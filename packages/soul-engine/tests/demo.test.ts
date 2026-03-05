/**
 * Demo模式测试
 *
 * 对照 TRUTH_TABLE.md 第七节验证7天Demo体验的完整逻辑。
 * 所有数值均来自真值表，确保代码实现与设计文档一致。
 */

import { describe, expect, it, vi } from 'vitest'
import {
  convertToFormal,
  DEMO_SCHEDULE,
  getDemoDay,
  getDemoDayConfig,
  getDemoMultiplier,
  getDemoState,
  getConversionPrompt,
  getDemoEndMessage,
  shouldReceiveGiftCoins,
  shouldTriggerDemoSurprise,
} from '../src/demo/manager'
import type { DemoState } from '../src/demo/manager'

// ============================================================
// 辅助工具
// ============================================================

/** 创建一个距今 N 天前的日期（归零到当天0点） */
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

/** 创建默认的DemoState，可按需覆盖字段 */
function makeDemoState(overrides: Partial<DemoState> = {}): DemoState {
  return {
    isActive: true,
    startDate: daysAgo(0),
    currentDay: 1,
    totalTrustEarned: 0,
    hasReceivedGiftCoins: false,
    hasReceivedSurprise: false,
    isExpired: false,
    ...overrides,
  }
}

// ============================================================
// 1. DEMO_SCHEDULE 常量验证（TRUTH_TABLE 第七节）
// ============================================================

describe('DEMO_SCHEDULE 常量验证', () => {
  it('应包含7天日程', () => {
    expect(DEMO_SCHEDULE).toHaveLength(7)
  })

  it('每天的day字段应为1-7', () => {
    for (let i = 0; i < 7; i++) {
      expect(DEMO_SCHEDULE[i].day).toBe(i + 1)
    }
  })

  it('所有天的信赖获取倍率均为x8', () => {
    for (const config of DEMO_SCHEDULE) {
      expect(config.trustMultiplier).toBe(8)
    }
  })

  it('Day3赠送50爱心币', () => {
    const day3 = DEMO_SCHEDULE.find(d => d.day === 3)
    expect(day3).toBeDefined()
    expect(day3!.giftCoinsReward).toBe(50)
  })

  it('非Day3天不赠送爱心币', () => {
    const nonDay3 = DEMO_SCHEDULE.filter(d => d.day !== 3)
    for (const config of nonDay3) {
      expect(config.giftCoinsReward).toBe(0)
    }
  })

  it('Day5触发模拟惊喜', () => {
    const day5 = DEMO_SCHEDULE.find(d => d.day === 5)
    expect(day5).toBeDefined()
    expect(day5!.triggerSurprise).toBe(true)
  })

  it('非Day5天不触发惊喜', () => {
    const nonDay5 = DEMO_SCHEDULE.filter(d => d.day !== 5)
    for (const config of nonDay5) {
      expect(config.triggerSurprise).toBe(false)
    }
  })

  it('每天都有付费引导文案', () => {
    for (const config of DEMO_SCHEDULE) {
      expect(config.conversionPrompt).toBeTruthy()
      expect(typeof config.conversionPrompt).toBe('string')
    }
  })

  it('Day1预期等级为Lv.2（信赖值200，超过100阈值）', () => {
    const day1 = DEMO_SCHEDULE.find(d => d.day === 1)
    expect(day1!.expectedLevel).toBe(2)
    expect(day1!.expectedTrust).toBe(200)
  })

  it('Day7预期等级为Lv.5', () => {
    const day7 = DEMO_SCHEDULE.find(d => d.day === 7)
    expect(day7!.expectedLevel).toBe(5)
  })

  it('预期信赖值递增', () => {
    for (let i = 1; i < DEMO_SCHEDULE.length; i++) {
      expect(DEMO_SCHEDULE[i].expectedTrust).toBeGreaterThan(
        DEMO_SCHEDULE[i - 1].expectedTrust,
      )
    }
  })
})

// ============================================================
// 2. getDemoDay 天数计算
// ============================================================

describe('getDemoDay', () => {
  it('开始当天 → Day 1', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result = getDemoDay(today)
    expect(result).toBe(1)
  })

  it('1天前开始 → Day 2', () => {
    const result = getDemoDay(daysAgo(1))
    expect(result).toBe(2)
  })

  it('2天前开始 → Day 3', () => {
    const result = getDemoDay(daysAgo(2))
    expect(result).toBe(3)
  })

  it('6天前开始 → Day 7', () => {
    const result = getDemoDay(daysAgo(6))
    expect(result).toBe(7)
  })

  it('7天前开始 → 仍返回 Day 7（上限限制）', () => {
    const result = getDemoDay(daysAgo(7))
    expect(result).toBe(7)
  })

  it('30天前开始 → 仍返回 Day 7（上限限制）', () => {
    const result = getDemoDay(daysAgo(30))
    expect(result).toBe(7)
  })

  it('Day 1-7 全覆盖', () => {
    for (let i = 0; i < 7; i++) {
      const result = getDemoDay(daysAgo(i))
      expect(result).toBe(i + 1)
    }
  })
})

// ============================================================
// 3. getDemoMultiplier 倍率验证
// ============================================================

describe('getDemoMultiplier', () => {
  it('Day 1-7 倍率均为 x8', () => {
    for (let day = 1; day <= 7; day++) {
      expect(getDemoMultiplier(day)).toBe(8)
    }
  })

  it('Day 0（无效天数） → 回退到 x1', () => {
    expect(getDemoMultiplier(0)).toBe(1)
  })

  it('Day 8（超出范围） → 回退到 x1', () => {
    expect(getDemoMultiplier(8)).toBe(1)
  })

  it('负数天数 → 回退到 x1', () => {
    expect(getDemoMultiplier(-1)).toBe(1)
  })
})

// ============================================================
// 4. shouldReceiveGiftCoins Day3赠送条件
// ============================================================

describe('shouldReceiveGiftCoins', () => {
  it('Day3 + 未领取 → 应该发放', () => {
    const state = makeDemoState({
      currentDay: 3,
      hasReceivedGiftCoins: false,
    })
    expect(shouldReceiveGiftCoins(state)).toBe(true)
  })

  it('Day3 + 已领取 → 不再发放', () => {
    const state = makeDemoState({
      currentDay: 3,
      hasReceivedGiftCoins: true,
    })
    expect(shouldReceiveGiftCoins(state)).toBe(false)
  })

  it('Day2 + 未领取 → 还未到Day3不发放', () => {
    const state = makeDemoState({
      currentDay: 2,
      hasReceivedGiftCoins: false,
    })
    expect(shouldReceiveGiftCoins(state)).toBe(false)
  })

  it('Day4 + 未领取 → 补发（>=3均可）', () => {
    const state = makeDemoState({
      currentDay: 4,
      hasReceivedGiftCoins: false,
    })
    expect(shouldReceiveGiftCoins(state)).toBe(true)
  })

  it('Day7 + 未领取 → 仍可补发', () => {
    const state = makeDemoState({
      currentDay: 7,
      hasReceivedGiftCoins: false,
    })
    expect(shouldReceiveGiftCoins(state)).toBe(true)
  })

  it('Demo已过期 → 不发放', () => {
    const state = makeDemoState({
      isActive: false,
      currentDay: 3,
      hasReceivedGiftCoins: false,
    })
    expect(shouldReceiveGiftCoins(state)).toBe(false)
  })

  it('Day1 + 未领取 → 不发放', () => {
    const state = makeDemoState({
      currentDay: 1,
      hasReceivedGiftCoins: false,
    })
    expect(shouldReceiveGiftCoins(state)).toBe(false)
  })
})

// ============================================================
// 5. shouldTriggerDemoSurprise Day5惊喜条件
// ============================================================

describe('shouldTriggerDemoSurprise', () => {
  it('Day5 + 未触发 → 应该触发', () => {
    const state = makeDemoState({
      currentDay: 5,
      hasReceivedSurprise: false,
    })
    expect(shouldTriggerDemoSurprise(state)).toBe(true)
  })

  it('Day5 + 已触发 → 不再触发', () => {
    const state = makeDemoState({
      currentDay: 5,
      hasReceivedSurprise: true,
    })
    expect(shouldTriggerDemoSurprise(state)).toBe(false)
  })

  it('Day4 + 未触发 → 还未到Day5不触发', () => {
    const state = makeDemoState({
      currentDay: 4,
      hasReceivedSurprise: false,
    })
    expect(shouldTriggerDemoSurprise(state)).toBe(false)
  })

  it('Day6 + 未触发 → 补触发（>=5均可）', () => {
    const state = makeDemoState({
      currentDay: 6,
      hasReceivedSurprise: false,
    })
    expect(shouldTriggerDemoSurprise(state)).toBe(true)
  })

  it('Day7 + 未触发 → 仍可补触发', () => {
    const state = makeDemoState({
      currentDay: 7,
      hasReceivedSurprise: false,
    })
    expect(shouldTriggerDemoSurprise(state)).toBe(true)
  })

  it('Demo已过期 → 不触发', () => {
    const state = makeDemoState({
      isActive: false,
      currentDay: 5,
      hasReceivedSurprise: false,
    })
    expect(shouldTriggerDemoSurprise(state)).toBe(false)
  })

  it('Day1 + 未触发 → 不触发', () => {
    const state = makeDemoState({
      currentDay: 1,
      hasReceivedSurprise: false,
    })
    expect(shouldTriggerDemoSurprise(state)).toBe(false)
  })

  it('Day3 + 未触发 → 不触发（仅Day5+才触发）', () => {
    const state = makeDemoState({
      currentDay: 3,
      hasReceivedSurprise: false,
    })
    expect(shouldTriggerDemoSurprise(state)).toBe(false)
  })
})

// ============================================================
// 6. convertToFormal 转正式版（TRUTH_TABLE: 100信赖+Lv.2+100币）
// ============================================================

describe('convertToFormal', () => {
  it('保留100信赖值', () => {
    const result = convertToFormal(1440)
    expect(result.formalTrust).toBe(100)
  })

  it('从Lv.2起步', () => {
    const result = convertToFormal(1440)
    expect(result.formalLevel).toBe(2)
  })

  it('赠送100爱心币', () => {
    const result = convertToFormal(1440)
    expect(result.bonusCoins).toBe(100)
  })

  it('无论Demo期间累计多少信赖值，转正后均为100', () => {
    const lowTrust = convertToFormal(200)
    const highTrust = convertToFormal(5000)
    expect(lowTrust.formalTrust).toBe(100)
    expect(highTrust.formalTrust).toBe(100)
  })

  it('转正后等级始终为Lv.2', () => {
    expect(convertToFormal(0).formalLevel).toBe(2)
    expect(convertToFormal(10000).formalLevel).toBe(2)
  })

  it('转正后赠送币始终为100', () => {
    expect(convertToFormal(0).bonusCoins).toBe(100)
    expect(convertToFormal(9999).bonusCoins).toBe(100)
  })
})

// ============================================================
// 7. getDemoDayConfig 各天配置
// ============================================================

describe('getDemoDayConfig', () => {
  it('Day1 配置正确', () => {
    const config = getDemoDayConfig(1)
    expect(config).not.toBeNull()
    expect(config!.day).toBe(1)
    expect(config!.trustMultiplier).toBe(8)
    expect(config!.giftCoinsReward).toBe(0)
    expect(config!.triggerSurprise).toBe(false)
  })

  it('Day3 配置 — 赠送50爱心币', () => {
    const config = getDemoDayConfig(3)
    expect(config).not.toBeNull()
    expect(config!.giftCoinsReward).toBe(50)
    expect(config!.triggerSurprise).toBe(false)
  })

  it('Day5 配置 — 触发模拟惊喜', () => {
    const config = getDemoDayConfig(5)
    expect(config).not.toBeNull()
    expect(config!.triggerSurprise).toBe(true)
    expect(config!.giftCoinsReward).toBe(0)
  })

  it('Day7 配置 — 最后一天', () => {
    const config = getDemoDayConfig(7)
    expect(config).not.toBeNull()
    expect(config!.day).toBe(7)
    expect(config!.triggerSurprise).toBe(false)
    expect(config!.giftCoinsReward).toBe(0)
  })

  it('Day 1-7 全覆盖', () => {
    for (let day = 1; day <= 7; day++) {
      const config = getDemoDayConfig(day)
      expect(config).not.toBeNull()
      expect(config!.day).toBe(day)
    }
  })

  it('Day0（无效） → 返回 null', () => {
    expect(getDemoDayConfig(0)).toBeNull()
  })

  it('Day8（超出范围） → 返回 null', () => {
    expect(getDemoDayConfig(8)).toBeNull()
  })

  it('负数天 → 返回 null', () => {
    expect(getDemoDayConfig(-1)).toBeNull()
  })
})

// ============================================================
// 8. getDemoState 完整状态
// ============================================================

describe('getDemoState', () => {
  it('开始当天 → isActive=true, currentDay=1, isExpired=false', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const state = getDemoState(today, 0, false, false)
    expect(state.isActive).toBe(true)
    expect(state.currentDay).toBe(1)
    expect(state.isExpired).toBe(false)
  })

  it('6天前开始 → isActive=true, currentDay=7', () => {
    const state = getDemoState(daysAgo(6), 1260, false, false)
    expect(state.isActive).toBe(true)
    expect(state.currentDay).toBe(7)
  })

  it('7天前开始 → isActive=false, isExpired=true', () => {
    const state = getDemoState(daysAgo(7), 1440, true, true)
    expect(state.isActive).toBe(false)
    expect(state.isExpired).toBe(true)
  })

  it('正确传递 totalTrustEarned', () => {
    const state = getDemoState(daysAgo(2), 420, false, false)
    expect(state.totalTrustEarned).toBe(420)
  })

  it('正确传递 hasReceivedGiftCoins', () => {
    const state = getDemoState(daysAgo(3), 620, true, false)
    expect(state.hasReceivedGiftCoins).toBe(true)
  })

  it('正确传递 hasReceivedSurprise', () => {
    const state = getDemoState(daysAgo(5), 1060, false, true)
    expect(state.hasReceivedSurprise).toBe(true)
  })
})

// ============================================================
// 9. getConversionPrompt 付费引导文案
// ============================================================

describe('getConversionPrompt', () => {
  it('Day1-7 均有引导文案', () => {
    for (let day = 1; day <= 7; day++) {
      const prompt = getConversionPrompt(day)
      expect(prompt).not.toBeNull()
      expect(typeof prompt).toBe('string')
      expect(prompt!.length).toBeGreaterThan(0)
    }
  })

  it('Day0（无效） → 返回 null', () => {
    expect(getConversionPrompt(0)).toBeNull()
  })

  it('Day8（超出范围） → 返回 null', () => {
    expect(getConversionPrompt(8)).toBeNull()
  })

  it('Day3 引导文案包含首充信息', () => {
    const prompt = getConversionPrompt(3)
    expect(prompt).toContain('首充')
  })

  it('Day7 引导文案包含限时优惠', () => {
    const prompt = getConversionPrompt(7)
    expect(prompt).toContain('限时优惠')
  })
})

// ============================================================
// 10. getDemoEndMessage 结束文案
// ============================================================

describe('getDemoEndMessage', () => {
  it('包含Lv.2起始信息', () => {
    const msg = getDemoEndMessage()
    expect(msg).toContain('Lv.2')
  })

  it('包含100点信赖值保留信息', () => {
    const msg = getDemoEndMessage()
    expect(msg).toContain('100')
  })

  it('包含100爱心币注册礼信息', () => {
    const msg = getDemoEndMessage()
    expect(msg).toContain('100 爱心币')
  })

  it('包含首充翻倍信息', () => {
    const msg = getDemoEndMessage()
    expect(msg).toContain('首充翻倍')
  })

  it('返回非空字符串', () => {
    const msg = getDemoEndMessage()
    expect(msg.length).toBeGreaterThan(0)
  })
})
