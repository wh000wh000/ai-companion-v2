import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  convertToFormal,
  getConversionPrompt,
  getDemoDay,
  getDemoDayConfig,
  getDemoEndMessage,
  getDemoState,
  shouldReceiveGiftCoins,
  shouldTriggerDemoSurprise,
} from '@ai-companion/soul-engine'
import type { DemoDayConfig, DemoState } from '@ai-companion/soul-engine'

interface PersistedDemoState {
  isDemo: boolean
  startDate: string
  completedDays: number[]
  totalTrustEarned: number
  hasReceivedGiftCoins: boolean
  hasReceivedSurprise: boolean
  chatCount: number
}

const STORAGE_KEY = 'demo_state'

export const useDemoStore = defineStore('demo', () => {
  const isDemo = ref(false)
  const startDate = ref<string | null>(null)
  const currentDay = ref(0)
  const completedDays = ref<number[]>([])
  const totalTrustEarned = ref(0)
  const hasReceivedGiftCoins = ref(false)
  const hasReceivedSurprise = ref(false)
  const chatCount = ref(0)

  const demoState = computed<DemoState | null>(() => {
    if (!isDemo.value || !startDate.value)
      return null
    return getDemoState(
      new Date(startDate.value),
      totalTrustEarned.value,
      hasReceivedGiftCoins.value,
      hasReceivedSurprise.value,
    )
  })

  const isExpired = computed(() => {
    return demoState.value?.isExpired ?? false
  })

  const remainingDays = computed(() => {
    return Math.max(0, 7 - currentDay.value)
  })

  // 初始化Demo
  function startDemo() {
    const now = new Date().toISOString()
    isDemo.value = true
    startDate.value = now
    currentDay.value = 1
    completedDays.value = []
    totalTrustEarned.value = 0
    hasReceivedGiftCoins.value = false
    hasReceivedSurprise.value = false
    chatCount.value = 0
    persist()
  }

  // 加载持久化状态
  function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved)
      return

    try {
      const data: PersistedDemoState = JSON.parse(saved)
      isDemo.value = data.isDemo
      startDate.value = data.startDate
      completedDays.value = data.completedDays ?? []
      totalTrustEarned.value = data.totalTrustEarned ?? 0
      hasReceivedGiftCoins.value = data.hasReceivedGiftCoins ?? false
      hasReceivedSurprise.value = data.hasReceivedSurprise ?? false
      chatCount.value = data.chatCount ?? 0

      // 根据 startDate 计算 currentDay
      if (data.startDate) {
        currentDay.value = getDemoDay(new Date(data.startDate))
      }
    }
    catch {
      // 持久化数据损坏，忽略
    }
  }

  // 持久化到 localStorage
  function persist() {
    const data: PersistedDemoState = {
      isDemo: isDemo.value,
      startDate: startDate.value ?? '',
      completedDays: completedDays.value,
      totalTrustEarned: totalTrustEarned.value,
      hasReceivedGiftCoins: hasReceivedGiftCoins.value,
      hasReceivedSurprise: hasReceivedSurprise.value,
      chatCount: chatCount.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  // 获取当天配置（调用 soul-engine）
  function getDayConfig(): DemoDayConfig | null {
    return getDemoDayConfig(currentDay.value)
  }

  // 标记今天完成
  function completeDay() {
    if (!completedDays.value.includes(currentDay.value)) {
      completedDays.value.push(currentDay.value)
      persist()
    }
  }

  // 检查是否应该赠送金币（Day 3）
  function checkGiftCoins(): boolean {
    if (!demoState.value)
      return false
    return shouldReceiveGiftCoins(demoState.value)
  }

  // 标记已领取赠送金币
  function markGiftCoinsReceived() {
    hasReceivedGiftCoins.value = true
    persist()
  }

  // 检查是否应该触发Demo惊喜（Day 5）
  function checkDemoSurprise(): boolean {
    if (!demoState.value)
      return false
    return shouldTriggerDemoSurprise(demoState.value)
  }

  // 标记已收到Demo惊喜
  function markSurpriseReceived() {
    hasReceivedSurprise.value = true
    persist()
  }

  // 增加对话计数
  function incrementChat() {
    chatCount.value++
    persist()
  }

  // 增加信赖值
  function addTrust(amount: number) {
    totalTrustEarned.value += amount
    persist()
  }

  // 转为正式用户
  function convert() {
    const result = convertToFormal(totalTrustEarned.value)
    isDemo.value = false
    startDate.value = null
    currentDay.value = 0
    completedDays.value = []
    localStorage.removeItem(STORAGE_KEY)
    return result
  }

  // 获取转化引导文案（当日）
  function getConversionText(): string | null {
    return getConversionPrompt(currentDay.value)
  }

  // 获取Demo结束总文案
  function getEndMessage(): string {
    return getDemoEndMessage()
  }

  // Demo统计数据
  const demoStats = computed(() => ({
    chatCount: chatCount.value,
    trustGained: totalTrustEarned.value,
    surpriseReceived: hasReceivedSurprise.value ? 1 : 0,
    daysCompleted: completedDays.value.length,
  }))

  return {
    isDemo,
    startDate,
    currentDay,
    completedDays,
    totalTrustEarned,
    hasReceivedGiftCoins,
    hasReceivedSurprise,
    chatCount,
    demoState,
    isExpired,
    remainingDays,
    demoStats,
    startDemo,
    loadState,
    getDayConfig,
    completeDay,
    checkGiftCoins,
    markGiftCoinsReceived,
    checkDemoSurprise,
    markSurpriseReceived,
    incrementChat,
    addTrust,
    convert,
    getConversionText,
    getEndMessage,
  }
})
