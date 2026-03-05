import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

import { relations } from 'drizzle-orm'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { nanoid } from '../utils/id'
import { user } from './accounts'
import { character } from './characters'

export const surprises = pgTable(
  'surprises',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    characterId: text('character_id').notNull().references(() => character.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    productName: text('product_name'),
    productUrl: text('product_url'),
    amount: integer('amount').default(0).notNull(),
    status: text('status').default('pending').notNull(),
    message: text('message'),
    feedback: text('feedback'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
)

export type Surprise = InferSelectModel<typeof surprises>
export type NewSurprise = InferInsertModel<typeof surprises>

export const surpriseRelations = relations(
  surprises,
  ({ one }) => ({
    user: one(user, {
      fields: [surprises.userId],
      references: [user.id],
    }),
    character: one(character, {
      fields: [surprises.characterId],
      references: [character.id],
    }),
  }),
)
