import type { MiddlewareHandler } from 'hono'

import type { EconomyService } from '../services/economy'
import type { MemoryService } from '../services/memory'
import type { SurpriseService } from '../services/surprises'
import type { TrustService } from '../services/trust'
import type { HonoEnv } from '../types/hono'

import { Hono } from 'hono'
import { maxValue, minLength, minValue, number, object, optional, pipe, string } from 'valibot'
import { safeParse } from 'valibot'

import { createBadRequestError, createForbiddenError, createUnauthorizedError } from '../utils/error'

// ─── Valibot 校验 Schema ─────────────────────────────

/** 用户+角色 通用请求 */
const UserCharacterSchema = object({
  userId: pipe(string(), minLength(1)),
  characterId: pipe(string(), minLength(1)),
})

/** 送礼请求 */
const SkillGiftSchema = object({
  userId: pipe(string(), minLength(1)),
  characterId: pipe(string(), minLength(1)),
  giftTier: pipe(string(), minLength(1)),
  idempotencyKey: pipe(string(), minLength(1)),
})

/** 惊喜方案创建请求 */
const SurprisePlanSchema = object({
  userId: pipe(string(), minLength(1)),
  characterId: pipe(string(), minLength(1)),
  type: pipe(string(), minLength(1)),
  content: pipe(string(), minLength(1)),
  cost: optional(pipe(number(), minValue(0))),
})

/** 记忆搜索请求 */
const MemorySearchSchema = object({
  userId: pipe(string(), minLength(1)),
  query: pipe(string(), minLength(1)),
  type: optional(string()),
  limit: optional(pipe(number(), minValue(1), maxValue(20))),
})

/** 记忆保存请求 */
const MemorySaveSchema = object({
  userId: pipe(string(), minLength(1)),
  characterId: pipe(string(), minLength(1)),
  type: pipe(string(), minLength(1)),
  content: pipe(string(), minLength(1)),
  importance: optional(pipe(number(), minValue(1), maxValue(10))),
})

// ─── 路由工厂 ──────────────────────────────────────

export function createSkillsRoutes(
  trustService: TrustService,
  economyService: EconomyService,
  surpriseService: SurpriseService,
  openclawToken: string | undefined,
  memoryService?: MemoryService,
) {
  /**
   * Gateway Token 守卫中间件
   * 验证 X-OpenClaw-Token 请求头是否与配置的 OPENCLAW_TOKEN 一致
   */
  const skillsGuard: MiddlewareHandler<HonoEnv> = async (c, next) => {
    // 未配置 token 时，Skills 功能整体禁用
    if (!openclawToken) {
      throw createForbiddenError('Skills disabled: OPENCLAW_TOKEN not configured')
    }

    const token = c.req.header('X-OpenClaw-Token')
    if (token !== openclawToken) {
      throw createUnauthorizedError('Invalid or missing X-OpenClaw-Token')
    }

    await next()
  }

  return new Hono<HonoEnv>()
    .use('*', skillsGuard)

    // ─── 信赖引擎 ─────────────────────────────────

    // POST /trust/calculate-daily — 每日信赖计算（签到）
    .post('/trust/calculate-daily', async (c) => {
      const body = await c.req.json()
      const result = safeParse(UserCharacterSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const checkinResult = await trustService.checkIn(
        result.output.userId,
        result.output.characterId,
      )

      return c.json(checkinResult, 201)
    })

    // POST /trust/check-decay — 衰减检查
    .post('/trust/check-decay', async (c) => {
      const body = await c.req.json()
      const result = safeParse(UserCharacterSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const decayResult = await trustService.applyDecay(
        result.output.userId,
        result.output.characterId,
      )

      return c.json(decayResult)
    })

    // GET /trust/level-info — 等级信息查询
    .get('/trust/level-info', async (c) => {
      const userId = c.req.query('userId')
      const characterId = c.req.query('characterId')

      if (!userId || !characterId) {
        throw createBadRequestError('Missing userId or characterId', 'INVALID_REQUEST')
      }

      const record = await trustService.getTrustRecord(userId, characterId)
      return c.json(record)
    })

    // ─── 经济引擎 ─────────────────────────────────

    // POST /economy/process-gift — 送礼处理
    .post('/economy/process-gift', async (c) => {
      const body = await c.req.json()
      const result = safeParse(SkillGiftSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const giftResult = await economyService.processGift(
        result.output.userId,
        result.output.characterId,
        result.output.giftTier,
        result.output.idempotencyKey,
      )

      // 如果送礼成功且有 trustGain，应用信赖变更
      if (!giftResult.duplicate && giftResult.giftResult?.trustGain) {
        await trustService.applyTrustEvent(
          result.output.userId,
          result.output.characterId,
          'gift',
          giftResult.giftResult.trustGain,
        )
      }

      return c.json(giftResult, giftResult.duplicate ? 200 : 201)
    })

    // GET /economy/balance — 余额查询
    .get('/economy/balance', async (c) => {
      const userId = c.req.query('userId')

      if (!userId) {
        throw createBadRequestError('Missing userId', 'INVALID_REQUEST')
      }

      const wallet = await economyService.getWallet(userId)
      return c.json(wallet)
    })

    // GET /economy/pocket-money — 零花钱查询
    .get('/economy/pocket-money', async (c) => {
      const userId = c.req.query('userId')

      if (!userId) {
        throw createBadRequestError('Missing userId', 'INVALID_REQUEST')
      }

      const wallet = await economyService.getWallet(userId)
      return c.json({
        userId,
        pocketMoney: wallet.pocketMoney,
      })
    })

    // ─── 惊喜引擎 ─────────────────────────────────

    // POST /surprise/check-trigger — 触发检查
    .post('/surprise/check-trigger', async (c) => {
      const body = await c.req.json()
      const result = safeParse(UserCharacterSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const triggerResult = await surpriseService.checkTrigger(
        result.output.userId,
        result.output.characterId,
      )

      return c.json(triggerResult)
    })

    // POST /surprise/plan — 惊喜方案生成
    .post('/surprise/plan', async (c) => {
      const body = await c.req.json()
      const result = safeParse(SurprisePlanSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const surprise = await surpriseService.createSurprise({
        userId: result.output.userId,
        characterId: result.output.characterId,
        type: result.output.type,
        message: result.output.content,
        amount: result.output.cost ?? 0,
        status: 'sent',
      })

      return c.json(surprise, 201)
    })

    // GET /surprise/history — 惊喜历史
    .get('/surprise/history', async (c) => {
      const userId = c.req.query('userId')
      const limit = Number(c.req.query('limit') ?? 20)
      const offset = Number(c.req.query('offset') ?? 0)

      if (!userId) {
        throw createBadRequestError('Missing userId', 'INVALID_REQUEST')
      }

      // 基本范围校验
      const safeLimit = Math.max(1, Math.min(limit || 20, 50))
      const safeOffset = Math.max(0, offset || 0)

      const surprises = await surpriseService.getSurprises(userId, safeLimit, safeOffset)
      return c.json(surprises)
    })

    // ─── 记忆引擎 ─────────────────────────────────

    // POST /memory/search — 语义搜索用户记忆
    .post('/memory/search', async (c) => {
      const body = await c.req.json()
      const result = safeParse(MemorySearchSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      if (!memoryService) {
        return c.json({
          status: 'not_configured',
          message: '记忆服务未注入',
          results: [],
        })
      }

      // 兼容旧版 MemorySearchSchema（没有 characterId），使用空字符串兜底
      const results = await memoryService.searchMemories({
        userId: result.output.userId,
        characterId: (result.output as any).characterId ?? '',
        query: result.output.query,
        limit: result.output.limit ?? 5,
      })

      return c.json({ results, total: results.length })
    })

    // POST /memory/save — 保存记忆
    .post('/memory/save', async (c) => {
      const body = await c.req.json()
      const result = safeParse(MemorySaveSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      if (!memoryService) {
        return c.json({
          status: 'not_configured',
          message: '记忆服务未注入',
          saved: false,
        })
      }

      const memory = await memoryService.saveMemory({
        userId: result.output.userId,
        characterId: result.output.characterId,
        content: result.output.content,
        type: result.output.type,
        importance: result.output.importance ?? 3,
      })

      return c.json(memory, 201)
    })
}
