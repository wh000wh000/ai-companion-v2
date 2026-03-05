import type { MiddlewareHandler } from 'hono'

import type { ChannelSyncService } from '../services/channel-sync'
import type { HonoEnv } from '../types/hono'

import { Hono } from 'hono'
import { safeParse } from 'valibot'

import { BindChannelSchema, ResolveUserSchema, UnbindChannelSchema } from '../api/channel-sync.schema'
import { authGuard } from '../middlewares/auth'
import { chargeRateLimiter, queryRateLimiter } from '../middlewares/rate-limit'
import { createBadRequestError, createForbiddenError, createUnauthorizedError } from '../utils/error'

/**
 * 渠道同步路由工厂
 *
 * 支持两种认证模式：
 * - authGuard（用户直接操作自己的绑定）
 * - Gateway Token（OpenClaw Agent 通过外部 ID 解析用户）
 */
export function createChannelSyncRoutes(
  channelSyncService: ChannelSyncService,
  openclawToken: string | undefined,
) {
  /**
   * Gateway Token 守卫中间件
   * 验证 X-OpenClaw-Token 请求头
   */
  const gatewayGuard: MiddlewareHandler<HonoEnv> = async (c, next) => {
    if (!openclawToken) {
      throw createForbiddenError('Channel resolve API disabled: OPENCLAW_TOKEN not configured')
    }

    const token = c.req.header('X-OpenClaw-Token')
    if (token !== openclawToken) {
      throw createUnauthorizedError('Invalid or missing X-OpenClaw-Token')
    }

    await next()
  }

  return new Hono<HonoEnv>()
    /**
     * POST /bind — 绑定渠道（需用户认证）
     * 将当前登录用户与外部渠道 ID 关联
     */
    .post('/bind', authGuard, chargeRateLimiter, async (c) => {
      const user = c.get('user')!
      const body = await c.req.json()
      const result = safeParse(BindChannelSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const binding = await channelSyncService.bindChannel(
        user.id,
        result.output.channel,
        result.output.externalId,
        result.output.metadata,
      )

      return c.json(binding, 201)
    })

    /**
     * GET /bindings — 查询当前用户的所有渠道绑定（需用户认证）
     */
    .get('/bindings', authGuard, queryRateLimiter, async (c) => {
      const user = c.get('user')!
      const bindings = await channelSyncService.listBindings(user.id)

      return c.json({
        bindings,
        total: bindings.length,
      })
    })

    /**
     * DELETE /unbind — 解除渠道绑定（需用户认证）
     */
    .delete('/unbind', authGuard, chargeRateLimiter, async (c) => {
      const user = c.get('user')!
      const body = await c.req.json()
      const result = safeParse(UnbindChannelSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      await channelSyncService.unbindChannel(user.id, result.output.channel)

      return c.json({ unbound: true })
    })

    /**
     * POST /resolve — 通过外部 ID 解析系统用户（Gateway Token 认证）
     * OpenClaw Agent 收到渠道消息时，用此接口查找对应的系统用户
     */
    .post('/resolve', gatewayGuard, async (c) => {
      const body = await c.req.json()
      const result = safeParse(ResolveUserSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      const userId = await channelSyncService.resolveUser(
        result.output.channel,
        result.output.externalId,
      )

      return c.json({
        userId,
        bound: userId !== null,
      })
    })
}
