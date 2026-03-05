/**
 * AI 伴侣 - 系统通知集成
 *
 * 接收 Agent 主动推送消息，转为系统原生通知。
 * 支持通过 WebSocket 从后端服务接收实时推送。
 */

import type { BrowserWindow } from 'electron'

import type { AgentPushMessage, NotificationPayload } from '../../shared/eventa'

import { useLogg } from '@guiiai/logg'
import { defineInvokeHandler } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/main'
import { ipcMain, Notification } from 'electron'

import {
  agentDismissMessage,
  agentGetPendingMessages,
  notificationShow,
} from '../../shared/eventa'
import { onAppBeforeQuit } from '../libs/bootkit/lifecycle'

const log = useLogg('companion/notifications').useGlobalConfig()

/** 待处理的 Agent 推送消息队列 */
const pendingMessages: AgentPushMessage[] = []

/** WebSocket 连接实例 */
let wsConnection: WebSocket | null = null

/** 重连定时器 */
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

/** 重连尝试次数 */
let reconnectAttempts = 0

/** 最大重连尝试次数 */
const MAX_RECONNECT_ATTEMPTS = 10

/** 重连间隔基数（毫秒） */
const RECONNECT_BASE_DELAY = 2000

/**
 * 显示系统原生通知
 *
 * @param title - 通知标题
 * @param body - 通知正文
 * @param icon - 通知图标路径（可选）
 */
export function showAgentNotification(title: string, body: string, icon?: string): void {
  // 检查系统是否支持通知
  if (!Notification.isSupported()) {
    log.warn('当前系统不支持原生通知')
    return
  }

  const notification = new Notification({
    title,
    body,
    icon: icon || undefined,
    // Windows 上使用应用图标
    silent: false,
  })

  notification.on('click', () => {
    log.log('用户点击了通知', { title })
  })

  notification.on('close', () => {
    log.log('通知已关闭', { title })
  })

  notification.show()
  log.log('已发送系统通知', { title, body: body.substring(0, 50) })
}

/**
 * 处理从 Agent 收到的推送消息
 * 存入待处理队列并显示系统通知
 */
function handleAgentPushMessage(message: AgentPushMessage): void {
  // 添加到待处理队列
  pendingMessages.push(message)

  // 队列最多保留 100 条
  if (pendingMessages.length > 100) {
    pendingMessages.splice(0, pendingMessages.length - 100)
  }

  // 根据消息类型决定通知展示方式
  switch (message.type) {
    case 'chat':
      showAgentNotification(message.title, message.body, message.icon)
      break
    case 'surprise':
      // 惊喜消息使用特殊格式
      showAgentNotification(`🎁 ${message.title}`, message.body, message.icon)
      break
    case 'reminder':
      showAgentNotification(`⏰ ${message.title}`, message.body, message.icon)
      break
    case 'system':
      showAgentNotification(message.title, message.body, message.icon)
      break
    default:
      showAgentNotification(message.title, message.body, message.icon)
  }
}

/**
 * 计算指数退避的重连延迟
 */
function getReconnectDelay(): number {
  const delay = RECONNECT_BASE_DELAY * 2 ** Math.min(reconnectAttempts, 6)
  // 加入随机抖动，避免多实例同时重连
  return delay + Math.random() * 1000
}

/**
 * 建立与 Agent 服务的 WebSocket 通知通道
 *
 * @param serverUrl - Agent 服务 WebSocket 地址
 * @param token - 认证令牌（可选）
 */
export function setupNotificationChannel(serverUrl: string, token?: string): void {
  // 清理已有连接
  cleanupConnection()

  const url = new URL(serverUrl)
  if (token) {
    url.searchParams.set('token', token)
  }

  log.log('正在连接 Agent 通知通道', { url: url.origin })

  try {
    wsConnection = new WebSocket(url.toString())

    wsConnection.onopen = () => {
      log.log('Agent 通知通道已连接')
      reconnectAttempts = 0
    }

    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data))

        // 验证消息格式
        if (data && typeof data.type === 'string' && typeof data.title === 'string') {
          const message: AgentPushMessage = {
            id: data.id || crypto.randomUUID(),
            type: data.type,
            title: data.title,
            body: data.body || '',
            icon: data.icon,
            timestamp: data.timestamp || Date.now(),
          }
          handleAgentPushMessage(message)
        }
        else {
          log.warn('收到格式不正确的推送消息', { data })
        }
      }
      catch (error) {
        log.withError(error).error('解析推送消息失败')
      }
    }

    wsConnection.onclose = (event) => {
      log.log('Agent 通知通道断开', { code: event.code, reason: event.reason })
      wsConnection = null
      scheduleReconnect(serverUrl, token)
    }

    wsConnection.onerror = (error) => {
      log.withError(error).error('Agent 通知通道错误')
    }
  }
  catch (error) {
    log.withError(error).error('建立通知通道失败')
    scheduleReconnect(serverUrl, token)
  }
}

/**
 * 安排重连
 */
function scheduleReconnect(serverUrl: string, token?: string): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    log.warn('已达最大重连次数，停止重连', { attempts: reconnectAttempts })
    return
  }

  const delay = getReconnectDelay()
  reconnectAttempts++

  log.log('将在延迟后重连', { delay: `${Math.round(delay)}ms`, attempt: reconnectAttempts })

  reconnectTimer = setTimeout(() => {
    setupNotificationChannel(serverUrl, token)
  }, delay)
}

/**
 * 清理 WebSocket 连接
 */
function cleanupConnection(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  if (wsConnection) {
    // 移除事件处理器避免触发重连
    wsConnection.onclose = null
    wsConnection.onerror = null
    wsConnection.onmessage = null

    if (wsConnection.readyState === WebSocket.OPEN || wsConnection.readyState === WebSocket.CONNECTING) {
      wsConnection.close()
    }
    wsConnection = null
  }
}

/**
 * 设置通知系统的 IPC 处理器
 * 连接 eventa 事件系统，允许渲染进程请求显示通知 / 获取待处理消息
 */
export function setupNotificationIpcHandlers(mainWindow: BrowserWindow): () => void {
  const { context } = createContext(ipcMain, mainWindow)
  const cleanups: Array<() => void> = []

  // 处理"显示通知"请求
  cleanups.push(
    defineInvokeHandler(context, notificationShow, (payload: NotificationPayload) => {
      showAgentNotification(payload.title, payload.body, payload.icon)
    }),
  )

  // 处理"获取待处理消息"请求
  cleanups.push(
    defineInvokeHandler(context, agentGetPendingMessages, () => {
      return [...pendingMessages]
    }),
  )

  // 处理"消息确认"请求
  cleanups.push(
    defineInvokeHandler(context, agentDismissMessage, (params: { id: string }) => {
      const index = pendingMessages.findIndex(m => m.id === params.id)
      if (index !== -1) {
        pendingMessages.splice(index, 1)
        log.log('已确认消息', { id: params.id })
      }
    }),
  )

  // 注册应用退出时的清理
  onAppBeforeQuit(() => {
    cleanupConnection()
  })

  return () => {
    for (const fn of cleanups) fn()
  }
}

/**
 * 手动向渲染进程推送 Agent 消息（供主进程内部调用）
 */
export function pushAgentMessage(message: Omit<AgentPushMessage, 'id' | 'timestamp'>): AgentPushMessage {
  const fullMessage: AgentPushMessage = {
    ...message,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }
  handleAgentPushMessage(fullMessage)
  return fullMessage
}
