import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

import { relations } from 'drizzle-orm'
import { integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

import { nanoid } from '../utils/id'
import { user } from './accounts'

export const transactions = pgTable(
  'transactions',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    amount: integer('amount').notNull(),
    coins: integer('coins').notNull(),
    pocketGain: integer('pocket_gain').default(0).notNull(),
    trustGain: integer('trust_gain').default(0).notNull(),
    description: text('description'),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('transactions_idempotency_key_idx').on(table.idempotencyKey),
  ],
)

export type Transaction = InferSelectModel<typeof transactions>
export type NewTransaction = InferInsertModel<typeof transactions>

export const transactionRelations = relations(
  transactions,
  ({ one }) => ({
    user: one(user, {
      fields: [transactions.userId],
      references: [user.id],
    }),
  }),
)
