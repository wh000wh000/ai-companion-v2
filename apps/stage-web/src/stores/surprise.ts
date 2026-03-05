import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** 惊喜状态 */
export type SurpriseStatus = 'pending' | 'sent' | 'clicked' | 'completed'

/** 惊喜类型 */
export type SurpriseType = 'virtual' | 'electronic' | 'physical' | 'personalized'

/** 惊喜记录（对齐后端 Drizzle schema 返回字段） */
export interface SurpriseRecord {
  id: string
  characterId: string
  userId: string
  /** 惊喜类型 */
  type: SurpriseType
  productName: string | null
  productUrl?: string | null
  /** 花费金额（单位：分） */
  amount: number
  status: SurpriseStatus
  /** 后端字段名为 message */
  message: string | null
  feedback: 'love' | 'ok' | 'change' | null
  createdAt: string
}

/** 惊喜触发阈值（分），对齐 TRUTH_TABLE 6.1 */
export const SURPRISE_THRESHOLDS = [
  { type: 'virtual' as SurpriseType, minPocketBalance: 0, label: '虚拟惊喜' },
  { type: 'electronic' as SurpriseType, minPocketBalance: 1500, label: '电子惊喜' },
  { type: 'physical' as SurpriseType, minPocketBalance: 3000, label: '实物惊喜' },
  { type: 'personalized' as SurpriseType, minPocketBalance: 5000, label: '个性化惊喜' },
] as const

export const useSurpriseStore = defineStore('surprise', () => {
  const surprises = ref<SurpriseRecord[]>([])
  const pendingSurprise = ref<SurpriseRecord | null>(null)
  const showAnimation = ref(false)
  const isLoading = ref(false)
  const hasMore = ref(true)
  const error = ref<string | null>(null)
  const filter = ref<'all' | SurpriseType>('all')

  const filteredSurprises = computed(() => {
    if (filter.value === 'all')
      return surprises.value
    return surprises.value.filter(s => s.type === filter.value)
  })

  async function fetchSurprises(reset?: boolean) {
    if (!hasMore.value && !reset)
      return

    isLoading.value = true
    error.value = null

    const offset = reset ? 0 : surprises.value.length
    const limit = 20

    try {
      const res = await fetch(`/api/surprises?limit=${limit}&offset=${offset}`, {
        credentials: 'include',
      })
      if (!res.ok)
        throw new Error(`Failed to fetch surprises: ${res.status}`)
      const data: SurpriseRecord[] = await res.json()

      if (reset)
        surprises.value = data
      else
        surprises.value.push(...data)

      hasMore.value = data.length >= limit
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    }
    finally {
      isLoading.value = false
    }
  }

  async function checkTrigger(characterId: string) {
    try {
      const res = await fetch('/api/surprises/check', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      })
      if (!res.ok)
        throw new Error(`Check trigger failed: ${res.status}`)
      const data = await res.json()
      if (data.surprise) {
        showSurprise(data.surprise)
      }
      return data
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return null
    }
  }

  async function submitFeedback(id: string, status: string, feedback?: string) {
    try {
      const res = await fetch(`/api/surprises/${id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, feedback }),
      })
      if (!res.ok)
        throw new Error(`Submit feedback failed: ${res.status}`)
      const data = await res.json()

      const idx = surprises.value.findIndex(s => s.id === id)
      if (idx !== -1)
        surprises.value[idx] = data

      return data
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return null
    }
  }

  function showSurprise(surprise: SurpriseRecord) {
    pendingSurprise.value = surprise
    showAnimation.value = true
  }

  function dismissSurprise() {
    showAnimation.value = false
    pendingSurprise.value = null
  }

  return {
    surprises,
    pendingSurprise,
    showAnimation,
    isLoading,
    hasMore,
    error,
    filter,
    filteredSurprises,
    fetchSurprises,
    checkTrigger,
    submitFeedback,
    showSurprise,
    dismissSurprise,
  }
})
