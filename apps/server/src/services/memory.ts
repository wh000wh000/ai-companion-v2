import type { Database } from '../libs/db'

import { and, desc, eq, gte, isNull, like, lte, or, sql } from 'drizzle-orm'

import { useLogger } from '@guiiai/logg'
import * as schema from '../schemas'

export function createMemoryService(db: Database) {
  const logger = useLogger('memory-service').useGlobalConfig()

  return {
    /**
     * 保存记忆
     */
    async saveMemory(data: {
      userId: string
      characterId: string
      content: string
      type: string
      importance?: number
      level?: number
      tags?: string[]
    }) {
      const level = data.level ?? 3
      const expiresAt = level === 2
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天过期
        : null

      const [memory] = await db.insert(schema.memories)
        .values({
          userId: data.userId,
          characterId: data.characterId,
          content: data.content,
          type: data.type,
          importance: data.importance ?? 3,
          level,
          tags: data.tags ?? null,
          expiresAt,
        })
        .returning()

      logger.log(`记忆已保存: type=${data.type}, level=${level}, userId=${data.userId}`)
      return memory
    },

    /**
     * 搜索记忆
     *
     * 策略:
     * 1. 优先使用 PostgreSQL tsvector 全文搜索（中文使用 simple 分词器）
     * 2. 全文搜索无结果时降级为 LIKE 模糊匹配
     * 3. 未来集成 pgvector 后使用向量相似度 70% + BM25 关键词 30% 混合检索
     */
    async searchMemories(params: {
      userId: string
      characterId: string
      query: string
      limit?: number
      level?: number
    }) {
      const { userId, characterId, query, limit = 5, level } = params

      // 基础过滤条件
      const baseConditions = [
        eq(schema.memories.userId, userId),
        eq(schema.memories.characterId, characterId),
      ]

      if (level !== undefined) {
        baseConditions.push(eq(schema.memories.level, level))
      }

      // 排除已过期的记忆（expiresAt IS NULL 或 expiresAt > now）
      baseConditions.push(
        or(
          isNull(schema.memories.expiresAt),
          gte(schema.memories.expiresAt, new Date()),
        )!,
      )

      // 尝试 tsvector 全文搜索（对中文使用 simple 分词器，按字符匹配）
      try {
        const tsQuery = query.split(/\s+/).filter(Boolean).join(' & ')
        const tsvectorResults = await db.select()
          .from(schema.memories)
          .where(and(
            ...baseConditions,
            sql`to_tsvector('simple', ${schema.memories.content}) @@ to_tsquery('simple', ${tsQuery})`,
          ))
          .orderBy(
            sql`ts_rank(to_tsvector('simple', ${schema.memories.content}), to_tsquery('simple', ${tsQuery})) DESC`,
            desc(schema.memories.importance),
          )
          .limit(limit)

        if (tsvectorResults.length > 0) {
          return tsvectorResults
        }
      }
      catch {
        // tsvector 不可用（例如 PGlite 不完整支持），降级到 LIKE
        logger.log('tsvector 搜索不可用，降级为 LIKE 搜索')
      }

      // 降级: LIKE 模糊搜索
      return await db.select()
        .from(schema.memories)
        .where(and(
          ...baseConditions,
          like(schema.memories.content, `%${query}%`),
        ))
        .orderBy(desc(schema.memories.importance), desc(schema.memories.createdAt))
        .limit(limit)
    },

    /**
     * 获取最近记忆
     */
    async getRecentMemories(userId: string, characterId: string, days: number = 7) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      // 排除已过期的记忆
      return await db.select()
        .from(schema.memories)
        .where(and(
          eq(schema.memories.userId, userId),
          eq(schema.memories.characterId, characterId),
          gte(schema.memories.createdAt, since),
          or(
            isNull(schema.memories.expiresAt),
            gte(schema.memories.expiresAt, new Date()),
          ),
        ))
        .orderBy(desc(schema.memories.createdAt))
    },

    /**
     * 删除记忆（仅Level 2）
     */
    async deleteMemory(memoryId: string) {
      // 先查询
      const memory = await db.query.memories.findFirst({
        where: eq(schema.memories.id, memoryId),
      })

      if (!memory)
        return null
      if (memory.level !== 2)
        return null // 只能删Level 2

      await db.delete(schema.memories)
        .where(eq(schema.memories.id, memoryId))

      logger.log(`记忆已删除: id=${memoryId}`)
      return memory
    },

    /**
     * 清理过期记忆（Cron调用）
     */
    async cleanExpired() {
      const now = new Date()
      // 删除所有过期的Level 2记忆（expiresAt <= now）
      const deleted = await db.delete(schema.memories)
        .where(and(
          eq(schema.memories.level, 2),
          lte(schema.memories.expiresAt, now),
        ))
        .returning()

      if (deleted.length > 0) {
        logger.log(`清理了 ${deleted.length} 条过期记忆`)
      }

      return { deleted: deleted.length }
    },
  }
}

export type MemoryService = ReturnType<typeof createMemoryService>
