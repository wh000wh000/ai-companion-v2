import { useAiriCardStore } from '@proj-airi/stage-ui/stores/modules/airi-card'
import { useLocalStorage } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

// ─── 类型定义 ──────────────────────────────────────────────────────────────

interface PresetCharacterI18n {
  id: string
  characterId: string
  language: string
  name: string
  tagline?: string
  description: string
  tags: string[]
}

interface PresetCharacterPrompt {
  id: string
  characterId: string
  language: string
  type: 'system' | 'personality' | 'greetings'
  content: string
}

export interface PresetCharacter {
  id: string
  version: string
  coverUrl: string
  characterId: string
  avatarUrl?: string
  i18n?: PresetCharacterI18n[]
  prompts?: PresetCharacterPrompt[]
}

// ─── Server URL ────────────────────────────────────────────────────────────

// Vercel 部署时 VITE_SERVER_URL 留空，相对路径通过 rewrites 代理到后端
const SERVER_URL = import.meta.env.VITE_SERVER_URL || ''

// ─── Composable ────────────────────────────────────────────────────────────

/**
 * 角色加载器
 *
 * 职责：
 * 1. 从 localStorage 读取 selected_character_id（默认 'preset-xiaoxing'）
 * 2. fetch 预置角色数据（公开端点，无需认证）
 * 3. 将 SOUL.md 内容设置到 airiCardStore 的 activeCard.systemPrompt
 * 4. 角色切换时重新加载
 */
export function useCharacterLoader() {
  const cardStore = useAiriCardStore()

  const selectedCharacterId = useLocalStorage<string>('selected_character_id', 'preset-xiaoxing')
  const presets = ref<PresetCharacter[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activePreset = computed(() => {
    return presets.value.find(p => p.id === selectedCharacterId.value)
  })

  /**
   * 从服务器获取预置角色列表
   */
  async function fetchPresets(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${SERVER_URL}/api/characters/presets`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch presets: ${response.status}`)
      }

      presets.value = await response.json()
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('[useCharacterLoader] Failed to fetch presets:', err)
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 将选中的角色人格注入到 airiCardStore
   */
  function applyCharacterToCard(preset: PresetCharacter): void {
    const zhI18n = preset.i18n?.find(i => i.language === 'zh-CN')
      ?? preset.i18n?.[0]
    const systemPromptEntry = preset.prompts?.find(p => p.type === 'system')

    if (!systemPromptEntry) {
      console.warn('[useCharacterLoader] No system prompt found for character:', preset.id)
      return
    }

    // 更新或创建 airiCard
    const existingCard = cardStore.activeCard
    if (existingCard) {
      cardStore.updateCard(cardStore.activeCardId, {
        ...existingCard,
        name: zhI18n?.name ?? preset.characterId,
        systemPrompt: systemPromptEntry.content,
        description: zhI18n?.description ?? '',
      })
    }
    else {
      // 创建新卡片并设为活跃
      const newId = cardStore.addCard({
        name: zhI18n?.name ?? preset.characterId,
        version: preset.version,
        systemPrompt: systemPromptEntry.content,
        description: zhI18n?.description ?? '',
      })
      cardStore.activeCardId = newId
    }
  }

  /**
   * 选择并激活一个预置角色
   */
  function selectCharacter(characterId: string): void {
    selectedCharacterId.value = characterId
  }

  // 监听角色切换
  watch(selectedCharacterId, () => {
    const preset = activePreset.value
    if (preset) {
      applyCharacterToCard(preset)
    }
  })

  // 监听 presets 加载完成后立即应用
  watch(presets, (newPresets) => {
    if (newPresets.length > 0) {
      const preset = newPresets.find(p => p.id === selectedCharacterId.value)
      if (preset) {
        applyCharacterToCard(preset)
      }
    }
  })

  return {
    selectedCharacterId,
    presets,
    activePreset,
    loading,
    error,
    fetchPresets,
    selectCharacter,
  }
}
