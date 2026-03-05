import type { TrustService } from '../services/trust'
import type { HonoEnv } from '../types/hono'

import { Hono } from 'hono'
import { safeParse } from 'valibot'

import { CheckinSchema, TrustUpdateSchema } from '../api/trust.schema'
import { authGuard } from '../middlewares/auth'
import { chargeRateLimiter, queryRateLimiter } from '../middlewares/rate-limit'
import { createBadRequestError } from '../utils/error'

export function createTrustRoutes(trustService: TrustService) {
  return new Hono<HonoEnv>()
    .use('*', authGuard)

    // GET /:characterId — 查询信赖状态
    .get('/:characterId', queryRateLimiter, async (c) => {
      const user = c.get('user')!
      const characterId = c.req.param('characterId')
      const record = await trustService.getTrustRecord(user.id, characterId)
      return c.json(record)
    })

    // POST /checkin — 每日签到
    .post('/checkin', chargeRateLimiter, async (c) => {
      const user = c.get('user')!
      const body = await c.req.json()
      const result = safeParse(CheckinSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const checkinResult = await trustService.checkIn(
        user.id,
        result.output.characterId,
      )

      return c.json(checkinResult, 201)
    })

    // POST /update — 手动更新（管理接口，仅开发/测试模式）
    // TODO: 生产环境需实现 admin 角色系统后替换为 adminGuard
    .post('/update', chargeRateLimiter, async (c) => {
      // 安全：生产环境禁止直接修改信赖值（无 admin 角色验证）
      if (process.env.NODE_ENV === 'production') {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const user = c.get('user')!
      const body = await c.req.json()
      const result = safeParse(TrustUpdateSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const updateResult = await trustService.applyTrustEvent(
        user.id,
        result.output.characterId,
        result.output.event,
        result.output.value,
      )

      return c.json(updateResult)
    })
}
