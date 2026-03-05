import type { MiddlewareHandler } from 'hono'

import type { HonoEnv } from '../types/hono'

import { Hono } from 'hono'
import { minLength, object, optional, picklist, pipe, string } from 'valibot'
import { safeParse } from 'valibot'

import { getOnlineCount, isUserOnline, pushToUser } from '../libs/ws-push'
import { createBadRequestError, createForbiddenError, createUnauthorizedError } from '../utils/error'

// ─── Valibot 校验 Schema ─────────────────────────────

/** 主动消息请求体 */
const ProactiveMessageSchema = object({
  userId: pipe(string(), minLength(1)),
  characterId: pipe(string(), minLength(1)),
  type: picklist(['greeting', 'reminder', 'surprise', 'system']),
  content: pipe(string(), minLength(1)),
  emotion: optional(picklist(['happy', 'calm', 'caring', 'curious', 'missing', 'clingy', 'shy', 'touched'])),
})

// ─── 消息类型映射 ────────────────────────────────────

/** 将业务类型映射为推送消息类型 */
function mapMessageType(type: string): 'proactive_message' | 'surprise_trigger' {
  switch (type) {
    case 'surprise':
      return 'surprise_trigger'
    default:
      return 'proactive_message'
  }
}

// ─── 路由工厂 ──────────────────────────────────────

export function createProactiveRoutes(openclawToken: string | undefined) {
  /**
   * Gateway Token 守卫中间件
   * 仅允许 OpenClaw Agent 通过 X-OpenClaw-Token 认证调用
   */
  const proactiveGuard: MiddlewareHandler<HonoEnv> = async (c, next) => {
    if (!openclawToken) {
      throw createForbiddenError('Proactive push disabled: OPENCLAW_TOKEN not configured')
    }

    const token = c.req.header('X-OpenClaw-Token')
    if (token !== openclawToken) {
      throw createUnauthorizedError('Invalid or missing X-OpenClaw-Token')
    }

    await next()
  }

  return new Hono<HonoEnv>()
    .use('*', proactiveGuard)

    // POST /send — Agent 推送主动消息给用户
    .post('/send', async (c) => {
      const body = await c.req.json()
      const result = safeParse(ProactiveMessageSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const { userId, characterId, type, content, emotion } = result.output

      const pushed = pushToUser(userId, {
        type: mapMessageType(type),
        content,
        emotion,
        characterId,
        timestamp: new Date().toISOString(),
      })

      return c.json({
        success: pushed,
        online: isUserOnline(userId),
      })
    })

    // GET /status — 推送系统状态
    .get('/status', async (c) => {
      return c.json({
        onlineUsers: getOnlineCount(),
      })
    })
}
