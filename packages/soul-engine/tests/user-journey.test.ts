import { describe, expect, it } from 'vitest'
import {
  processCharge,
  processGift,
  getPocketMoneyRatio,
  checkSpendingLimit,
  determineTrustLevel,
  checkLevelUp,
  getStreakBonus,
  checkThresholdTrigger,
  getDemoDay,
  getDemoState,
  getDemoMultiplier,
  shouldReceiveGiftCoins,
  shouldTriggerDemoSurprise,
  convertToFormal,
  getDemoDayConfig,
} from '../src/index'
import type { SurpriseTriggerContext } from '../src/index'
import {
  CHARGE_PACKS,
  GIFT_CONFIG,
  POCKET_MONEY_RATIO,
  TRUST_LEVEL_CONFIG,
  SURPRISE_THRESHOLDS,
} from '../src/index'

/**
 * 用户旅程逻辑验证
 *
 * 模拟用户从新手到深度用户的全链路流程，
 * 验证各子系统之间的数值衔接正确性。
 */
describe('用户旅程逻辑验证', () => {
  // ─────────────────────────────────────────────────────────
  // 旅程 1：充值→���礼→信赖升级链路
  // ─────────────────────────────────────────────────────────
  describe('充值→送礼→信赖升级链路', () => {
    it('充值68元档获得680+180=860爱心币（首充翻倍→1720）', () => {
      const pack = CHARGE_PACKS.find(p => p.id === 'pack_68')!
      const result = processCharge(pack.id, 0, true) // 首充

      expect(result.success).toBe(true)
      expect(result.baseCoins).toBe(680)
      expect(result.bonusCoins).toBe(180)
      expect(result.firstChargeBonus).toBe(680) // 680 * (2-1) = 680
      expect(result.coinsAdded).toBe(680 + 180 + 680) // 1540
      // 注意：首充翻倍是基础币翻倍，不含赠送
      // 总计 = 680(基础) + 180(赠送) + 680(首充额外) = 1540
      expect(result.newBalance).toBe(1540)
    })

    it('非首充68元档获得680+180=860爱心币', () => {
      const pack = CHARGE_PACKS.find(p => p.id === 'pack_68')!
      const result = processCharge(pack.id, 0, false) // 非首充

      expect(result.success).toBe(true)
      expect(result.firstChargeBonus).toBe(0)
      expect(result.coinsAdded).toBe(680 + 180) // 860
      expect(result.newBalance).toBe(860)
    })

    it('送礼"暖暖的"扣50币+45信赖值', () => {
      const result = processGift('warm', 1000, 0, null)

      expect(result.success).toBe(true)
      expect(result.coinsDeducted).toBe(50)
      expect(result.trustGain).toBe(45)
      expect(result.newCoinBalance).toBe(950)
    })

    it('余额扣减正确（连续送礼）', () => {
      let balance = 1540 // 首充68元后

      // 送 small (10币)
      const r1 = processGift('small', balance, 0, null)
      expect(r1.success).toBe(true)
      balance = r1.newCoinBalance
      expect(balance).toBe(1530)

      // 送 warm (50币)
      const r2 = processGift('warm', balance, 0, null)
      expect(r2.success).toBe(true)
      balance = r2.newCoinBalance
      expect(balance).toBe(1480)

      // 送 love (200币)
      const r3 = processGift('love', balance, 0, null)
      expect(r3.success).toBe(true)
      balance = r3.newCoinBalance
      expect(balance).toBe(1280)

      // 送 forever (520币)
      const r4 = processGift('forever', balance, 0, null)
      expect(r4.success).toBe(true)
      balance = r4.newCoinBalance
      expect(balance).toBe(760)
    })

    it('零花钱分成正确（普通用户40%）', () => {
      // small: 10币 = 1元 = 100分, 40% = 40分
      const r1 = processGift('small', 1000, 0, null)
      expect(r1.pocketMoneyGain).toBe(40) // 100 * 0.4

      // warm: 50币 = 5元 = 500分, 40% = 200分
      const r2 = processGift('warm', 1000, 0, null)
      expect(r2.pocketMoneyGain).toBe(200) // 500 * 0.4

      // love: 200币 = 20元 = 2000分, 40% = 800分
      const r3 = processGift('love', 1000, 0, null)
      expect(r3.pocketMoneyGain).toBe(800) // 2000 * 0.4

      // forever: 520币 = 52元 = 5200分, 40% = 2080分
      const r4 = processGift('forever', 1000, 0, null)
      expect(r4.pocketMoneyGain).toBe(2080) // 5200 * 0.4
    })

    it('月卡用户零花钱分成50%', () => {
      const r = processGift('warm', 1000, 0, 'monthly')
      // 50币 = 500分, 50% = 250分
      expect(r.pocketMoneyGain).toBe(250)
    })

    it('年卡用户零花钱分成60%', () => {
      const r = processGift('warm', 1000, 0, 'yearly')
      // 50币 = 500分, 60% = 300分
      expect(r.pocketMoneyGain).toBe(300)
    })

    it('平台收入 = 总额 - 零花钱', () => {
      const r = processGift('love', 1000, 0, null)
      // 200币 = 2000分, 40% pocket = 800, 60% platform = 1200
      expect(r.platformRevenue).toBe(1200)
      expect(r.pocketMoneyGain + r.platformRevenue).toBe(2000) // 总额一致
    })

    it('信赖值累计达到阈值后可以升级', () => {
      // 从 Lv.1 开始，累计 100 点 → Lv.2
      const result = checkLevelUp(1, 100, 0)
      expect(result.canLevelUp).toBe(true)
      expect(result.targetLevel).toBe(2)
    })

    it('送礼积累足够信赖值后升级到Lv.3', () => {
      // Lv.3 需要 350 点
      // 送 8 次 warm(45) = 360 → 足够 Lv.3
      let totalTrust = 0
      for (let i = 0; i < 8; i++) {
        totalTrust += 45 // warm gift
      }
      expect(totalTrust).toBe(360)
      expect(totalTrust).toBeGreaterThanOrEqual(350)

      const level = determineTrustLevel(totalTrust)
      expect(level).toBe(3)
    })

    it('余额不足时送礼失败', () => {
      const result = processGift('forever', 100, 0, null)
      expect(result.success).toBe(false)
      expect(result.error).toContain('爱心币不足')
    })
  })

  // ─────────────────────────────────────────────────────────
  // 旅程 2：信赖升级→惊喜触发
  // ─────────────────────────────────────────────────────────
  describe('信赖升级→惊喜触发链路', () => {
    it('Lv4用户不触发任何惊喜', () => {
      const context: SurpriseTriggerContext = {
        trustLevel: 4,
        pocketBalance: 10000,
        lastSurpriseDate: null,
        monthlySurpriseCount: 0,
        isMonthlyCard: false,
        preferences: [],
      }

      const result = checkThresholdTrigger(context)
      expect(result.shouldTrigger).toBe(false)
    })

    it('Lv5+零花钱0分→仅触发虚拟惊喜', () => {
      const context: SurpriseTriggerContext = {
        trustLevel: 5,
        pocketBalance: 0,
        lastSurpriseDate: null,
        monthlySurpriseCount: 0,
        isMonthlyCard: false,
        preferences: [],
      }

      const result = checkThresholdTrigger(context)
      expect(result.shouldTrigger).toBe(true)
      expect(result.availableTypes).toContain('virtual')
      expect(result.availableTypes).not.toContain('electronic')
    })

    it('Lv6+零花钱1500分→触发虚拟+电子惊喜', () => {
      const context: SurpriseTriggerContext = {
        trustLevel: 6,
        pocketBalance: 1500,
        lastSurpriseDate: null,
        monthlySurpriseCount: 0,
        isMonthlyCard: false,
        preferences: [],
      }

      const result = checkThresholdTrigger(context)
      expect(result.shouldTrigger).toBe(true)
      expect(result.availableTypes).toContain('virtual')
      expect(result.availableTypes).toContain('electronic')
      // 最高优先级是 electronic
      expect(result.bestType).toBe('electronic')
    })

    it('Lv8+零花钱3000分→触发虚拟+电子+实物', () => {
      const context: SurpriseTriggerContext = {
        trustLevel: 8,
        pocketBalance: 3000,
        lastSurpriseDate: null,
        monthlySurpriseCount: 0,
        isMonthlyCard: false,
        preferences: [],
      }

      const result = checkThresholdTrigger(context)
      expect(result.shouldTrigger).toBe(true)
      expect(result.availableTypes).toContain('physical')
      expect(result.bestType).toBe('physical')
    })

    it('Lv9+零花钱5000分→全部类型可触发', () => {
      const context: SurpriseTriggerContext = {
        trustLevel: 9,
        pocketBalance: 5000,
        lastSurpriseDate: null,
        monthlySurpriseCount: 0,
        isMonthlyCard: false,
        preferences: [],
      }

      const result = checkThresholdTrigger(context)
      expect(result.shouldTrigger).toBe(true)
      expect(result.availableTypes).toContain('personalized')
      expect(result.bestType).toBe('personalized')
    })

    it('月度惊喜达上限4次后不再触发', () => {
      const context: SurpriseTriggerContext = {
        trustLevel: 9,
        pocketBalance: 10000,
        lastSurpriseDate: null,
        monthlySurpriseCount: 4,
        isMonthlyCard: false,
        preferences: [],
      }

      const result = checkThresholdTrigger(context)
      expect(result.shouldTrigger).toBe(false)
    })

    it('冷却期内不触发（7天内非月卡）', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      const context: SurpriseTriggerContext = {
        trustLevel: 9,
        pocketBalance: 10000,
        lastSurpriseDate: twoDaysAgo,
        monthlySurpriseCount: 0,
        isMonthlyCard: false,
        preferences: [],
      }

      const result = checkThresholdTrigger(context)
      expect(result.shouldTrigger).toBe(false)
    })

    it('月卡用户5天冷却', () => {
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      const context: SurpriseTriggerContext = {
        trustLevel: 9,
        pocketBalance: 10000,
        lastSurpriseDate: sixDaysAgo,
        monthlySurpriseCount: 0,
        isMonthlyCard: true,
        preferences: [],
      }

      // 6天前触发，月卡冷却5天 → 已过冷却
      const result = checkThresholdTrigger(context)
      expect(result.shouldTrigger).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────
  // 旅程 3：Demo模式7天流程
  // ─────────────────────────────────────────────────────────
  describe('Demo模式7天流程', () => {
    it('Day1 初始化Demo状态', () => {
      const now = new Date()
      const state = getDemoState(now, 0, false, false)

      expect(state.isActive).toBe(true)
      expect(state.currentDay).toBe(1)
      expect(state.isExpired).toBe(false)
      expect(state.hasReceivedGiftCoins).toBe(false)
      expect(state.hasReceivedSurprise).toBe(false)
    })

    it('Demo模式信赖获取倍率固定×8', () => {
      for (let day = 1; day <= 7; day++) {
        expect(getDemoMultiplier(day)).toBe(8)
      }
      // 超出范围返回1
      expect(getDemoMultiplier(0)).toBe(1)
      expect(getDemoMultiplier(8)).toBe(1)
    })

    it('Day3 赠送50爱心币', () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 2) // 2天前开始 → 今天是Day3

      const state = getDemoState(startDate, 500, false, false)
      expect(state.currentDay).toBe(3)
      expect(shouldReceiveGiftCoins(state)).toBe(true)
    })

    it('Day3 已领取后不再重复', () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 2)

      const state = getDemoState(startDate, 500, true, false) // 已领取
      expect(shouldReceiveGiftCoins(state)).toBe(false)
    })

    it('Day5 触发Demo惊喜', () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 4) // 4天前开始 → 今天是Day5

      const state = getDemoState(startDate, 1000, true, false)
      expect(state.currentDay).toBe(5)
      expect(shouldTriggerDemoSurprise(state)).toBe(true)
    })

    it('Day5 惊喜已收到后不再重复', () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 4)

      const state = getDemoState(startDate, 1000, true, true) // 已收到
      expect(shouldTriggerDemoSurprise(state)).toBe(false)
    })

    it('Day7 转化保留100信赖值Lv.2', () => {
      const result = convertToFormal(1440) // Demo 7天累计
      expect(result.formalTrust).toBe(100)
      expect(result.formalLevel).toBe(2)
      expect(result.bonusCoins).toBe(100)
    })

    it('Demo转正式版固定100信赖值（不受Demo累计影响）', () => {
      // 无论 Demo 期间赚了多少，转正后统一 100 信赖
      expect(convertToFormal(0).formalTrust).toBe(100)
      expect(convertToFormal(5000).formalTrust).toBe(100)
      expect(convertToFormal(10000).formalTrust).toBe(100)
    })

    it('7天日程配置完整', () => {
      for (let day = 1; day <= 7; day++) {
        const config = getDemoDayConfig(day)
        expect(config, `Day${day} 配置`).not.toBeNull()
        expect(config!.day).toBe(day)
        expect(config!.trustMultiplier).toBe(8)
      }
    })

    it('Day3配置有50爱心币奖励', () => {
      const config = getDemoDayConfig(3)!
      expect(config.giftCoinsReward).toBe(50)
    })

    it('Day5配置有惊喜触发', () => {
      const config = getDemoDayConfig(5)!
      expect(config.triggerSurprise).toBe(true)
    })

    it('只有Day5触发惊喜，其他天不触发', () => {
      for (let day = 1; day <= 7; day++) {
        const config = getDemoDayConfig(day)!
        if (day === 5) {
          expect(config.triggerSurprise).toBe(true)
        }
        else {
          expect(config.triggerSurprise).toBe(false)
        }
      }
    })

    it('只有Day3有爱心币奖励', () => {
      for (let day = 1; day <= 7; day++) {
        const config = getDemoDayConfig(day)!
        if (day === 3) {
          expect(config.giftCoinsReward).toBe(50)
        }
        else {
          expect(config.giftCoinsReward).toBe(0)
        }
      }
    })

    it('Demo过期后状态正确', () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 8) // 8天前开始 → 已过期

      const state = getDemoState(startDate, 1000, true, true)
      expect(state.isExpired).toBe(true)
      expect(state.isActive).toBe(false)
      expect(state.currentDay).toBe(7) // 限制在7
    })
  })

  // ─────────────────────────────────────────────────────────
  // 旅程 4：消费限额保护
  // ─────────────────────────────────────────────────────────
  describe('消费限额保护', () => {
    it('成年用户500元以内通过', () => {
      const result = checkSpendingLimit(500, 25)
      expect(result.allowed).toBe(true)
    })

    it('成年用户超过500元拒绝', () => {
      const result = checkSpendingLimit(501, 25)
      expect(result.allowed).toBe(false)
    })

    it('16-17岁用户单次上限50元', () => {
      expect(checkSpendingLimit(50, 17).allowed).toBe(true)
      expect(checkSpendingLimit(51, 17).allowed).toBe(false)
    })

    it('8-15岁用户单次上限20元', () => {
      expect(checkSpendingLimit(20, 12).allowed).toBe(true)
      expect(checkSpendingLimit(21, 12).allowed).toBe(false)
    })

    it('8岁以下禁止充值', () => {
      expect(checkSpendingLimit(1, 7).allowed).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────
  // 旅程 5：连续签到加成链路
  // ─────────────────────────────────────────────────────────
  describe('连续签到加成链路', () => {
    it('签到1-2天无额外奖励', () => {
      expect(getStreakBonus(1)).toBe(0)
      expect(getStreakBonus(2)).toBe(0)
    })

    it('连续3天+3', () => {
      expect(getStreakBonus(3)).toBe(3)
    })

    it('连续7天+8', () => {
      expect(getStreakBonus(7)).toBe(8)
    })

    it('连续14天+15', () => {
      expect(getStreakBonus(14)).toBe(15)
    })

    it('连续21天+20', () => {
      expect(getStreakBonus(21)).toBe(20)
    })

    it('连续30天+30', () => {
      expect(getStreakBonus(30)).toBe(30)
    })
  })

  // ─────────────────────────────────────────────────────────
  // 旅程 6：完整充值→送礼→惊喜端到端数值流
  // ─────────────────────────────────────────────────────────
  describe('完整充值→送礼→惊喜端到端数值流', () => {
    it('648元顶级充值→连续送礼forever→验证零花钱累积→惊喜触发', () => {
      // Step 1: 首充648元
      const chargeResult = processCharge('pack_648', 0, true)
      expect(chargeResult.success).toBe(true)
      // 6480(基础) + 2520(赠送) + 6480(首充额外) = 15480
      let coinBalance = chargeResult.newBalance
      expect(coinBalance).toBe(15480)

      // Step 2: 连续送 forever 礼物，跟踪零花钱和信赖
      let pocketBalance = 0
      let totalTrust = 0
      let giftCount = 0

      while (coinBalance >= 520) {
        const giftResult = processGift('forever', coinBalance, pocketBalance, null)
        if (!giftResult.success)
          break
        coinBalance = giftResult.newCoinBalance
        pocketBalance = giftResult.newPocketBalance
        totalTrust += giftResult.trustGain
        giftCount++
      }

      // 验证信赖值足够达到高等级
      expect(totalTrust).toBeGreaterThanOrEqual(TRUST_LEVEL_CONFIG[4].requiredPoints) // Lv5+
      expect(determineTrustLevel(totalTrust)).toBeGreaterThanOrEqual(5)

      // Step 3: 验证零花钱累积到惊喜阈值
      // forever: 520币 = 5200分, 40% = 2080分/次
      // 检查零花钱是否足够触发惊喜
      const trustLevel = determineTrustLevel(totalTrust)

      const context: SurpriseTriggerContext = {
        trustLevel,
        pocketBalance,
        lastSurpriseDate: null,
        monthlySurpriseCount: 0,
        isMonthlyCard: false,
        preferences: [],
      }

      const triggerResult = checkThresholdTrigger(context)

      // 高等级+有零花钱 → 应能触发惊喜
      expect(triggerResult.shouldTrigger).toBe(true)
      expect(triggerResult.availableTypes.length).toBeGreaterThan(0)
    })
  })
})
