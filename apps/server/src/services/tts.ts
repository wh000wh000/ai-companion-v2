import { useLogger } from '@guiiai/logg'

interface VoiceConfig {
  voiceId: string
  name: string
  speed: number
  pitch: number
}

/**
 * 6个角色模板对应的中文音色配置
 * 基于阿里云 CosyVoice V2 预设音色
 */
const VOICE_CONFIGS: Record<string, VoiceConfig> = {
  mystic_spirit: { voiceId: 'cosyvoice-xiaoxing', name: '灵动少女', speed: 1.0, pitch: 1.0 },
  gentle_healer: { voiceId: 'cosyvoice-xiaonuan', name: '温柔治愈', speed: 0.95, pitch: 0.95 },
  energetic_girl: { voiceId: 'cosyvoice-keke', name: '元气少女', speed: 1.1, pitch: 1.05 },
  elegant_scholar: { voiceId: 'cosyvoice-shizhi', name: '知性优雅', speed: 0.9, pitch: 0.9 },
  cold_tsundere: { voiceId: 'cosyvoice-bingtang', name: '冷酷傲娇', speed: 0.95, pitch: 1.0 },
  sunny_boy: { voiceId: 'cosyvoice-alie', name: '阳光少年', speed: 1.05, pitch: 0.85 },
}

export function createTTSService(config?: { apiKey?: string, apiUrl?: string }) {
  const logger = useLogger('tts-service').useGlobalConfig()
  const apiKey = config?.apiKey
  const apiUrl = config?.apiUrl ?? 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

  const mockMode = !apiKey
  if (mockMode) {
    logger.warn('TTS service in mock mode — no API key configured')
  }

  return {
    /**
     * 文本转语音
     * @param text 待合成文本
     * @param characterTemplate 角色模板ID（映射到 VOICE_CONFIGS）
     * @returns Base64编码的音频数据 + 格式 + 估算时长
     */
    async synthesize(text: string, characterTemplate: string): Promise<{
      audioBase64: string
      format: string
      duration: number
    }> {
      if (mockMode) {
        // Mock模式：返回空音频占位，方便前端调试
        logger.log(`TTS mock: "${text.slice(0, 20)}..." → mock audio`)
        return {
          audioBase64: '', // 空音频
          format: 'mp3',
          duration: Math.max(1, text.length * 0.1), // 估算时长（秒）
        }
      }

      // TODO: 待配置 CosyVoice API Key 后启用实际调用
      const voiceConfig = this.getVoiceConfig(characterTemplate)

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'cosyvoice-v2',
          input: { text },
          parameters: {
            voice: voiceConfig.voiceId,
            speed: voiceConfig.speed,
            format: 'mp3',
          },
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        logger.withError(new Error(error)).error('TTS synthesis failed')
        throw new Error(`TTS synthesis failed: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      return {
        audioBase64: base64,
        format: 'mp3',
        duration: text.length * 0.1, // 估算，实际应从音频元数据获取
      }
    },

    /**
     * 获取角色语音配置
     * 未知模板回退到 mystic_spirit
     */
    getVoiceConfig(characterTemplate: string): VoiceConfig {
      return VOICE_CONFIGS[characterTemplate] ?? VOICE_CONFIGS.mystic_spirit
    },

    /**
     * 获取所有可用音色列表
     */
    getAvailableVoices(): Array<{ template: string } & VoiceConfig> {
      return Object.entries(VOICE_CONFIGS).map(([template, config]) => ({
        template,
        ...config,
      }))
    },

    /**
     * 是否为Mock模式（无API Key时自动降级）
     */
    isMockMode(): boolean {
      return mockMode
    },

    /**
     * 健康检查：验证 TTS 服务可用性
     * - Mock模式：始终返回 healthy
     * - 生产模式：尝试发送小请求验证 API 连通性
     */
    async healthCheck(): Promise<{ healthy: boolean, mode: 'mock' | 'live', latencyMs?: number }> {
      if (mockMode) {
        return { healthy: true, mode: 'mock' }
      }

      const start = Date.now()
      try {
        // 发送最短文本测试 API 可达性
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'cosyvoice-v2',
            input: { text: '你好' },
            parameters: {
              voice: 'cosyvoice-xiaoxing',
              format: 'mp3',
            },
          }),
          signal: AbortSignal.timeout(10_000),
        })

        const latencyMs = Date.now() - start
        return { healthy: response.ok, mode: 'live', latencyMs }
      }
      catch {
        return { healthy: false, mode: 'live', latencyMs: Date.now() - start }
      }
    },
  }
}

export type TTSService = ReturnType<typeof createTTSService>
