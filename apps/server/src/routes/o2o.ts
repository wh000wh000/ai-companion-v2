import type { MiddlewareHandler } from 'hono'

import type { O2OService } from '../services/o2o'
import type { HonoEnv } from '../types/hono'

import { Hono } from 'hono'
import { array, minLength, minValue, number, object, optional, picklist, pipe, string } from 'valibot'
import { safeParse } from 'valibot'

import { pushToUser } from '../libs/ws-push'
import { createBadRequestError, createForbiddenError, createUnauthorizedError } from '../utils/error'

// ─── Valibot 校验 Schema ─────────────────────────────

/** 商品推荐请求 */
const RecommendSchema = object({
  userId: pipe(string(), minLength(1)),
  characterId: pipe(string(), minLength(1)),
  budget: pipe(number(), minValue(1)),
  preferences: array(string()),
  location: optional(string()),
})

/** 链接生成请求 */
const GenerateLinkSchema = object({
  productName: pipe(string(), minLength(1)),
  platform: optional(picklist(['meituan', 'eleme'])),
  location: optional(string()),
})

/** 惊喜推送请求 */
const SendSurpriseSchema = object({
  userId: pipe(string(), minLength(1)),
  characterId: pipe(string(), minLength(1)),
  productName: pipe(string(), minLength(1)),
  message: pipe(string(), minLength(1)),
  searchUrl: pipe(string(), minLength(1)),
  emotion: optional(picklist(['happy', 'calm', 'caring', 'curious', 'missing', 'clingy', 'shy', 'touched'])),
})

// ─── 路由工厂 ──────────────────────────────────────

export function createO2ORoutes(
  o2oService: O2OService,
  openclawToken: string | undefined,
) {
  /**
   * Gateway Token 守卫中间件
   * 仅允许 OpenClaw Agent 通过 X-OpenClaw-Token 认证调用
   */
  const o2oGuard: MiddlewareHandler<HonoEnv> = async (c, next) => {
    if (!openclawToken) {
      throw createForbiddenError('O2O skills disabled: OPENCLAW_TOKEN not configured')
    }

    const token = c.req.header('X-OpenClaw-Token')
    if (token !== openclawToken) {
      throw createUnauthorizedError('Invalid or missing X-OpenClaw-Token')
    }

    await next()
  }

  return new Hono<HonoEnv>()
    .use('*', o2oGuard)

    // ─── 智能选品 ─────────────────────────────────

    // POST /recommend — 根据预算和偏好推荐商品
    .post('/recommend', async (c) => {
      const body = await c.req.json()
      const result = safeParse(RecommendSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const recommendations = o2oService.recommend({
        budget: result.output.budget,
        preferences: result.output.preferences,
        location: result.output.location,
      })

      return c.json({ recommendations })
    })

    // ─── 链接生成 ─────────────────────────────────

    // POST /generate-link — 生成外卖平台搜索链接
    .post('/generate-link', async (c) => {
      const body = await c.req.json()
      const result = safeParse(GenerateLinkSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const platform = result.output.platform ?? 'meituan'
      const url = o2oService.generateSearchUrl(
        result.output.productName,
        platform,
        result.output.location,
      )

      return c.json({
        url,
        platform,
        productName: result.output.productName,
      })
    })

    // ─── 惊喜推送 ─────────────────────────────────

    // POST /send-surprise — 将 O2O 惊喜推送给用户
    .post('/send-surprise', async (c) => {
      const body = await c.req.json()
      const result = safeParse(SendSurpriseSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const { userId, characterId, productName, message, searchUrl, emotion } = result.output

      // 通过 WebSocket 推送给用户（O2O 信息放入 metadata）
      const pushed = pushToUser(userId, {
        type: 'surprise_trigger',
        content: message,
        emotion,
        characterId,
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'o2o',
          productName,
          searchUrl,
        },
      })

      return c.json({
        success: pushed,
        productName,
        searchUrl,
      })
    })
}
