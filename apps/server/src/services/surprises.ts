import type { SurpriseTriggerContext } from '@ai-companion/soul-engine'

import type { Database } from '../libs/db'

import {
  checkThresholdTrigger,
} from '@ai-companion/soul-engine'
import { and, desc, eq } from 'drizzle-orm'

import { createNotFoundError } from '../utils/error'

import * as schema from '../schemas'

export function createSurpriseService(db: Database) {
  return {
    /**
     * 检查惊喜触发条件
     * 1. 获取 trustRecord（trustLevel）
     * 2. 获取 wallet（pocketMoney）
     * 3. 获取最近惊喜记录（冷却检查）
     * 4. 调用 soul-engine checkThresholdTrigger
     */
    async checkTrigger(userId: string, characterId: string) {
      // 获取信赖记录
      const trustRecord = await db.query.trustRecords.findFirst({
        where: and(
          eq(schema.trustRecords.userId, userId),
          eq(schema.trustRecords.characterId, characterId),
        ),
      })

      if (!trustRecord)
        return { shouldTrigger: false, availableTypes: [], bestType: null, reasons: ['Trust record not found'] }

      // 获取钱包
      const wallet = await db.query.wallets.findFirst({
        where: eq(schema.wallets.userId, userId),
      })

      if (!wallet)
        return { shouldTrigger: false, availableTypes: [], bestType: null, reasons: ['Wallet not found'] }

      // 获取最近惊喜记录
      const recentSurprises = await db.select()
        .from(schema.surprises)
        .where(and(
          eq(schema.surprises.userId, userId),
          eq(schema.surprises.characterId, characterId),
        ))
        .orderBy(desc(schema.surprises.createdAt))
        .limit(1)

      const lastSurprise = recentSurprises[0] ?? null

      // 计算本月惊喜次数
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const allSurprises = await db.select()
        .from(schema.surprises)
        .where(and(
          eq(schema.surprises.userId, userId),
          eq(schema.surprises.characterId, characterId),
        ))

      const monthlySurpriseCount = allSurprises.filter(
        s => s.createdAt >= monthStart,
      ).length

      // 构建触发上下文
      const context: SurpriseTriggerContext = {
        trustLevel: trustRecord.trustLevel,
        pocketBalance: wallet.pocketMoney,
        lastSurpriseDate: lastSurprise?.createdAt ?? null,
        monthlySurpriseCount,
        isMonthlyCard: wallet.subscriptionTier !== 'none',
        preferences: [],
      }

      // 调用 soul-engine 检查
      return checkThresholdTrigger(context)
    },

    /**
     * 创建惊喜记录
     */
    async createSurprise(data: schema.NewSurprise) {
      const [surprise] = await db.insert(schema.surprises)
        .values(data)
        .returning()

      return surprise
    },

    /**
     * 查询惊喜记录（分页）
     */
    async getSurprises(userId: string, limit: number, offset: number) {
      return await db.select()
        .from(schema.surprises)
        .where(eq(schema.surprises.userId, userId))
        .orderBy(desc(schema.surprises.createdAt))
        .limit(limit)
        .offset(offset)
    },

    /**
     * 更新状态/反馈
     */
    async updateStatus(surpriseId: string, userId: string, status: string, feedback?: string) {
      const existing = await db.query.surprises.findFirst({
        where: and(
          eq(schema.surprises.id, surpriseId),
          eq(schema.surprises.userId, userId),
        ),
      })

      if (!existing)
        throw createNotFoundError('Surprise not found')

      const updateData: Record<string, unknown> = { status }
      if (feedback !== undefined)
        updateData.feedback = feedback

      const [updated] = await db.update(schema.surprises)
        .set(updateData)
        .where(eq(schema.surprises.id, surpriseId))
        .returning()

      return updated
    },
  }
}

export type SurpriseService = ReturnType<typeof createSurpriseService>
