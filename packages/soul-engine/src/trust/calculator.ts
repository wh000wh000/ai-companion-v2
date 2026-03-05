/**
 * 信赖度计算引擎（v2）
 *
 * 完全对齐 TRUTH_TABLE.md 数值。
 * 管理信赖值获取、连续签到加成、衰减、等级判定、升级冷却。
 */

import type { TrustLevel } from '../types/character'
import { TRUST_LEVEL_CONFIG } from '../types/character'

// ────────────────────────────── 类型定义 ──────────────────────────────

/** 信赖值获取事件类型 */
export type TrustEventType =
  | 'daily_checkin' // 每日签到
  | 'chat_round' // 每轮对话 (+1, 上限15轮)
  | 'deep_chat' // 深度对话(>10轮, +10)
  | 'share_mood' // 分享心情 (+8)
  | 'daily_task' // 完成每日任务 (+5)
  | 'gift_small' // 送小心意 (+8)
  | 'gift_warm' // 送暖暖的 (+45)
  | 'gift_love' // 送超爱你 (+200)
  | 'gift_forever' // 送一辈子 (+550)

/** 用户上下文（日结算所需的全部状态） */
export interface TrustUserContext {
  /** 是否月卡用户 */
  isMonthlyCard: boolean
  /** 是否暂停陪伴 */
  isPaused: boolean
  /** 连续签到天数 */
  streakDays: number
  /** 今日已签到 */
  checkedInToday: boolean
  /** 今日对话轮次 */
  todayChatRounds: number
  /** 今日最长会话轮次 */
  todayMaxSessionRounds: number
  /** 今日深度对话已奖励 */
  deepChatRewardedToday: boolean
  /** 今日已分享心情 */
  sharedMoodToday: boolean
  /** 今日已完成任务数 */
  dailyTasksCompleted: number
  /** 今日送礼获得的信赖值 */
  todayGiftTrust: number
  /** 是否有双倍卡 */
  hasDoubleCard: boolean
  /** 是否Demo模式 */
  isDemo: boolean
}

/** 升级检查结果 */
export interface LevelUpCheckResult {
  /** 是否可升级 */
  canLevelUp: boolean
  /** 目标等级 */
  targetLevel: number
  /** 剩余冷却天数（0 表示无冷却） */
  cooldownRemaining: number
}

/** 信赖值变更结果 */
export interface TrustChangeResult {
  /** 变更后的信赖值 */
  trustPoints: number
  /** 变更后的等级 */
  trustLevel: number
  /** 变更后的连续签到天数 */
  streakDays: number
  /** 本次获取的信赖值（正数） */
  gained: number
  /** 本次衰减的信赖值（正数） */
  decayed: number
  /** 是否升级 */
  leveledUp: boolean
  /** 等级是否进入"动摇中"状态 */
  isShaken: boolean
}

// ────────────────────────────── 常量 ──────────────────────────────

/** Demo模式信赖倍率 */
const DEMO_MULTIPLIER = 8

/** 默认活动加成倍率（无活动时为1.0） */
const DEFAULT_EVENT_MULTIPLIER = 1.0

// ────────────────────────────── 核心函数 ──────────────────────────────

/**
 * 计算用户当日信赖值获取总量
 *
 * 公式对齐 TRUTH_TABLE.md 第二节：
 * total = floor((base × eventMultiplier × doubleCardMultiplier) + giftTrust)
 * Demo模式下 base 额外 ×8
 */
export function calculateDailyTrust(
  user: TrustUserContext,
  eventMultiplier: number = DEFAULT_EVENT_MULTIPLIER,
): number {
  let base = 0

  // 1. 签到基础(5) + 月卡签到加成(+3) + 连续签到加成
  if (user.checkedInToday) {
    base += 5
    if (user.isMonthlyCard)
      base += 3
    base += getStreakBonus(user.streakDays)
  }

  // 2. 对话信赖 = min(todayChatRounds, 15) × 1 × (月卡1.5倍)
  const chatTrust = Math.min(user.todayChatRounds, 15) * 1
  const chatMultiplier = user.isMonthlyCard ? 1.5 : 1.0
  base += Math.floor(chatTrust * chatMultiplier)

  // 3. 深度对话 +10（当日首次，会话轮次>=10）
  if (user.todayMaxSessionRounds >= 10 && !user.deepChatRewardedToday) {
    base += 10
  }

  // 4. 分享心情 +8
  if (user.sharedMoodToday) {
    base += 8
  }

  // 5. 完成每日任务 +5（需完成3个）
  if (user.dailyTasksCompleted >= 3) {
    base += 5
  }

  // 6. 月卡每日 +15
  if (user.isMonthlyCard) {
    base += 15
  }

  // 7. Demo模式 ×8倍率（应用于base，在活动和双倍卡之前）
  if (user.isDemo) {
    base *= DEMO_MULTIPLIER
  }

  // 8. 送礼信赖值（不计入日上限，不受base倍率影响）
  const giftTrust = user.todayGiftTrust

  // 9. 活动加成（默认1.0）+ 双倍卡加成
  const doubleCardMultiplier = user.hasDoubleCard ? 2.0 : 1.0

  // 总计 = floor((base × eventMultiplier × doubleCardMultiplier) + giftTrust)
  const total = Math.floor(
    base * eventMultiplier * doubleCardMultiplier + giftTrust,
  )

  return total
}

/**
 * 连续签到加成
 *
 * 对齐 TRUTH_TABLE.md 2.4节：
 * - days >= 30: 30 + floor((days - 30) / 30) × 5，上限50
 * - days >= 21: 20
 * - days >= 14: 15
 * - days >= 7:  8
 * - days >= 3:  3
 * - else: 0
 */
export function getStreakBonus(days: number): number {
  if (days >= 30) {
    const extraCycles = Math.floor((days - 30) / 30)
    const bonus = 30 + extraCycles * 5
    return Math.min(bonus, 50) // 上限50
  }
  if (days >= 21)
    return 20
  if (days >= 14)
    return 15
  if (days >= 7)
    return 8
  if (days >= 3)
    return 3
  return 0
}

/**
 * 信赖衰减计算
 *
 * 对齐 TRUTH_TABLE.md 第三节：
 * - 暂停模式返回0
 * - 宽限期：普通4天，月卡7天
 * - 超过宽限期后按超出天数分段累计衰减
 *
 * 普通用户分段（超出宽限期后的天数）：
 *   1-3天:  3/天（轻度）
 *   4-10天: 8/天（中度）
 *   11-26天: 15/天（重度）
 *   27天+: 20/天（最大）
 *
 * 月卡用户分段：
 *   1-3天:  1/天
 *   4-10天: 4/天
 *   11-26天: 8/天
 *   27天+: 12/天
 */
export function calculateTrustDecay(
  inactiveDays: number,
  isMonthlyCard: boolean,
  isPaused: boolean,
): number {
  // 暂停模式：信赖冻结，不增不减
  if (isPaused)
    return 0

  // 宽限期
  const gracePeriod = isMonthlyCard ? 7 : 4
  if (inactiveDays <= gracePeriod)
    return 0

  // 超过宽限期的有效天数
  const effectiveDays = inactiveDays - gracePeriod

  // 逐日累加衰减（按分段计算每一天的衰减值）
  let totalDecay = 0
  for (let day = 1; day <= effectiveDays; day++) {
    totalDecay += getDailyDecayRate(day, isMonthlyCard)
  }

  return totalDecay
}

/**
 * 获取指定超出宽限期天数对应的每日衰减速率
 */
function getDailyDecayRate(
  effectiveDay: number,
  isMonthlyCard: boolean,
): number {
  if (isMonthlyCard) {
    if (effectiveDay <= 3)
      return 1 // 轻度
    if (effectiveDay <= 10)
      return 4 // 中度
    if (effectiveDay <= 26)
      return 8 // 重度
    return 12 // 最大
  }
  else {
    if (effectiveDay <= 3)
      return 3 // 轻度
    if (effectiveDay <= 10)
      return 8 // 中度
    if (effectiveDay <= 26)
      return 15 // 重度
    return 20 // 最大
  }
}

/**
 * 衰减下限计算
 *
 * 对齐 TRUTH_TABLE.md 3.3节：
 * 衰减下限 = floor((当前等级起始值 + 上一等级起始值) / 2)
 */
export function getDecayFloor(currentLevel: number): number {
  if (currentLevel <= 1)
    return 0

  const currentConfig = TRUST_LEVEL_CONFIG.find(
    c => c.level === currentLevel,
  )
  const prevConfig = TRUST_LEVEL_CONFIG.find(
    c => c.level === currentLevel - 1,
  )

  if (!currentConfig || !prevConfig)
    return 0

  return Math.floor(
    (currentConfig.requiredPoints + prevConfig.requiredPoints) / 2,
  )
}

/**
 * 根据信赖值确定等级
 */
export function determineTrustLevel(trustPoints: number): number {
  let level = 1
  for (const config of TRUST_LEVEL_CONFIG) {
    if (trustPoints >= config.requiredPoints) {
      level = config.level
    }
    else {
      break
    }
  }
  return level
}

/**
 * 检查是否可以升级（含冷却时间检查）
 *
 * 对齐 TRUTH_TABLE.md 第一节冷却天数列
 */
export function checkLevelUp(
  currentLevel: number,
  trustPoints: number,
  daysAtCurrentLevel: number,
): LevelUpCheckResult {
  // 已满级
  if (currentLevel >= 10) {
    return { canLevelUp: false, targetLevel: 10, cooldownRemaining: 0 }
  }

  // 检查信赖值是否达到下一等级门槛
  const nextLevelConfig = TRUST_LEVEL_CONFIG.find(
    c => c.level === currentLevel + 1,
  )

  if (!nextLevelConfig || trustPoints < nextLevelConfig.requiredPoints) {
    return {
      canLevelUp: false,
      targetLevel: currentLevel,
      cooldownRemaining: 0,
    }
  }

  // 获取当前等级的冷却时间
  const currentLevelConfig = TRUST_LEVEL_CONFIG.find(
    c => c.level === currentLevel,
  )
  const cooldownDays = currentLevelConfig?.cooldownDays ?? 0

  // 检查冷却
  const cooldownRemaining = Math.max(0, cooldownDays - daysAtCurrentLevel)

  return {
    canLevelUp: cooldownRemaining === 0,
    targetLevel: currentLevel + 1,
    cooldownRemaining,
  }
}

/**
 * 应用信赖值变更（日结算入口）
 *
 * 综合计算当日获取、衰减、等级判定，返回完整的变更结果。
 */
export function applyTrustChange(
  current: Pick<TrustLevel, 'trustPoints' | 'trustLevel' | 'streakDays'>,
  user: TrustUserContext,
  inactiveDays: number,
  daysAtCurrentLevel: number,
  eventMultiplier: number = DEFAULT_EVENT_MULTIPLIER,
): TrustChangeResult {
  let { trustPoints, trustLevel, streakDays } = current
  const originalLevel = trustLevel

  // ── 1. 计算衰减 ──
  const rawDecay = calculateTrustDecay(
    inactiveDays,
    user.isMonthlyCard,
    user.isPaused,
  )

  // 应用衰减下限
  const decayFloor = getDecayFloor(trustLevel)
  const afterDecay = Math.max(trustPoints - rawDecay, decayFloor)
  const actualDecay = trustPoints - afterDecay
  trustPoints = afterDecay

  // ── 2. 更新连续签到天数 ──
  if (inactiveDays === 0) {
    // 当天已有互动，保持不变
  }
  else if (inactiveDays === 1) {
    // 昨天互动过，连续+1
    streakDays = streakDays + 1
  }
  else {
    // 超过1天未互动，重置连续天数
    streakDays = 1
  }

  // ── 3. 计算当日获取 ──
  const dailyGain = calculateDailyTrust(
    { ...user, streakDays },
    eventMultiplier,
  )
  trustPoints += dailyGain

  // ── 4. 等级判定 ──
  const pointsLevel = determineTrustLevel(trustPoints)

  // ── 5. 升级检查（含冷却） ──
  let newLevel = trustLevel
  if (pointsLevel > trustLevel) {
    const { canLevelUp, targetLevel } = checkLevelUp(
      trustLevel,
      trustPoints,
      daysAtCurrentLevel,
    )
    if (canLevelUp) {
      newLevel = targetLevel
    }
    // 冷却未结束时保持当前等级，信赖值继续累积
  }
  else if (pointsLevel < trustLevel) {
    // 信赖值低于当前等级门槛，进入"动摇中"状态
    // 注意：衰减只掉点数不立即掉等级
    newLevel = trustLevel
  }

  // 检查是否处于"动摇中"状态
  const currentLevelConfig = TRUST_LEVEL_CONFIG.find(
    c => c.level === newLevel,
  )
  const isShaken = currentLevelConfig
    ? trustPoints < currentLevelConfig.requiredPoints
    : false

  return {
    trustPoints,
    trustLevel: newLevel,
    streakDays,
    gained: dailyGain,
    decayed: actualDecay,
    leveledUp: newLevel > originalLevel,
    isShaken,
  }
}

// ────────────────────────────── 辅助函数 ──────────────────────────────

/**
 * 获取指定事件类型对应的信赖值
 */
export function getTrustEventValue(eventType: TrustEventType): number {
  const values: Record<TrustEventType, number> = {
    daily_checkin: 5,
    chat_round: 1,
    deep_chat: 10,
    share_mood: 8,
    daily_task: 5,
    gift_small: 8,
    gift_warm: 45,
    gift_love: 200,
    gift_forever: 550,
  }
  return values[eventType]
}

/**
 * 获取等级名称
 */
export function getTrustLevelName(level: number): string {
  const config = TRUST_LEVEL_CONFIG.find(c => c.level === level)
  return config?.name ?? '未知'
}

/**
 * 获取达到指定等级所需的信赖值
 */
export function getRequiredPoints(level: number): number {
  const config = TRUST_LEVEL_CONFIG.find(c => c.level === level)
  return config?.requiredPoints ?? Infinity
}

/**
 * 计算到下一等级的进度百分比
 */
export function getLevelProgress(
  trustPoints: number,
  currentLevel: number,
): number {
  if (currentLevel >= 10)
    return 100

  const currentRequired = getRequiredPoints(currentLevel)
  const nextRequired = getRequiredPoints(currentLevel + 1)

  if (nextRequired === Infinity)
    return 100

  const progress = trustPoints - currentRequired
  const needed = nextRequired - currentRequired

  if (needed <= 0)
    return 100

  return Math.min(100, Math.max(0, Math.floor((progress / needed) * 100)))
}
