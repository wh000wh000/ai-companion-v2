import { useLocalStorage } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

import { useNarrativeStore } from '../stores/narrative'

/**
 * 情感节奏追踪器
 *
 * 原理：
 * - 追踪用户当前对话的「情感密度」（基于对话长度、深度话题关键词、时间段）
 * - 在情感密度达到阈值且不在冷却期时，通知叙事系统可以展示 HandwrittenCard
 * - 绝不在前14天触发任何付费入口
 *
 * 情感密度评分规则：
 * - 基础分：对话轮次 * 0.5
 * - 深度话题加分：出现历史/哲学/人生/自省等关键词 +2
 * - 深夜加分：22:00-02:00 +1.5
 * - 长停顿加分：用户沉默>30秒后回复 +1
 * - 阈值：评分 >= 8 时可触发
 */

// 深度话题关键词（中文）
const DEEP_TOPIC_KEYWORDS = [
  '人生', '意义', '哲学', '自省', '回忆', '梦想', '未来',
  '孤独', '成长', '理想', '信仰', '命运', '选择', '遗憾',
  '温暖', '感动', '珍惜', '陪伴', '理解', '灵魂', '内心',
  '幸福', '自由', '勇气', '坚持', '希望', '思考', '感悟',
  '历史', '文化', '艺术', '诗', '音乐', '星空', '时间',
]

// 触发情感密度的阈值
const DENSITY_THRESHOLD = 8

// 前14天不触发的保护期（天数）
const PROTECTION_DAYS = 14

export function useEmotionalRhythm() {
  const narrativeStore = useNarrativeStore()

  // 情感密度分数
  const density = ref(0)

  // 对话轮次计数
  const messageCount = ref(0)

  // 上一条消息的时间戳（用于检测沉默）
  const lastMessageTimestamp = ref(0)

  // 是否可以触发付费涌现
  const canTrigger = ref(false)

  // 首次互动日期（持久化），用于计算互动天数
  const firstInteractionDate = useLocalStorage<string>('emotional_rhythm_first_interaction', '')

  // 互动天数（从首次对话算起）
  const interactionDays = computed(() => {
    if (!firstInteractionDate.value)
      return 0
    const first = new Date(firstInteractionDate.value)
    const now = new Date()
    const diff = now.getTime() - first.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  })

  // 是否在保护期内（前14天不触发）
  const isInProtection = computed(() => interactionDays.value < PROTECTION_DAYS)

  /**
   * 初始化首次互动日期
   * 应在用户首次发消息时调用
   */
  function ensureFirstInteraction() {
    if (!firstInteractionDate.value) {
      firstInteractionDate.value = new Date().toISOString()
    }
  }

  /**
   * 检查当前时间是否处于深夜时段（22:00-02:00）
   */
  function isLateNight(): boolean {
    const hour = new Date().getHours()
    return hour >= 22 || hour < 2
  }

  /**
   * 检查消息内容是否包含深度话题关键词
   */
  function containsDeepTopics(content: string): boolean {
    return DEEP_TOPIC_KEYWORDS.some(keyword => content.includes(keyword))
  }

  /**
   * 记录一条对话消息，更新情感密度
   */
  function recordMessage(content: string) {
    ensureFirstInteraction()

    const now = Date.now()
    messageCount.value++

    // 基础分：每轮对话 +0.5
    density.value += 0.5

    // 深度话题加分：+2
    if (containsDeepTopics(content)) {
      density.value += 2
    }

    // 深夜加分：+1.5
    if (isLateNight()) {
      density.value += 1.5
    }

    // 长停顿加分：沉默 > 30秒后回复 +1
    if (lastMessageTimestamp.value > 0) {
      const silence = now - lastMessageTimestamp.value
      if (silence > 30000) {
        density.value += 1
      }
    }

    lastMessageTimestamp.value = now

    // 更新触发状态
    canTrigger.value = checkTrigger()
  }

  /**
   * 记录用户沉默（由外部计时器调用）
   */
  function recordSilence(durationMs: number) {
    if (durationMs > 30000) {
      density.value += 1
      canTrigger.value = checkTrigger()
    }
  }

  /**
   * 检查是否可以触发付费涌现
   * 满足三个条件才触发：
   * 1. 不在保护期内（前14天绝不触发）
   * 2. 不在冷却期内（距上次付费至少7天）
   * 3. 情感密度达到阈值
   */
  function checkTrigger(): boolean {
    // 前14天绝不触发
    if (isInProtection.value)
      return false

    // 冷却期内不触发
    if (narrativeStore.isInCooldown)
      return false

    // 情感密度不够不触发
    return density.value >= DENSITY_THRESHOLD
  }

  /**
   * 重置情感密度（对话结束或切换角色时调用）
   */
  function reset() {
    density.value = 0
    messageCount.value = 0
    lastMessageTimestamp.value = 0
    canTrigger.value = false
  }

  // 监听密度变化，实时更新触发状态
  watch(density, () => {
    canTrigger.value = checkTrigger()
  })

  return {
    density,
    messageCount,
    canTrigger,
    interactionDays,
    isInProtection,
    recordMessage,
    recordSilence,
    checkTrigger,
    reset,
  }
}
