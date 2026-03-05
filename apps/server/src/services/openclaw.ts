import type { OpenClawClient } from '../libs/openclaw-client'

import { useLogger } from '@guiiai/logg'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentMessage {
  /** Agent that sent the message */
  agentId: string
  /** Message type: proactive push (surprise), greeting, reminder, etc. */
  type: 'surprise' | 'greeting' | 'reminder' | 'system' | 'unknown'
  /** Message content text */
  content: string
  /** ISO timestamp of the message */
  timestamp: string
  /** Optional metadata from OpenClaw */
  metadata?: Record<string, unknown>
}

export interface AgentState {
  /** Whether the agent is currently online and responsive */
  online: boolean
  /** Last time the agent was active */
  lastActive: Date
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Number of consecutive failures before the service considers OpenClaw
 * unavailable and recommends falling back to direct LLM.
 */
const FALLBACK_THRESHOLD = 3

/**
 * Window (ms) over which failures are counted. Failures older than this
 * are forgotten.
 */
const FAILURE_WINDOW_MS = 60_000

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Create the OpenClaw service layer.
 *
 * Follows the project's `createXxxService` factory pattern. The service wraps
 * the low-level OpenClawClient and provides domain-specific methods for
 * chatting with an Agent, querying state, and subscribing to proactive
 * messages.
 *
 * @param client An initialised (but not necessarily connected) OpenClawClient
 */
export function createOpenClawService(client: OpenClawClient) {
  const logger = useLogger('openclaw-service').useGlobalConfig()

  // Track recent failures for fallback heuristic
  const recentFailures: number[] = []

  function recordFailure(): void {
    recentFailures.push(Date.now())
  }

  function pruneFailures(): void {
    const cutoff = Date.now() - FAILURE_WINDOW_MS
    while (recentFailures.length > 0 && recentFailures[0] < cutoff) {
      recentFailures.shift()
    }
  }

  return {
    // ── Chat ─────────────────────────────────────────────────────────────

    /**
     * Send a user message to an OpenClaw Agent and receive a response.
     *
     * Supports optional token-level streaming via the `onToken` callback.
     * Returns the full accumulated response text.
     *
     * @param agentId  The OpenClaw Agent identifier
     * @param message  User message text
     * @param onToken  Optional callback invoked for each streamed token
     * @returns        Full response text from the Agent
     */
    async sendMessage(
      agentId: string,
      message: string,
      onToken?: (token: string) => void,
    ): Promise<string> {
      try {
        // TODO: Verify exact param schema for `chat.send` once Gateway
        // pairing is complete. The params below follow the RPC method
        // signature documented in AGENT_PLATFORM_SELECTION.md.
        const result = await client.callStreaming('chat.send', {
          agent_id: agentId,
          message,
        }, onToken)

        return result
      }
      catch (err) {
        recordFailure()
        logger.withError(err).error('Failed to send message via OpenClaw')
        throw err
      }
    },

    // ── Agent state ──────────────────────────────────────────────────────

    /**
     * Query the current state of an Agent (online status, last activity).
     *
     * @param agentId The OpenClaw Agent identifier
     */
    async getAgentState(agentId: string): Promise<AgentState> {
      try {
        // TODO: Verify exact response shape from `status` / `system-presence`
        // RPC methods.
        const result = await client.call<{
          online?: boolean
          last_active?: string
          agents?: Array<{ id: string; online: boolean; last_active: string }>
        }>('status', { agent_id: agentId })

        // Handle both single-agent and multi-agent response shapes
        if (result.agents) {
          const agent = result.agents.find(a => a.id === agentId)
          return {
            online: agent?.online ?? false,
            lastActive: agent?.last_active ? new Date(agent.last_active) : new Date(0),
          }
        }

        return {
          online: result.online ?? false,
          lastActive: result.last_active ? new Date(result.last_active) : new Date(0),
        }
      }
      catch (err) {
        recordFailure()
        logger.withError(err).warn('Failed to get agent state')
        return { online: false, lastActive: new Date(0) }
      }
    },

    // ── Subscriptions ────────────────────────────────────────────────────

    /**
     * Subscribe to proactive messages from an Agent.
     *
     * OpenClaw Agents can send unsolicited messages via Heartbeat/Cron tasks
     * (e.g. morning greetings, surprise pushes, reminders). This method
     * registers a listener and returns an unsubscribe function.
     *
     * @param agentId  The Agent to listen to
     * @param callback Invoked when the Agent sends a proactive message
     * @returns        Unsubscribe function
     */
    onAgentMessage(
      agentId: string,
      callback: (msg: AgentMessage) => void,
    ): () => void {
      const handler = (method: string, params: Record<string, unknown>) => {
        // TODO: Verify exact notification methods for proactive Agent
        // messages. Likely `chat.message` or `agent.message`.
        if (method === 'chat.message' || method === 'agent.message') {
          const sourceAgentId = params.agent_id as string | undefined
          if (sourceAgentId && sourceAgentId !== agentId)
            return

          const msg: AgentMessage = {
            agentId: sourceAgentId ?? agentId,
            type: resolveMessageType(params.type as string | undefined),
            content: (params.content ?? params.message ?? '') as string,
            timestamp: (params.timestamp as string) ?? new Date().toISOString(),
            metadata: params.metadata as Record<string, unknown> | undefined,
          }

          callback(msg)
        }
      }

      client.on('message', handler)

      // Return unsubscribe function
      return () => {
        client.off('message', handler)
      }
    },

    // ── Connection state ─────────────────────────────────────────────────

    /**
     * Whether the underlying WebSocket connection is currently open.
     */
    isConnected(): boolean {
      return client.connected
    },

    /**
     * Heuristic check: should the caller fall back to direct LLM?
     *
     * Returns `true` if:
     * - The WebSocket is disconnected, OR
     * - There have been >= FALLBACK_THRESHOLD failures within the recent
     *   FAILURE_WINDOW_MS window.
     */
    shouldFallback(): boolean {
      if (!client.connected) {
        return true
      }

      pruneFailures()
      return recentFailures.length >= FALLBACK_THRESHOLD
    },

    // ── Lifecycle helpers ────────────────────────────────────────────────

    /**
     * Attempt to connect the underlying client.
     * Safe to call multiple times; no-ops if already connected.
     */
    async ensureConnected(): Promise<void> {
      if (client.connected)
        return

      try {
        await client.connect()
      }
      catch (err) {
        recordFailure()
        logger.withError(err).warn('Failed to connect to OpenClaw')
        // Don't re-throw — callers should check shouldFallback() instead
      }
    },

    /**
     * Gracefully shut down the OpenClaw connection.
     */
    shutdown(): void {
      client.disconnect()
    },
  }
}

export type OpenClawService = ReturnType<typeof createOpenClawService>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveMessageType(raw: string | undefined): AgentMessage['type'] {
  if (!raw)
    return 'unknown'

  const normalized = raw.toLowerCase()
  if (normalized.includes('surprise'))
    return 'surprise'
  if (normalized.includes('greet') || normalized.includes('morning') || normalized.includes('night'))
    return 'greeting'
  if (normalized.includes('remind'))
    return 'reminder'
  if (normalized.includes('system'))
    return 'system'

  return 'unknown'
}
