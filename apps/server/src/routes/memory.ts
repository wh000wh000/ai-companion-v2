import type { MiddlewareHandler } from 'hono'

import type { MemoryService } from '../services/memory'
import type { HonoEnv } from '../types/hono'

import { Hono } from 'hono'
import { safeParse } from 'valibot'

import { MemorySaveSchema, MemorySearchSchema } from '../api/memory.schema'
import { createBadRequestError, createForbiddenError, createNotFoundError, createUnauthorizedError } from '../utils/error'

/**
 * 记忆路由工厂
 * 支持两种认证模式：
 * - Gateway Token（OpenClaw Agent 调用）
 * - authGuard（用户直接调用）
 */
export function createMemoryRoutes(
  memoryService: MemoryService,
  openclawToken: string | undefined,
) {
  /**
   * Gateway Token 守卫中间件
   * 验证 X-OpenClaw-Token 请求头是否与配置的 OPENCLAW_TOKEN 一致
   */
  const memoryGuard: MiddlewareHandler<HonoEnv> = async (c, next) => {
    // 未配置 token 时，记忆功能整体禁用
    if (!openclawToken) {
      throw createForbiddenError('Memory API disabled: OPENCLAW_TOKEN not configured')
    }

    const token = c.req.header('X-OpenClaw-Token')
    if (token !== openclawToken) {
      throw createUnauthorizedError('Invalid or missing X-OpenClaw-Token')
    }

    await next()
  }

  return new Hono<HonoEnv>()
    .use('*', memoryGuard)

    // POST /save — 保存记忆
    .post('/save', async (c) => {
      const body = await c.req.json()
      const result = safeParse(MemorySaveSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const memory = await memoryService.saveMemory({
        userId: result.output.userId,
        characterId: result.output.characterId,
        content: result.output.content,
        type: result.output.type,
        importance: result.output.importance,
        level: result.output.level,
        tags: result.output.tags,
      })

      return c.json(memory, 201)
    })

    // POST /search — 搜索记忆
    .post('/search', async (c) => {
      const body = await c.req.json()
      const result = safeParse(MemorySearchSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const results = await memoryService.searchMemories({
        userId: result.output.userId,
        characterId: result.output.characterId,
        query: result.output.query,
        limit: result.output.limit,
        level: result.output.level,
      })

      return c.json({
        results,
        total: results.length,
      })
    })

    // GET /recent — 最近记忆
    .get('/recent', async (c) => {
      const userId = c.req.query('userId')
      const characterId = c.req.query('characterId')
      const days = Number(c.req.query('days') ?? 7)

      if (!userId || !characterId) {
        throw createBadRequestError('Missing userId or characterId', 'INVALID_REQUEST')
      }

      // 天数范围校验
      const safeDays = Math.max(1, Math.min(days || 7, 30))

      const results = await memoryService.getRecentMemories(userId, characterId, safeDays)

      return c.json({
        results,
        total: results.length,
        days: safeDays,
      })
    })

    // DELETE /:id — 删除记忆（仅Level 2）
    .delete('/:id', async (c) => {
      const memoryId = c.req.param('id')
      const memory = await memoryService.deleteMemory(memoryId)

      if (!memory) {
        throw createNotFoundError('Memory not found or not deletable (only Level 2 memories can be deleted)')
      }

      return c.json({
        deleted: true,
        memory,
      })
    })
}
