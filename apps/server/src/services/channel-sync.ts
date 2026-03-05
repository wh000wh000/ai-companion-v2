import type { Database } from '../libs/db'
import type { ChannelBinding } from '../schemas/channel-bindings'

import { and, eq } from 'drizzle-orm'
import { useLogger } from '@guiiai/logg'

import * as schema from '../schemas'
import { createConflictError, createNotFoundError } from '../utils/error'

/**
 * 跨渠道状态同步服务
 *
 * 确保同一用户在不同渠道看到的是同一个"角色"：
 * - 信赖值/零花钱/记忆 在所有渠道共享
 * - 对话历史跨渠道可见
 *
 * 通过将外部渠道用户 ID 绑定到系统用户 ID 实现统一身份。
 */
export function createChannelSyncService(db: Database) {
  const logger = useLogger('channel-sync').useGlobalConfig()

  return {
    /**
     * 绑定外部渠道用户到系统用户
     * @param userId 系统用户 ID
     * @param channel 渠道标识（feishu/telegram/wechat/web）
     * @param externalId 渠道方用户 ID
     * @param metadata 可选额外信息（JSON 字符串）
     */
    async bindChannel(userId: string, channel: string, externalId: string, metadata?: string): Promise<ChannelBinding> {
      // 检查是否已被其他用户绑定
      const existing = await db.query.channelBindings.findFirst({
        where: and(
          eq(schema.channelBindings.channel, channel),
          eq(schema.channelBindings.externalId, externalId),
        ),
      })

      if (existing) {
        if (existing.userId === userId) {
          // 已经绑定到同一用户，更新 metadata 并返回
          if (metadata !== undefined) {
            const [updated] = await db.update(schema.channelBindings)
              .set({ metadata })
              .where(eq(schema.channelBindings.id, existing.id))
              .returning()
            return updated
          }
          return existing
        }
        // 已经绑定到其他用户，拒绝
        throw createConflictError(`Channel ${channel}:${externalId} is already bound to another user`)
      }

      const [binding] = await db.insert(schema.channelBindings)
        .values({ userId, channel, externalId, metadata })
        .returning()

      logger.log(`Bound channel ${channel}:${externalId} -> user ${userId}`)
      return binding
    },

    /**
     * 通过外部渠道身份查找系统用户 ID
     * @param channel 渠道标识
     * @param externalId 渠道方用户 ID
     * @returns 系统用户 ID，未找到返回 null
     */
    async resolveUser(channel: string, externalId: string): Promise<string | null> {
      const binding = await db.query.channelBindings.findFirst({
        where: and(
          eq(schema.channelBindings.channel, channel),
          eq(schema.channelBindings.externalId, externalId),
        ),
      })

      return binding?.userId ?? null
    },

    /**
     * 查询用户绑定的所有渠道
     * @param userId 系统用户 ID
     * @returns 该用户的所有渠道绑定列表
     */
    async listBindings(userId: string): Promise<ChannelBinding[]> {
      return await db.query.channelBindings.findMany({
        where: eq(schema.channelBindings.userId, userId),
      })
    },

    /**
     * 解除渠道绑定
     * @param userId 系统用户 ID
     * @param channel 渠道标识
     */
    async unbindChannel(userId: string, channel: string): Promise<void> {
      const existing = await db.query.channelBindings.findFirst({
        where: and(
          eq(schema.channelBindings.userId, userId),
          eq(schema.channelBindings.channel, channel),
        ),
      })

      if (!existing) {
        throw createNotFoundError(`No binding found for channel ${channel}`)
      }

      await db.delete(schema.channelBindings)
        .where(eq(schema.channelBindings.id, existing.id))

      logger.log(`Unbound channel ${channel} from user ${userId}`)
    },
  }
}

export type ChannelSyncService = ReturnType<typeof createChannelSyncService>
