import type { OpenClawService } from '../services/openclaw'

import { useLogger } from '@guiiai/logg'

/**
 * OpenClaw 降级管理器
 *
 * 功能：
 * - 跟踪 OpenClaw 连接状态
 * - 失败时自动降级到直连引擎模式
 * - 5分钟后自动重试 OpenClaw 连接
 * - 记录降级事件日志
 */
export function createOpenClawFallback(openclawService: OpenClawService) {
  const logger = useLogger('openclaw-fallback').useGlobalConfig()

  let fallbackMode = false
  let lastFallbackTime = 0
  const RETRY_INTERVAL_MS = 5 * 60 * 1000 // 5分钟

  return {
    /**
     * 检查是否应该使用 OpenClaw
     * 如果处于降级模式但已过重试时间，自动尝试恢复
     */
    shouldUseOpenClaw(): boolean {
      if (!fallbackMode) {
        return !openclawService.shouldFallback()
      }

      // 检查是否到了重试时间
      if (Date.now() - lastFallbackTime > RETRY_INTERVAL_MS) {
        if (openclawService.isConnected()) {
          logger.log('OpenClaw connection restored — exiting fallback mode')
          fallbackMode = false
          return true
        }
      }

      return false
    },

    /**
     * 记录失败并进入降级模式
     */
    enterFallback(reason: string): void {
      if (!fallbackMode) {
        logger.warn(`Entering OpenClaw fallback mode: ${reason}`)
      }
      fallbackMode = true
      lastFallbackTime = Date.now()
    },

    /**
     * 获取当前模式
     */
    getMode(): 'openclaw' | 'fallback' {
      return this.shouldUseOpenClaw() ? 'openclaw' : 'fallback'
    },

    /**
     * 强制退出降级模式
     */
    resetFallback(): void {
      fallbackMode = false
      logger.log('Fallback mode manually reset')
    },
  }
}

export type OpenClawFallback = ReturnType<typeof createOpenClawFallback>
