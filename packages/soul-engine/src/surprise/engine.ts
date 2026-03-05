/**
 * 惊喜决策引擎（确定性阈值版）
 *
 * 所有触发判定均基于确定性阈值，绝不使用 Math.random()。
 * 当信赖等级和零花钱余额同时满足阈值条件时，惊喜必然触发。
 */

import type { SurpriseType } from '../types/surprise'
import {
  DEFAULT_BUDGET_CONTROL,
  MONTHLY_SUBSCRIBER_COOLDOWN_DAYS,
  SURPRISE_THRESHOLDS,
} from '../types/surprise'

// ============================================================
// 类型定义
// ============================================================

/** 惊喜触发上下文 */
export interface SurpriseTriggerContext {
  /** 当前信赖等级 */
  trustLevel: number
  /** 零花钱余额（单位：分） */
  pocketBalance: number
  /** 上次惊喜触发日期 */
  lastSurpriseDate: Date | null
  /** 本月已触发惊喜次数 */
  monthlySurpriseCount: number
  /** 是否为月卡用户 */
  isMonthlyCard: boolean
  /** 用户偏好关键词 */
  preferences: string[]
}

/** 触发检查结果 */
export interface TriggerCheckResult {
  /** 是否应该触发惊喜 */
  shouldTrigger: boolean
  /** 所有可触发的惊喜类型列表 */
  availableTypes: SurpriseType[]
  /** 推荐的最佳惊喜类型 */
  bestType: SurpriseType | null
  /** 触发/未触发的详细原因 */
  reasons: string[]
}

// ============================================================
// 惊喜类型优先级（越高越优先）
// ============================================================

/** 惊喜类型优先级映射，数值越大优先级越高 */
const SURPRISE_TYPE_PRIORITY: Record<SurpriseType, number> = {
  virtual: 1,
  electronic: 2,
  physical: 3,
  personalized: 4,
}

// ============================================================
// 核心函数
// ============================================================

/**
 * 确定性阈值触发检查
 *
 * 遍历所有惊喜阈值配置，检查每种类型的触发条件是否满足。
 * 绝对不使用 Math.random()，完全基于阈值判定。
 */
export function checkThresholdTrigger(
  context: SurpriseTriggerContext,
): TriggerCheckResult {
  const reasons: string[] = []
  const availableTypes: SurpriseType[] = []

  // 1. 月度次数上限检查
  const budget = DEFAULT_BUDGET_CONTROL
  if (context.monthlySurpriseCount >= budget.monthlyMaxCount) {
    return {
      shouldTrigger: false,
      availableTypes: [],
      bestType: null,
      reasons: [`本月惊喜次数已达上限（${budget.monthlyMaxCount}次）`],
    }
  }

  // 2. 冷却期检查
  const cooldownResult = checkCooldown(
    context.lastSurpriseDate,
    context.isMonthlyCard,
  )
  if (cooldownResult.inCooldown) {
    return {
      shouldTrigger: false,
      availableTypes: [],
      bestType: null,
      reasons: [
        `惊喜冷却期内，还需等待${cooldownResult.daysRemaining}天`,
      ],
    }
  }

  // 3. 逐一检查每种惊喜类型的阈值条件
  for (const threshold of SURPRISE_THRESHOLDS) {
    // 3a. 信赖等级检查
    if (context.trustLevel < threshold.minTrustLevel) {
      reasons.push(
        `${threshold.description}：信赖等级不足（当前Lv.${context.trustLevel}，需要Lv.${threshold.minTrustLevel}）`,
      )
      continue
    }

    // 3b. 零花钱余额检查
    if (context.pocketBalance < threshold.minPocketBalance) {
      reasons.push(
        `${threshold.description}：零花钱不足（当前${context.pocketBalance}分，需要${threshold.minPocketBalance}分）`,
      )
      continue
    }

    // 3c. 条件全部满足，加入可触发列表
    availableTypes.push(threshold.type)
    reasons.push(`${threshold.description}：条件满足，可触发`)
  }

  // 4. 选择最佳惊喜类型
  const bestType = availableTypes.length > 0
    ? selectSurpriseType(availableTypes, context.trustLevel)
    : null

  return {
    shouldTrigger: availableTypes.length > 0,
    availableTypes,
    bestType,
    reasons,
  }
}

/**
 * 按信赖等级选择最合适的惊喜类型
 *
 * 优先级顺序：personalized > physical > electronic > virtual
 */
export function selectSurpriseType(
  availableTypes: SurpriseType[],
  _trustLevel: number,
): SurpriseType {
  if (availableTypes.length === 0) {
    return 'virtual'
  }

  const sorted = [...availableTypes].sort(
    (a, b) => SURPRISE_TYPE_PRIORITY[b] - SURPRISE_TYPE_PRIORITY[a],
  )

  return sorted[0]
}

/**
 * 预算计算
 *
 * recommended = min(池余额 × 0.45, max)
 */
export function calculateBudget(
  pocketBalance: number,
  surpriseType: SurpriseType,
): { min: number, max: number, recommended: number } {
  const threshold = SURPRISE_THRESHOLDS.find(t => t.type === surpriseType)

  if (!threshold) {
    return { min: 0, max: 0, recommended: 0 }
  }

  const { min, max } = threshold.budgetRange

  // 推荐预算 = min(池余额 × 0.45, 类型最大预算)
  const recommended = Math.min(
    Math.floor(pocketBalance * 0.45),
    max,
  )

  // 确保推荐金额不低于最小预算
  const clampedRecommended = Math.max(recommended, min)

  return {
    min,
    max,
    recommended: clampedRecommended,
  }
}

/**
 * 冷却期检查
 *
 * 月卡用户享受缩短的冷却天数（5天 vs 7天）
 */
export function checkCooldown(
  lastSurpriseDate: Date | null,
  isMonthlyCard: boolean,
): { inCooldown: boolean, daysRemaining: number } {
  if (!lastSurpriseDate) {
    return { inCooldown: false, daysRemaining: 0 }
  }

  const cooldownDays = isMonthlyCard
    ? MONTHLY_SUBSCRIBER_COOLDOWN_DAYS
    : 7

  const daysSinceLast = Math.floor(
    (Date.now() - lastSurpriseDate.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (daysSinceLast < cooldownDays) {
    return {
      inCooldown: true,
      daysRemaining: cooldownDays - daysSinceLast,
    }
  }

  return { inCooldown: false, daysRemaining: 0 }
}

/**
 * 生成角色留言
 */
export function generateCharacterMessage(
  _characterName: string,
  productName: string,
  surpriseType: SurpriseType,
): string {
  switch (surpriseType) {
    case 'virtual':
      return `我给你准备了一个小惊喜——${productName}！虽然不是什么贵重的东西，但这是我的心意，希望你能喜欢~`
    case 'electronic':
      return `嘿，我攒了好久的零花钱，终于可以给你买${productName}啦！快去看看吧，我挑了好久才选中的~`
    case 'physical':
      return `今天有个快递要到哦！我用零花钱给你买了${productName}，想到你收到时的表情，我就好开心~`
    case 'personalized':
      return `我想了很久，觉得${productName}最适合你。这是我专门为你挑选的，因为我最了解你嘛！希望每次看到它，你都能想到我~`
    default:
      return `我给你准备了${productName}，希望你喜欢~`
  }
}
