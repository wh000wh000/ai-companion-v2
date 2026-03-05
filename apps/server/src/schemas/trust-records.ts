import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

import { relations } from 'drizzle-orm'
import { boolean, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

import { nanoid } from '../utils/id'
import { user } from './accounts'
import { character } from './characters'

export const trustRecords = pgTable(
  'trust_records',
  {
    id: text('id').primaryKey().$defaultFn(() => nanoid()),
    characterId: text('character_id').notNull().references(() => character.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    trustPoints: integer('trust_points').default(0).notNull(),
    trustLevel: integer('trust_level').default(1).notNull(),
    streakDays: integer('streak_days').default(0).notNull(),
    lastInteractAt: timestamp('last_interact_at'),
    daysAtCurrentLevel: integer('days_at_current_level').default(0).notNull(),
    isShaken: boolean('is_shaken').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    uniqueIndex('trust_records_character_user_idx').on(table.characterId, table.userId),
  ],
)

export type TrustRecord = InferSelectModel<typeof trustRecords>
export type NewTrustRecord = InferInsertModel<typeof trustRecords>

export const trustRecordRelations = relations(
  trustRecords,
  ({ one }) => ({
    user: one(user, {
      fields: [trustRecords.userId],
      references: [user.id],
    }),
    character: one(character, {
      fields: [trustRecords.characterId],
      references: [character.id],
    }),
  }),
)
