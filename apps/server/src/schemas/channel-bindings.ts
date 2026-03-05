import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

import { relations } from 'drizzle-orm'
import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

import { nanoid } from '../utils/id'
import { user } from './accounts'

/**
 * 渠道绑定表
 * 记录系统用户与外部渠道用户的映射关系，
 * 确保同一用户在不同渠道（飞书/Telegram/微信/Web）看到同一个角色状态。
 */
export const channelBindings = pgTable(
  'channel_bindings',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    /** 系统用户 ID */
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    /** 渠道标识：feishu / telegram / wechat / web */
    channel: text('channel').notNull(),
    /** 渠道方用户 ID（如飞书 open_id、Telegram chat_id 等） */
    externalId: text('external_id').notNull(),
    /** 可选额外信息（JSON 格式，如渠道昵称、头像等） */
    metadata: text('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    /** 同一渠道下，外部 ID 必须唯一（一个渠道用户只能绑定一个系统用户） */
    uniqueIndex('channel_bindings_channel_external_id_idx').on(table.channel, table.externalId),
  ],
)

export type ChannelBinding = InferSelectModel<typeof channelBindings>
export type NewChannelBinding = InferInsertModel<typeof channelBindings>

export const channelBindingRelations = relations(
  channelBindings,
  ({ one }) => ({
    user: one(user, {
      fields: [channelBindings.userId],
      references: [user.id],
    }),
  }),
)
