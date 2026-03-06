import type { EconomyService } from '../services/economy'
import type { PaymentService } from '../services/payment'
import type { HonoEnv } from '../types/hono'

import process from 'node:process'

import { Hono } from 'hono'
import { safeParse } from 'valibot'

import { CreatePaymentOrderSchema } from '../api/payment.schema'
import { authGuard } from '../middlewares/auth'
import { createBadRequestError } from '../utils/error'

// ─── 支付路由 ──────────────────────────────────────────────────────────────

/**
 * 支付路由工厂
 *
 * 端点：
 * - POST /create-order     — 创建支付订单（需认证）
 * - POST /callback/wechat  — 微信支付回调（无需认证）
 * - POST /callback/alipay  — 支付宝回调（无需认证）
 * - GET  /order/:id        — 查询订单状态（需认证）
 * - POST /mock-pay/:id     — Mock 支付完成（需认证，仅 ENABLE_MOCK_PAY=true 或非生产环境）
 */
export function createPaymentRoutes(
  paymentService: PaymentService,
  economyService: EconomyService,
) {
  const app = new Hono<HonoEnv>()

    // ── POST /create-order — 创建支付订单 ─────────────────────────────
    .post('/create-order', authGuard, async (c) => {
      const user = c.get('user')!
      const body = await c.req.json()
      const result = safeParse(CreatePaymentOrderSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const { packId, provider, idempotencyKey } = result.output

      const orderResult = await paymentService.createOrder(
        user.id,
        packId,
        provider ?? undefined,
        idempotencyKey ?? undefined,
      )

      return c.json({
        order: orderResult.order,
        duplicate: orderResult.duplicate,
      })
    })

    // ── POST /callback/wechat — 微信支付回调 ──────────────────────────
    .post('/callback/wechat', async (c) => {
      const rawBody = await c.req.text()
      const signature = c.req.header('Wechatpay-Signature') ?? ''

      const result = await paymentService.handleCallback('wechat', rawBody, signature)

      if (result.success && result.orderId && result.order) {
        // 支付成功 → 自动触发充值到账
        await economyService.processCharge(
          result.order.userId,
          result.order.packId,
          `payment:${result.orderId}`,
        )
        // 充值到账后标记订单为已履约
        await paymentService.fulfillOrder(result.orderId)
      }

      // 微信要求返回 200 + JSON
      return c.json({ code: result.success ? 'SUCCESS' : 'FAIL' })
    })

    // ── POST /callback/alipay — 支付宝回调 ────────────────────────────
    .post('/callback/alipay', async (c) => {
      const rawBody = await c.req.text()
      const signature = c.req.header('sign') ?? ''

      const result = await paymentService.handleCallback('alipay', rawBody, signature)

      if (result.success && result.orderId && result.order) {
        await economyService.processCharge(
          result.order.userId,
          result.order.packId,
          `payment:${result.orderId}`,
        )
        // 充值到账后标记订单为已履约
        await paymentService.fulfillOrder(result.orderId)
      }

      // 支付宝要求返回 "success" 字符串
      return c.text(result.success ? 'success' : 'fail')
    })

    // ── GET /order/:id — 查询订单状态 ─────────────────────────────────
    .get('/order/:id', authGuard, async (c) => {
      const user = c.get('user')!
      const orderId = c.req.param('id')

      const order = await paymentService.getOrder(orderId, user.id)
      return c.json({ order })
    })

  // ── POST /mock-pay/:id — Mock 支付完成 ────────────────
  // 安全：在路由注册时决定是否挂载，而非运行时判断
  const mockPayEnabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_MOCK_PAY === 'true'
  if (mockPayEnabled) {
    app.post('/mock-pay/:id', authGuard, async (c) => {
      const user = c.get('user')!
      const orderId = c.req.param('id')

      // 安全：先验证订单存在且属于当前用户
      const existingOrder = await paymentService.getOrder(orderId, user.id)
      if (!existingOrder) {
        return c.json({ error: 'Order not found' }, 404)
      }

      const order = await paymentService.mockPay(orderId)

      // 使用订单实际所属用户（而非当前登录用户）触发充值
      await economyService.processCharge(
        existingOrder.userId,
        order.packId,
        `payment:${orderId}`,
      )

      return c.json({ order, charged: true })
    })
  }

  return app
}
