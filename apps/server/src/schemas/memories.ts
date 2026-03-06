import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { nanoid } from '../utils/id'

export const memories = pgTable(
  'memories',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    userId: text('user_id').notNull(),
    characterId: text('character_id').notNull(),
    content: text('content').notNull(),
    type: text('type').notNull(), // preference, habit, event, emotion, date
    importance: integer('importance').default(3).notNull(),
    level: integer('level').default(3).notNull(), // 2=短期, 3=长期
    tags: text('tags').array(), // 标签数组
    // 向量嵌入列（预留，需 pgvector 扩展）
    // 启用步骤:
    //   1. CREATE EXTENSION IF NOT EXISTS vector;
    //   2. 取消下行注释
    //   3. 生成迁移: pnpm drizzle-kit generate
    //   4. 在 memory.ts searchMemories 中添加余弦相似度检索
    // embedding: vector('embedding', { dimensions: 1536 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }), // Level 2: 7天过期
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    index('memories_user_char_idx').on(table.userId, table.characterId),
    index('memories_type_idx').on(table.type),
  ],
)

export type Memory = InferSelectModel<typeof memories>
export type NewMemory = InferInsertModel<typeof memories>
