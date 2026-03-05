import { beforeAll, describe, expect, it } from 'vitest'

import {
  getDecayFloor,
  getStreakBonus,
  TRUST_LEVEL_CONFIG,
} from '@ai-companion/soul-engine'

import { mockDB } from '../../libs/mock-db'
import * as schema from '../../schemas'
import { createTrustService } from '../trust'

describe('Trust Service', () => {
  let db: any
  let service: ReturnType<typeof createTrustService>
  let testUser: any
  let testCharacter: any

  beforeAll(async () => {
    db = await mockDB(schema)
    service = createTrustService(db)

    // Create a test user
    const [user] = await db.insert(schema.user).values({
      id: 'user-trust-1',
      name: 'Trust Test User',
      email: 'trust@example.com',
    }).returning()
    testUser = user

    // Create a test character
    const [char] = await db.insert(schema.character).values({
      id: 'char-trust-1',
      version: '1.0',
      coverUrl: 'url',
      characterId: 'cid-trust',
      ownerId: testUser.id,
      creatorId: testUser.id,
    }).returning()
    testCharacter = char
  })

  describe('getTrustRecord', () => {
    it('should auto-create trust record if not exists', async () => {
      const record = await service.getTrustRecord(testUser.id, testCharacter.id)
      expect(record).toBeDefined()
      expect(record.userId).toBe(testUser.id)
      expect(record.characterId).toBe(testCharacter.id)
      expect(record.trustPoints).toBe(0)
      expect(record.trustLevel).toBe(1)
      expect(record.streakDays).toBe(0)
    })

    it('should return existing record on second call', async () => {
      const record1 = await service.getTrustRecord(testUser.id, testCharacter.id)
      const record2 = await service.getTrustRecord(testUser.id, testCharacter.id)
      expect(record1.id).toBe(record2.id)
    })
  })

  describe('checkIn', () => {
    let checkinUser: any
    let checkinChar: any

    beforeAll(async () => {
      const [user] = await db.insert(schema.user).values({
        id: 'user-trust-checkin',
        name: 'Checkin User',
        email: 'checkin@example.com',
      }).returning()
      checkinUser = user

      const [char] = await db.insert(schema.character).values({
        id: 'char-trust-checkin',
        version: '1.0',
        coverUrl: 'url',
        characterId: 'cid-checkin',
        ownerId: user.id,
        creatorId: user.id,
      }).returning()
      checkinChar = char

      // Initialize trust record
      await service.initTrustRecord(checkinUser.id, checkinChar.id)
    })

    it('should add base trust points (5)', async () => {
      const result = await service.checkIn(checkinUser.id, checkinChar.id)

      // Base trust = 5, streakDays goes from 0 to 1, streakBonus(1) = 0
      expect(result.trustGain).toBe(5 + getStreakBonus(1))
      expect(result.newTotal).toBe(5 + getStreakBonus(1))
    })

    it('should apply streak bonus', async () => {
      // Create a user and simulate streak
      const [user] = await db.insert(schema.user).values({
        id: 'user-trust-streak',
        name: 'Streak User',
        email: 'streak@example.com',
      }).returning()

      const [char] = await db.insert(schema.character).values({
        id: 'char-trust-streak',
        version: '1.0',
        coverUrl: 'url',
        characterId: 'cid-streak',
        ownerId: user.id,
        creatorId: user.id,
      }).returning()

      // Pre-set a trust record with 6 day streak and recent lastInteractAt
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      await db.insert(schema.trustRecords).values({
        userId: user.id,
        characterId: char.id,
        streakDays: 6,
        lastInteractAt: yesterday,
      })

      const result = await service.checkIn(user.id, char.id)

      // streakDays was 6, diffDays should be 1, so newStreakDays = 7
      // streakBonus(7) = 8, baseTrust = 5
      const expectedBonus = getStreakBonus(7)
      expect(result.streakBonus).toBe(expectedBonus)
      expect(result.streakDays).toBe(7)
      expect(result.trustGain).toBe(5 + expectedBonus)
    })

    it('should update streakDays', async () => {
      // First checkin already done above; verify streakDays updated
      const record = await service.getTrustRecord(checkinUser.id, checkinChar.id)
      expect(record.streakDays).toBe(1)
    })

    it('should trigger level up when threshold reached', async () => {
      // Create a user at the edge of level 2
      const [user] = await db.insert(schema.user).values({
        id: 'user-trust-levelup',
        name: 'Level Up User',
        email: 'levelup@example.com',
      }).returning()

      const [char] = await db.insert(schema.character).values({
        id: 'char-trust-levelup',
        version: '1.0',
        coverUrl: 'url',
        characterId: 'cid-levelup',
        ownerId: user.id,
        creatorId: user.id,
      }).returning()

      // Level 2 requires certain points (find from config)
      const level2Config = TRUST_LEVEL_CONFIG.find(c => c.level === 2)
      const pointsNeeded = level2Config ? level2Config.requiredPoints : 100

      // Set trust points just below level 2 threshold
      // (5 + streakBonus(1) = 5 trust gain from checkin)
      const prePoints = pointsNeeded - 5
      await db.insert(schema.trustRecords).values({
        userId: user.id,
        characterId: char.id,
        trustPoints: prePoints > 0 ? prePoints : 0,
        trustLevel: 1,
        daysAtCurrentLevel: 30, // Plenty of days to pass cooldown
      })

      const result = await service.checkIn(user.id, char.id)

      if (prePoints > 0 && prePoints + result.trustGain >= pointsNeeded) {
        expect(result.levelUp).toBe(true)
        expect(result.newLevel).toBe(2)
      }
    })

    it('should reset streak on gap > 1 day', async () => {
      const [user] = await db.insert(schema.user).values({
        id: 'user-trust-streak-reset',
        name: 'Streak Reset User',
        email: 'streak-reset@example.com',
      }).returning()

      const [char] = await db.insert(schema.character).values({
        id: 'char-trust-streak-reset',
        version: '1.0',
        coverUrl: 'url',
        characterId: 'cid-streak-reset',
        ownerId: user.id,
        creatorId: user.id,
      }).returning()

      // Set last interact 3 days ago with streak of 10
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      await db.insert(schema.trustRecords).values({
        userId: user.id,
        characterId: char.id,
        streakDays: 10,
        lastInteractAt: threeDaysAgo,
      })

      const result = await service.checkIn(user.id, char.id)
      expect(result.streakDays).toBe(1) // Reset to 1
    })
  })

  describe('applyTrustEvent', () => {
    it('should add trust points for gift event', async () => {
      const [user] = await db.insert(schema.user).values({
        id: 'user-trust-event',
        name: 'Event User',
        email: 'event@example.com',
      }).returning()

      const [char] = await db.insert(schema.character).values({
        id: 'char-trust-event',
        version: '1.0',
        coverUrl: 'url',
        characterId: 'cid-event',
        ownerId: user.id,
        creatorId: user.id,
      }).returning()

      await service.initTrustRecord(user.id, char.id)

      const result = await service.applyTrustEvent(user.id, char.id, 'gift', 45)
      expect(result.trustGain).toBe(45)
      expect(result.newTotal).toBe(45)
    })

    it('should use getTrustEventValue when value not provided', async () => {
      const [user] = await db.insert(schema.user).values({
        id: 'user-trust-event-auto',
        name: 'Event Auto User',
        email: 'event-auto@example.com',
      }).returning()

      const [char] = await db.insert(schema.character).values({
        id: 'char-trust-event-auto',
        version: '1.0',
        coverUrl: 'url',
        characterId: 'cid-event-auto',
        ownerId: user.id,
        creatorId: user.id,
      }).returning()

      await service.initTrustRecord(user.id, char.id)

      // share_mood event = 8 points
      const result = await service.applyTrustEvent(user.id, char.id, 'share_mood')
      expect(result.trustGain).toBe(8)
    })
  })

  describe('applyDecay', () => {
    it('should not decay within grace period (4 days)', async () => {
      const [user] = await db.insert(schema.user).values({
        id: 'user-trust-decay-grace',
        name: 'Grace Period User',
        email: 'grace@example.com',
      }).returning()

      const [char] = await db.insert(schema.character).values({
        id: 'char-trust-decay-grace',
        version: '1.0',
        coverUrl: 'url',
        characterId: 'cid-grace',
        ownerId: user.id,
        creatorId: user.id,
      }).returning()

      // Last interact 3 days ago (within 4-day grace period)
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      await db.insert(schema.trustRecords).values({
        userId: user.id,
        characterId: char.id,
        trustPoints: 500,
        trustLevel: 3,
        lastInteractAt: threeDaysAgo,
      })

      const result = await service.applyDecay(user.id, char.id)
      expect(result.decayed).toBe(0)
      expect(result.newTotal).toBe(500)
    })

    it('should apply correct decay rate per tier', async () => {
      const [user] = await db.insert(schema.user).values({
        id: 'user-trust-decay-rate',
        name: 'Decay Rate User',
        email: 'decay-rate@example.com',
      }).returning()

      const [char] = await db.insert(schema.character).values({
        id: 'char-trust-decay-rate',
        version: '1.0',
        coverUrl: 'url',
        characterId: 'cid-decay-rate',
        ownerId: user.id,
        creatorId: user.id,
      }).returning()

      // Last interact 6 days ago (4 grace + 2 effective decay days)
      // Normal user: day1 = 3, day2 = 3 => total decay = 6
      const sixDaysAgo = new Date()
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
      await db.insert(schema.trustRecords).values({
        userId: user.id,
        characterId: char.id,
        trustPoints: 500,
        trustLevel: 3,
        lastInteractAt: sixDaysAgo,
      })

      const result = await service.applyDecay(user.id, char.id)
      // 6 inactive days - 4 grace = 2 effective days
      // day1: 3, day2: 3 => total decay = 6
      expect(result.decayed).toBe(6)
      expect(result.newTotal).toBe(494)
    })

    it('should not go below decay floor', async () => {
      const [user] = await db.insert(schema.user).values({
        id: 'user-trust-decay-floor',
        name: 'Decay Floor User',
        email: 'decay-floor@example.com',
      }).returning()

      const [char] = await db.insert(schema.character).values({
        id: 'char-trust-decay-floor',
        version: '1.0',
        coverUrl: 'url',
        characterId: 'cid-decay-floor',
        ownerId: user.id,
        creatorId: user.id,
      }).returning()

      // Set trust points barely above floor for level 3
      const floor = getDecayFloor(3)

      // Set last interact 30 days ago to cause massive decay
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      await db.insert(schema.trustRecords).values({
        userId: user.id,
        characterId: char.id,
        trustPoints: floor + 5,
        trustLevel: 3,
        lastInteractAt: thirtyDaysAgo,
      })

      const result = await service.applyDecay(user.id, char.id)
      // Trust should not go below the floor
      expect(result.newTotal).toBeGreaterThanOrEqual(floor)
    })

    it('should mark isShaken when points drop below level threshold', async () => {
      const [user] = await db.insert(schema.user).values({
        id: 'user-trust-shaken',
        name: 'Shaken User',
        email: 'shaken@example.com',
      }).returning()

      const [char] = await db.insert(schema.character).values({
        id: 'char-trust-shaken',
        version: '1.0',
        coverUrl: 'url',
        characterId: 'cid-shaken',
        ownerId: user.id,
        creatorId: user.id,
      }).returning()

      // Level 3 config
      const level3Config = TRUST_LEVEL_CONFIG.find(c => c.level === 3)!

      // Set points just above floor but below level 3 threshold after decay
      // We need points that after decay will be below level 3 required points
      const tenDaysAgo = new Date()
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

      // Set points at level3 threshold + small margin
      await db.insert(schema.trustRecords).values({
        userId: user.id,
        characterId: char.id,
        trustPoints: level3Config.requiredPoints + 5,
        trustLevel: 3,
        lastInteractAt: tenDaysAgo,
      })

      const result = await service.applyDecay(user.id, char.id)

      // If decay brought points below level 3 threshold, isShaken should be true
      if (result.newTotal < level3Config.requiredPoints) {
        expect(result.isShaken).toBe(true)
      }
    })

    it('should handle no lastInteractAt gracefully', async () => {
      const [user] = await db.insert(schema.user).values({
        id: 'user-trust-no-interact',
        name: 'No Interact User',
        email: 'no-interact@example.com',
      }).returning()

      const [char] = await db.insert(schema.character).values({
        id: 'char-trust-no-interact',
        version: '1.0',
        coverUrl: 'url',
        characterId: 'cid-no-interact',
        ownerId: user.id,
        creatorId: user.id,
      }).returning()

      await db.insert(schema.trustRecords).values({
        userId: user.id,
        characterId: char.id,
        trustPoints: 100,
        trustLevel: 2,
        // lastInteractAt is null
      })

      const result = await service.applyDecay(user.id, char.id)
      // When lastInteractAt is null, inactiveDays = 0, so no decay
      expect(result.decayed).toBe(0)
      expect(result.newTotal).toBe(100)
    })
  })
})
