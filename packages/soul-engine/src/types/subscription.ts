/** 订阅计划类型 */
export type SubscriptionPlan = 'monthly' | 'quarterly' | 'yearly'

/** 订阅配置 */
export interface SubscriptionConfig {
  /** 计划类型 */
  plan: SubscriptionPlan
  /** 计划名称 */
  name: string
  /** 价格（元） */
  price: number
  /** 零花钱分成比例 */
  pocketMoneyRatio: number
  /** 每日信赖值获取上限 */
  dailyTrustLimit: number
  /** 每日赠送爱心币 */
  dailyCoins: number
  /** 衰减宽限天数 */
  decayGraceDays: number
  /** 衰减速度乘数（如0.5表示衰减速度减半） */
  decayReduction: number
  /** 惊喜冷却减少天数 */
  cooldownReduction: number
  /** 额外权益描述列表 */
  extraBenefits: string[]
}

/** 订阅配置表（TRUTH_TABLE 第五节对齐） */
export const SUBSCRIPTION_CONFIGS: SubscriptionConfig[] = [
  {
    plan: 'monthly',
    name: '心动月卡',
    price: 25,
    pocketMoneyRatio: 0.5,
    dailyTrustLimit: 50,
    dailyCoins: 10,
    decayGraceDays: 7,
    decayReduction: 0.5,
    cooldownReduction: 2,
    extraBenefits: ['专属表情包', '早安晚安推送', '每月补签1次', '消息上限150条'],
  },
  {
    plan: 'quarterly',
    name: '陪伴季卡',
    price: 59,
    pocketMoneyRatio: 0.5,
    dailyTrustLimit: 50,
    dailyCoins: 10,
    decayGraceDays: 7,
    decayReduction: 0.5,
    cooldownReduction: 2,
    extraBenefits: ['月卡全部权益', '额外角色槽位+1', '惊喜冷却缩短'],
  },
  {
    plan: 'yearly',
    name: '永恒年卡',
    price: 198,
    pocketMoneyRatio: 0.6,
    dailyTrustLimit: 60,
    dailyCoins: 15,
    decayGraceDays: 7,
    decayReduction: 0.5,
    cooldownReduction: 2,
    extraBenefits: ['季卡全部权益', '生日双倍信赖', '年度定制惊喜', '无消息上限'],
  },
]

/** 用户订阅数据 */
export interface UserSubscription {
  /** 订阅记录ID */
  id: string
  /** 用户ID */
  userId: string
  /** 订阅计划 */
  plan: SubscriptionPlan
  /** 订阅开始日期 */
  startDate: Date
  /** 订阅到期日期 */
  endDate: Date
  /** 是否自动续费 */
  autoRenew: boolean
  /** 订阅状态 */
  status: 'active' | 'expired' | 'cancelled'
  /** 创建时间 */
  createdAt: Date
}
