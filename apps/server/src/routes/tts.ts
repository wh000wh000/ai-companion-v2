import type { TTSService } from '../services/tts'
import type { TrustService } from '../services/trust'
import type { HonoEnv } from '../types/hono'

import { Hono } from 'hono'
import { safeParse } from 'valibot'

import { SynthesizeSchema } from '../api/tts.schema'
import { authGuard } from '../middlewares/auth'
import { createBadRequestError, createForbiddenError } from '../utils/error'

export function createTTSRoutes(ttsService: TTSService, trustService: TrustService) {
  return new Hono<HonoEnv>()
    .use('*', authGuard)

    /**
     * POST /synthesize — 文本转语音
     * 需要信赖等级 Lv.7+
     */
    .post('/synthesize', async (c) => {
      const user = c.get('user')!
      const body = await c.req.json()
      const result = safeParse(SynthesizeSchema, body)

      if (!result.success) {
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)
      }

      // Lv.7+ 门控：语音消息需要达到信赖等级7
      const trustRecord = await trustService.getTrustRecord(user.id, result.output.characterId)
      if (trustRecord.trustLevel < 7) {
        throw createForbiddenError('Voice messages require Trust Level 7+')
      }

      const audio = await ttsService.synthesize(
        result.output.text,
        result.output.characterTemplate,
      )

      return c.json({
        ...audio,
        mockMode: ttsService.isMockMode(),
      })
    })

    /**
     * GET /voices — 可用音色列表（无门控）
     */
    .get('/voices', async (c) => {
      return c.json({
        voices: ttsService.getAvailableVoices(),
        mockMode: ttsService.isMockMode(),
      })
    })

    /**
     * GET /status — TTS 服务健康状态
     * 返回服务模式 (mock/live)、可用性和延迟
     */
    .get('/status', async (c) => {
      const health = await ttsService.healthCheck()
      return c.json(health)
    })
}
