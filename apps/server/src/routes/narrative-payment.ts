import type { NarrativePaymentService } from '../services/narrative-payment'
import type { HonoEnv } from '../types/hono'

import { Hono } from 'hono'
import { safeParse } from 'valibot'

import {
  ActiveNarrativesQuerySchema,
  AdvanceNarrativeSchema,
  CreateMemoryMomentSchema,
  CreateNarrativePaymentSchema,
  MemoryMomentsQuerySchema,
  NarrativeHistoryQuerySchema,
} from '../api/narrative-payment.schema'
import { authGuard } from '../middlewares/auth'
import { chargeRateLimiter, queryRateLimiter } from '../middlewares/rate-limit'
import { createBadRequestError } from '../utils/error'

// ─── 叙事支付路由 ─────────────────────────────────────────────────────────

/**
 * 叙事支付路由工厂
 *
 * 端点：
 * - POST   /payments          — 创建叙事支付（需认证）
 * - GET    /active             — 进行中的叙事（需认证，query: characterId）
 * - GET    /history            — 支付历史（需认证，query: limit, offset）
 * - PATCH  /payments/:id/phase — 更新叙事阶段（需认证）
 * - POST   /moments            — 创建记忆瞬间（需认证）
 * - GET    /moments            — 获取记忆瞬间（需认证，query: characterId, limit, offset）
 * - PATCH  /moments/:id/save   — 保存记忆瞬间（需认证）
 */
export function createNarrativePaymentRoutes(
  narrativePaymentService: NarrativePaymentService,
) {
  return new Hono<HonoEnv>()
    .use('*', authGuard)

    // ── POST /payments — 创建叙事支付 ──────────────────────────────────
    .post('/payments', chargeRateLimiter, async (c) => {
      const user = c.get('user')!
      const body = await c.req.json()
      const result = safeParse(CreateNarrativePaymentSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const payment = await narrativePaymentService.createPayment({
        userId: user.id,
        characterId: result.output.characterId,
        type: result.output.type,
        storyTitle: result.output.storyTitle,
        storyDescription: result.output.storyDescription ?? undefined,
        characterQuote: result.output.characterQuote ?? undefined,
        itemEmoji: result.output.itemEmoji ?? undefined,
        amountCents: result.output.amountCents,
      })

      return c.json({ payment }, 201)
    })

    // ── GET /active — 进行中的叙事 ───────────────────────────────
    .get('/active', queryRateLimiter, async (c) => {
      const user = c.get('user')!
      const characterId = c.req.query('characterId')

      if (!characterId) {
        throw createBadRequestError('characterId is required', 'MISSING_CHARACTER_ID')
      }

      const result = safeParse(ActiveNarrativesQuerySchema, { characterId })

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const narratives = await narrativePaymentService.getActivePayments(
        user.id,
        result.output.characterId,
      )

      return c.json({ narratives })
    })

    // ── GET /history — 支付历史（心意足迹） ───────────────────────
    .get('/history', queryRateLimiter, async (c) => {
      const user = c.get('user')!
      const query = {
        limit: Number(c.req.query('limit') ?? 20),
        offset: Number(c.req.query('offset') ?? 0),
      }
      const result = safeParse(NarrativeHistoryQuerySchema, query)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const payments = await narrativePaymentService.getPaymentHistory(
        user.id,
        result.output.limit!,
        result.output.offset!,
      )

      return c.json({ payments })
    })

    // ── PATCH /payments/:id/phase — 更新叙事阶段 ─────────────────────
    .patch('/payments/:id/phase', chargeRateLimiter, async (c) => {
      const user = c.get('user')!
      const paymentId = c.req.param('id')
      const body = await c.req.json()
      const result = safeParse(AdvanceNarrativeSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const payment = await narrativePaymentService.updatePhase(
        paymentId,
        user.id,
        result.output.phase,
        result.output.message,
      )

      return c.json({ payment })
    })

    // ── POST /moments — 创建记忆瞬间 ──────────────────────────────────
    .post('/moments', chargeRateLimiter, async (c) => {
      const user = c.get('user')!
      const body = await c.req.json()
      const result = safeParse(CreateMemoryMomentSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const moment = await narrativePaymentService.createMemoryMoment({
        userId: user.id,
        characterId: result.output.characterId,
        conversationDate: new Date(result.output.conversationDate),
        summary: result.output.summary,
        characterNote: result.output.characterNote ?? undefined,
        emotionalDensity: result.output.emotionalDensity ?? undefined,
      })

      return c.json({ moment }, 201)
    })

    // ── GET /moments — 获取记忆瞬间列表 ────────────────────────────────
    .get('/moments', queryRateLimiter, async (c) => {
      const user = c.get('user')!
      const characterId = c.req.query('characterId')

      if (!characterId) {
        throw createBadRequestError('characterId is required', 'MISSING_CHARACTER_ID')
      }

      const query = {
        characterId,
        limit: Number(c.req.query('limit') ?? 20),
        offset: Number(c.req.query('offset') ?? 0),
      }
      const result = safeParse(MemoryMomentsQuerySchema, query)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const moments = await narrativePaymentService.getMemoryMoments(
        user.id,
        result.output.characterId,
        result.output.limit!,
        result.output.offset!,
      )

      return c.json({ moments })
    })

    // ── PATCH /moments/:id/save — 保存记忆瞬间 ────────────────────────
    .patch('/moments/:id/save', chargeRateLimiter, async (c) => {
      const user = c.get('user')!
      const momentId = c.req.param('id')

      const moment = await narrativePaymentService.saveMemoryMoment(momentId, user.id)

      return c.json({ moment })
    })
}
