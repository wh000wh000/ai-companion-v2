import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface TrustRecord {
  id: string
  userId: string
  characterId: string
  trustPoints: number
  trustLevel: number
  streakDays: number
  lastInteractAt: string | null
  isShaken: boolean
  createdAt: string
  updatedAt: string
}

export interface GiftTier {
  id: string
  name: string
  cost: number
  trustGain: number
  emoji: string
}

export const GIFT_TIERS: GiftTier[] = [
  { id: 'small', name: '小心意', cost: 10, trustGain: 8, emoji: '💝' },
  { id: 'warm', name: '暖暖的', cost: 50, trustGain: 45, emoji: '🌸' },
  { id: 'love', name: '超爱你', cost: 200, trustGain: 200, emoji: '💖' },
  { id: 'forever', name: '一辈子', cost: 520, trustGain: 550, emoji: '💎' },
]

export const TRUST_LEVEL_NAMES: Record<number, string> = {
  1: '初见',
  2: '相识',
  3: '熟悉',
  4: '信任',
  5: '亲密',
  6: '默契',
  7: '挚友',
  8: '知己',
  9: '灵魂伴侣',
  10: '命中注定',
}

export const TRUST_LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 100,
  3: 350,
  4: 700,
  5: 1200,
  6: 2000,
  7: 3500,
  8: 6000,
  9: 10000,
  10: 16000,
}

export const useTrustStore = defineStore('trust', () => {
  const trustRecord = ref<TrustRecord | null>(null)
  const showLevelUp = ref(false)
  const levelUpInfo = ref({ from: 0, to: 0, levelName: '' })
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTrust(characterId: string) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/trust/${characterId}`, { credentials: 'include' })
      if (!res.ok)
        throw new Error(`Failed to fetch trust: ${res.statusText}`)
      const data = await res.json()
      trustRecord.value = data
    }
    catch (err) {
      error.value = (err as Error).message
      // Provide fallback data for development
      trustRecord.value = {
        id: 'dev-fallback',
        userId: 'dev-user',
        characterId,
        trustPoints: 0,
        trustLevel: 1,
        streakDays: 0,
        lastInteractAt: null,
        isShaken: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }
    finally {
      loading.value = false
    }
  }

  async function checkIn(characterId: string) {
    try {
      const res = await fetch('/api/trust/checkin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      })
      if (!res.ok)
        throw new Error(`Check-in failed: ${res.statusText}`)
      const data = await res.json()
      const oldLevel = trustRecord.value?.trustLevel ?? 1

      // 后���签到接口返回的是 CheckinResult（非完整 TrustRecord），
      // 需要重新拉取最新信赖记录以更新前端状态
      await fetchTrust(characterId)

      const newLevel = data.newLevel ?? trustRecord.value?.trustLevel ?? 1
      if (newLevel > oldLevel) {
        triggerLevelUp(oldLevel, newLevel, TRUST_LEVEL_NAMES[newLevel] ?? '')
      }

      return data
    }
    catch (err) {
      error.value = (err as Error).message
    }
  }

  /**
   * 送礼后刷新信赖状态。
   * 注意：实际扣款+信赖增长由服务端 POST /api/wallet/gift 统一处理，
   * 此方法只负责拉取最新信赖数据并检测等级变化。
   */
  async function refreshAfterGift(characterId: string) {
    const oldLevel = trustRecord.value?.trustLevel ?? 1
    await fetchTrust(characterId)
    const newLevel = trustRecord.value?.trustLevel ?? 1
    if (newLevel > oldLevel) {
      triggerLevelUp(oldLevel, newLevel, TRUST_LEVEL_NAMES[newLevel] ?? '')
    }
  }

  function triggerLevelUp(from: number, to: number, levelName: string) {
    levelUpInfo.value = { from, to, levelName }
    showLevelUp.value = true
  }

  function dismissLevelUp() {
    showLevelUp.value = false
  }

  return {
    trustRecord,
    showLevelUp,
    levelUpInfo,
    loading,
    error,
    fetchTrust,
    checkIn,
    refreshAfterGift,
    triggerLevelUp,
    dismissLevelUp,
  }
})
