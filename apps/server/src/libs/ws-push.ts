import type { IncomingMessage } from 'node:http'
import type { Server as HTTPServer } from 'node:http'

import { parse as parseUrl } from 'node:url'

import { useLogger } from '@guiiai/logg'
import { WebSocket, WebSocketServer } from 'ws'

// ─── 推送消息类型定义 ──────────────────────────────

/** WebSocket 推送消息体 */
export interface PushMessage {
  /** 消息类型 */
  type: 'proactive_message' | 'surprise_trigger' | 'level_up' | 'decay_warning' | 'system'
  /** 消息文本内容 */
  content: string
  /** 角色当前情感状态 */
  emotion?: string
  /** 发送角色 ID */
  characterId?: string
  /** 附加元数据 */
  metadata?: Record<string, unknown>
  /** ISO 8601 时间戳 */
  timestamp: string
}

// ─── 连接管理器 ────────────────────────────────────

/**
 * 用户 WebSocket 连接池
 * key = userId, value = 该用户所有活跃连接
 */
const connections = new Map<string, Set<WebSocket>>()
const logger = useLogger('ws-push').useGlobalConfig()

/** WebSocket 服务实例（全局） */
let wss: WebSocketServer | null = null

/** 心跳检测间隔（30秒） */
const HEARTBEAT_INTERVAL_MS = 30_000
/** 僵死连接清理间隔 */
let heartbeatTimer: ReturnType<typeof setInterval> | null = null

/**
 * 注册用户 WebSocket 连接
 */
export function registerConnection(userId: string, ws: WebSocket): void {
  if (!connections.has(userId)) {
    connections.set(userId, new Set())
  }
  connections.get(userId)!.add(ws)
  logger.log(`WebSocket connected: user=${userId}, total=${connections.get(userId)!.size}`)
}

/**
 * 移除用户 WebSocket 连接
 */
export function removeConnection(userId: string, ws: WebSocket): void {
  const userConns = connections.get(userId)
  if (userConns) {
    userConns.delete(ws)
    if (userConns.size === 0) {
      connections.delete(userId)
    }
  }
  logger.log(`WebSocket disconnected: user=${userId}`)
}

/**
 * 向指定用户推送消息
 * @returns true 如果至少有一个连接成功发送
 */
export function pushToUser(userId: string, message: PushMessage): boolean {
  const userConns = connections.get(userId)
  if (!userConns || userConns.size === 0) {
    return false
  }

  const payload = JSON.stringify(message)
  for (const ws of userConns) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    }
    catch {
      // 发送失败，清理无效连接
      userConns.delete(ws)
    }
  }
  return true
}

/**
 * 检查用户是否在线（有活跃 WebSocket 连接）
 */
export function isUserOnline(userId: string): boolean {
  const userConns = connections.get(userId)
  return !!userConns && userConns.size > 0
}

/**
 * 获取当前在线用户数
 */
export function getOnlineCount(): number {
  return connections.size
}

/**
 * 关闭所有 WebSocket 连接（优雅关闭时调用）
 */
export function closeAllConnections(): void {
  // 停止心跳检测
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  let count = 0
  for (const [userId, userConns] of connections) {
    for (const ws of userConns) {
      try {
        ws.close(1001, 'Server shutting down')
        count++
      }
      catch {
        // 忽略关闭错误
      }
    }
    userConns.clear()
    connections.delete(userId)
  }

  // 关闭 WebSocket 服务
  if (wss) {
    wss.close()
    wss = null
  }

  logger.log(`Closed ${count} WebSocket connections`)
}

// ─── WebSocket 服务端 ────────────────────────────────

/**
 * 从 cookie 字符串中提取 better_auth session token
 */
function extractSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * 初始化 WebSocket 推送服务
 *
 * 在底层 HTTP server 上监听 upgrade 事件，
 * 处理 /ws/push 路径的 WebSocket 连接。
 *
 * 认证方式：从 cookie 中提取 better-auth session token
 *
 * @param httpServer @hono/node-server 返回的 HTTP server 实例
 * @param validateSession 验证 session token 并返回 userId 的函数
 */
export function setupWebSocketServer(
  httpServer: HTTPServer,
  validateSession: (token: string) => Promise<string | null>,
): void {
  wss = new WebSocketServer({ noServer: true })

  // 监听 HTTP upgrade 事件
  httpServer.on('upgrade', async (request: IncomingMessage, socket, head) => {
    const { pathname } = parseUrl(request.url || '', true)

    if (pathname !== '/ws/push') {
      socket.destroy()
      return
    }

    // 认证：从 cookie 提取 session token
    const token = extractSessionToken(request.headers.cookie)
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    const userId = await validateSession(token)
    if (!userId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    // 升级连接
    wss!.handleUpgrade(request, socket, head, (ws) => {
      wss!.emit('connection', ws, request, userId)
    })
  })

  // 处理新连接
  wss.on('connection', (ws: WebSocket, _request: IncomingMessage, userId: string) => {
    // 标记为活跃（用于心跳检测）
    ;(ws as any).isAlive = true
    ;(ws as any).userId = userId

    registerConnection(userId, ws)

    // Pong 响应标记为活跃
    ws.on('pong', () => {
      ;(ws as any).isAlive = true
    })

    ws.on('close', () => {
      removeConnection(userId, ws)
    })

    ws.on('error', () => {
      removeConnection(userId, ws)
    })

    // 发送欢迎消息
    ws.send(JSON.stringify({
      type: 'system',
      content: 'Connected to push channel',
      timestamp: new Date().toISOString(),
    }))
  })

  // 启动心跳检测（清理僵死连接）
  heartbeatTimer = setInterval(() => {
    if (!wss) return
    wss.clients.forEach((ws) => {
      if ((ws as any).isAlive === false) {
        const userId = (ws as any).userId as string | undefined
        if (userId) {
          removeConnection(userId, ws)
        }
        ws.terminate()
        return
      }
      ;(ws as any).isAlive = false
      ws.ping()
    })
  }, HEARTBEAT_INTERVAL_MS)

  logger.log('WebSocket push server initialized on /ws/push')
}
