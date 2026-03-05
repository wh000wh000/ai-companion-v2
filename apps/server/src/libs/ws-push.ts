import { useLogger } from '@guiiai/logg'

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
      ws.send(payload)
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

// ─── WebSocket 升级处理 TODO ───────────────────────
//
// 当前项目使用 @hono/node-server，原生不支持 WebSocket 升级。
// 实际 WebSocket 端点需要以下方式之一实现：
//
// 方案 A：安装 @hono/node-ws（推荐）
//   pnpm add @hono/node-ws
//   然后在 app.ts 中配置 WebSocket 升级中间件。
//
// 方案 B：使用独立的 ws 库
//   在 createApp() 中获取底层 HTTP server，
//   通过 ws 库监听 upgrade 事件处理 /ws/push 路径。
//
// 两种方案均使用上面的 registerConnection / removeConnection
// 管理连接生命周期。
