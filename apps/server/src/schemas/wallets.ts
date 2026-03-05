import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

import { relations } from 'drizzle-orm'
import { boolean, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

import { nanoid } from '../utils/id'
import { user } from './accounts'

export const wallets = pgTable(
  'wallets',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    coinBalance: integer('coin_balance').default(0).notNull(),
    pocketMoney: integer('pocket_money').default(0).notNull(),
    isFirstCharge: boolean('is_first_charge').default(true).notNull(),
    subscriptionTier: text('subscription_tier').default('none').notNull(),
    totalCharged: integer('total_charged').default(0).notNull(),
    totalGifted: integer('total_gifted').default(0).notNull(),
    costumeTickets: integer('costume_tickets').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    uniqueIndex('wallets_user_id_idx').on(table.userId),
  ],
)

export type Wallet = InferSelectModel<typeof wallets>
export type NewWallet = InferInsertModel<typeof wallets>

export const walletRelations = relations(
  wallets,
  ({ one }) => ({
    owner: one(user, {
      fields: [wallets.userId],
      references: [user.id],
    }),
  }),
)
