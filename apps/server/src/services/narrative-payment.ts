import type { Database } from '../libs/db'

import { useLogger } from '@guiiai/logg'
import { and, desc, eq, ne } from 'drizzle-orm'

import * as schema from '../schemas'
import { createBadRequestError, createNotFoundError } from '../utils/error'

/** 叙事更新条目 */
interface NarrativeUpdate {
  /** 更新阶段 */
  phase: string
  /** 角色的进度消息，如"那本书我还在找" */
  message: string
  /** 更新时间 */
  timestamp: string
}

/**
 * 叙事支付服务
 *
 * 核心理念：用户不是"买虚拟货币"，而是"为角色做一件事"。
 * 每一笔支付都对应一条叙事线——角色接受心意后会"行动"，
 * 用户可以追踪角色行动的进度。
 */
export function createNarrativePaymentService(db: Database) {
  const logger = useLogger('narrative-payment-service').useGlobalConfig()

  return {
    /**
     * 创建叙事支付
     *
     * 用户发起一个"为角色做一件事"的心意，进入待支付状态。
     */
    async createPayment(data: {
      userId: string
      characterId: string
      type: string
      storyTitle: string
      storyDescription?: string
      characterQuote?: string
      itemEmoji?: string
      amountCents: number
    }) {
      // 验证叙事类型
      const validTypes = ['book', 'gift', 'care', 'experience', 'course']
      if (!validTypes.includes(data.type)) {
        throw createBadRequestError(
          `无效的叙事类型: ${data.type}，允许的类型: ${validTypes.join(', ')}`,
          'INVALID_NARRATIVE_TYPE',
        )
      }

      // 验证金额
      if (data.amountCents <= 0) {
        throw createBadRequestError('金额必须大于 0', 'INVALID_AMOUNT')
      }

      // 初始化叙事时间线
      const initialUpdates: NarrativeUpdate[] = [
        {
          phase: 'initiated',
          message: '心意已收到，让我来为你做这件事吧',
          timestamp: new Date().toISOString(),
        },
      ]

      const [payment] = await db.insert(schema.narrativePayments).values({
        userId: data.userId,
        characterId: data.characterId,
        type: data.type,
        storyTitle: data.storyTitle,
        storyDescription: data.storyDescription ?? null,
        characterQuote: data.characterQuote ?? null,
        itemEmoji: data.itemEmoji ?? null,
        amountCents: data.amountCents,
        status: 'pending',
        narrativePhase: 'initiated',
        narrativeUpdates: JSON.stringify(initialUpdates),
      }).returning()

      logger.withFields({ paymentId: payment.id, type: data.type, amount: data.amountCents })
        .log('叙事支付已创建')

      return payment
    },

    /**
     * 获取进行中的叙事（角色还在"做事"的付费项）
     *
     * 返回当前用户与指定角色之间所有未到达终态的叙事支付。
     */
    async getActivePayments(userId: string, characterId: string) {
      return await db.select()
        .from(schema.narrativePayments)
        .where(and(
          eq(schema.narrativePayments.userId, userId),
          eq(schema.narrativePayments.characterId, characterId),
          eq(schema.narrativePayments.status, 'completed'),
          ne(schema.narrativePayments.narrativePhase, 'reflected'),
        ))
        .orderBy(desc(schema.narrativePayments.createdAt))
    },

    /**
     * 获取用户的叙事支付历史（展示为"心意足迹"）
     */
    async getPaymentHistory(userId: string, limit: number, offset: number) {
      return await db.select()
        .from(schema.narrativePayments)
        .where(eq(schema.narrativePayments.userId, userId))
        .orderBy(desc(schema.narrativePayments.createdAt))
        .limit(limit)
        .offset(offset)
    },

    /**
     * 更新叙事阶段（角色"做事"的过程）
     *
     * 由系统或 Agent 调用，更新角色行动的进度消息。
     * 阶段：in_progress → delivered → reflected
     */
    async updatePhase(paymentId: string, userId: string, phase: string, message: string) {
      const validPhases = ['in_progress', 'delivered', 'reflected']
      if (!validPhases.includes(phase)) {
        throw createBadRequestError(
          `无效的叙事阶段: ${phase}`,
          'INVALID_NARRATIVE_PHASE',
        )
      }

      const payment = await db.query.narrativePayments.findFirst({
        where: and(
          eq(schema.narrativePayments.id, paymentId),
          eq(schema.narrativePayments.userId, userId),
        ),
      })

      if (!payment) {
        throw createNotFoundError('叙事支付记录不存在')
      }

      if (payment.status !== 'completed') {
        throw createBadRequestError('只有已完成支付的叙事才能推进', 'PAYMENT_NOT_COMPLETED')
      }

      // 追加叙事更新
      const existingUpdates: NarrativeUpdate[] = payment.narrativeUpdates
        ? JSON.parse(payment.narrativeUpdates)
        : []

      existingUpdates.push({
        phase,
        message,
        timestamp: new Date().toISOString(),
      })

      const setFields: Record<string, unknown> = {
        narrativePhase: phase,
        narrativeUpdates: JSON.stringify(existingUpdates),
      }

      // 如果阶段为 delivered，记录送达时间
      if (phase === 'delivered') {
        setFields.deliveredAt = new Date()
      }

      const [updated] = await db.update(schema.narrativePayments)
        .set(setFields)
        .where(and(
          eq(schema.narrativePayments.id, paymentId),
          eq(schema.narrativePayments.userId, userId),
        ))
        .returning()

      logger.withFields({ paymentId, phase })
        .log('叙事进度已更新')

      return updated
    },

    /**
     * 创建记忆瞬间
     *
     * 对话中有特殊情感密度的时刻，由系统自动识别并标记。
     */
    async createMemoryMoment(data: {
      userId: string
      characterId: string
      conversationDate: Date
      summary: string
      characterNote?: string
      emotionalDensity?: number
    }) {
      // 验证情感密度范围
      if (data.emotionalDensity !== undefined && (data.emotionalDensity < 1 || data.emotionalDensity > 10)) {
        throw createBadRequestError('情感密度必须在 1-10 之间', 'INVALID_EMOTIONAL_DENSITY')
      }

      const [moment] = await db.insert(schema.memoryMoments).values({
        userId: data.userId,
        characterId: data.characterId,
        conversationDate: data.conversationDate,
        summary: data.summary,
        characterNote: data.characterNote ?? null,
        emotionalDensity: data.emotionalDensity ?? 0,
        isSaved: false,
      }).returning()

      logger.withFields({ momentId: moment.id, characterId: data.characterId })
        .log('记忆瞬间已创建')

      return moment
    },

    /**
     * 获取记忆瞬间列表
     */
    async getMemoryMoments(userId: string, characterId: string, limit: number, offset: number) {
      return await db.select()
        .from(schema.memoryMoments)
        .where(and(
          eq(schema.memoryMoments.userId, userId),
          eq(schema.memoryMoments.characterId, characterId),
        ))
        .orderBy(desc(schema.memoryMoments.createdAt))
        .limit(limit)
        .offset(offset)
    },

    /**
     * 保存记忆瞬间（标记为"已留住"）
     *
     * 用户付费"留住"某个特殊瞬间，角色会为之添加批注。
     */
    async saveMemoryMoment(momentId: string, userId: string) {
      const moment = await db.query.memoryMoments.findFirst({
        where: and(
          eq(schema.memoryMoments.id, momentId),
          eq(schema.memoryMoments.userId, userId),
        ),
      })

      if (!moment) {
        throw createNotFoundError('记忆瞬间不存在')
      }

      if (moment.isSaved) {
        throw createBadRequestError('该记忆瞬间已被保存', 'ALREADY_SAVED')
      }

      const [updated] = await db.update(schema.memoryMoments)
        .set({
          isSaved: true,
          savedAt: new Date(),
        })
        .where(and(
          eq(schema.memoryMoments.id, momentId),
          eq(schema.memoryMoments.userId, userId),
        ))
        .returning()

      logger.withFields({ momentId })
        .log('记忆瞬间已保存')

      return updated
    },
  }
}

export type NarrativePaymentService = ReturnType<typeof createNarrativePaymentService>
