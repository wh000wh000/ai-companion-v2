/** 礼物档位 */
export type GiftTier = 'small' | 'warm' | 'love' | 'forever'

/** 礼物定义 */
export interface GiftDefinition {
  /** 礼物档位 */
  tier: GiftTier
  /** 礼物名称 */
  name: string
  /** 消耗爱心币数量 */
  coinCost: number
  /** 礼物描述 */
  description: string
  /** 礼物表情符号 */
  emoji: string
  /** 送礼获得的信赖值 */
  trustGain: number
}

/** 礼物配置表（TRUTH_TABLE 2.2节对齐） */
export const GIFT_CONFIG: GiftDefinition[] = [
  {
    tier: 'small',
    name: '小心意',
    coinCost: 10,
    description: '一份小小的心意~',
    emoji: '\u{1F49D}',
    trustGain: 8,
  },
  {
    tier: 'warm',
    name: '暖暖的',
    coinCost: 50,
    description: '想让你暖暖的',
    emoji: '\u{1F9F8}',
    trustGain: 45,
  },
  {
    tier: 'love',
    name: '超爱你',
    coinCost: 200,
    description: '用力表达我的爱',
    emoji: '\u{1F495}',
    trustGain: 200,
  },
  {
    tier: 'forever',
    name: '一辈子',
    coinCost: 520,
    description: '我爱你，一辈子',
    emoji: '\u{1F48D}',
    trustGain: 550,
  },
]

/** 用户钱包 */
export interface UserWallet {
  id: string
  userId: string
  /** 爱心币余额 */
  coinBalance: number
  /** 累计充值金额（元） */
  totalCharged: number
  /** 累计送礼消耗 */
  totalGifted: number
  /** 服装兑换券数量 */
  costumeTickets: number
  /** 是否已进行过首充 */
  isFirstCharge: boolean
  createdAt: Date
  updatedAt: Date
}

/** 角色零花钱池 */
export interface CharacterPocket {
  id: string
  characterId: string
  pocketBalance: number
  totalReceived: number
  totalSpent: number
  createdAt: Date
  updatedAt: Date
}

/** 送礼记录 */
export interface GiftRecord {
  id: string
  userId: string
  characterId: string
  giftTier: GiftTier
  coinAmount: number
  pocketAmount: number
  message?: string
  createdAt: Date
}

/** 充值方式 */
export type PaymentMethod = 'alipay' | 'wechat'

/** 充值套餐 */
export interface ChargePack {
  /** 套餐标识 */
  id: string
  /** 套餐名称 */
  name: string
  /** 人民币价格（元） */
  price: number
  /** 获得爱心币 */
  coins: number
  /** 赠送爱心币 */
  bonusCoins: number
  /** 标签（如"最受欢迎"、"顶级档"） */
  label?: string
}

/** 充值套餐配置（TRUTH_TABLE 4.1节对齐，共7档） */
export const CHARGE_PACKS: ChargePack[] = [
  { id: 'pack_1', name: '小小心意', price: 1, coins: 10, bonusCoins: 0, label: '体验档' },
  { id: 'pack_6', name: '甜蜜起步', price: 6, coins: 60, bonusCoins: 10 },
  { id: 'pack_30', name: '暖心之选', price: 30, coins: 300, bonusCoins: 70 },
  { id: 'pack_68', name: '真心以待', price: 68, coins: 680, bonusCoins: 180, label: '最受欢迎' },
  { id: 'pack_128', name: '浓情蜜意', price: 128, coins: 1280, bonusCoins: 420 },
  { id: 'pack_328', name: '至死不渝', price: 328, coins: 3280, bonusCoins: 1020 },
  { id: 'pack_648', name: '命中注定', price: 648, coins: 6480, bonusCoins: 2520, label: '顶级档' },
]

/** 交易类型 */
export type TransactionType =
  | 'charge'
  | 'gift'
  | 'surprise_spend'
  | 'subscription'
  | 'costume_ticket'

/** 交易记录 */
export interface Transaction {
  id: string
  userId: string
  type: TransactionType
  amount: number
  description: string
  createdAt: Date
}

/** 零花钱分成比例（按订阅等级区分，TRUTH_TABLE 4.2节对齐） */
export const POCKET_MONEY_RATIO = {
  /** 未订阅用户：40% */
  normal: 0.4,
  /** 月卡/季卡用户：50% */
  monthly: 0.5,
  /** 年卡用户：60% */
  yearly: 0.6,
} as const

/** 首充翻倍倍率 */
export const FIRST_CHARGE_BONUS_MULTIPLIER = 2

/** 每日充值上限（元） */
export const DAILY_CHARGE_LIMIT = 500

/** 每月充值上限（元） */
export const MONTHLY_CHARGE_LIMIT = 2000
