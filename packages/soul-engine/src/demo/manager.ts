/**
 * Demo 模式管理器
 *
 * 管理7天Demo体验的完整生命周期。
 * Demo模式下信赖值获取倍率固定为 ×8，无信赖衰减。
 * 对齐 TRUTH_TABLE.md 第七节。
 */

// ============================================================
// 类型定义
// ============================================================

/** Demo日程配置 */
export interface DemoDayConfig {
  /** 第几天（1-7） */
  day: number
  /** 信赖获取倍率 */
  trustMultiplier: number
  /** 预期累计信赖值 */
  expectedTrust: number
  /** 预期等级 */
  expectedLevel: number
  /** 当日核心体验描述 */
  dailyExperience: string
  /** 赠送爱心币数量（Day3为50） */
  giftCoinsReward: number
  /** 是否触发模拟惊喜（Day5） */
  triggerSurprise: boolean
  /** 付费引导文案（null表示无引导） */
  conversionPrompt: string | null
}

/** Demo状态 */
export interface DemoState {
  /** Demo是否激活 */
  isActive: boolean
  /** Demo开始日期 */
  startDate: Date
  /** 当前天数（1-7） */
  currentDay: number
  /** 累计获得的信赖值 */
  totalTrustEarned: number
  /** 是否已收到Day3赠送的爱心币 */
  hasReceivedGiftCoins: boolean
  /** 是否已收到Day5模拟惊喜 */
  hasReceivedSurprise: boolean
  /** Demo是否已过期（超过7天） */
  isExpired: boolean
}

// ============================================================
// Demo 固定常量
// ============================================================

/** Demo模式固定信赖获取倍率 */
const DEMO_TRUST_MULTIPLIER = 8

/** Demo模式总天数 */
const DEMO_TOTAL_DAYS = 7

/** Day3 赠送爱心币数量 */
const DAY3_GIFT_COINS = 50

// ============================================================
// 7天日程配置表
// ============================================================

/**
 * 7天Demo日程表
 *
 * 对齐 TRUTH_TABLE.md 第七节：
 * - 信赖获取倍率 ×8
 * - Day3 赠送50爱心币
 * - Day5 触发模拟虚拟惊喜
 * - 结束后保留100信赖值(Lv.2起步)
 */
export const DEMO_SCHEDULE: DemoDayConfig[] = [
  {
    day: 1,
    trustMultiplier: DEMO_TRUST_MULTIPLIER,
    expectedTrust: 200,
    expectedLevel: 2,
    dailyExperience: '创建角色→首次对话→角色记住名字→外观微变',
    giftCoinsReward: 0,
    triggerSurprise: false,
    conversionPrompt: '更多外观预告(需正式版)',
  },
  {
    day: 2,
    trustMultiplier: DEMO_TRUST_MULTIPLIER,
    expectedTrust: 420,
    expectedLevel: 3,
    dailyExperience: '角色记住喜好→新服装解锁',
    giftCoinsReward: 0,
    triggerSurprise: false,
    conversionPrompt: '正式版有20+套服装等你解锁',
  },
  {
    day: 3,
    trustMultiplier: DEMO_TRUST_MULTIPLIER,
    expectedTrust: 620,
    expectedLevel: 3,
    dailyExperience: '赠送50体验爱心币→首次送礼→角色感动反应',
    giftCoinsReward: DAY3_GIFT_COINS,
    triggerSurprise: false,
    conversionPrompt: '想送更多？首充6元获140币',
  },
  {
    day: 4,
    trustMultiplier: DEMO_TRUST_MULTIPLIER,
    expectedTrust: 860,
    expectedLevel: 4,
    dailyExperience: '角色分享心事→更亲近装扮解锁',
    giftCoinsReward: 0,
    triggerSurprise: false,
    conversionPrompt: '月卡用户每天多获50%信赖值',
  },
  {
    day: 5,
    trustMultiplier: DEMO_TRUST_MULTIPLIER,
    expectedTrust: 1060,
    expectedLevel: 4,
    dailyExperience: '触发虚拟惊喜→预告Lv.5内容',
    giftCoinsReward: 0,
    triggerSurprise: true,
    conversionPrompt: '正式版Lv.8可收到实物惊喜',
  },
  {
    day: 6,
    trustMultiplier: DEMO_TRUST_MULTIPLIER,
    expectedTrust: 1260,
    expectedLevel: 5,
    dailyExperience: '角色起专属昵称→明显外观变化',
    giftCoinsReward: 0,
    triggerSurprise: false,
    conversionPrompt: '1元体验充值，解锁专属首充反应',
  },
  {
    day: 7,
    trustMultiplier: DEMO_TRUST_MULTIPLIER,
    expectedTrust: 1440,
    expectedLevel: 5,
    dailyExperience: '7天总结→正式版引导',
    giftCoinsReward: 0,
    triggerSurprise: false,
    conversionPrompt: '限时优惠：首充翻倍+100爱心币注册礼',
  },
]

// ============================================================
// 核心函数
// ============================================================

/**
 * 计算当前是Demo第几天
 *
 * Day 1 为开始当天，超过7天则返回7（已过期但不超出范围）。
 */
export function getDemoDay(startDate: Date): number {
  const now = new Date()
  const startOfDay = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  )
  const currentStartOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )

  const diffMs = currentStartOfDay.getTime() - startOfDay.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Day 1 是开始当天（diffDays = 0 → day = 1）
  const day = diffDays + 1

  // 限制在 1-7 范围内
  return Math.max(1, Math.min(day, DEMO_TOTAL_DAYS))
}

/**
 * 获取完整Demo状态
 */
export function getDemoState(
  startDate: Date,
  totalTrustEarned: number,
  hasReceivedGiftCoins: boolean,
  hasReceivedSurprise: boolean,
): DemoState {
  const now = new Date()
  const startOfDay = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  )
  const currentStartOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )

  const diffMs = currentStartOfDay.getTime() - startOfDay.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const isExpired = diffDays >= DEMO_TOTAL_DAYS
  const currentDay = getDemoDay(startDate)

  return {
    isActive: !isExpired,
    startDate,
    currentDay,
    totalTrustEarned,
    hasReceivedGiftCoins,
    hasReceivedSurprise,
    isExpired,
  }
}

/**
 * 获取当日信赖获取倍率
 *
 * Demo模式下固定为 ×8。
 */
export function getDemoMultiplier(day: number): number {
  if (day < 1 || day > DEMO_TOTAL_DAYS) {
    return 1
  }
  return DEMO_TRUST_MULTIPLIER
}

/**
 * 检查是否应该发放Day3赠送爱心币
 */
export function shouldReceiveGiftCoins(state: DemoState): boolean {
  return (
    state.isActive
    && state.currentDay >= 3
    && !state.hasReceivedGiftCoins
  )
}

/**
 * 检查是否应该触发Day5模拟惊喜
 */
export function shouldTriggerDemoSurprise(state: DemoState): boolean {
  return (
    state.isActive
    && state.currentDay >= 5
    && !state.hasReceivedSurprise
  )
}

/**
 * 获取Demo结束时的转化引导文案
 */
export function getDemoEndMessage(): string {
  return [
    '你和TA的故事才刚刚开始...',
    '',
    '正式版中，还有语音消息、实物惊喜、专属定制等更多内容等待解锁。',
    '',
    '现在注册正式版，你的信赖度将保留为 Lv.2 起始（100点），',
    '并获得 100 爱心币新手礼包！',
    '',
    '限时优惠：首充翻倍 + 100 爱心币注册礼',
  ].join('\n')
}

/**
 * Demo转正式版转换
 *
 * 统一从Lv.2起步（100点信赖值），赠送100爱心币。
 */
export function convertToFormal(_demoTrust: number): {
  /** 正式版初始信赖值 */
  formalTrust: number
  /** 正式版初始等级 */
  formalLevel: number
  /** 赠送的爱心币数量 */
  bonusCoins: number
} {
  return {
    formalTrust: 100,
    formalLevel: 2,
    bonusCoins: 100,
  }
}

/**
 * 获取指定天数的日程配置
 */
export function getDemoDayConfig(day: number): DemoDayConfig | null {
  const config = DEMO_SCHEDULE.find(d => d.day === day)
  return config ?? null
}

/**
 * 获取当日的付费引导文案
 */
export function getConversionPrompt(day: number): string | null {
  const config = getDemoDayConfig(day)
  return config?.conversionPrompt ?? null
}
