import type { OpenClawFallback } from '../middlewares/openclaw-fallback'
import type { OpenClawService } from '../services/openclaw'
import type { CharacterService } from '../services/characters'
import type { OpenRouterService } from '../services/openrouter'
import type { HonoEnv } from '../types/hono'

import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { safeParse } from 'valibot'
import { nonEmpty, object, optional, pipe, string } from 'valibot'

import { authGuard } from '../middlewares/auth'
import { createBadRequestError } from '../utils/error'

// ─── Validation Schemas ──────────────────────────────────────────────────────

const ChatSendSchema = object({
  /** The OpenClaw Agent ID to send the message to */
  agentId: pipe(string(), nonEmpty('agentId is required')),
  /** The user's message text */
  message: pipe(string(), nonEmpty('message is required')),
  /** Optional character ID for fallback LLM context */
  characterId: optional(string()),
})

// ─── Route factory ───────────────────────────────────────────────────────────

/**
 * Create the chat route handler.
 *
 * Supports dual-channel messaging:
 * 1. **Primary**: OpenClaw Agent via WebSocket JSON-RPC (token-level streaming)
 * 2. **Fallback**: Direct LLM call through AIRI's existing provider system
 *
 * Both channels respond with SSE for consistent client-side consumption.
 */
export function createChatRoute(openclawService: OpenClawService, fallback?: OpenClawFallback, openrouter?: OpenRouterService, characterService?: CharacterService) {
  return new Hono<HonoEnv>()
    .use('*', authGuard)

    // ── POST / — Send a message ────────────────────────────────────────
    .post('/', async (c) => {
      // authGuard ensures user is present; extract for future use in
      // fallback LLM context and audit logging.
      c.get('user')!

      const body = await c.req.json()
      const result = safeParse(ChatSendSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const { agentId, message, characterId } = result.output
      // 优先使用降级管理器判断，若未提供则使用 openclawService 原始判断
      const useOpenClaw = fallback
        ? fallback.shouldUseOpenClaw()
        : !openclawService.shouldFallback()

      if (useOpenClaw) {
        // ── OpenClaw channel: SSE streaming ──────────────────────────
        return streamSSE(c, async (stream) => {
          try {
            // Send channel indicator
            await stream.writeSSE({
              event: 'channel',
              data: JSON.stringify({ channel: 'openclaw' }),
            })

            await openclawService.sendMessage(agentId, message, async (token) => {
              await stream.writeSSE({
                event: 'token',
                data: JSON.stringify({ token }),
              })
            })

            await stream.writeSSE({
              event: 'done',
              data: JSON.stringify({ channel: 'openclaw' }),
            })
          }
          catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'

            // 通知降级管理器记录失败
            if (fallback) {
              fallback.enterFallback(errorMessage)
            }

            // If OpenClaw fails mid-stream, notify client to potentially retry
            // with fallback
            await stream.writeSSE({
              event: 'error',
              data: JSON.stringify({
                error: errorMessage,
                channel: 'openclaw',
                canRetry: true,
              }),
            })
          }
        })
      }

      // ── Fallback channel: OpenRouter LLM ──────────────────────────────
      if (!openrouter?.isAvailable()) {
        return streamSSE(c, async (stream) => {
          await stream.writeSSE({
            event: 'channel',
            data: JSON.stringify({ channel: 'fallback' }),
          })
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({
              error: 'OpenClaw unavailable and OPENROUTER_API_KEY not configured',
              channel: 'fallback',
              canRetry: false,
            }),
          })
        })
      }

      // 使用 OpenRouter 直连 LLM，以角色人格回复
      const resolvedCharacterId = characterId ?? 'preset-xiaoxing'

      // 优先从 DB 获取角色 systemPrompt
      let dbSystemPrompt: string | undefined
      if (characterService) {
        try {
          const charData = await characterService.findById(resolvedCharacterId)
          const systemPromptEntry = charData?.prompts?.find(
            (p: { type: string }) => p.type === 'system',
          )
          if (systemPromptEntry) {
            dbSystemPrompt = systemPromptEntry.content
          }
        }
        catch {
          // DB 查询失败时静默降级，openrouter 会从文件系统加载
        }
      }

      // 对于 DB 查询的 characterId，openrouter 可能需要 slug 而非完整 ID
      const openrouterCharacterId = resolvedCharacterId.replace('preset-', '')

      return streamSSE(c, async (stream) => {
        try {
          await stream.writeSSE({
            event: 'channel',
            data: JSON.stringify({ channel: 'fallback' }),
          })

          await openrouter.chat(openrouterCharacterId, message, async (token) => {
            await stream.writeSSE({
              event: 'token',
              data: JSON.stringify({ token }),
            })
          }, dbSystemPrompt)

          await stream.writeSSE({
            event: 'done',
            data: JSON.stringify({ channel: 'fallback' }),
          })
        }
        catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({
              error: errorMessage,
              channel: 'fallback',
              canRetry: false,
            }),
          })
        }
      })
    })

    // ── GET /status — Connection status ────────────────────────────────
    .get('/status', async (c) => {
      const connected = openclawService.isConnected()
      const shouldFallback = openclawService.shouldFallback()
      // 如果有降级管理器，使用它的模式判断
      const currentMode = fallback ? fallback.getMode() : (connected && !shouldFallback ? 'openclaw' : 'fallback')

      return c.json({
        channel: currentMode,
        openclaw: {
          connected,
          shouldFallback,
        },
        fallbackManager: fallback ? { mode: currentMode } : undefined,
        timestamp: new Date().toISOString(),
      })
    })
}
