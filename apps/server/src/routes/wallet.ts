import type { EconomyService } from '../services/economy'
import type { TrustService } from '../services/trust'
import type { HonoEnv } from '../types/hono'

import { Hono } from 'hono'
import { safeParse } from 'valibot'

import { ChargeSchema, GiftSchema, HistoryQuerySchema } from '../api/wallet.schema'
import { authGuard } from '../middlewares/auth'
import { chargeRateLimiter, giftRateLimiter, queryRateLimiter } from '../middlewares/rate-limit'
import { createBadRequestError } from '../utils/error'

export function createWalletRoutes(economyService: EconomyService, trustService: TrustService) {
  return new Hono<HonoEnv>()
    .use('*', authGuard)

    // GET / — 查询钱包余额
    .get('/', queryRateLimiter, async (c) => {
      const user = c.get('user')!
      const wallet = await economyService.getWallet(user.id)
      return c.json(wallet)
    })

    // POST /charge — 充值
    .post('/charge', chargeRateLimiter, async (c) => {
      const user = c.get('user')!
      const body = await c.req.json()
      const result = safeParse(ChargeSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const chargeResult = await economyService.processCharge(
        user.id,
        result.output.packId,
        result.output.idempotencyKey,
      )

      return c.json(chargeResult, chargeResult.duplicate ? 200 : 201)
    })

    // POST /gift — 送礼
    .post('/gift', giftRateLimiter, async (c) => {
      const user = c.get('user')!
      const body = await c.req.json()
      const result = safeParse(GiftSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const giftResult = await economyService.processGift(
        user.id,
        result.output.characterId,
        result.output.giftTier,
        result.output.idempotencyKey,
      )

      // 如果送礼成功且有 trustGain，应用信赖变更
      if (!giftResult.duplicate && giftResult.giftResult?.trustGain) {
        await trustService.applyTrustEvent(
          user.id,
          result.output.characterId,
          'gift',
          giftResult.giftResult.trustGain,
        )
      }

      return c.json(giftResult, giftResult.duplicate ? 200 : 201)
    })

    // GET /history — 交易记录
    .get('/history', queryRateLimiter, async (c) => {
      const user = c.get('user')!
      const query = {
        limit: Number(c.req.query('limit') ?? 20),
        offset: Number(c.req.query('offset') ?? 0),
      }
      const result = safeParse(HistoryQuerySchema, query)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const transactions = await economyService.getTransactions(
        user.id,
        result.output.limit!,
        result.output.offset!,
      )

      return c.json(transactions)
    })
}
