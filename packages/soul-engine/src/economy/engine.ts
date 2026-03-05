/**
 * 经济引擎
 *
 * 处理充值、送礼、零花钱分成、消费限额等经济系统核心逻辑。
 * 对齐 TRUTH_TABLE.md 第四节经济体系。
 *
 * 单位约定：
 * - 爱心币（coinBalance）：虚拟货币整数，10币 = 1元
 * - 零花钱（pocketBalance）：以"分"为单位（1元 = 100分）
 * - 平台收入（platformRevenue）：以"分"为单位
 * - 价格（price）：以"元"为单位
 */

import type { ChargePack, GiftTier } from '../types/wallet'
import type { SubscriptionPlan } from '../types/subscription'
import {
  CHARGE_PACKS,
  DAILY_CHARGE_LIMIT,
  FIRST_CHARGE_BONUS_MULTIPLIER,
  GIFT_CONFIG,
  POCKET_MONEY_RATIO,
} from '../types/wallet'

// ────────────────────────────── 类型定义 ──────────────────────────────

/** 充值结果 */
export interface ChargeResult {
  /** 是否成功 */
  success: boolean
  /** 实际获得爱心币（含赠送+首充翻倍） */
  coinsAdded: number
  /** 基础爱心币（套餐标准数量） */
  baseCoins: number
  /** 赠送爱心币 */
  bonusCoins: number
  /** 首充翻倍额外获得（基础币×(倍率-1)） */
  firstChargeBonus: number
  /** 充值后余额 */
  newBalance: number
  /** 错误信息（失败时） */
  error?: string
}

/** 送礼结果 */
export interface GiftSendResult {
  /** 是否成功 */
  success: boolean
  /** 扣减爱心币 */
  coinsDeducted: number
  /** 获得信赖值 */
  trustGain: number
  /** 零花钱增长（分） */
  pocketMoneyGain: number
  /** 平台收入（分） */
  platformRevenue: number
  /** 新爱心币余额 */
  newCoinBalance: number
  /** 新零花钱余额（分） */
  newPocketBalance: number
  /** 错误信息（失败时） */
  error?: string
}

/** 消费限额检查结果 */
export interface SpendingLimitCheck {
  /** 是否允许消费 */
  allowed: boolean
  /** 拒绝原因（不允许时） */
  reason?: string
}

// ────────────────────────────── 充值处理 ──────────────────────────────

/**
 * 充值处理
 *
 * 首充翻倍规则（对齐 TRUTH_TABLE.md 4.1节）：
 * - 首次充值任意档位，基础爱心币×2（不含赠送）
 * - 例：6元首充 = 60(基础) + 10(赠送) + 60(首充翻倍) = 130币
 */
export function processCharge(
  packId: string,
  currentBalance: number,
  isFirstCharge: boolean,
): ChargeResult {
  // 查找套餐
  const pack = CHARGE_PACKS.find(p => p.id === packId)
  if (!pack) {
    return {
      success: false,
      coinsAdded: 0,
      baseCoins: 0,
      bonusCoins: 0,
      firstChargeBonus: 0,
      newBalance: currentBalance,
      error: `未找到充值套餐: ${packId}`,
    }
  }

  const baseCoins = pack.coins
  const bonusCoins = pack.bonusCoins

  // 首充翻倍：基础币 × (倍率 - 1)，不含赠送
  const firstChargeBonus = isFirstCharge
    ? baseCoins * (FIRST_CHARGE_BONUS_MULTIPLIER - 1)
    : 0

  const coinsAdded = baseCoins + bonusCoins + firstChargeBonus
  const newBalance = currentBalance + coinsAdded

  return {
    success: true,
    coinsAdded,
    baseCoins,
    bonusCoins,
    firstChargeBonus,
    newBalance,
  }
}

// ────────────────────────────── 送礼处理 ──────────────────────────────

/**
 * 送礼处理
 *
 * 扣减爱心币 → 计算零花钱分成 → 返回信赖值增长。
 *
 * 分成规则（对齐 TRUTH_TABLE.md 4.2节）：
 * - 爱心币 → 换算人民币（10币 = 1元 = 100分）
 * - 按订阅等级取不同零花钱比例
 */
export function processGift(
  tier: GiftTier,
  currentCoinBalance: number,
  currentPocketBalance: number,
  subscriptionPlan: SubscriptionPlan | null,
): GiftSendResult {
  // 查找礼物配置
  const giftConfig = GIFT_CONFIG.find(g => g.tier === tier)
  if (!giftConfig) {
    return {
      success: false,
      coinsDeducted: 0,
      trustGain: 0,
      pocketMoneyGain: 0,
      platformRevenue: 0,
      newCoinBalance: currentCoinBalance,
      newPocketBalance: currentPocketBalance,
      error: `未找到礼物配置: ${tier}`,
    }
  }

  const { coinCost, trustGain } = giftConfig

  // 检查余额是否足够
  if (currentCoinBalance < coinCost) {
    return {
      success: false,
      coinsDeducted: 0,
      trustGain: 0,
      pocketMoneyGain: 0,
      platformRevenue: 0,
      newCoinBalance: currentCoinBalance,
      newPocketBalance: currentPocketBalance,
      error: `爱心币不足，需要${coinCost}币，当前${currentCoinBalance}币`,
    }
  }

  // 扣减爱心币
  const newCoinBalance = currentCoinBalance - coinCost

  // 换算人民币（分）：10币 = 1元 = 100分
  const totalCentsValue = coinCost * 10

  // 获取零花钱分成比例
  const pocketRatio = getPocketMoneyRatio(subscriptionPlan)

  // 计算零花钱增长（分）
  const pocketMoneyGain = Math.floor(totalCentsValue * pocketRatio)

  // 平台收入（分）
  const platformRevenue = totalCentsValue - pocketMoneyGain

  // 更新零花钱余额
  const newPocketBalance = currentPocketBalance + pocketMoneyGain

  return {
    success: true,
    coinsDeducted: coinCost,
    trustGain,
    pocketMoneyGain,
    platformRevenue,
    newCoinBalance,
    newPocketBalance,
  }
}

// ────────────────────────────── 分成比例 ──────────────────────────────

/**
 * 根据会员等级返回零花钱分成比例
 *
 * 对齐 TRUTH_TABLE.md 4.2节：
 * - 未订阅：40%
 * - 月卡/季卡：50%
 * - 年卡：60%
 */
export function getPocketMoneyRatio(
  plan: SubscriptionPlan | null,
): number {
  if (!plan) {
    return POCKET_MONEY_RATIO.normal
  }

  switch (plan) {
    case 'monthly':
    case 'quarterly':
      return POCKET_MONEY_RATIO.monthly
    case 'yearly':
      return POCKET_MONEY_RATIO.yearly
    default:
      return POCKET_MONEY_RATIO.normal
  }
}

// ────────────────────────────── 消费限额 ──────────────────────────────

/**
 * 消费限额检查
 *
 * 对齐 TRUTH_TABLE.md 4.3节：
 * - 8岁以下：禁止充值
 * - 8-15岁：单次上限20元，月上限100元
 * - 16-17岁：单次上限50元，月上限200元
 * - 成年人：单日上限500元，月上限2000元
 */
export function checkSpendingLimit(
  amount: number,
  userAge: number,
  monthlySpent: number = 0,
): SpendingLimitCheck {
  // 金额基础校验
  if (amount <= 0) {
    return { allowed: false, reason: '消费金额必须大于0' }
  }

  // 未成年人保护（合规要求）
  if (userAge < 8) {
    return {
      allowed: false,
      reason: '8岁以下用户不允许进行充值消费',
    }
  }

  if (userAge < 16) {
    // 8-15岁：单次上限20元，月上限100元
    if (amount > 20) {
      return {
        allowed: false,
        reason: '未满16岁用户单次充值不得超过20元',
      }
    }
    if (monthlySpent + amount > 100) {
      return {
        allowed: false,
        reason: '未满16岁用户月消费不得超过100元',
      }
    }
    return { allowed: true }
  }

  if (userAge < 18) {
    // 16-17岁：单次上限50元，月上限200元
    if (amount > 50) {
      return {
        allowed: false,
        reason: '未满18岁用户单次充值不得超过50元',
      }
    }
    if (monthlySpent + amount > 200) {
      return {
        allowed: false,
        reason: '未满18岁用户月消费不得超过200元',
      }
    }
    return { allowed: true }
  }

  // 成年用户：单日上限 + 月上限2000元
  if (amount > DAILY_CHARGE_LIMIT) {
    return {
      allowed: false,
      reason: `单日充值不得超过${DAILY_CHARGE_LIMIT}元`,
    }
  }
  if (monthlySpent + amount > 2000) {
    return {
      allowed: false,
      reason: '月消费不得超过2000元',
    }
  }

  return { allowed: true }
}

// ────────────────────────────── 辅助函数 ──────────────────────────────

/**
 * 根据套餐ID获取套餐配置
 */
export function getChargePack(packId: string): ChargePack | undefined {
  return CHARGE_PACKS.find(p => p.id === packId)
}

/**
 * 计算爱心币对应的人民币金额（元）
 */
export function coinsToYuan(coins: number): number {
  return coins / 10
}

/**
 * 计算人民币对应的爱心币数量
 */
export function yuanToCoins(yuan: number): number {
  return yuan * 10
}

/**
 * 计算爱心币对应的人民币金额（分）
 */
export function coinsToCents(coins: number): number {
  return coins * 10 // 10币=1元=100分 → 1币=10分
}

/**
 * 获取礼物档位的信赖值
 */
export function getGiftTrustGain(tier: GiftTier): number {
  const config = GIFT_CONFIG.find(g => g.tier === tier)
  return config?.trustGain ?? 0
}

/**
 * 获取礼物档位的爱心币消耗
 */
export function getGiftCoinCost(tier: GiftTier): number {
  const config = GIFT_CONFIG.find(g => g.tier === tier)
  return config?.coinCost ?? 0
}

/**
 * 计算套餐的性价比（每元获得爱心币数量，含赠送）
 */
export function getPackValuePerYuan(
  packId: string,
  isFirstCharge: boolean,
): number {
  const pack = CHARGE_PACKS.find(p => p.id === packId)
  if (!pack || pack.price <= 0)
    return 0

  let totalCoins = pack.coins + pack.bonusCoins
  if (isFirstCharge) {
    totalCoins += pack.coins * (FIRST_CHARGE_BONUS_MULTIPLIER - 1)
  }

  return totalCoins / pack.price
}
