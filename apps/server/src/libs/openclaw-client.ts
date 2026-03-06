import { EventEmitter } from 'node:events'
import { useLogger } from '@guiiai/logg'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OpenClawClientConfig {
  /** WebSocket URL, e.g. ws://192.168.3.196:3000 */
  url: string
  /** Gateway Token for authentication */
  token: string
  /** Whether to automatically reconnect on disconnect */
  reconnect: boolean
  /** Heartbeat interval in ms (default 30000) */
  heartbeatInterval: number
}

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

type JsonRpcMessage = JsonRpcResponse | JsonRpcNotification

export interface StreamToken {
  token: string
  done: boolean
}

// ─── Events ──────────────────────────────────────────────────────────────────

export interface OpenClawClientEvents {
  connect: []
  disconnect: [code: number, reason: string]
  error: [error: Error]
  message: [method: string, params: Record<string, unknown>]
  'stream:token': [requestId: number, token: StreamToken]
}

// ─── Pending request tracker ─────────────────────────────────────────────────

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_RECONNECT_DELAY_MS = 30_000
const BASE_RECONNECT_DELAY_MS = 1_000
const RPC_TIMEOUT_MS = 30_000

// ─── Client ──────────────────────────────────────────────────────────────────

/**
 * WebSocket JSON-RPC client for OpenClaw Agent platform.
 *
 * Handles connection lifecycle, JSON-RPC request/response correlation,
 * token-level streaming, heartbeat keep-alive, and exponential backoff
 * reconnection.
 */
export class OpenClawClient extends EventEmitter<OpenClawClientEvents> {
  private ws: WebSocket | null = null
  private config: OpenClawClientConfig
  private requestId = 0
  private pending = new Map<number, PendingRequest>()
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private intentionalClose = false
  private _connected = false
  private logger = useLogger('openclaw-client').useGlobalConfig()

  constructor(config: OpenClawClientConfig) {
    super()
    this.config = config
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** Whether the WebSocket connection is currently open. */
  get connected(): boolean {
    return this._connected
  }

  /**
   * Open the WebSocket connection to the OpenClaw Gateway.
   * Resolves once the connection is established, rejects on failure.
   */
  async connect(): Promise<void> {
    if (this._connected) {
      return
    }

    this.intentionalClose = false

    return new Promise<void>((resolve, reject) => {
      try {
        // Use the standard global WebSocket (Node 21+ / browsers).
        // If running on older Node without global WebSocket, the caller must
        // polyfill globalThis.WebSocket (e.g. via the `ws` npm package).
        const wsUrl = this.buildAuthUrl()
        this.logger.withFields({ url: this.config.url }).log('Connecting to OpenClaw Gateway')

        this.ws = new WebSocket(wsUrl)

        const onOpen = () => {
          cleanup()
          this._connected = true
          this.reconnectAttempt = 0
          this.startHeartbeat()
          this.emit('connect')
          this.logger.log('Connected to OpenClaw Gateway')
          resolve()
        }

        const onError = (ev: Event) => {
          cleanup()
          const errorMsg = 'message' in ev ? String((ev as { message: unknown }).message) : 'unknown'
          const error = new Error(`WebSocket connection error: ${errorMsg}`)
          this.emit('error', error)
          reject(error)
        }

        const onClose = (ev: CloseEvent) => {
          cleanup()
          reject(new Error(`WebSocket closed during connect: ${ev.code} ${ev.reason}`))
        }

        const cleanup = () => {
          this.ws?.removeEventListener('open', onOpen)
          this.ws?.removeEventListener('error', onError)
          this.ws?.removeEventListener('close', onClose)
        }

        this.ws.addEventListener('open', onOpen)
        this.ws.addEventListener('error', onError)
        this.ws.addEventListener('close', onClose)

        // Attach persistent handlers (they outlive the connect promise)
        this.ws.addEventListener('message', this.handleMessage)
        this.ws.addEventListener('close', this.handleClose)
        this.ws.addEventListener('error', this.handleError)
      }
      catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    })
  }

  /**
   * Gracefully close the connection. Stops heartbeat and reconnection.
   */
  disconnect(): void {
    this.intentionalClose = true
    this.stopHeartbeat()
    this.cancelReconnect()
    this.rejectAllPending('Client disconnected')

    if (this.ws) {
      this.ws.removeEventListener('message', this.handleMessage)
      this.ws.removeEventListener('close', this.handleClose)
      this.ws.removeEventListener('error', this.handleError)
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect')
      }
      this.ws = null
    }

    this._connected = false
    this.logger.log('Disconnected from OpenClaw Gateway')
  }

  /**
   * Send a JSON-RPC method call and wait for the response.
   *
   * @param method  RPC method name (e.g. `chat.send`, `cron.list`)
   * @param params  Optional parameters object
   * @param timeout Request-level timeout in ms (default 30 s)
   * @returns       The `result` field from the JSON-RPC response
   */
  async call<T = unknown>(method: string, params?: Record<string, unknown>, timeout = RPC_TIMEOUT_MS): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('OpenClaw WebSocket is not connected')
    }

    const id = ++this.requestId
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      ...(params ? { params } : {}),
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC call "${method}" timed out after ${timeout}ms`))
      }, timeout)

      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      })

      this.ws!.send(JSON.stringify(request))
      this.logger.withFields({ method, id }).log('RPC request sent')
    })
  }

  /**
   * Send a JSON-RPC call that returns a streamed response.
   * Tokens are emitted via the `stream:token` event keyed by request id.
   *
   * @param method  RPC method name (e.g. `chat.send` with streaming enabled)
   * @param params  Parameters including stream flag
   * @param onToken Callback invoked for each streamed token
   * @returns       The final accumulated response text
   */
  async callStreaming(
    method: string,
    params: Record<string, unknown>,
    onToken?: (token: string) => void,
  ): Promise<string> {
    const id = ++this.requestId

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('OpenClaw WebSocket is not connected')
    }

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params: { ...params, stream: true },
    }

    return new Promise<string>((resolve, reject) => {
      let accumulated = ''

      const tokenHandler = (reqId: number, streamToken: StreamToken) => {
        if (reqId !== id)
          return

        accumulated += streamToken.token
        onToken?.(streamToken.token)

        if (streamToken.done) {
          this.off('stream:token', tokenHandler)
          resolve(accumulated)
        }
      }

      this.on('stream:token', tokenHandler)

      // Also handle the final RPC response / error for this request
      const timer = setTimeout(() => {
        this.pending.delete(id)
        this.off('stream:token', tokenHandler)
        reject(new Error(`Streaming RPC call "${method}" timed out`))
      }, 120_000) // streaming calls get a longer timeout (2 min)

      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          // If we haven't resolved via streaming tokens yet, resolve now
          this.off('stream:token', tokenHandler)
          if (!accumulated && typeof value === 'string') {
            resolve(value)
          }
          else {
            resolve(accumulated || String(value ?? ''))
          }
        },
        reject: (err) => {
          clearTimeout(timer)
          this.off('stream:token', tokenHandler)
          reject(err)
        },
        timer,
      })

      this.ws!.send(JSON.stringify(request))
      this.logger.withFields({ method, id, streaming: true }).log('Streaming RPC request sent')
    })
  }

  // ── Private: message handling ────────────────────────────────────────────

  private handleMessage = (ev: MessageEvent): void => {
    try {
      const data = typeof ev.data === 'string' ? ev.data : String(ev.data)
      const msg: JsonRpcMessage = JSON.parse(data)

      if (this.isResponse(msg)) {
        this.handleRpcResponse(msg)
      }
      else if (this.isNotification(msg)) {
        this.handleNotification(msg)
      }
    }
    catch (err) {
      this.logger.withError(err).warn('Failed to parse WebSocket message')
    }
  }

  private isResponse(msg: JsonRpcMessage): msg is JsonRpcResponse {
    return 'id' in msg && typeof (msg as JsonRpcResponse).id === 'number'
  }

  private isNotification(msg: JsonRpcMessage): msg is JsonRpcNotification {
    return !('id' in msg) && 'method' in msg
  }

  private handleRpcResponse(msg: JsonRpcResponse): void {
    const pending = this.pending.get(msg.id)
    if (!pending) {
      // Could be a streaming intermediate frame — check for partial tokens
      // OpenClaw sends streaming data as JSON-RPC notifications with the
      // request id embedded in params
      return
    }

    clearTimeout(pending.timer)
    this.pending.delete(msg.id)

    if (msg.error) {
      const err = new Error(`RPC error [${msg.error.code}]: ${msg.error.message}`)
      pending.reject(err)
    }
    else {
      pending.resolve(msg.result)
    }
  }

  private handleNotification(msg: JsonRpcNotification): void {
    const params = msg.params ?? {}

    // OpenClaw 流式 Token 通知 API 契约:
    //   通知方法: "chat.stream" 或 "stream.token"
    //   params: { request_id: number, token: string, done: boolean }
    //   done=true 时表示流结束，客户端应 resolve Promise
    // 两个方法名均监听，以兼容不同 Gateway 版本
    if (msg.method === 'chat.stream' || msg.method === 'stream.token') {
      const requestId = params.request_id as number | undefined
      const token = params.token as string | undefined
      const done = params.done as boolean | undefined

      if (requestId != null && token != null) {
        this.emit('stream:token', requestId, { token, done: done ?? false })
        return
      }
    }

    // Generic notification passthrough
    this.emit('message', msg.method, params)
  }

  // ── Private: connection lifecycle ────────────────────────────────────────

  private handleClose = (ev: CloseEvent): void => {
    this._connected = false
    this.stopHeartbeat()
    this.rejectAllPending('WebSocket connection closed')
    this.emit('disconnect', ev.code, ev.reason)
    this.logger.withFields({ code: ev.code, reason: ev.reason }).warn('WebSocket closed')

    if (!this.intentionalClose && this.config.reconnect) {
      this.scheduleReconnect()
    }
  }

  private handleError = (ev: Event): void => {
    const errorMsg = 'message' in ev ? String((ev as { message: unknown }).message) : 'unknown'
    const error = new Error(`WebSocket error: ${errorMsg}`)
    this.emit('error', error)
    this.logger.withError(error).error('WebSocket error')
  }

  // ── Private: heartbeat ───────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send a lightweight health check via JSON-RPC
        this.call('health').catch((err) => {
          this.logger.withError(err).warn('Heartbeat failed')
        })
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // ── Private: reconnection with exponential backoff ───────────────────────

  private scheduleReconnect(): void {
    this.cancelReconnect()

    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempt,
      MAX_RECONNECT_DELAY_MS,
    )

    this.logger.withFields({ attempt: this.reconnectAttempt + 1, delayMs: delay }).log('Scheduling reconnect')

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempt++
      try {
        await this.connect()
      }
      catch {
        // connect() failed — handleClose will fire again and re-schedule
        this.logger.withFields({ attempt: this.reconnectAttempt }).warn('Reconnect attempt failed')
      }
    }, delay)
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // ── Private: helpers ─────────────────────────────────────────────────────

  /** Build a WebSocket URL with the auth token as a query parameter. */
  private buildAuthUrl(): string {
    // OpenClaw Gateway 认证方式:
    //   查询参数: ?token=<gateway_token>
    //   参考 GitHub issue #2248: 设备签名验证可通过
    //   dangerouslyDisableDeviceAuth=true 禁用
    // 注意: 生产环境应使用 Device Pairing 而非 query param token
    const url = new URL(this.config.url)
    url.searchParams.set('token', this.config.token)
    return url.toString()
  }

  /** Reject all pending RPC calls (used on disconnect). */
  private rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error(reason))
      this.pending.delete(id)
    }
  }
}

/**
 * Factory function to create an OpenClawClient with sensible defaults.
 */
export function createOpenClawClient(config: Partial<OpenClawClientConfig> & Pick<OpenClawClientConfig, 'url' | 'token'>): OpenClawClient {
  return new OpenClawClient({
    reconnect: true,
    heartbeatInterval: 30_000,
    ...config,
  })
}
