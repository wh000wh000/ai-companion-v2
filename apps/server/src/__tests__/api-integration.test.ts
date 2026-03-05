import type { HonoEnv } from '../types/hono'

import { Hono } from 'hono'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { CHARGE_PACKS, GIFT_CONFIG } from '@ai-companion/soul-engine'

import { mockDB } from '../libs/mock-db'
import * as schema from '../schemas'
import { createEconomyService } from '../services/economy'
import { createSurpriseService } from '../services/surprises'
import { createTrustService } from '../services/trust'
import { ApiError } from '../utils/error'
import { resetRateLimitStore } from '../middlewares/rate-limit'
import { createSurpriseRoutes } from '../routes/surprises'
import { createTrustRoutes } from '../routes/trust'
import { createWalletRoutes } from '../routes/wallet'

/**
 * API 路由集成测试
 *
 * 通过 Hono 的 app.request / app.fetch 进行路由级集成测试，
 * 验证请求/响应格式、Schema 校验、错误处理等。
 */

/** 创建测试 Hono 应用（跳过真实 auth，使用注入用户） */
function createTestApp(
  walletRoutes: ReturnType<typeof createWalletRoutes>,
  trustRoutes: ReturnType<typeof createTrustRoutes>,
  surpriseRoutes: ReturnType<typeof createSurpriseRoutes>,
) {
  const app = new Hono<HonoEnv>()

  // 错误处理
  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json({
        error: err.errorCode,
        message: err.message,
        details: err.details,
      }, err.statusCode)
    }
    return c.json({ error: 'Internal Server Error', message: err.message }, 500)
  })

  // 注入用户中间件（从 env 读取）
  app.use('*', async (c, next) => {
    const user = (c.env as any)?.user
    if (user) {
      c.set('user', user)
    }
    await next()
  })

  app.route('/api/wallet', walletRoutes)
  app.route('/api/trust', trustRoutes)
  app.route('/api/surprises', surpriseRoutes)

  return app
}

describe('API 路由集成', () => {
  let db: any
  let app: ReturnType<typeof createTestApp>
  let testUser: any
  let testCharacter: any

  beforeEach(() => {
    resetRateLimitStore()
  })

  beforeAll(async () => {
    db = await mockDB(schema)

    const economyService = createEconomyService(db)
    const trustService = createTrustService(db)
    const surpriseService = createSurpriseService(db)

    const walletRoutes = createWalletRoutes(economyService, trustService)
    const trustRoutes = createTrustRoutes(trustService)
    const surpriseRoutes = createSurpriseRoutes(surpriseService)

    app = createTestApp(walletRoutes, trustRoutes, surpriseRoutes)

    // 创建测试用户
    const [user] = await db.insert(schema.user).values({
      id: 'api-test-user-1',
      name: 'API Test User',
      email: 'api-test@example.com',
    }).returning()
    testUser = user

    // 创建测试角色（供 trust/surprise 路由使用）
    const [char] = await db.insert(schema.character).values({
      id: 'api-test-char-1',
      version: '1',
      coverUrl: 'url',
      creatorId: testUser.id,
      ownerId: testUser.id,
      characterId: 'cid-1',
    }).returning()
    testCharacter = char
  })

  // ───────────────────────────────────────────────────────
  // Wallet Routes
  // ───────────────────────────────────────────────────────
  describe('wallet routes', () => {
    it('GET /api/wallet 未认证时返回401', async () => {
      const res = await app.request('/api/wallet')
      expect(res.status).toBe(401)
    })

    it('GET /api/wallet 返回钱包结构', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/wallet'),
        { user: testUser } as any,
      )

      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data).toHaveProperty('coinBalance')
      expect(data).toHaveProperty('pocketMoney')
      expect(data).toHaveProperty('isFirstCharge')
      expect(data).toHaveProperty('subscriptionTier')
      expect(data).toHaveProperty('totalCharged')
      expect(data).toHaveProperty('totalGifted')
      expect(data).toHaveProperty('costumeTickets')
    })

    it('POST /api/wallet/charge 接受 ChargeSchema', async () => {
      const pack = CHARGE_PACKS[0] // pack_1
      const res = await app.fetch(
        new Request('http://localhost/api/wallet/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packId: pack.id,
            idempotencyKey: `api-test-charge-${Date.now()}`,
          }),
        }),
        { user: testUser } as any,
      )

      expect(res.status).toBe(201)
      const data: any = await res.json()
      expect(data).toHaveProperty('chargeResult')
      expect(data).toHaveProperty('duplicate')
      expect(data.duplicate).toBe(false)
      expect(data.chargeResult.success).toBe(true)
      expect(data.chargeResult.baseCoins).toBe(pack.coins)
    })

    it('POST /api/wallet/charge 拒绝无效 packId', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/wallet/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packId: 'invalid_pack',
            idempotencyKey: `api-test-invalid-${Date.now()}`,
          }),
        }),
        { user: testUser } as any,
      )

      expect(res.status).toBe(400)
    })

    it('POST /api/wallet/charge 幂等性', async () => {
      // 创建一个新用户来避免影响
      const [freshUser] = await db.insert(schema.user).values({
        id: 'api-idempotent-user',
        name: 'Idempotent User',
        email: 'idempotent-api@example.com',
      }).returning()

      const key = `api-idempotent-${Date.now()}`
      const pack = CHARGE_PACKS[1]

      const res1 = await app.fetch(
        new Request('http://localhost/api/wallet/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packId: pack.id, idempotencyKey: key }),
        }),
        { user: freshUser } as any,
      )
      expect(res1.status).toBe(201)
      const data1: any = await res1.json()
      expect(data1.duplicate).toBe(false)

      const res2 = await app.fetch(
        new Request('http://localhost/api/wallet/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packId: pack.id, idempotencyKey: key }),
        }),
        { user: freshUser } as any,
      )
      expect(res2.status).toBe(200)
      const data2: any = await res2.json()
      expect(data2.duplicate).toBe(true)
      expect(data2.transaction.id).toBe(data1.transaction.id)
    })

    it('POST /api/wallet/charge 缺少必填字段返回400', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/wallet/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packId: 'pack_1' }), // 缺少 idempotencyKey
        }),
        { user: testUser } as any,
      )
      expect(res.status).toBe(400)
    })

    it('POST /api/wallet/gift 接受 GiftSchema', async () => {
      // 先确保有足够余额（前面已充值了 pack_1）
      const gift = GIFT_CONFIG[0] // small: 10 coins
      const res = await app.fetch(
        new Request('http://localhost/api/wallet/gift', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: testCharacter.id,
            giftTier: gift.tier,
            idempotencyKey: `api-test-gift-${Date.now()}`,
          }),
        }),
        { user: testUser } as any,
      )

      expect(res.status).toBe(201)
      const data: any = await res.json()
      expect(data).toHaveProperty('giftResult')
      expect(data.duplicate).toBe(false)
    })

    it('POST /api/wallet/gift 余额不足时返回400', async () => {
      // 创建一个没有余额的新用户
      const [poorUser] = await db.insert(schema.user).values({
        id: 'api-poor-user',
        name: 'Poor User',
        email: 'poor-api@example.com',
      }).returning()

      const res = await app.fetch(
        new Request('http://localhost/api/wallet/gift', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: testCharacter.id,
            giftTier: 'forever', // 520 coins, far exceeds 0 balance
            idempotencyKey: `api-poor-gift-${Date.now()}`,
          }),
        }),
        { user: poorUser } as any,
      )

      expect(res.status).toBe(400)
    })

    it('GET /api/wallet/history 返回交易列表', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/wallet/history?limit=10&offset=0'),
        { user: testUser } as any,
      )

      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('GET /api/wallet/history 支持分页参数', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/wallet/history?limit=1&offset=0'),
        { user: testUser } as any,
      )

      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.length).toBeLessThanOrEqual(1)
    })
  })

  // ───────────────────────────────────────────────────────
  // Trust Routes
  // ───────────────────────────────────────────────────────
  describe('trust routes', () => {
    it('GET /api/trust/:characterId 未认证返回401', async () => {
      const res = await app.request(`/api/trust/${testCharacter.id}`)
      expect(res.status).toBe(401)
    })

    it('GET /api/trust/:characterId 返回信赖记录', async () => {
      // 先初始化信赖记录
      const trustService = createTrustService(db)
      await trustService.initTrustRecord(testUser.id, testCharacter.id)

      const res = await app.fetch(
        new Request(`http://localhost/api/trust/${testCharacter.id}`),
        { user: testUser } as any,
      )

      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data).toHaveProperty('trustPoints')
      expect(data).toHaveProperty('trustLevel')
      expect(data).toHaveProperty('streakDays')
      expect(data.trustLevel).toBe(1)
    })

    it('POST /api/trust/checkin 接受 CheckinSchema', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/trust/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: testCharacter.id,
          }),
        }),
        { user: testUser } as any,
      )

      expect(res.status).toBe(201)
      const data: any = await res.json()
      expect(data).toHaveProperty('trustGain')
      expect(data).toHaveProperty('newTotal')
      expect(data).toHaveProperty('newLevel')
      expect(data).toHaveProperty('streakDays')
      expect(data.trustGain).toBeGreaterThan(0)
    })

    it('POST /api/trust/checkin 缺少 characterId 返回400', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/trust/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}), // 缺少 characterId
        }),
        { user: testUser } as any,
      )

      expect(res.status).toBe(400)
    })

    it('POST /api/trust/update 接受 TrustUpdateSchema', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/trust/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: testCharacter.id,
            event: 'chat',
          }),
        }),
        { user: testUser } as any,
      )

      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data).toHaveProperty('trustGain')
      expect(data).toHaveProperty('newTotal')
    })
  })

  // ───────────────────────────────────────────────────────
  // Surprises Routes
  // ───────────────────────────────────────────────────────
  describe('surprises routes', () => {
    it('GET /api/surprises 未认证返回401', async () => {
      const res = await app.request('/api/surprises')
      expect(res.status).toBe(401)
    })

    it('GET /api/surprises 支持分页', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/surprises?limit=5&offset=0'),
        { user: testUser } as any,
      )

      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('POST /api/surprises/check 返回触发结果', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/surprises/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: testCharacter.id,
          }),
        }),
        { user: testUser } as any,
      )

      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data).toHaveProperty('shouldTrigger')
      expect(data).toHaveProperty('availableTypes')
      expect(data).toHaveProperty('bestType')
      expect(data).toHaveProperty('reasons')
      expect(typeof data.shouldTrigger).toBe('boolean')
      expect(Array.isArray(data.availableTypes)).toBe(true)
      expect(Array.isArray(data.reasons)).toBe(true)
    })

    it('POST /api/surprises/check 缺少 characterId 返回400', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/surprises/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
        { user: testUser } as any,
      )

      expect(res.status).toBe(400)
    })

    it('POST /api/surprises/check Lv1用户不应触发惊喜', async () => {
      // 新用户 Lv1，不应触发任何惊喜（最低需Lv5）
      const [newUser] = await db.insert(schema.user).values({
        id: 'api-surprise-lv1',
        name: 'Low Level User',
        email: 'lv1@example.com',
      }).returning()

      // 初始化信赖和钱包
      const trustService = createTrustService(db)
      await trustService.initTrustRecord(newUser.id, testCharacter.id)
      const economyService = createEconomyService(db)
      await economyService.initWallet(newUser.id)

      const res = await app.fetch(
        new Request('http://localhost/api/surprises/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId: testCharacter.id }),
        }),
        { user: newUser } as any,
      )

      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.shouldTrigger).toBe(false)
    })

    it('PATCH /api/surprises/:id/status 不存在的惊喜返回404', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/surprises/non-existent/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'clicked' }),
        }),
        { user: testUser } as any,
      )

      expect(res.status).toBe(404)
    })
  })
})
