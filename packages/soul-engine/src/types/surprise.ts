/** 惊喜状态 */
export type SurpriseStatus = 'pending' | 'sent' | 'clicked' | 'completed'

/** 惊喜类型（确定性触发，4种类型按信赖等级解锁） */
export type SurpriseType = 'virtual' | 'electronic' | 'physical' | 'personalized'

/** O2O平台 */
export type O2OPlatform = 'meituan' | 'eleme' | 'jd_daojia' | 'pinduoduo'

/** 平台配置 */
export interface PlatformConfig {
  platform: O2OPlatform
  name: string
  deepLinkPrefix: string
  iconUrl: string
}

/** O2O平台配置表 */
export const PLATFORM_CONFIGS: PlatformConfig[] = [
  { platform: 'meituan', name: '美团', deepLinkPrefix: 'imeituan://', iconUrl: '/icons/meituan.svg' },
  { platform: 'eleme', name: '饿了么', deepLinkPrefix: 'eleme://', iconUrl: '/icons/eleme.svg' },
  { platform: 'jd_daojia', name: '京东到家', deepLinkPrefix: 'jddj://', iconUrl: '/icons/jd.svg' },
  { platform: 'pinduoduo', name: '拼多多', deepLinkPrefix: 'pinduoduo://', iconUrl: '/icons/pdd.svg' },
]

/** 惊喜触发阈值配置（确定性触发，替代概率机制） */
export interface SurpriseThreshold {
  /** 惊喜类型 */
  type: SurpriseType
  /** 最低信赖等级要求 */
  minTrustLevel: number
  /** 最低零花钱余额要求（单位：分） */
  minPocketBalance: number
  /** 触发冷却天数 */
  cooldownDays: number
  /** 预算范围（单位：分） */
  budgetRange: { min: number, max: number }
  /** 惊喜描述 */
  description: string
}

/**
 * 惊喜触发阈值配置表（TRUTH_TABLE 6.1节对齐）
 *
 * 确定性触发：当信赖等级和零花钱同时满足阈值时，必然触发。
 * 零概率/零random。
 */
export const SURPRISE_THRESHOLDS: SurpriseThreshold[] = [
  {
    type: 'virtual',
    minTrustLevel: 5,
    minPocketBalance: 0,
    cooldownDays: 7,
    budgetRange: { min: 0, max: 0 },
    description: '虚拟惊喜（壁纸/歌单/故事）',
  },
  {
    type: 'electronic',
    minTrustLevel: 6,
    minPocketBalance: 1500,
    cooldownDays: 7,
    budgetRange: { min: 500, max: 1500 },
    description: '电子惊喜（视频会员/奶茶券）',
  },
  {
    type: 'physical',
    minTrustLevel: 8,
    minPocketBalance: 3000,
    cooldownDays: 7,
    budgetRange: { min: 1000, max: 5000 },
    description: '实物惊喜（外卖/鲜花/小礼品）',
  },
  {
    type: 'personalized',
    minTrustLevel: 9,
    minPocketBalance: 5000,
    cooldownDays: 7,
    budgetRange: { min: 1500, max: 10000 },
    description: '个性化惊喜（定制礼物）',
  },
]

/** 月卡用户惊喜冷却天数（TRUTH_TABLE 6.2节对齐） */
export const MONTHLY_SUBSCRIBER_COOLDOWN_DAYS = 5

/** 惊喜记录 */
export interface SurpriseRecord {
  id: string
  characterId: string
  userId: string
  /** 惊喜类型 */
  surpriseType: SurpriseType
  productName: string
  productUrl?: string
  productImage?: string
  /** 花费金额（单位：分） */
  amount: number
  platform: O2OPlatform
  triggerReason: string
  status: SurpriseStatus
  characterMessage: string
  /** 用户对惊喜的反馈 */
  userFeedback: 'love' | 'ok' | 'change' | null
  createdAt: Date
}

/** 惊喜触发条件（确定性判断，无概��） */
export interface SurpriseTriggerCondition {
  /** 要求的信赖等级 */
  trustLevel: number
  /** 最低零花钱余额（单位：分） */
  minPocketBalance: number
  /** 触发冷却天数 */
  cooldownDays: number
}

/** 选品评分权重 */
export interface ScoringWeights {
  preferenceMatch: number
  timingFit: number
  novelty: number
  priceReasonable: number
}

/** 默认评分权重 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  preferenceMatch: 0.4,
  timingFit: 0.3,
  novelty: 0.2,
  priceReasonable: 0.1,
}

/** 预算控制配置 */
export interface BudgetControl {
  /** 单次最大花费比例（相对零花钱池） */
  maxSpendRatio: number
  /** 每月最大惊喜次数 */
  monthlyMaxCount: number
  /** 最小惊喜金额（单位：分） */
  minSurpriseAmount: number
}

/** 默认预算控制（TRUTH_TABLE 6.2节对齐） */
export const DEFAULT_BUDGET_CONTROL: BudgetControl = {
  maxSpendRatio: 0.6,
  monthlyMaxCount: 4,
  minSurpriseAmount: 1000, // 10元
}
