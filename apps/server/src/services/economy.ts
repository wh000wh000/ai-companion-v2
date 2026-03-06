import type { GiftTier } from '@ai-companion/soul-engine'

import type { Database } from '../libs/db'

import {
  processCharge as calcCharge,
  processGift as calcGift,
  checkSpendingLimit,
  coinsToYuan,
  getChargePack,
  GIFT_CONFIG,
} from '@ai-companion/soul-engine'
import { useLogger } from '@guiiai/logg'
import { and, desc, eq, gte, sql } from 'drizzle-orm'

import { createBadRequestError, createConflictError, createNotFoundError } from '../utils/error'

import * as schema from '../schemas'

/** 经济服务可选配置 */
interface EconomyServiceOptions {
  /** 是否由 OpenClaw Agent 驱动决策（日志标记用） */
  openclawMode?: boolean
}

export function createEconomyService(db: Database, options?: EconomyServiceOptions) {
  const openclawMode = options?.openclawMode ?? false
  const logger = useLogger('economy-service').useGlobalConfig()
  return {
    /**
     * 查询钱包（不存在则自动创建）
     */
    async getWallet(userId: string) {
      const existing = await db.query.wallets.findFirst({
        where: eq(schema.wallets.userId, userId),
      })

      if (existing)
        return existing

      return await this.initWallet(userId)
    },

    /**
     * 初始化钱包（注册时调用）
     */
    async initWallet(userId: string) {
      // Demo赠送：新用户默认赠送1000元等值爱心币（10000币）
      const WELCOME_BONUS_COINS = 10000
      const [wallet] = await db.insert(schema.wallets)
        .values({ userId, coinBalance: WELCOME_BONUS_COINS })
        .onConflictDoNothing()
        .returning()

      if (!wallet) {
        const existing = await db.query.wallets.findFirst({
          where: eq(schema.wallets.userId, userId),
        })
        if (!existing)
          throw createConflictError('Failed to initialize wallet')
        return existing
      }

      return wallet
    },

    /**
     * 充值处理：
     * 1. 检查 idempotencyKey 是否重复
     * 2. 调用 soul-engine processCharge 计算 coins + bonus
     * 3. 事务：插入 transaction + 更新 wallet
     * 4. 返回 ChargeResult
     */
    async processCharge(userId: string, packId: string, idempotencyKey: string) {
      // 1. 验证套餐存在（无需事务）
      const pack = getChargePack(packId)
      if (!pack)
        throw createBadRequestError('Invalid pack ID', 'INVALID_PACK')

      // 2. 确保钱包存在
      await this.getWallet(userId)

      // 3. 事务内：幂等检查 + 行锁 + 计算 + 写入（防止并发首充双倍和幂等竞态）
      const result = await db.transaction(async (tx) => {
        // 3a. 事务内幂等性检查（消除 TOCTOU 竞态）
        const existingTx = await tx.query.transactions.findFirst({
          where: eq(schema.transactions.idempotencyKey, idempotencyKey),
        })
        if (existingTx) {
          if (existingTx.userId !== userId)
            throw createBadRequestError('Idempotency key already used', 'IDEMPOTENCY_CONFLICT')
          return { transaction: existingTx, chargeResult: null, duplicate: true }
        }

        // 3b. 行锁钱包（防止并发首充双倍）
        const [lockedWallet] = await tx
          .select()
          .from(schema.wallets)
          .where(eq(schema.wallets.userId, userId))
          .for('update')

        if (!lockedWallet)
          throw createNotFoundError('Wallet not found')

        // 3c. 使用锁定后的最新状态计算
        const chargeResult = calcCharge(packId, lockedWallet.coinBalance, lockedWallet.isFirstCharge)
        if (!chargeResult.success)
          throw createBadRequestError(chargeResult.error ?? 'Charge failed', 'CHARGE_FAILED')

        // 3d. 插入交易记录
        const [transaction] = await tx.insert(schema.transactions).values({
          userId,
          type: 'charge',
          amount: pack.price,
          coins: chargeResult.coinsAdded,
          pocketGain: 0,
          trustGain: 0,
          description: `充值 ${pack.name}`,
          idempotencyKey,
        }).returning()

        // 3e. 更新钱包
        await tx.update(schema.wallets)
          .set({
            coinBalance: sql`${schema.wallets.coinBalance} + ${chargeResult.coinsAdded}`,
            totalCharged: sql`${schema.wallets.totalCharged} + ${pack.price}`,
            isFirstCharge: false,
          })
          .where(eq(schema.wallets.userId, userId))

        return { transaction, chargeResult, duplicate: false }
      })

      return result
    },

    /**
     * 送礼处理：
     * 1. 检查 idempotencyKey 是否重复
     * 2. 事务内锁定钱包行并验证余额
     * 3. 调用 soul-engine processGift 计算分成
     * 4. 更新 wallet + 插入 transaction
     * 5. 返回 GiftSendResult
     */
    async processGift(userId: string, characterId: string, giftTier: string, idempotencyKey: string) {
      // OpenClaw Agent 驱动时记录日志
      if (openclawMode) {
        logger.log(`Gift [${giftTier}] triggered by OpenClaw Agent for user=${userId} character=${characterId}`)
      }

      // 1. 幂等性检查（全局唯一约束，但必须验证归属用户）
      const existingTx = await db.query.transactions.findFirst({
        where: eq(schema.transactions.idempotencyKey, idempotencyKey),
      })
      if (existingTx) {
        // 安全校验：幂等键存在但不属于当前用户时，拒绝操作（而非泄露他人数据）
        if (existingTx.userId !== userId)
          throw createBadRequestError('Idempotency key already used', 'IDEMPOTENCY_CONFLICT')
        return { transaction: existingTx, giftResult: null, duplicate: true }
      }

      // 1b. 消费限额检查（合规要求，含月累计）
      // TODO: 从用户档案获取真实年龄，当前默认为成年人（18）
      const giftDef = GIFT_CONFIG.find(g => g.tier === giftTier)
      if (giftDef) {
        const amountYuan = coinsToYuan(giftDef.coinCost)
        // 查询本月累计消费（元）
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)
        const [monthlyResult] = await db
          .select({ total: sql<number>`COALESCE(SUM(${schema.transactions.amount}), 0)` })
          .from(schema.transactions)
          .where(and(
            eq(schema.transactions.userId, userId),
            eq(schema.transactions.type, 'gift'),
            gte(schema.transactions.createdAt, monthStart),
          ))
        const monthlySpent = Number(monthlyResult?.total ?? 0)
        const spendingCheck = checkSpendingLimit(amountYuan, 18, monthlySpent)
        if (!spendingCheck.allowed) {
          throw createBadRequestError(spendingCheck.reason ?? '超出消费限额', 'SPENDING_LIMIT_EXCEEDED')
        }
      }

      // 2. 确保钱包存在
      await this.getWallet(userId)

      // 3. 事务处理（使用行锁防止并发透支）
      const result = await db.transaction(async (tx) => {
        // 3a. 获取钱包最新状态（FOR UPDATE 行锁，防止并发送礼透支余额）
        const [lockedWallet] = await tx
          .select()
          .from(schema.wallets)
          .where(eq(schema.wallets.userId, userId))
          .for('update')

        if (!lockedWallet)
          throw createNotFoundError('Wallet not found')

        // 2b. 调用 soul-engine 计算
        const giftResult = calcGift(
          giftTier as GiftTier,
          lockedWallet.coinBalance,
          lockedWallet.pocketMoney,
          lockedWallet.subscriptionTier === 'none' ? null : lockedWallet.subscriptionTier as 'monthly' | 'quarterly' | 'yearly',
        )

        if (!giftResult.success)
          throw createBadRequestError(giftResult.error ?? 'Gift failed', 'GIFT_FAILED')

        // 2c. 更新 wallet
        await tx.update(schema.wallets)
          .set({
            coinBalance: giftResult.newCoinBalance,
            pocketMoney: giftResult.newPocketBalance,
            totalGifted: sql`${schema.wallets.totalGifted} + ${giftResult.coinsDeducted}`,
          })
          .where(eq(schema.wallets.userId, userId))

        // 2d. 插入 transaction
        const [transaction] = await tx.insert(schema.transactions).values({
          userId,
          type: 'gift',
          amount: giftResult.coinsDeducted,
          coins: -giftResult.coinsDeducted,
          pocketGain: giftResult.pocketMoneyGain,
          trustGain: giftResult.trustGain,
          description: `送礼给角色 ${characterId}`,
          idempotencyKey,
        }).returning()

        return { transaction, giftResult }
      })

      return { ...result, duplicate: false }
    },

    /**
     * 查询交易记录（分页）
     */
    async getTransactions(userId: string, limit: number, offset: number) {
      return await db.select()
        .from(schema.transactions)
        .where(eq(schema.transactions.userId, userId))
        .orderBy(desc(schema.transactions.createdAt))
        .limit(limit)
        .offset(offset)
    },
  }
}

export type EconomyService = ReturnType<typeof createEconomyService>
