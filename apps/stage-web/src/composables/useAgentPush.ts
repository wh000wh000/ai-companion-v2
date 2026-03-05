import { onMounted, onUnmounted, ref } from 'vue'

// ─── 类型定义 ──────────────────────────────────────

/** Agent 推送消息体 */
export interface AgentPushMessage {
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

// ─── Composable ────────────────────────────────────

/**
 * 监听 Agent 主动推送消息的 Vue composable
 *
 * @param serverUrl 可选的 WebSocket 服务器地址，默认自动从当前页面推断
 *
 * @example
 * ```vue
 * <script setup>
 * const { connected, lastMessage, messages } = useAgentPush()
 *
 * watch(lastMessage, (msg) => {
 *   if (msg?.type === 'surprise_trigger') {
 *     showSurpriseModal(msg)
 *   }
 * })
 * </script>
 * ```
 */
export function useAgentPush(serverUrl?: string) {
  const connected = ref(false)
  const lastMessage = ref<AgentPushMessage | null>(null)
  const messages = ref<AgentPushMessage[]>([])

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  /** 建立 WebSocket 连接 */
  function connect() {
    const url = serverUrl
      ?? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/push`

    ws = new WebSocket(url)

    ws.onopen = () => {
      connected.value = true
    }

    ws.onclose = () => {
      connected.value = false
      // 自动重连，间隔 5 秒
      reconnectTimer = setTimeout(connect, 5000)
    }

    ws.onerror = () => {
      // onclose 会在 onerror 之后触发，重连逻辑交给 onclose 处理
    }

    ws.onmessage = (event) => {
      try {
        const msg: AgentPushMessage = JSON.parse(event.data as string)
        lastMessage.value = msg
        messages.value.push(msg)
      }
      catch {
        // 忽略无法解析的消息
      }
    }
  }

  /** 断开 WebSocket 连接并停止重连 */
  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    ws?.close()
    ws = null
    connected.value = false
  }

  /** 清空消息历史 */
  function clearMessages() {
    messages.value = []
    lastMessage.value = null
  }

  onMounted(connect)
  onUnmounted(disconnect)

  return {
    /** WebSocket 连接状态 */
    connected,
    /** 最新一条推送消息 */
    lastMessage,
    /** 所有已接收的推送消息列表 */
    messages,
    /** 手动断开连接 */
    disconnect,
    /** 清空消息历史 */
    clearMessages,
  }
}
