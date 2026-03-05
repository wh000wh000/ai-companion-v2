import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

import { relations } from 'drizzle-orm'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { nanoid } from '../utils/id'
import { user } from './accounts'

/**
 * 支付订单表
 *
 * 记录所有支付订单的生命周期，状态机：
 * created → paying → paid → fulfilled
 *                  ↘ closed（超时/取消）
 *           paid → refunded
 */
export const paymentOrders = pgTable(
  'payment_orders',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    /** 充值套餐 ID（对应 CHARGE_PACKS） */
    packId: text('pack_id').notNull(),
    /** 金额，单位：分 */
    amount: integer('amount').notNull(),
    /** 支付提供者：wechat / alipay / mock */
    provider: text('provider').notNull(),
    /** 订单状态 */
    status: text('status').notNull().default('created'),
    /** 第三方支付流水号 */
    transactionId: text('transaction_id'),
    /** 前端唤起支付所需的参数（JSON 序列化） */
    paymentParams: text('payment_params'),
    /** 订单描述 */
    description: text('description'),
    /** 支付完成时间 */
    paidAt: timestamp('paid_at'),
    /** 订单过期时间（30分钟） */
    expireAt: timestamp('expire_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  // 注意：已移除 (userId, status) 唯一索引 — 同一用户可有多笔同状态订单
  // 原唯一索引会导致连续充值时冲突（如两笔 fulfilled/paid/closed 订单冲突）

)

export type PaymentOrderRecord = InferSelectModel<typeof paymentOrders>
export type NewPaymentOrderRecord = InferInsertModel<typeof paymentOrders>

export const paymentOrderRelations = relations(
  paymentOrders,
  ({ one }) => ({
    user: one(user, {
      fields: [paymentOrders.userId],
      references: [user.id],
    }),
  }),
)
