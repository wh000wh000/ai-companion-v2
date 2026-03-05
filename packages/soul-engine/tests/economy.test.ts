/**
 * 经济系统测试
 *
 * 对照 TRUTH_TABLE.md 第四节"爱心币经济体系"验证全部数值。
 * 包括：充值套餐、送礼、分成比例、消费限额、币值转换、性价比计算。
 */
import { describe, it, expect } from 'vitest'

import {
  processCharge,
  processGift,
  getPocketMoneyRatio,
  checkSpendingLimit,
  coinsToYuan,
  yuanToCoins,
  coinsToCents,
  getGiftTrustGain,
  getGiftCoinCost,
  getPackValuePerYuan,
} from '../src/economy/engine'

import {
  CHARGE_PACKS,
  GIFT_CONFIG,
  POCKET_MONEY_RATIO,
  FIRST_CHARGE_BONUS_MULTIPLIER,
  DAILY_CHARGE_LIMIT,
  MONTHLY_CHARGE_LIMIT,
} from '../src/types/wallet'

// ────────────────────────────── 1. CHARGE_PACKS 常量验证 ──────────────────────────────

describe('CHARGE_PACKS 常量验证（TRUTH_TABLE 4.1节）', () => {
  it('应包含正好7档套餐', () => {
    expect(CHARGE_PACKS).toHaveLength(7)
  })

  it('pack_1 — 小小心意：1元, 10币, 赠送0, 体验档', () => {
    const pack = CHARGE_PACKS.find(p => p.id === 'pack_1')
    expect(pack).toBeDefined()
    expect(pack!.name).toBe('小小心意')
    expect(pack!.price).toBe(1)
    expect(pack!.coins).toBe(10)
    expect(pack!.bonusCoins).toBe(0)
    expect(pack!.label).toBe('体验档')
  })

  it('pack_6 — 甜蜜起步：6元, 60币, 赠送+10', () => {
    const pack = CHARGE_PACKS.find(p => p.id === 'pack_6')
    expect(pack).toBeDefined()
    expect(pack!.name).toBe('甜蜜起步')
    expect(pack!.price).toBe(6)
    expect(pack!.coins).toBe(60)
    expect(pack!.bonusCoins).toBe(10)
  })

  it('pack_30 — 暖心之选：30元, 300币, 赠送+70', () => {
    const pack = CHARGE_PACKS.find(p => p.id === 'pack_30')
    expect(pack).toBeDefined()
    expect(pack!.name).toBe('暖心之选')
    expect(pack!.price).toBe(30)
    expect(pack!.coins).toBe(300)
    expect(pack!.bonusCoins).toBe(70)
  })

  it('pack_68 — 真心以待：68元, 680币, 赠送+180, 最受欢迎', () => {
    const pack = CHARGE_PACKS.find(p => p.id === 'pack_68')
    expect(pack).toBeDefined()
    expect(pack!.name).toBe('真心以待')
    expect(pack!.price).toBe(68)
    expect(pack!.coins).toBe(680)
    expect(pack!.bonusCoins).toBe(180)
    expect(pack!.label).toBe('最受欢迎')
  })

  it('pack_128 — 浓情蜜意：128元, 1280币, 赠送+420', () => {
    const pack = CHARGE_PACKS.find(p => p.id === 'pack_128')
    expect(pack).toBeDefined()
    expect(pack!.name).toBe('浓情蜜意')
    expect(pack!.price).toBe(128)
    expect(pack!.coins).toBe(1280)
    expect(pack!.bonusCoins).toBe(420)
  })

  it('pack_328 — 至死不渝：328元, 3280币, 赠送+1020', () => {
    const pack = CHARGE_PACKS.find(p => p.id === 'pack_328')
    expect(pack).toBeDefined()
    expect(pack!.name).toBe('至死不渝')
    expect(pack!.price).toBe(328)
    expect(pack!.coins).toBe(3280)
    expect(pack!.bonusCoins).toBe(1020)
  })

  it('pack_648 — 命中注定：648元, 6480币, 赠送+2520, 顶级档', () => {
    const pack = CHARGE_PACKS.find(p => p.id === 'pack_648')
    expect(pack).toBeDefined()
    expect(pack!.name).toBe('命中注定')
    expect(pack!.price).toBe(648)
    expect(pack!.coins).toBe(6480)
    expect(pack!.bonusCoins).toBe(2520)
    expect(pack!.label).toBe('顶级档')
  })

  it('首充翻倍倍率应为2', () => {
    expect(FIRST_CHARGE_BONUS_MULTIPLIER).toBe(2)
  })

  it('每日充值上限应为500元', () => {
    expect(DAILY_CHARGE_LIMIT).toBe(500)
  })

  it('每月充值上限应为2000元', () => {
    expect(MONTHLY_CHARGE_LIMIT).toBe(2000)
  })
})

// ────────────────────────────── 2. GIFT_CONFIG 常量验证 ──────────────────────────────

describe('GIFT_CONFIG 常量验证（TRUTH_TABLE 2.2节）', () => {
  it('应包含正好4档礼物', () => {
    expect(GIFT_CONFIG).toHaveLength(4)
  })

  it('small — 小心意：10币, +8信赖', () => {
    const gift = GIFT_CONFIG.find(g => g.tier === 'small')
    expect(gift).toBeDefined()
    expect(gift!.name).toBe('小心意')
    expect(gift!.coinCost).toBe(10)
    expect(gift!.trustGain).toBe(8)
  })

  it('warm — 暖暖的：50币, +45信赖', () => {
    const gift = GIFT_CONFIG.find(g => g.tier === 'warm')
    expect(gift).toBeDefined()
    expect(gift!.name).toBe('暖暖的')
    expect(gift!.coinCost).toBe(50)
    expect(gift!.trustGain).toBe(45)
  })

  it('love — 超爱你：200币, +200信赖', () => {
    const gift = GIFT_CONFIG.find(g => g.tier === 'love')
    expect(gift).toBeDefined()
    expect(gift!.name).toBe('超爱你')
    expect(gift!.coinCost).toBe(200)
    expect(gift!.trustGain).toBe(200)
  })

  it('forever — 一辈子：520币, +550信赖', () => {
    const gift = GIFT_CONFIG.find(g => g.tier === 'forever')
    expect(gift).toBeDefined()
    expect(gift!.name).toBe('一辈子')
    expect(gift!.coinCost).toBe(520)
    expect(gift!.trustGain).toBe(550)
  })
})

// ────────────────────────────── 3. POCKET_MONEY_RATIO 分成比例验证 ──────────────────────────────

describe('POCKET_MONEY_RATIO 常量验证（TRUTH_TABLE 4.2节）', () => {
  it('普通用户 — 平台60%, 零花钱40%', () => {
    expect(POCKET_MONEY_RATIO.normal).toBe(0.4)
  })

  it('月卡/季卡用户 — 平台50%, 零花钱50%', () => {
    expect(POCKET_MONEY_RATIO.monthly).toBe(0.5)
  })

  it('年卡用户 — 平台40%, 零花钱60%', () => {
    expect(POCKET_MONEY_RATIO.yearly).toBe(0.6)
  })

  it('平台收入 + 零花钱 = 100%（各等级）', () => {
    expect(POCKET_MONEY_RATIO.normal + 0.6).toBeCloseTo(1.0)
    expect(POCKET_MONEY_RATIO.monthly + 0.5).toBeCloseTo(1.0)
    expect(POCKET_MONEY_RATIO.yearly + 0.4).toBeCloseTo(1.0)
  })
})

// ────────────────────────────── 4. processCharge 充值计算 ────���─────────────────────────

describe('processCharge 充值计算', () => {
  describe('普通充值（非首充）', () => {
    it('1元档：获得10+0=10币', () => {
      const result = processCharge('pack_1', 0, false)
      expect(result.success).toBe(true)
      expect(result.baseCoins).toBe(10)
      expect(result.bonusCoins).toBe(0)
      expect(result.firstChargeBonus).toBe(0)
      expect(result.coinsAdded).toBe(10)
      expect(result.newBalance).toBe(10)
    })

    it('6元档：获得60+10=70币', () => {
      const result = processCharge('pack_6', 100, false)
      expect(result.success).toBe(true)
      expect(result.baseCoins).toBe(60)
      expect(result.bonusCoins).toBe(10)
      expect(result.coinsAdded).toBe(70)
      expect(result.newBalance).toBe(170)
    })

    it('30元档：获得300+70=370币', () => {
      const result = processCharge('pack_30', 0, false)
      expect(result.success).toBe(true)
      expect(result.coinsAdded).toBe(370)
    })

    it('68元档：获得680+180=860币', () => {
      const result = processCharge('pack_68', 0, false)
      expect(result.success).toBe(true)
      expect(result.coinsAdded).toBe(860)
    })

    it('128元档：获得1280+420=1700币', () => {
      const result = processCharge('pack_128', 0, false)
      expect(result.success).toBe(true)
      expect(result.coinsAdded).toBe(1700)
    })

    it('328元档：获得3280+1020=4300币', () => {
      const result = processCharge('pack_328', 0, false)
      expect(result.success).toBe(true)
      expect(result.coinsAdded).toBe(4300)
    })

    it('648元档：获得6480+2520=9000币', () => {
      const result = processCharge('pack_648', 0, false)
      expect(result.success).toBe(true)
      expect(result.coinsAdded).toBe(9000)
    })
  })

  describe('首充翻倍', () => {
    it('1元首充：10(基础) + 0(赠送) + 10(首充翻倍) = 20币', () => {
      const result = processCharge('pack_1', 0, true)
      expect(result.success).toBe(true)
      expect(result.baseCoins).toBe(10)
      expect(result.bonusCoins).toBe(0)
      expect(result.firstChargeBonus).toBe(10) // 10 * (2-1)
      expect(result.coinsAdded).toBe(20)
    })

    it('6元首充：60(基础) + 10(赠送) + 60(首充翻倍) = 130币', () => {
      const result = processCharge('pack_6', 0, true)
      expect(result.success).toBe(true)
      expect(result.baseCoins).toBe(60)
      expect(result.bonusCoins).toBe(10)
      expect(result.firstChargeBonus).toBe(60)
      expect(result.coinsAdded).toBe(130)
    })

    it('68元首充：680(基础) + 180(赠送) + 680(首充翻倍) = 1540币', () => {
      const result = processCharge('pack_68', 0, true)
      expect(result.success).toBe(true)
      expect(result.firstChargeBonus).toBe(680)
      expect(result.coinsAdded).toBe(1540)
    })

    it('648元首充：6480(基础) + 2520(赠送) + 6480(首充翻倍) = 15480币', () => {
      const result = processCharge('pack_648', 0, true)
      expect(result.success).toBe(true)
      expect(result.firstChargeBonus).toBe(6480)
      expect(result.coinsAdded).toBe(15480)
    })

    it('首充翻倍只作用于基础币，不含赠送', () => {
      // 以30元为例验证：300(基础) + 70(赠送) + 300(首充) = 670
      const result = processCharge('pack_30', 0, true)
      expect(result.firstChargeBonus).toBe(300) // 仅基础 * (2-1)
      expect(result.coinsAdded).toBe(670)
    })
  })

  describe('充值累加余额', () => {
    it('现有余额100 + 充值68元档(非首充) = 100 + 860 = 960', () => {
      const result = processCharge('pack_68', 100, false)
      expect(result.newBalance).toBe(960)
    })

    it('现有余额500 + 充值6元档(首充) = 500 + 130 = 630', () => {
      const result = processCharge('pack_6', 500, true)
      expect(result.newBalance).toBe(630)
    })
  })

  describe('错误处理', () => {
    it('不存在的套餐ID应返回失败', () => {
      const result = processCharge('pack_999', 100, false)
      expect(result.success).toBe(false)
      expect(result.coinsAdded).toBe(0)
      expect(result.newBalance).toBe(100)
      expect(result.error).toBeDefined()
    })
  })
})

// ────────────────────────────── 5. processGift 送礼计算 ──────────────────────────────

describe('processGift 送礼计算', () => {
  describe('普通用户送礼（零花钱40%分成）', () => {
    it('送小心意(10币)：扣10币, +8信赖, 零花钱40分, 平台60分', () => {
      // 10币 = 1元 = 100分；零花钱 = 100 * 0.4 = 40分
      const result = processGift('small', 100, 0, null)
      expect(result.success).toBe(true)
      expect(result.coinsDeducted).toBe(10)
      expect(result.trustGain).toBe(8)
      expect(result.pocketMoneyGain).toBe(40) // 10 * 10 * 0.4 = 40分
      expect(result.platformRevenue).toBe(60) // 100 - 40 = 60分
      expect(result.newCoinBalance).toBe(90)
      expect(result.newPocketBalance).toBe(40)
    })

    it('送暖暖的(50币)：扣50币, +45信赖, 零花钱200分, 平台300分', () => {
      // 50币 = 5元 = 500分；零花钱 = 500 * 0.4 = 200分
      const result = processGift('warm', 200, 0, null)
      expect(result.success).toBe(true)
      expect(result.coinsDeducted).toBe(50)
      expect(result.trustGain).toBe(45)
      expect(result.pocketMoneyGain).toBe(200)
      expect(result.platformRevenue).toBe(300)
    })

    it('送超爱你(200币)：扣200币, +200信赖, 零花钱800分, 平台1200分', () => {
      // 200币 = 20元 = 2000分；零花钱 = 2000 * 0.4 = 800分
      const result = processGift('love', 500, 1000, null)
      expect(result.success).toBe(true)
      expect(result.coinsDeducted).toBe(200)
      expect(result.trustGain).toBe(200)
      expect(result.pocketMoneyGain).toBe(800)
      expect(result.platformRevenue).toBe(1200)
      expect(result.newCoinBalance).toBe(300)
      expect(result.newPocketBalance).toBe(1800)
    })

    it('送一辈子(520币)：扣520币, +550信赖, 零花钱2080分, 平台3120分', () => {
      // 520币 = 52元 = 5200分；零花钱 = 5200 * 0.4 = 2080分
      const result = processGift('forever', 1000, 0, null)
      expect(result.success).toBe(true)
      expect(result.coinsDeducted).toBe(520)
      expect(result.trustGain).toBe(550)
      expect(result.pocketMoneyGain).toBe(2080)
      expect(result.platformRevenue).toBe(3120)
    })
  })

  describe('月卡用户送礼（零花钱50%分成）', () => {
    it('送小心意(10币)：零花钱50分, 平台50分', () => {
      // 100分 * 0.5 = 50分
      const result = processGift('small', 100, 0, 'monthly')
      expect(result.success).toBe(true)
      expect(result.pocketMoneyGain).toBe(50)
      expect(result.platformRevenue).toBe(50)
    })

    it('送一辈子(520币)：零花钱2600分, 平台2600分', () => {
      // 5200分 * 0.5 = 2600分
      const result = processGift('forever', 1000, 0, 'monthly')
      expect(result.success).toBe(true)
      expect(result.pocketMoneyGain).toBe(2600)
      expect(result.platformRevenue).toBe(2600)
    })
  })

  describe('季卡用户送礼（零花钱50%分成，与月卡相同）', () => {
    it('送暖暖的(50币)：零花钱250分, 平台250分', () => {
      // 500分 * 0.5 = 250分
      const result = processGift('warm', 200, 0, 'quarterly')
      expect(result.success).toBe(true)
      expect(result.pocketMoneyGain).toBe(250)
      expect(result.platformRevenue).toBe(250)
    })
  })

  describe('年卡用户送礼（零花钱60%分成）', () => {
    it('送超爱你(200币)：零花钱1200分, 平台800分', () => {
      // 2000分 * 0.6 = 1200分
      const result = processGift('love', 500, 0, 'yearly')
      expect(result.success).toBe(true)
      expect(result.pocketMoneyGain).toBe(1200)
      expect(result.platformRevenue).toBe(800)
    })

    it('送一辈子(520币)：零花钱3120分, 平台2080分', () => {
      // 5200分 * 0.6 = 3120分
      const result = processGift('forever', 1000, 0, 'yearly')
      expect(result.success).toBe(true)
      expect(result.pocketMoneyGain).toBe(3120)
      expect(result.platformRevenue).toBe(2080)
    })
  })

  describe('余额不足', () => {
    it('爱心币不足应返回失败，余额不变', () => {
      const result = processGift('love', 50, 1000, null)
      expect(result.success).toBe(false)
      expect(result.coinsDeducted).toBe(0)
      expect(result.trustGain).toBe(0)
      expect(result.pocketMoneyGain).toBe(0)
      expect(result.newCoinBalance).toBe(50)
      expect(result.newPocketBalance).toBe(1000)
      expect(result.error).toBeDefined()
    })

    it('刚好足够应成功', () => {
      const result = processGift('small', 10, 0, null)
      expect(result.success).toBe(true)
      expect(result.newCoinBalance).toBe(0)
    })

    it('差1币应失败', () => {
      const result = processGift('small', 9, 0, null)
      expect(result.success).toBe(false)
    })
  })

  describe('错误处理', () => {
    it('不存在的礼物档位应返回失败', () => {
      const result = processGift('nonexistent' as any, 1000, 0, null)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('零花钱 + 平台收入 = 总金额（恒等式）', () => {
    const tiers = ['small', 'warm', 'love', 'forever'] as const
    const plans = [null, 'monthly', 'quarterly', 'yearly'] as const

    for (const tier of tiers) {
      for (const plan of plans) {
        const planLabel = plan ?? '普通'
        it(`${tier} + ${planLabel}：零花钱 + 平台收入 = 爱心币 * 10分`, () => {
          const gift = GIFT_CONFIG.find(g => g.tier === tier)!
          const result = processGift(tier, 10000, 0, plan)
          expect(result.success).toBe(true)
          expect(result.pocketMoneyGain + result.platformRevenue).toBe(
            gift.coinCost * 10,
          )
        })
      }
    }
  })
})

// ────────────────────────────── 6. getPocketMoneyRatio 不同订阅等级 ──────────────────────────────

describe('getPocketMoneyRatio 分成比例', () => {
  it('null（未订阅）→ 0.4', () => {
    expect(getPocketMoneyRatio(null)).toBe(0.4)
  })

  it('monthly → 0.5', () => {
    expect(getPocketMoneyRatio('monthly')).toBe(0.5)
  })

  it('quarterly → 0.5（与月卡相同）', () => {
    expect(getPocketMoneyRatio('quarterly')).toBe(0.5)
  })

  it('yearly → 0.6', () => {
    expect(getPocketMoneyRatio('yearly')).toBe(0.6)
  })
})

// ────────────────────────────── 7. checkSpendingLimit 消费限额 ──────────────────────────────

describe('checkSpendingLimit 消费限额（TRUTH_TABLE 4.3节）', () => {
  describe('8岁以下 — 禁止充值', () => {
    it('7岁用户任意金额均被拒绝', () => {
      const result = checkSpendingLimit(1, 7)
      expect(result.allowed).toBe(false)
    })

    it('0岁用户被拒绝', () => {
      const result = checkSpendingLimit(1, 0)
      expect(result.allowed).toBe(false)
    })

    it('5岁用户被拒绝', () => {
      const result = checkSpendingLimit(1, 5)
      expect(result.allowed).toBe(false)
    })
  })

  describe('8-15岁 — 单次上限20元', () => {
    it('8岁用户充值20元允许', () => {
      const result = checkSpendingLimit(20, 8)
      expect(result.allowed).toBe(true)
    })

    it('8岁用户充值21元拒绝', () => {
      const result = checkSpendingLimit(21, 8)
      expect(result.allowed).toBe(false)
    })

    it('15岁用户充值20元允许', () => {
      const result = checkSpendingLimit(20, 15)
      expect(result.allowed).toBe(true)
    })

    it('15岁用户充值21元拒绝', () => {
      const result = checkSpendingLimit(21, 15)
      expect(result.allowed).toBe(false)
    })

    it('12岁用户充值1元允许', () => {
      const result = checkSpendingLimit(1, 12)
      expect(result.allowed).toBe(true)
    })
  })

  describe('16-17岁 — 单次上限50元', () => {
    it('16岁用户充值50元允许', () => {
      const result = checkSpendingLimit(50, 16)
      expect(result.allowed).toBe(true)
    })

    it('16岁用户充值51元拒绝', () => {
      const result = checkSpendingLimit(51, 16)
      expect(result.allowed).toBe(false)
    })

    it('17岁用户充值50元允许', () => {
      const result = checkSpendingLimit(50, 17)
      expect(result.allowed).toBe(true)
    })

    it('17岁用户充值51元拒绝', () => {
      const result = checkSpendingLimit(51, 17)
      expect(result.allowed).toBe(false)
    })
  })

  describe('成年用户 — 单日上限500元', () => {
    it('18岁用户充值500元允许', () => {
      const result = checkSpendingLimit(500, 18)
      expect(result.allowed).toBe(true)
    })

    it('18岁用户充值501元拒绝', () => {
      const result = checkSpendingLimit(501, 18)
      expect(result.allowed).toBe(false)
    })

    it('30岁用户充值500元允许', () => {
      const result = checkSpendingLimit(500, 30)
      expect(result.allowed).toBe(true)
    })

    it('30岁用户充值648元拒绝（超过单日500限额）', () => {
      const result = checkSpendingLimit(648, 30)
      expect(result.allowed).toBe(false)
    })
  })

  describe('边界条件', () => {
    it('金额为0应拒绝', () => {
      const result = checkSpendingLimit(0, 25)
      expect(result.allowed).toBe(false)
    })

    it('金额为负数应拒绝', () => {
      const result = checkSpendingLimit(-10, 25)
      expect(result.allowed).toBe(false)
    })

    it('年龄边界：7→8岁从禁止变为允许', () => {
      expect(checkSpendingLimit(1, 7).allowed).toBe(false)
      expect(checkSpendingLimit(1, 8).allowed).toBe(true)
    })

    it('年龄边界：15→16岁限额从20变为50', () => {
      expect(checkSpendingLimit(21, 15).allowed).toBe(false)
      expect(checkSpendingLimit(21, 16).allowed).toBe(true)
    })

    it('年龄边界：17→18岁限额从50变为500', () => {
      expect(checkSpendingLimit(51, 17).allowed).toBe(false)
      expect(checkSpendingLimit(51, 18).allowed).toBe(true)
    })
  })
})

// ────────────────────────────── 8. 币值转换工具函数 ──────────────────────────────

describe('币值转换工具函数', () => {
  describe('coinsToYuan — 爱心币转人民币（元）', () => {
    it('10币 = 1元', () => {
      expect(coinsToYuan(10)).toBe(1)
    })

    it('0币 = 0元', () => {
      expect(coinsToYuan(0)).toBe(0)
    })

    it('6480币 = 648元', () => {
      expect(coinsToYuan(6480)).toBe(648)
    })

    it('520币 = 52元', () => {
      expect(coinsToYuan(520)).toBe(52)
    })

    it('1币 = 0.1元', () => {
      expect(coinsToYuan(1)).toBeCloseTo(0.1)
    })
  })

  describe('yuanToCoins — 人民币转爱心币', () => {
    it('1元 = 10币', () => {
      expect(yuanToCoins(1)).toBe(10)
    })

    it('0元 = 0币', () => {
      expect(yuanToCoins(0)).toBe(0)
    })

    it('648元 = 6480币', () => {
      expect(yuanToCoins(648)).toBe(6480)
    })

    it('52元 = 520币', () => {
      expect(yuanToCoins(52)).toBe(520)
    })
  })

  describe('coinsToCents — 爱心币转人民币（分）', () => {
    it('10币 = 100分（1元）', () => {
      expect(coinsToCents(10)).toBe(100)
    })

    it('1币 = 10分', () => {
      expect(coinsToCents(1)).toBe(10)
    })

    it('0币 = 0分', () => {
      expect(coinsToCents(0)).toBe(0)
    })

    it('520币 = 5200分（52元）', () => {
      expect(coinsToCents(520)).toBe(5200)
    })
  })

  describe('转换一致性', () => {
    it('coinsToYuan 和 yuanToCoins 互逆', () => {
      expect(yuanToCoins(coinsToYuan(100))).toBe(100)
      expect(coinsToYuan(yuanToCoins(100))).toBe(100)
    })

    it('coinsToCents = coinsToYuan * 100', () => {
      const coins = 520
      expect(coinsToCents(coins)).toBe(coinsToYuan(coins) * 100)
    })
  })
})

// ────────────────────────────── 8.5 getGiftTrustGain / getGiftCoinCost ──────────────────────────────

describe('getGiftTrustGain 和 getGiftCoinCost', () => {
  it('small: trustGain=8, coinCost=10', () => {
    expect(getGiftTrustGain('small')).toBe(8)
    expect(getGiftCoinCost('small')).toBe(10)
  })

  it('warm: trustGain=45, coinCost=50', () => {
    expect(getGiftTrustGain('warm')).toBe(45)
    expect(getGiftCoinCost('warm')).toBe(50)
  })

  it('love: trustGain=200, coinCost=200', () => {
    expect(getGiftTrustGain('love')).toBe(200)
    expect(getGiftCoinCost('love')).toBe(200)
  })

  it('forever: trustGain=550, coinCost=520', () => {
    expect(getGiftTrustGain('forever')).toBe(550)
    expect(getGiftCoinCost('forever')).toBe(520)
  })

  it('不存在的档位返回0', () => {
    expect(getGiftTrustGain('nonexistent' as any)).toBe(0)
    expect(getGiftCoinCost('nonexistent' as any)).toBe(0)
  })
})

// ────────────────────────────── 9. getPackValuePerYuan 性价比计算 ──────────────────────────────

describe('getPackValuePerYuan 性价比计算', () => {
  describe('非首充性价比', () => {
    it('1元档：(10+0)/1 = 10 币/元', () => {
      expect(getPackValuePerYuan('pack_1', false)).toBeCloseTo(10)
    })

    it('6元档：(60+10)/6 ≈ 11.67 币/元', () => {
      expect(getPackValuePerYuan('pack_6', false)).toBeCloseTo(70 / 6)
    })

    it('30元档：(300+70)/30 ≈ 12.33 币/元', () => {
      expect(getPackValuePerYuan('pack_30', false)).toBeCloseTo(370 / 30)
    })

    it('68元档：(680+180)/68 ≈ 12.65 币/元', () => {
      expect(getPackValuePerYuan('pack_68', false)).toBeCloseTo(860 / 68)
    })

    it('128元档：(1280+420)/128 ≈ 13.28 币/元', () => {
      expect(getPackValuePerYuan('pack_128', false)).toBeCloseTo(1700 / 128)
    })

    it('328元档：(3280+1020)/328 ≈ 13.11 币/元', () => {
      expect(getPackValuePerYuan('pack_328', false)).toBeCloseTo(4300 / 328)
    })

    it('648元档：(6480+2520)/648 ≈ 13.89 币/元', () => {
      expect(getPackValuePerYuan('pack_648', false)).toBeCloseTo(9000 / 648)
    })
  })

  describe('首充性价比（基础币翻倍）', () => {
    it('1元首充：(10+0+10)/1 = 20 币/元', () => {
      expect(getPackValuePerYuan('pack_1', true)).toBeCloseTo(20)
    })

    it('6元首充：(60+10+60)/6 ≈ 21.67 币/元', () => {
      expect(getPackValuePerYuan('pack_6', true)).toBeCloseTo(130 / 6)
    })

    it('648元首充：(6480+2520+6480)/648 ≈ 23.89 币/元', () => {
      expect(getPackValuePerYuan('pack_648', true)).toBeCloseTo(15480 / 648)
    })
  })

  describe('高档位性价比优于低档位（非首充）', () => {
    it('648元档性价比 > 1元档性价比', () => {
      const low = getPackValuePerYuan('pack_1', false)
      const high = getPackValuePerYuan('pack_648', false)
      expect(high).toBeGreaterThan(low)
    })
  })

  describe('错误处理', () => {
    it('不存在的套餐返回0', () => {
      expect(getPackValuePerYuan('pack_999', false)).toBe(0)
    })
  })
})
