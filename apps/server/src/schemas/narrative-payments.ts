import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

import { relations } from 'drizzle-orm'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { nanoid } from '../utils/id'
import { user } from './accounts'

/**
 * 叙事支付表
 *
 * 每一笔支付都是"为角色做的一件事"，而非"购买商品"。
 * 用户的每一次付费都对应一个叙事故事线——角色接受心意后会"行动"。
 *
 * 叙事阶段状态机：
 * initiated → in_progress → delivered → reflected
 *
 * 支付状态机：
 * pending → completed
 *        → cancelled
 */
export const narrativePayments = pgTable(
  'narrative_payments',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    /** 关联角色 ID */
    characterId: text('character_id').notNull(),

    // ── 叙事类型 ──────────────────────────────────────────────
    /** 叙事类型：book=找书 | gift=送礼 | care=关心 | experience=体验 | course=课程 */
    type: text('type').notNull(),

    // ── 叙事内容 ──────────────────────────────────────────────
    /** 叙事标题，如"为令仪找到那本书" */
    storyTitle: text('story_title').notNull(),
    /** 叙事详细描述 */
    storyDescription: text('story_description'),
    /** 角色的话，如"这本书我一直想读！" */
    characterQuote: text('character_quote'),
    /** 叙事图标 emoji */
    itemEmoji: text('item_emoji'),

    // ── 金额 ──────────────────────────────────────────────────
    /** 金额，单位：人民币分 */
    amountCents: integer('amount_cents').notNull(),

    // ── 支付状态 ──────────────────────────────────────────────
    /** 支付状态：pending=待支付 | completed=已完成 | cancelled=已取消 */
    status: text('status').default('pending').notNull(),

    // ── 叙事进度 ──────────────────────────────────────────────
    /** 叙事阶段：initiated=已发起 | in_progress=进行中 | delivered=已送达 | reflected=已感悟 */
    narrativePhase: text('narrative_phase').default('initiated'),
    /** 叙事时间线更新（JSON 数组），记录角色行动的每一步 */
    narrativeUpdates: text('narrative_updates'),

    // ── 时间 ──────────────────────────────────────────────────
    createdAt: timestamp('created_at').defaultNow().notNull(),
    /** 支付完成时间 */
    completedAt: timestamp('completed_at'),
    /** 叙事送达时间 */
    deliveredAt: timestamp('delivered_at'),
  },
)

export type NarrativePaymentRecord = InferSelectModel<typeof narrativePayments>
export type NewNarrativePaymentRecord = InferInsertModel<typeof narrativePayments>

export const narrativePaymentRelations = relations(
  narrativePayments,
  ({ one }) => ({
    user: one(user, {
      fields: [narrativePayments.userId],
      references: [user.id],
    }),
  }),
)
