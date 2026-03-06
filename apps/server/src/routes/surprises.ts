import type { O2OService } from '../services/o2o'
import type { SurpriseService } from '../services/surprises'
import type { HonoEnv } from '../types/hono'

import { Hono } from 'hono'
import { safeParse } from 'valibot'

import { SurpriseCheckSchema, SurpriseQuerySchema, SurpriseStatusUpdateSchema } from '../api/surprises.schema'
import { authGuard } from '../middlewares/auth'
import { chargeRateLimiter, queryRateLimiter } from '../middlewares/rate-limit'
import { createBadRequestError } from '../utils/error'

/** 根据惊喜类型生成默认产品名称 */
function getSurpriseProductName(type: string): string {
  const names: Record<string, string> = {
    virtual: '专属虚拟礼物',
    electronic: '电子惊喜礼包',
    physical: '实物惊喜礼品',
    personalized: '个性化定制惊喜',
  }
  return names[type] ?? '神秘惊喜'
}

/** 根据惊喜类型生成角色消息 */
function getSurpriseMessage(type: string): string {
  const messages: Record<string, string> = {
    virtual: '我给你准备了一个小惊喜，希望你喜欢~',
    electronic: '攒了好久的零花钱，给你买了这个！',
    physical: '这是我用零花钱给你准备的礼物哦~',
    personalized: '这是我特别为你定制的，独一无二的！',
  }
  return messages[type] ?? '这是我给你准备的惊喜~'
}

export function createSurpriseRoutes(surpriseService: SurpriseService, o2oService?: O2OService) {
  return new Hono<HonoEnv>()
    .use('*', authGuard)

    // GET / — 查询惊喜记录
    .get('/', queryRateLimiter, async (c) => {
      const user = c.get('user')!
      const query = {
        limit: Number(c.req.query('limit') ?? 20),
        offset: Number(c.req.query('offset') ?? 0),
      }
      const result = safeParse(SurpriseQuerySchema, query)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const surprises = await surpriseService.getSurprises(
        user.id,
        result.output.limit!,
        result.output.offset!,
      )

      return c.json(surprises)
    })

    // POST /check — 触发检查（触发成功时自动创建惊喜记录）
    .post('/check', chargeRateLimiter, async (c) => {
      const user = c.get('user')!
      const body = await c.req.json()
      const result = safeParse(SurpriseCheckSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const triggerResult = await surpriseService.checkTrigger(
        user.id,
        result.output.characterId,
      )

      // 触发成功时自动创建惊喜记录，使前端可以展示惊喜动画
      if (triggerResult.shouldTrigger && triggerResult.bestType) {
        // 如果是非虚拟惊喜且有 O2O 服务，获取推荐商品
        let productName = getSurpriseProductName(triggerResult.bestType)
        let amount = 0
        const triggerBudget = (triggerResult as unknown as Record<string, unknown>).budget as number | undefined

        if (triggerResult.bestType !== 'virtual' && o2oService && triggerBudget) {
          const recommendations = o2oService.recommend({
            budget: triggerBudget,
            preferences: [], // v1 暂无偏好数据
          })
          if (recommendations.length > 0) {
            const topPick = recommendations[0]
            productName = topPick.name
            amount = topPick.price
          }
        }

        const surprise = await surpriseService.createSurprise({
          userId: user.id,
          characterId: result.output.characterId,
          type: triggerResult.bestType,
          productName,
          amount,
          status: 'sent',
          message: getSurpriseMessage(triggerResult.bestType),
        })
        return c.json({ ...triggerResult, surprise })
      }

      return c.json({ ...triggerResult, surprise: null })
    })

    // PATCH /:id/status — 更新状态
    .patch('/:id/status', chargeRateLimiter, async (c) => {
      const user = c.get('user')!
      const id = c.req.param('id')
      const body = await c.req.json()
      const result = safeParse(SurpriseStatusUpdateSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      // 安全：传入 userId 做所有权校验，防止 IDOR
      const updated = await surpriseService.updateStatus(
        id,
        user.id,
        result.output.status,
        result.output.feedback,
      )

      return c.json(updated)
    })
}
