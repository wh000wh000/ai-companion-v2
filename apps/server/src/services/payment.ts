import type { Database } from '../libs/db'
import type { PaymentConfig, PaymentOrder, PaymentProvider } from '../libs/payment'

import { eq, and } from 'drizzle-orm'
import { useLogger } from '@guiiai/logg'
import { getChargePack } from '@ai-companion/soul-engine'

import { createPaymentProvider, getDefaultProvider, mockCompletePayment } from '../libs/payment'
import * as schema from '../schemas'
import { createBadRequestError, createNotFoundError } from '../utils/error'

/**
 * 支付服务
 *
 * 负责支付订单的全生命周期管理：
 * - 创建订单（调用支付提供者）
 * - 处理回调（验签 + 状态更新）
 * - 查询订单
 * - Mock 支付完成（仅开发模式）
 */
export function createPaymentService(db: Database, config?: PaymentConfig) {
  const logger = useLogger('payment-service').useGlobalConfig()
  const defaultProvider = getDefaultProvider(config)

  return {
    /**
     * 创建支付订单
     *
     * 1. 验证套餐是否存在
     * 2. 检查幂等键防重复
     * 3. 调用支付提供者创建订单
     * 4. 持久化到数据库
     */
    async createOrder(userId: string, packId: string, provider?: PaymentProvider, idempotencyKey?: string) {
      // 1. 验证套餐
      const pack = getChargePack(packId)
      if (!pack)
        throw createBadRequestError('Invalid pack ID', 'INVALID_PACK')

      // 2. 幂等性检查 — 使用专用 idempotencyKey 列
      if (idempotencyKey) {
        const existing = await db.query.paymentOrders.findFirst({
          where: eq(schema.paymentOrders.idempotencyKey, idempotencyKey),
        })
        if (existing) {
          // 安全：验证归属用户
          if (existing.userId !== userId) {
            throw createBadRequestError('Idempotency key already used', 'IDEMPOTENCY_CONFLICT')
          }
          return {
            order: this.toPaymentOrder(existing),
            duplicate: true,
          }
        }
      }

      // 3. 调用支付提供者
      const selectedProvider = provider ?? defaultProvider
      const paymentProvider = createPaymentProvider(selectedProvider, config)
      const paymentOrder = await paymentProvider.createOrder({
        userId,
        packId,
        amount: pack.price, // 单位：分
        provider: selectedProvider,
        description: `充值 ${pack.name}`,
      })

      // 4. 持久化订单
      const [record] = await db.insert(schema.paymentOrders).values({
        userId,
        packId,
        amount: paymentOrder.amount,
        provider: selectedProvider,
        status: paymentOrder.status,
        paymentParams: paymentOrder.paymentParams ? JSON.stringify(paymentOrder.paymentParams) : null,
        idempotencyKey: idempotencyKey ?? null,
        description: `充值 ${pack.name}`,
        expireAt: paymentOrder.expireAt,
      }).returning()

      logger.withFields({ orderId: record.id, provider: selectedProvider, amount: pack.price })
        .log('支付订单已创建')

      return {
        order: {
          ...paymentOrder,
          orderId: record.id,
        },
        duplicate: false,
      }
    },

    /**
     * 处理支付回调
     *
     * 1. 验签
     * 2. 解析回调数据
     * 3. 更新订单状态
     */
    async handleCallback(provider: PaymentProvider, rawBody: string, signature: string) {
      const paymentProvider = createPaymentProvider(provider, config)

      // 1. 验签
      if (!paymentProvider.verifyCallback(rawBody, signature)) {
        logger.warn('支付回调验签失败')
        return { success: false, reason: 'INVALID_SIGNATURE' }
      }

      // 2. 解析回调
      const callback = paymentProvider.parseCallback(rawBody)

      // 3. 查找订单
      const order = await db.query.paymentOrders.findFirst({
        where: eq(schema.paymentOrders.id, callback.orderId),
      })

      if (!order) {
        logger.withFields({ orderId: callback.orderId }).warn('回调对应的订单不存在')
        return { success: false, reason: 'ORDER_NOT_FOUND' }
      }

      // 防止重复处理
      if (order.status === 'paid' || order.status === 'fulfilled') {
        return { success: true, reason: 'ALREADY_PROCESSED' }
      }

      // 状态机校验：只有 created/paying 状态才能变为 paid
      if (order.status !== 'created' && order.status !== 'paying') {
        logger.withFields({ orderId: order.id, status: order.status }).warn('订单状态不允许支付')
        return { success: false, reason: 'INVALID_STATUS' }
      }

      // 4. 更新订单状态
      if (callback.status === 'success') {
        await db.update(schema.paymentOrders)
          .set({
            status: 'paid',
            transactionId: callback.transactionId,
            paidAt: new Date(),
          })
          .where(eq(schema.paymentOrders.id, order.id))

        logger.withFields({ orderId: order.id, transactionId: callback.transactionId })
          .log('支付成功，订单已更新')

        return { success: true, orderId: order.id, order }
      }

      // 支付失败 → 关闭订单
      await db.update(schema.paymentOrders)
        .set({ status: 'closed' })
        .where(eq(schema.paymentOrders.id, order.id))

      return { success: false, reason: 'PAYMENT_FAILED' }
    },

    /**
     * 查询订单状态
     */
    async getOrder(orderId: string, userId?: string) {
      const conditions = userId
        ? and(eq(schema.paymentOrders.id, orderId), eq(schema.paymentOrders.userId, userId))
        : eq(schema.paymentOrders.id, orderId)

      const order = await db.query.paymentOrders.findFirst({
        where: conditions,
      })

      if (!order)
        throw createNotFoundError('Order not found')

      return this.toPaymentOrder(order)
    },

    /**
     * Mock 支付完成（仅开发模式）
     *
     * 模拟用户在支付页面完成支付的过程。
     */
    async mockPay(orderId: string) {
      // 从数据库查找订单
      const order = await db.query.paymentOrders.findFirst({
        where: eq(schema.paymentOrders.id, orderId),
      })

      if (!order)
        throw createNotFoundError('Order not found')

      if (order.provider !== 'mock')
        throw createBadRequestError('Only mock orders can use mock-pay', 'NOT_MOCK_ORDER')

      if (order.status !== 'created')
        throw createBadRequestError('Order is not in created status', 'INVALID_STATUS')

      // 检查是否超时
      if (new Date() > order.expireAt)
        throw createBadRequestError('Order has expired', 'ORDER_EXPIRED')

      // 更新内存中的 mock 订单状态
      mockCompletePayment(orderId)

      // 更新数据库订单状态
      const [updated] = await db.update(schema.paymentOrders)
        .set({
          status: 'paid',
          transactionId: `mock_tx_${Date.now()}`,
          paidAt: new Date(),
        })
        .where(eq(schema.paymentOrders.id, orderId))
        .returning()

      logger.withFields({ orderId }).log('Mock 支付完成')

      return this.toPaymentOrder(updated)
    },

    /**
     * 将订单完成后标记为已履约（充值到账）
     */
    async fulfillOrder(orderId: string) {
      const [updated] = await db.update(schema.paymentOrders)
        .set({ status: 'fulfilled' })
        .where(and(
          eq(schema.paymentOrders.id, orderId),
          eq(schema.paymentOrders.status, 'paid'),
        ))
        .returning()

      if (!updated)
        throw createBadRequestError('Order cannot be fulfilled', 'INVALID_STATUS')

      return this.toPaymentOrder(updated)
    },

    /**
     * 数据库记录 → PaymentOrder 转换
     */
    toPaymentOrder(record: schema.PaymentOrderRecord): PaymentOrder {
      return {
        orderId: record.id,
        userId: record.userId,
        packId: record.packId,
        amount: record.amount,
        provider: record.provider as PaymentProvider,
        status: record.status as PaymentOrder['status'],
        paymentParams: record.paymentParams ? JSON.parse(record.paymentParams) : undefined,
        createdAt: record.createdAt,
        paidAt: record.paidAt ?? undefined,
        expireAt: record.expireAt,
      }
    },
  }
}

export type PaymentService = ReturnType<typeof createPaymentService>
