import type { Database } from '../libs/db'
import type { TrustEventType } from '@ai-companion/soul-engine'

import { and, eq } from 'drizzle-orm'

import { useLogger } from '@guiiai/logg'
import {
  getStreakBonus,
  calculateTrustDecay,
  getDecayFloor,
  determineTrustLevel,
  checkLevelUp,
  getTrustEventValue,
} from '@ai-companion/soul-engine'
import * as schema from '../schemas'
import { createNotFoundError } from '../utils/error'

/** 信赖服务可选配置 */
interface TrustServiceOptions {
  /** 是否由 OpenClaw Agent 驱动决策（日志标记用） */
  openclawMode?: boolean
}

export function createTrustService(db: Database, options?: TrustServiceOptions) {
  const openclawMode = options?.openclawMode ?? false
  const logger = useLogger('trust-service').useGlobalConfig()
  return {
    /**
     * 查询信赖记录（不存在则自动创建）
     */
    async getTrustRecord(userId: string, characterId: string) {
      const existing = await db.query.trustRecords.findFirst({
        where: and(
          eq(schema.trustRecords.userId, userId),
          eq(schema.trustRecords.characterId, characterId),
        ),
      })

      if (existing)
        return existing

      return await this.initTrustRecord(userId, characterId)
    },

    /**
     * 初始化信赖记录
     */
    async initTrustRecord(userId: string, characterId: string) {
      const [record] = await db.insert(schema.trustRecords)
        .values({ userId, characterId })
        .onConflictDoNothing()
        .returning()

      if (!record) {
        const existing = await db.query.trustRecords.findFirst({
          where: and(
            eq(schema.trustRecords.userId, userId),
            eq(schema.trustRecords.characterId, characterId),
          ),
        })
        if (!existing)
          throw createNotFoundError('Failed to initialize trust record')
        return existing
      }

      return record
    },

    /**
     * 每日签到：
     * 1. 获取 trustRecord
     * 2. 调用 soul-engine calculateDailyTrust + getStreakBonus
     * 3. 更新 trustPoints, streakDays, lastInteractAt
     * 4. 检查升级
     */
    async checkIn(userId: string, characterId: string) {
      return await db.transaction(async (tx) => {
        // 获取信赖记录
        const [record] = await tx
          .select()
          .from(schema.trustRecords)
          .where(and(
            eq(schema.trustRecords.userId, userId),
            eq(schema.trustRecords.characterId, characterId),
          ))
          .for('update')

        if (!record)
          throw createNotFoundError('Trust record not found')

        // 计算签到信赖值
        const baseTrust = 5 // daily_checkin base
        const streakBonus = getStreakBonus(record.streakDays + 1)
        const trustGain = baseTrust + streakBonus

        // 更新连续签到天数
        const now = new Date()
        const lastInteract = record.lastInteractAt
        let newStreakDays = record.streakDays

        if (lastInteract) {
          const diffMs = now.getTime() - lastInteract.getTime()
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

          if (diffDays <= 1) {
            newStreakDays = record.streakDays + 1
          }
          else {
            newStreakDays = 1
          }
        }
        else {
          newStreakDays = 1
        }

        const newTrustPoints = record.trustPoints + trustGain

        // 检查升级
        const levelUpResult = checkLevelUp(
          record.trustLevel,
          newTrustPoints,
          record.daysAtCurrentLevel,
        )

        const newLevel = levelUpResult.canLevelUp
          ? levelUpResult.targetLevel
          : record.trustLevel
        const newDaysAtLevel = levelUpResult.canLevelUp
          ? 0
          : record.daysAtCurrentLevel

        // 更新记录
        await tx.update(schema.trustRecords)
          .set({
            trustPoints: newTrustPoints,
            trustLevel: newLevel,
            streakDays: newStreakDays,
            lastInteractAt: now,
            daysAtCurrentLevel: newDaysAtLevel,
          })
          .where(eq(schema.trustRecords.id, record.id))

        return {
          trustGain,
          newTotal: newTrustPoints,
          levelUp: newLevel > record.trustLevel,
          newLevel,
          streakDays: newStreakDays,
          streakBonus,
        }
      })
    },

    /**
     * 应用信赖变更（送礼、对话等事件）
     * 自动初始化信赖记录（如果不存在）
     */
    async applyTrustEvent(userId: string, characterId: string, event: string, value?: number) {
      // OpenClaw Agent 驱动时记录日志
      if (openclawMode) {
        logger.log(`Trust event [${event}] triggered by OpenClaw Agent for user=${userId} character=${characterId}`)
      }

      // 确保信赖记录存在
      await this.getTrustRecord(userId, characterId)

      // 映射 API 事件类型 → soul-engine 事件类型
      const eventMap: Record<string, TrustEventType> = {
        chat: 'chat_round',
        deep_chat: 'deep_chat',
        share_mood: 'share_mood',
        daily_task: 'daily_task',
        gift: 'gift_small',
        checkin: 'daily_checkin',
      }

      return await db.transaction(async (tx) => {
        const [record] = await tx
          .select()
          .from(schema.trustRecords)
          .where(and(
            eq(schema.trustRecords.userId, userId),
            eq(schema.trustRecords.characterId, characterId),
          ))
          .for('update')

        if (!record)
          throw createNotFoundError('Trust record not found')

        // 计算事件带来的信赖值
        const mappedEvent = eventMap[event] ?? (event as TrustEventType)
        const trustGain = value ?? getTrustEventValue(mappedEvent)
        const newTrustPoints = record.trustPoints + trustGain

        // 检查升级
        const levelUpResult = checkLevelUp(
          record.trustLevel,
          newTrustPoints,
          record.daysAtCurrentLevel,
        )

        const newLevel = levelUpResult.canLevelUp
          ? levelUpResult.targetLevel
          : record.trustLevel
        const newDaysAtLevel = levelUpResult.canLevelUp
          ? 0
          : record.daysAtCurrentLevel

        // 更新记录
        await tx.update(schema.trustRecords)
          .set({
            trustPoints: newTrustPoints,
            trustLevel: newLevel,
            lastInteractAt: new Date(),
            daysAtCurrentLevel: newDaysAtLevel,
          })
          .where(eq(schema.trustRecords.id, record.id))

        return {
          trustGain,
          newTotal: newTrustPoints,
          levelUp: newLevel > record.trustLevel,
          newLevel,
        }
      })
    },

    /**
     * 计算并应用衰减（Cron 定期调用）
     */
    async applyDecay(userId: string, characterId: string) {
      return await db.transaction(async (tx) => {
        const [record] = await tx
          .select()
          .from(schema.trustRecords)
          .where(and(
            eq(schema.trustRecords.userId, userId),
            eq(schema.trustRecords.characterId, characterId),
          ))
          .for('update')

        if (!record)
          throw createNotFoundError('Trust record not found')

        // 计算不活跃天数
        const now = new Date()
        const lastInteract = record.lastInteractAt
        let inactiveDays = 0

        if (lastInteract) {
          inactiveDays = Math.floor(
            (now.getTime() - lastInteract.getTime()) / (1000 * 60 * 60 * 24),
          )
        }

        // 计算衰减值
        const decay = calculateTrustDecay(inactiveDays, false, false)
        if (decay === 0)
          return { decayed: 0, newTotal: record.trustPoints, newLevel: record.trustLevel }

        // 应用衰减下限
        const floor = getDecayFloor(record.trustLevel)
        const newTrustPoints = Math.max(record.trustPoints - decay, floor)
        const actualDecay = record.trustPoints - newTrustPoints

        // 检查是否进入动摇状态
        const newPointsLevel = determineTrustLevel(newTrustPoints)
        const isShaken = newPointsLevel < record.trustLevel

        // 更新记录
        await tx.update(schema.trustRecords)
          .set({
            trustPoints: newTrustPoints,
            isShaken,
            daysAtCurrentLevel: record.daysAtCurrentLevel + 1,
          })
          .where(eq(schema.trustRecords.id, record.id))

        return {
          decayed: actualDecay,
          newTotal: newTrustPoints,
          newLevel: record.trustLevel,
          isShaken,
        }
      })
    },
  }
}

export type TrustService = ReturnType<typeof createTrustService>
