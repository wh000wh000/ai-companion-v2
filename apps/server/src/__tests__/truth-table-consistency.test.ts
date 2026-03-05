import { describe, expect, it } from 'vitest'
import {
  CHARGE_PACKS,
  DAILY_CHARGE_LIMIT,
  DEFAULT_BUDGET_CONTROL,
  FIRST_CHARGE_BONUS_MULTIPLIER,
  GIFT_CONFIG,
  MONTHLY_CHARGE_LIMIT,
  MONTHLY_SUBSCRIBER_COOLDOWN_DAYS,
  POCKET_MONEY_RATIO,
  SUBSCRIPTION_CONFIGS,
  SURPRISE_THRESHOLDS,
  TRUST_LEVEL_CONFIG,
} from '@ai-companion/soul-engine'

/**
 * TRUTH_TABLE.md 数值一致性验证
 *
 * 本测试对照 docs/TRUTH_TABLE.md（权威数值真值表）逐项验证
 * soul-engine 导出的所有常量，确保代码与设计文档 100% 一致。
 */
describe('TRUTH_TABLE 数值一致性', () => {
  // ─────────────────────────────────────────────────────────────
  // 第一节：信赖等级阈值表
  // ─────────────────────────────────────────────────────────────
  describe('一、信赖等级阈值表', () => {
    it('共有10个等级', () => {
      expect(TRUST_LEVEL_CONFIG).toHaveLength(10)
    })

    it('10级阈值（requiredPoints）正确', () => {
      const expected = [0, 100, 350, 700, 1200, 2000, 3500, 6000, 10000, 16000]
      TRUST_LEVEL_CONFIG.forEach((config, i) => {
        expect(config.requiredPoints, `Lv.${i + 1} 阈值`).toBe(expected[i])
      })
    })

    it('等级编号从1到10连续', () => {
      TRUST_LEVEL_CONFIG.forEach((config, i) => {
        expect(config.level).toBe(i + 1)
      })
    })

    it('冷却天数正确', () => {
      const expected = [0, 0, 0, 0, 3, 5, 7, 7, 14, 21]
      TRUST_LEVEL_CONFIG.forEach((config, i) => {
        expect(config.cooldownDays, `Lv.${i + 1} 冷却天数`).toBe(expected[i])
      })
    })

    it('等级名称正确', () => {
      const expectedNames = [
        '初见', '相识', '熟悉', '信任', '亲密',
        '默契', '挚友', '知己', '灵魂伴侣', '命中注定',
      ]
      TRUST_LEVEL_CONFIG.forEach((config, i) => {
        expect(config.name, `Lv.${i + 1} 名称`).toBe(expectedNames[i])
      })
    })

    it('本级所需值与阈值差值对齐', () => {
      // 本级所需 = 当前阈值 - 上一级阈值
      const expectedDiffs = [0, 100, 250, 350, 500, 800, 1500, 2500, 4000, 6000]
      for (let i = 1; i < TRUST_LEVEL_CONFIG.length; i++) {
        const diff = TRUST_LEVEL_CONFIG[i].requiredPoints - TRUST_LEVEL_CONFIG[i - 1].requiredPoints
        expect(diff, `Lv.${i + 1} 本级所需`).toBe(expectedDiffs[i])
      }
    })

    it('每级都有解锁行为描述', () => {
      TRUST_LEVEL_CONFIG.forEach((config) => {
        expect(config.unlockedBehaviors.length).toBeGreaterThan(0)
        expect(config.description.length).toBeGreaterThan(0)
      })
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 第二节 2.2：送礼信赖值
  // ─────────────────────────────────────────────────────────────
  describe('二、送礼信赖值（2.2节）', () => {
    it('共有4档礼物', () => {
      expect(GIFT_CONFIG).toHaveLength(4)
    })

    it('小心意: 10币→+8信赖', () => {
      const gift = GIFT_CONFIG.find(g => g.tier === 'small')!
      expect(gift.coinCost).toBe(10)
      expect(gift.trustGain).toBe(8)
      expect(gift.name).toBe('小心意')
    })

    it('暖暖的: 50币→+45信赖', () => {
      const gift = GIFT_CONFIG.find(g => g.tier === 'warm')!
      expect(gift.coinCost).toBe(50)
      expect(gift.trustGain).toBe(45)
      expect(gift.name).toBe('暖暖的')
    })

    it('超爱你: 200币→+200信赖', () => {
      const gift = GIFT_CONFIG.find(g => g.tier === 'love')!
      expect(gift.coinCost).toBe(200)
      expect(gift.trustGain).toBe(200)
      expect(gift.name).toBe('超爱你')
    })

    it('一辈子: 520币→+550信赖', () => {
      const gift = GIFT_CONFIG.find(g => g.tier === 'forever')!
      expect(gift.coinCost).toBe(520)
      expect(gift.trustGain).toBe(550)
      expect(gift.name).toBe('一辈子')
    })

    it('礼物档位顺序 small→warm→love→forever', () => {
      const tiers = GIFT_CONFIG.map(g => g.tier)
      expect(tiers).toEqual(['small', 'warm', 'love', 'forever'])
    })

    it('币价递增、信赖递增', () => {
      for (let i = 1; i < GIFT_CONFIG.length; i++) {
        expect(GIFT_CONFIG[i].coinCost).toBeGreaterThan(GIFT_CONFIG[i - 1].coinCost)
        expect(GIFT_CONFIG[i].trustGain).toBeGreaterThan(GIFT_CONFIG[i - 1].trustGain)
      }
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 第四节 4.1：充值套餐
  // ─────────────────────────────────────────────────────────────
  describe('四、充值套餐（4.1节）', () => {
    it('共有7档充值', () => {
      expect(CHARGE_PACKS).toHaveLength(7)
    })

    it('价格(元)正确: 1, 6, 30, 68, 128, 328, 648', () => {
      const expectedPrices = [1, 6, 30, 68, 128, 328, 648]
      CHARGE_PACKS.forEach((pack, i) => {
        expect(pack.price, `第${i + 1}档价格`).toBe(expectedPrices[i])
      })
    })

    it('爱心币正确: 10, 60, 300, 680, 1280, 3280, 6480', () => {
      const expectedCoins = [10, 60, 300, 680, 1280, 3280, 6480]
      CHARGE_PACKS.forEach((pack, i) => {
        expect(pack.coins, `第${i + 1}档爱心币`).toBe(expectedCoins[i])
      })
    })

    it('赠送正确: 0, 10, 70, 180, 420, 1020, 2520', () => {
      const expectedBonus = [0, 10, 70, 180, 420, 1020, 2520]
      CHARGE_PACKS.forEach((pack, i) => {
        expect(pack.bonusCoins, `第${i + 1}档赠送`).toBe(expectedBonus[i])
      })
    })

    it('首充翻倍倍率为2', () => {
      expect(FIRST_CHARGE_BONUS_MULTIPLIER).toBe(2)
    })

    it('套餐ID格式正确 pack_{price}', () => {
      CHARGE_PACKS.forEach((pack) => {
        expect(pack.id).toBe(`pack_${pack.price}`)
      })
    })

    it('体验档和顶级档标签正确', () => {
      const pack1 = CHARGE_PACKS.find(p => p.id === 'pack_1')!
      expect(pack1.label).toBe('体验档')

      const pack648 = CHARGE_PACKS.find(p => p.id === 'pack_648')!
      expect(pack648.label).toBe('顶级档')

      const pack68 = CHARGE_PACKS.find(p => p.id === 'pack_68')!
      expect(pack68.label).toBe('最受欢迎')
    })

    it('爱心币兑换率恒为 10币/元', () => {
      CHARGE_PACKS.forEach((pack) => {
        expect(pack.coins / pack.price, `${pack.name} 兑换率`).toBe(10)
      })
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 第四节 4.2：分成比例
  // ─────────────────────────────────────────────────────────────
  describe('四、分成比例（4.2节）', () => {
    it('普通用户40%零花钱', () => {
      expect(POCKET_MONEY_RATIO.normal).toBe(0.4)
    })

    it('月卡用户50%零花钱', () => {
      expect(POCKET_MONEY_RATIO.monthly).toBe(0.5)
    })

    it('年卡用户60%零花钱', () => {
      expect(POCKET_MONEY_RATIO.yearly).toBe(0.6)
    })

    it('分成比例递增: normal < monthly < yearly', () => {
      expect(POCKET_MONEY_RATIO.normal).toBeLessThan(POCKET_MONEY_RATIO.monthly)
      expect(POCKET_MONEY_RATIO.monthly).toBeLessThan(POCKET_MONEY_RATIO.yearly)
    })

    it('平台收入 + 零花钱 = 100%', () => {
      expect(1 - POCKET_MONEY_RATIO.normal).toBeCloseTo(0.6)
      expect(1 - POCKET_MONEY_RATIO.monthly).toBeCloseTo(0.5)
      expect(1 - POCKET_MONEY_RATIO.yearly).toBeCloseTo(0.4)
    })
  })

  // ──────────────────────────────────────────────────────────���──
  // 第四节 4.3：消费限额
  // ─────────────────────────────────────────────────────────────
  describe('四、消费限额（4.3节）', () => {
    it('成年用户单日500元', () => {
      expect(DAILY_CHARGE_LIMIT).toBe(500)
    })

    it('成年用户单月2000元', () => {
      expect(MONTHLY_CHARGE_LIMIT).toBe(2000)
    })

    it('月限额大于日限额', () => {
      expect(MONTHLY_CHARGE_LIMIT).toBeGreaterThan(DAILY_CHARGE_LIMIT)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 第五节：订阅套餐
  // ─────────────────────────────────────────────────────────────
  describe('五、订阅套餐', () => {
    it('共有3种订阅', () => {
      expect(SUBSCRIPTION_CONFIGS).toHaveLength(3)
    })

    it('月卡25元', () => {
      const monthly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'monthly')!
      expect(monthly.price).toBe(25)
      expect(monthly.name).toBe('心动月卡')
    })

    it('季卡59元', () => {
      const quarterly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'quarterly')!
      expect(quarterly.price).toBe(59)
      expect(quarterly.name).toBe('陪伴季卡')
    })

    it('年卡198元', () => {
      const yearly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'yearly')!
      expect(yearly.price).toBe(198)
      expect(yearly.name).toBe('永恒年卡')
    })

    it('月卡/季卡零花钱比例50%，年卡60%', () => {
      const monthly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'monthly')!
      const quarterly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'quarterly')!
      const yearly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'yearly')!

      expect(monthly.pocketMoneyRatio).toBe(0.5)
      expect(quarterly.pocketMoneyRatio).toBe(0.5)
      expect(yearly.pocketMoneyRatio).toBe(0.6)
    })

    it('日信赖上限: 月卡/季卡50, 年卡60', () => {
      const monthly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'monthly')!
      const quarterly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'quarterly')!
      const yearly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'yearly')!

      expect(monthly.dailyTrustLimit).toBe(50)
      expect(quarterly.dailyTrustLimit).toBe(50)
      expect(yearly.dailyTrustLimit).toBe(60)
    })

    it('每日赠送爱心币: 月卡/季卡10, 年卡15', () => {
      const monthly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'monthly')!
      const quarterly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'quarterly')!
      const yearly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'yearly')!

      expect(monthly.dailyCoins).toBe(10)
      expect(quarterly.dailyCoins).toBe(10)
      expect(yearly.dailyCoins).toBe(15)
    })

    it('衰减宽限7天，衰减速度减半', () => {
      SUBSCRIPTION_CONFIGS.forEach((config) => {
        expect(config.decayGraceDays, `${config.name} 宽限天数`).toBe(7)
        expect(config.decayReduction, `${config.name} 衰减减免`).toBe(0.5)
      })
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 第六节 6.1：惊喜分层触发条件
  // ─────────────────────────────────────────────────────────────
  describe('六、惊喜系统（6.1节分层触发）', () => {
    it('共有4种惊喜类型', () => {
      expect(SURPRISE_THRESHOLDS).toHaveLength(4)
    })

    it('虚拟惊喜: Lv5+, 零花钱>=0元(0分)', () => {
      const virtual = SURPRISE_THRESHOLDS.find(t => t.type === 'virtual')!
      expect(virtual.minTrustLevel).toBe(5)
      expect(virtual.minPocketBalance).toBe(0)
      expect(virtual.budgetRange.min).toBe(0)
      expect(virtual.budgetRange.max).toBe(0)
    })

    it('电子惊喜: Lv6+, 零花钱>=15元(1500分)', () => {
      const electronic = SURPRISE_THRESHOLDS.find(t => t.type === 'electronic')!
      expect(electronic.minTrustLevel).toBe(6)
      expect(electronic.minPocketBalance).toBe(1500)
      expect(electronic.budgetRange.min).toBe(500)
      expect(electronic.budgetRange.max).toBe(1500)
    })

    it('实物惊喜: Lv8+, 零花钱>=30元(3000分)', () => {
      const physical = SURPRISE_THRESHOLDS.find(t => t.type === 'physical')!
      expect(physical.minTrustLevel).toBe(8)
      expect(physical.minPocketBalance).toBe(3000)
      expect(physical.budgetRange.min).toBe(1000)
      expect(physical.budgetRange.max).toBe(5000)
    })

    it('个性化惊喜: Lv9+, 零花钱>=50元(5000分)', () => {
      const personalized = SURPRISE_THRESHOLDS.find(t => t.type === 'personalized')!
      expect(personalized.minTrustLevel).toBe(9)
      expect(personalized.minPocketBalance).toBe(5000)
      expect(personalized.budgetRange.min).toBe(1500)
      expect(personalized.budgetRange.max).toBe(10000)
    })

    it('惊喜类型按等级递增排列', () => {
      for (let i = 1; i < SURPRISE_THRESHOLDS.length; i++) {
        expect(SURPRISE_THRESHOLDS[i].minTrustLevel)
          .toBeGreaterThanOrEqual(SURPRISE_THRESHOLDS[i - 1].minTrustLevel)
      }
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 第六节 6.2：惊喜控制参数
  // ─────────────────────────────────────────────────────────────
  describe('六、惊喜控制参数（6.2节）', () => {
    it('冷却期7天', () => {
      SURPRISE_THRESHOLDS.forEach((threshold) => {
        expect(threshold.cooldownDays, `${threshold.type} 冷却`).toBe(7)
      })
    })

    it('月卡用户冷却缩短为5天', () => {
      expect(MONTHLY_SUBSCRIBER_COOLDOWN_DAYS).toBe(5)
    })

    it('月度上限4次', () => {
      expect(DEFAULT_BUDGET_CONTROL.monthlyMaxCount).toBe(4)
    })

    it('单次最大花费为池余额的60%', () => {
      expect(DEFAULT_BUDGET_CONTROL.maxSpendRatio).toBe(0.6)
    })

    it('单次最小花费10元(1000分)', () => {
      expect(DEFAULT_BUDGET_CONTROL.minSurpriseAmount).toBe(1000)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 第六节 6.3：已移除参数验证（反向检查）
  // ─────────────────────────────────────────────────────────────
  describe('六、确定性触发（6.3节反向验证）', () => {
    it('惊喜配置中不存在 baseProbability 字段', () => {
      SURPRISE_THRESHOLDS.forEach((threshold) => {
        expect(threshold).not.toHaveProperty('baseProbability')
      })
    })

    it('惊喜配置中不存在 probabilityModifiers 字段', () => {
      SURPRISE_THRESHOLDS.forEach((threshold) => {
        expect(threshold).not.toHaveProperty('probabilityModifiers')
      })
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 交叉验证：订阅与零花钱比例一致
  // ─────────────────────────────────────────────────────────────
  describe('交叉验证', () => {
    it('SUBSCRIPTION_CONFIGS 与 POCKET_MONEY_RATIO 一致', () => {
      const monthly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'monthly')!
      const quarterly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'quarterly')!
      const yearly = SUBSCRIPTION_CONFIGS.find(s => s.plan === 'yearly')!

      expect(monthly.pocketMoneyRatio).toBe(POCKET_MONEY_RATIO.monthly)
      expect(quarterly.pocketMoneyRatio).toBe(POCKET_MONEY_RATIO.monthly)
      expect(yearly.pocketMoneyRatio).toBe(POCKET_MONEY_RATIO.yearly)
    })

    it('最高充值档648元未超过单日限额500元×充值次数（需多次充值）', () => {
      const maxPack = CHARGE_PACKS[CHARGE_PACKS.length - 1]
      // 648元 > 500元日限额，说明648元档需要两天才能充
      expect(maxPack.price).toBeGreaterThan(DAILY_CHARGE_LIMIT)
    })

    it('Lv10满级阈值16000是最高充值档带来信赖的合理倍数', () => {
      // 最高礼物 forever: 520币→550信赖
      // 达到16000约需要 16000/550 ≈ 29 次最高礼物
      const maxGift = GIFT_CONFIG[GIFT_CONFIG.length - 1]
      const timesNeeded = Math.ceil(16000 / maxGift.trustGain)
      expect(timesNeeded).toBeGreaterThan(0)
      expect(timesNeeded).toBeLessThan(100) // 合理范围内
    })
  })
})
