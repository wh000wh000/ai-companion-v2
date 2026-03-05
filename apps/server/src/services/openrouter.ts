import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { useLogger } from '@guiiai/logg'

// ─── 类型定义 ──────────────────────────────────────────────────────────────

interface OpenRouterConfig {
  apiKey: string
  baseUrl?: string
  model?: string
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// ─── SOUL.md 角色缓存 ──────────────────────────────────────────────────────

const soulCache = new Map<string, string>()

/**
 * 加载角色 SOUL.md 作为系统提示
 * 从 openclaw/agents/{characterId}/SOUL.md 读取
 */
async function loadSoulPrompt(characterId: string): Promise<string> {
  if (soulCache.has(characterId)) {
    return soulCache.get(characterId)!
  }

  try {
    // 项目根目录（从 apps/server/ 向上两级）
    const projectRoot = resolve(__dirname, '..', '..', '..', '..')
    const soulPath = resolve(projectRoot, 'openclaw', 'agents', characterId, 'SOUL.md')
    const content = await readFile(soulPath, 'utf-8')
    soulCache.set(characterId, content)
    return content
  }
  catch {
    // 找不到 SOUL.md 时使用默认人格
    const defaultPrompt = '你是一个温暖友善的伪春菜角色。请用自然、亲切的方式与用户聊天。'
    soulCache.set(characterId, defaultPrompt)
    return defaultPrompt
  }
}

// ─── OpenRouter 服务工厂 ────────────────────────────────────────────────────

/**
 * 创建 OpenRouter LLM 服务
 *
 * 使用 OpenAI 兼容 API（OpenRouter 提供），支持流式响应。
 * 作为 OpenClaw 不可用时的降级 LLM 通道。
 */
export function createOpenRouterService(config: OpenRouterConfig) {
  const logger = useLogger('openrouter').useGlobalConfig()
  const baseUrl = (config.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '')
  const model = config.model ?? 'anthropic/claude-sonnet-4'

  return {
    /** 检查服务是否可用（API Key 已配置） */
    isAvailable(): boolean {
      return !!config.apiKey
    },

    /**
     * 流式对话
     *
     * @param characterId 角色ID（用于加载 SOUL.md 人格）
     * @param message 用户消息
     * @param onToken 每个 token 的回调
     * @param systemPromptOverride 可选的 systemPrompt 覆盖（DB 优先）
     */
    async chat(
      characterId: string,
      message: string,
      onToken: (token: string) => Promise<void>,
      systemPromptOverride?: string,
    ): Promise<void> {
      if (!config.apiKey) {
        throw new Error('OPENROUTER_API_KEY not configured')
      }

      // 优先使用 DB 提供的 systemPrompt，否则从文件系统加载
      const soulPrompt = systemPromptOverride || await loadSoulPrompt(characterId)

      const messages: ChatMessage[] = [
        { role: 'system', content: soulPrompt },
        { role: 'user', content: message },
      ]

      logger.withFields({ model, characterId }).log('发起 OpenRouter 请求')

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ai-companion.app',
          'X-Title': 'AI Companion',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: 1024,
          temperature: 0.8,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.withFields({ status: response.status, error: errorText }).error('OpenRouter 请求失败')
        throw new Error(`OpenRouter API error: ${response.status} ${errorText}`)
      }

      if (!response.body) {
        throw new Error('OpenRouter response has no body')
      }

      // 解析 SSE 流
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done)
          break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: '))
            continue

          const data = trimmed.slice(6)
          if (data === '[DONE]')
            break

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) {
              await onToken(delta)
            }
          }
          catch {
            // 忽略解析错误（可能是不完整的 JSON）
          }
        }
      }

      logger.log('OpenRouter 流式响应完成')
    },
  }
}

export type OpenRouterService = ReturnType<typeof createOpenRouterService>
