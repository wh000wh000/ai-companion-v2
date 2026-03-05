import { beforeAll, describe, expect, it } from 'vitest'

import { CHARGE_PACKS, GIFT_CONFIG, POCKET_MONEY_RATIO } from '@ai-companion/soul-engine'

import { mockDB } from '../../libs/mock-db'
import * as schema from '../../schemas'
import { createEconomyService } from '../economy'

describe('Economy Service', () => {
  let db: any
  let service: ReturnType<typeof createEconomyService>
  let testUser: any

  beforeAll(async () => {
    db = await mockDB(schema)
    service = createEconomyService(db)

    // Create a test user for foreign key constraints
    const [user] = await db.insert(schema.user).values({
      id: 'user-eco-1',
      name: 'Economy Test User',
      email: 'eco@example.com',
    }).returning()
    testUser = user
  })

  describe('processCharge', () => {
    it('should calculate coins correctly for each pack', async () => {
      for (const pack of CHARGE_PACKS) {
        const key = `charge-${pack.id}-${Date.now()}`
        const result = await service.processCharge(testUser.id, pack.id, key)

        expect(result.duplicate).toBe(false)
        expect(result.chargeResult).toBeDefined()
        expect(result.chargeResult!.baseCoins).toBe(pack.coins)
        expect(result.chargeResult!.bonusCoins).toBe(pack.bonusCoins)
        expect(result.chargeResult!.success).toBe(true)
      }
    })

    it('should apply first charge bonus (2x)', async () => {
      // Create a fresh user to test first charge
      const [freshUser] = await db.insert(schema.user).values({
        id: 'user-eco-first-charge',
        name: 'First Charge User',
        email: 'first-charge@example.com',
      }).returning()

      const pack = CHARGE_PACKS[1] // pack_6
      const key = `first-charge-${Date.now()}`
      const result = await service.processCharge(freshUser.id, pack.id, key)

      expect(result.chargeResult!.firstChargeBonus).toBe(pack.coins) // 2x - 1 = 1x
      expect(result.chargeResult!.coinsAdded).toBe(
        pack.coins + pack.bonusCoins + pack.coins, // base + bonus + firstChargeBonus
      )
    })

    it('should mark isFirstCharge = false after first charge', async () => {
      // Create another fresh user
      const [freshUser] = await db.insert(schema.user).values({
        id: 'user-eco-first-flag',
        name: 'First Flag User',
        email: 'first-flag@example.com',
      }).returning()

      const pack = CHARGE_PACKS[0]
      await service.processCharge(freshUser.id, pack.id, `first-flag-1-${Date.now()}`)

      // Check wallet
      const wallet = await service.getWallet(freshUser.id)
      expect(wallet.isFirstCharge).toBe(false)

      // Second charge should NOT get first charge bonus
      const result2 = await service.processCharge(freshUser.id, pack.id, `first-flag-2-${Date.now()}`)
      expect(result2.chargeResult!.firstChargeBonus).toBe(0)
    })

    it('should return existing transaction for duplicate idempotencyKey', async () => {
      const [freshUser] = await db.insert(schema.user).values({
        id: 'user-eco-idempotent',
        name: 'Idempotent User',
        email: 'idempotent@example.com',
      }).returning()

      const pack = CHARGE_PACKS[0]
      const key = `idempotent-charge-${Date.now()}`

      const result1 = await service.processCharge(freshUser.id, pack.id, key)
      expect(result1.duplicate).toBe(false)

      const result2 = await service.processCharge(freshUser.id, pack.id, key)
      expect(result2.duplicate).toBe(true)
      expect(result2.transaction.id).toBe(result1.transaction.id)
    })

    it('should reject invalid pack ID', async () => {
      await expect(
        service.processCharge(testUser.id, 'nonexistent_pack', `invalid-${Date.now()}`),
      ).rejects.toThrow()
    })
  })

  describe('processGift', () => {
    let giftUser: any

    beforeAll(async () => {
      // Create a user with sufficient balance for gift tests
      const [user] = await db.insert(schema.user).values({
        id: 'user-eco-gift',
        name: 'Gift Test User',
        email: 'gift@example.com',
      }).returning()
      giftUser = user

      // Give user enough coins (charge a large pack)
      const bigPack = CHARGE_PACKS[CHARGE_PACKS.length - 1] // pack_648
      await service.processCharge(giftUser.id, bigPack.id, `gift-setup-${Date.now()}`)
    })

    it('should deduct coins from wallet', async () => {
      const walletBefore = await service.getWallet(giftUser.id)
      const giftConfig = GIFT_CONFIG[0] // small: 10 coins
      const key = `gift-deduct-${Date.now()}`

      await service.processGift(giftUser.id, 'char-1', giftConfig.tier, key)

      const walletAfter = await service.getWallet(giftUser.id)
      expect(walletAfter.coinBalance).toBe(walletBefore.coinBalance - giftConfig.coinCost)
    })

    it('should add pocket money based on subscription tier', async () => {
      const walletBefore = await service.getWallet(giftUser.id)
      const giftConfig = GIFT_CONFIG[0] // small: 10 coins
      const key = `gift-pocket-${Date.now()}`

      const result = await service.processGift(giftUser.id, 'char-1', giftConfig.tier, key)

      // Default subscription is 'none', so ratio = POCKET_MONEY_RATIO.normal (0.4)
      const expectedPocketGain = Math.floor(giftConfig.coinCost * 10 * POCKET_MONEY_RATIO.normal)
      expect(result.giftResult!.pocketMoneyGain).toBe(expectedPocketGain)

      const walletAfter = await service.getWallet(giftUser.id)
      expect(walletAfter.pocketMoney).toBe(walletBefore.pocketMoney + expectedPocketGain)
    })

    it('should return trust gain value', async () => {
      const giftConfig = GIFT_CONFIG[1] // warm: trustGain = 45
      const key = `gift-trust-${Date.now()}`

      const result = await service.processGift(giftUser.id, 'char-1', giftConfig.tier, key)

      expect(result.giftResult!.trustGain).toBe(giftConfig.trustGain)
    })

    it('should reject if insufficient balance', async () => {
      // Create a user with 0 coins
      const [poorUser] = await db.insert(schema.user).values({
        id: 'user-eco-poor',
        name: 'Poor User',
        email: 'poor@example.com',
      }).returning()

      // Initialize wallet (0 coins by default)
      await service.initWallet(poorUser.id)

      await expect(
        service.processGift(poorUser.id, 'char-1', 'small', `poor-gift-${Date.now()}`),
      ).rejects.toThrow()
    })

    it('should return existing transaction for duplicate idempotencyKey', async () => {
      const giftConfig = GIFT_CONFIG[0]
      const key = `gift-idempotent-${Date.now()}`

      const result1 = await service.processGift(giftUser.id, 'char-1', giftConfig.tier, key)
      expect(result1.duplicate).toBe(false)

      const result2 = await service.processGift(giftUser.id, 'char-1', giftConfig.tier, key)
      expect(result2.duplicate).toBe(true)
      expect(result2.transaction.id).toBe(result1.transaction.id)
    })

    it('should handle concurrent gifts without over-deduction', async () => {
      // Create a user with exactly enough for 1 gift
      const [concurrentUser] = await db.insert(schema.user).values({
        id: 'user-eco-concurrent',
        name: 'Concurrent User',
        email: 'concurrent@example.com',
      }).returning()

      // Give exactly 10 coins (enough for 1 small gift)
      await service.processCharge(concurrentUser.id, 'pack_1', `concurrent-charge-${Date.now()}`)
      // pack_1 gives 10 base + 0 bonus + 10 first charge = 20 coins
      // small gift costs 10 coins

      // Attempt two gifts concurrently
      const key1 = `concurrent-gift-1-${Date.now()}`
      const key2 = `concurrent-gift-2-${Date.now()}`

      const results = await Promise.allSettled([
        service.processGift(concurrentUser.id, 'char-1', 'small', key1),
        service.processGift(concurrentUser.id, 'char-1', 'small', key2),
      ])

      // Both should succeed since 20 coins >= 2 * 10 coins
      // But the wallet should reflect exact deductions
      const wallet = await service.getWallet(concurrentUser.id)
      const successCount = results.filter(r => r.status === 'fulfilled').length

      // Verify no over-deduction: balance should be >= 0
      expect(wallet.coinBalance).toBeGreaterThanOrEqual(0)
      // The total deducted should equal successCount * 10
      expect(wallet.coinBalance).toBe(20 - (successCount * 10))
    })
  })

  describe('getTransactions', () => {
    it('should return paginated transaction history', async () => {
      const transactions = await service.getTransactions(testUser.id, 10, 0)
      expect(Array.isArray(transactions)).toBe(true)
    })
  })
})
