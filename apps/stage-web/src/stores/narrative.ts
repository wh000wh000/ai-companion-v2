import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// ─── 叙事支付类型定义 ────────────────────────────────────────────────────────

/** 叙事支付类型 */
export type NarrativeType = 'book' | 'gift' | 'care' | 'experience' | 'course'

/** 叙事阶段 */
export type NarrativePhase = 'initiated' | 'in_progress' | 'delivered' | 'reflected'

/** 叙事进度更新 */
export interface NarrativeUpdate {
  phase: string
  message: string
  timestamp: string
}

/** 叙事支付记录 */
export interface NarrativePayment {
  id: string
  characterId: string
  type: NarrativeType
  storyTitle: string
  storyDescription?: string
  characterQuote?: string
  itemEmoji?: string
  amountCents: number
  status: 'pending' | 'completed' | 'cancelled'
  narrativePhase: NarrativePhase
  narrativeUpdates?: NarrativeUpdate[]
  createdAt: string
}

/** 手写卡片展示数据 */
export interface HandwrittenCardData {
  message: string
  actionText: string
  characterName: string
  paymentData: Partial<NarrativePayment>
}

// ─── 叙事类型配置 ──────────────────────────────────────────────────────────

export const NARRATIVE_TYPE_CONFIG: Record<NarrativeType, { label: string, emoji: string, color: string }> = {
  book: { label: '共读一本书', emoji: '\uD83D\uDCDA', color: 'text-blue-500' },
  gift: { label: '心意礼物', emoji: '\uD83C\uDF81', color: 'text-pink-500' },
  care: { label: '关心时刻', emoji: '\uD83D\uDC9B', color: 'text-amber-500' },
  experience: { label: '共同体验', emoji: '\u2728', color: 'text-purple-500' },
  course: { label: '一起学习', emoji: '\uD83C\uDF1F', color: 'text-green-500' },
}

/** 叙事阶段展示配置 */
export const NARRATIVE_PHASE_CONFIG: Record<NarrativePhase, { label: string, dotClass: string }> = {
  initiated: { label: '已发起', dotClass: 'bg-blue-400' },
  in_progress: { label: '进行中', dotClass: 'bg-amber-400' },
  delivered: { label: '已送达', dotClass: 'bg-green-400' },
  reflected: { label: '已回味', dotClass: 'bg-purple-400' },
}

// ─── Store ────────────────────────────────────────────────────────────────

export const useNarrativeStore = defineStore('narrative', () => {
  // 当前显示的叙事支付卡片（HandwrittenCard 触发用）
  const pendingCard = ref<HandwrittenCardData | null>(null)

  // 是否显示支付确认页
  const showPaymentSheet = ref(false)

  // 进行中的叙事列表
  const activeNarratives = ref<NarrativePayment[]>([])

  // 历史记录
  const history = ref<NarrativePayment[]>([])

  // 加载状态
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 上次支付时间戳（持久化到 localStorage）
  const lastPaymentTimestamp = useLocalStorage<number>('narrative_last_payment_ts', 0)

  // 上次付费距今天数（冷却期控制）
  const daysSinceLastPayment = computed(() => {
    if (!lastPaymentTimestamp.value)
      return Infinity
    const now = Date.now()
    const diff = now - lastPaymentTimestamp.value
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  })

  // 是否在冷却期内（至少7天间隔）
  const isInCooldown = computed(() => daysSinceLastPayment.value < 7)

  // 所有叙事（进行中 + 历史）按时间排序
  const allNarratives = computed(() => {
    return [...activeNarratives.value, ...history.value]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  /**
   * 显示手写卡片
   * 由情感节奏系统在合适时机调用
   */
  function showCard(data: HandwrittenCardData) {
    pendingCard.value = data
  }

  /**
   * 确认支付
   * 将 pendingCard 中的支付数据提交到后端
   */
  async function confirmPayment() {
    if (!pendingCard.value)
      return

    const paymentData = pendingCard.value.paymentData
    isLoading.value = true
    error.value = null

    try {
      const res = await fetch('/api/narrative/payments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })
      if (!res.ok)
        throw new Error(`创建叙事支付失败: ${res.status}`)

      const json = await res.json()
      const data: NarrativePayment = json.payment
      activeNarratives.value.unshift(data)

      // 更新冷却期计时
      lastPaymentTimestamp.value = Date.now()

      // 关闭支付面板和卡片
      showPaymentSheet.value = false
      pendingCard.value = null

      return data
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : '未知错误'
      throw e
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * 关闭手写卡片和支付面板
   */
  function dismiss() {
    pendingCard.value = null
    showPaymentSheet.value = false
  }

  /**
   * 获取进行中的叙事列表
   */
  async function fetchActiveNarratives(characterId: string) {
    isLoading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/narrative/active?characterId=${characterId}`, {
        credentials: 'include',
      })
      if (!res.ok)
        throw new Error(`获取进行中叙事失败: ${res.status}`)
      const json = await res.json()
      activeNarratives.value = json.narratives
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : '未知错误'
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * 获取历史记录
   */
  async function fetchHistory() {
    isLoading.value = true
    error.value = null
    try {
      const res = await fetch('/api/narrative/history', {
        credentials: 'include',
      })
      if (!res.ok)
        throw new Error(`获取叙事历史失败: ${res.status}`)
      const json = await res.json()
      history.value = json.payments
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : '未知错误'
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    pendingCard,
    showPaymentSheet,
    activeNarratives,
    history,
    isLoading,
    error,
    lastPaymentTimestamp,
    daysSinceLastPayment,
    isInCooldown,
    allNarratives,
    showCard,
    confirmPayment,
    dismiss,
    fetchActiveNarratives,
    fetchHistory,
  }
})
