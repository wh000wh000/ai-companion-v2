import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

import { relations } from 'drizzle-orm'
import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { nanoid } from '../utils/id'
import { user } from './accounts'

/**
 * 记忆瞬间表
 *
 * 对话中有特殊情感密度的时刻，由系统自动识别并标记。
 * 用户可以付费"留住"这些瞬间，角色会为之添加批注。
 */
export const memoryMoments = pgTable(
  'memory_moments',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    /** 关联角色 ID */
    characterId: text('character_id').notNull(),

    // ── 对话快照 ──────────────────────────────────────────────
    /** 对话发生的时间 */
    conversationDate: timestamp('conversation_date').notNull(),
    /** 对话摘要（2-3 句话） */
    summary: text('summary').notNull(),
    /** 角色的批注，如"那天你说的话，我一直记得" */
    characterNote: text('character_note'),
    /** 情感密度评分 1-10 */
    emotionalDensity: integer('emotional_density').default(0),

    // ── 保存状态 ──────────────────────────────────────────────
    /** 是否已被用户付费"留住" */
    isSaved: boolean('is_saved').default(false),
    /** 保存时间 */
    savedAt: timestamp('saved_at'),

    // ── 时间 ──────────────────────────────────────────────────
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
)

export type MemoryMomentRecord = InferSelectModel<typeof memoryMoments>
export type NewMemoryMomentRecord = InferInsertModel<typeof memoryMoments>

export const memoryMomentRelations = relations(
  memoryMoments,
  ({ one }) => ({
    user: one(user, {
      fields: [memoryMoments.userId],
      references: [user.id],
    }),
  }),
)
