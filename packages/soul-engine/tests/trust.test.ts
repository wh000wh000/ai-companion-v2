/**
 * 信赖系统测试 — 精确对照 TRUTH_TABLE.md
 *
 * 覆盖全部10个等级阈值、连续签到加成、每日信赖获取、
 * Demo模式、衰减分段、衰减下限、等级判定、升级冷却、
 * 事件值、综合变更。
 */

import { describe, expect, it } from 'vitest'
import {
  applyTrustChange,
  calculateDailyTrust,
  calculateTrustDecay,
  checkLevelUp,
  determineTrustLevel,
  getDecayFloor,
  getLevelProgress,
  getStreakBonus,
  getTrustEventValue,
} from '../src/trust/calculator'
import type { TrustUserContext } from '../src/trust/calculator'
import { TRUST_LEVEL_CONFIG } from '../src/types/character'

// ──────────────────────────── 工具函数 ────────────────────────────

/** 生成默认 TrustUserContext，便于测试中只覆写关心的字段 */
function makeUser(overrides: Partial<TrustUserContext> = {}): TrustUserContext {
  return {
    isMonthlyCard: false,
    isPaused: false,
    streakDays: 1,
    checkedInToday: false,
    todayChatRounds: 0,
    todayMaxSessionRounds: 0,
    deepChatRewardedToday: false,
    sharedMoodToday: false,
    dailyTasksCompleted: 0,
    todayGiftTrust: 0,
    hasDoubleCard: false,
    isDemo: false,
    ...overrides,
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. TRUST_LEVEL_CONFIG 常量验证
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━���━━━━━━━━━━

describe('TRUST_LEVEL_CONFIG 常量验证', () => {
  const expected = [
    { level: 1, name: '初见', requiredPoints: 0, cooldownDays: 0 },
    { level: 2, name: '相识', requiredPoints: 100, cooldownDays: 0 },
    { level: 3, name: '熟悉', requiredPoints: 350, cooldownDays: 0 },
    { level: 4, name: '信任', requiredPoints: 700, cooldownDays: 0 },
    { level: 5, name: '亲密', requiredPoints: 1200, cooldownDays: 3 },
    { level: 6, name: '默契', requiredPoints: 2000, cooldownDays: 5 },
    { level: 7, name: '挚友', requiredPoints: 3500, cooldownDays: 7 },
    { level: 8, name: '知己', requiredPoints: 6000, cooldownDays: 7 },
    { level: 9, name: '灵魂伴侣', requiredPoints: 10000, cooldownDays: 14 },
    { level: 10, name: '命中注定', requiredPoints: 16000, cooldownDays: 21 },
  ]

  it('应包含恰好10个等级', () => {
    expect(TRUST_LEVEL_CONFIG).toHaveLength(10)
  })

  it.each(expected)(
    '等级 $level ($name): 阈值=$requiredPoints, 冷却=$cooldownDays天',
    ({ level, name, requiredPoints, cooldownDays }) => {
      const config = TRUST_LEVEL_CONFIG.find(c => c.level === level)
      expect(config).toBeDefined()
      expect(config!.name).toBe(name)
      expect(config!.requiredPoints).toBe(requiredPoints)
      expect(config!.cooldownDays).toBe(cooldownDays)
    },
  )

  it('等级应按 level 升序排列', () => {
    for (let i = 1; i < TRUST_LEVEL_CONFIG.length; i++) {
      expect(TRUST_LEVEL_CONFIG[i].level).toBeGreaterThan(
        TRUST_LEVEL_CONFIG[i - 1].level,
      )
    }
  })

  it('阈值应严格递增', () => {
    for (let i = 1; i < TRUST_LEVEL_CONFIG.length; i++) {
      expect(TRUST_LEVEL_CONFIG[i].requiredPoints).toBeGreaterThan(
        TRUST_LEVEL_CONFIG[i - 1].requiredPoints,
      )
    }
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. getStreakBonus 连续签到加成
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('getStreakBonus 连续签到加成', () => {
  it.each([
    // 1-2天: 0
    { days: 0, expected: 0 },
    { days: 1, expected: 0 },
    { days: 2, expected: 0 },
    // 3天: +3
    { days: 3, expected: 3 },
    { days: 4, expected: 3 },
    { days: 6, expected: 3 },
    // 7天: +8
    { days: 7, expected: 8 },
    { days: 10, expected: 8 },
    { days: 13, expected: 8 },
    // 14天: +15
    { days: 14, expected: 15 },
    { days: 18, expected: 15 },
    { days: 20, expected: 15 },
    // 21天: +20
    { days: 21, expected: 20 },
    { days: 25, expected: 20 },
    { days: 29, expected: 20 },
    // 30天: +30
    { days: 30, expected: 30 },
    // 30天+: +5/周期, 上限+50
    { days: 59, expected: 30 },
    { days: 60, expected: 35 },
    { days: 89, expected: 35 },
    { days: 90, expected: 40 },
    { days: 120, expected: 45 },
    { days: 150, expected: 50 },
    // 上限50
    { days: 180, expected: 50 },
    { days: 300, expected: 50 },
  ])('连续 $days 天 → 加成 $expected', ({ days, expected }) => {
    expect(getStreakBonus(days)).toBe(expected)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. calculateDailyTrust 基础计算
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('calculateDailyTrust 基础计算', () => {
  it('零活动用户返回0', () => {
    expect(calculateDailyTrust(makeUser())).toBe(0)
  })

  // ── 签到 ──

  it('每日签到: 基础 5 点', () => {
    const user = makeUser({ checkedInToday: true, streakDays: 1 })
    // 5 (签到) + 0 (连续天数1天无加成)
    expect(calculateDailyTrust(user)).toBe(5)
  })

  it('签到 + 连续3天 = 5 + 3 = 8', () => {
    const user = makeUser({ checkedInToday: true, streakDays: 3 })
    expect(calculateDailyTrust(user)).toBe(8)
  })

  it('签到 + 连续7天 = 5 + 8 = 13', () => {
    const user = makeUser({ checkedInToday: true, streakDays: 7 })
    expect(calculateDailyTrust(user)).toBe(13)
  })

  // ── 对话 ──

  it('普通对话: 1/轮, 上限15轮 → 5轮=5', () => {
    const user = makeUser({ todayChatRounds: 5 })
    expect(calculateDailyTrust(user)).toBe(5)
  })

  it('普通对话: 超过15轮上限 → 依然=15', () => {
    const user = makeUser({ todayChatRounds: 20 })
    expect(calculateDailyTrust(user)).toBe(15)
  })

  it('普通对话: 恰好15轮 → 15', () => {
    const user = makeUser({ todayChatRounds: 15 })
    expect(calculateDailyTrust(user)).toBe(15)
  })

  // ── 深度对话 ──

  it('深度对话: 会话>=10轮且首次 → +10', () => {
    const user = makeUser({
      todayMaxSessionRounds: 10,
      deepChatRewardedToday: false,
    })
    expect(calculateDailyTrust(user)).toBe(10)
  })

  it('深度对话: 已奖励过 → 不再加', () => {
    const user = makeUser({
      todayMaxSessionRounds: 15,
      deepChatRewardedToday: true,
    })
    expect(calculateDailyTrust(user)).toBe(0)
  })

  it('深度对话: 会话不足10轮 → 不触发', () => {
    const user = makeUser({
      todayMaxSessionRounds: 9,
      deepChatRewardedToday: false,
    })
    expect(calculateDailyTrust(user)).toBe(0)
  })

  // ── 分享心情 ──

  it('分享心情: +8', () => {
    const user = makeUser({ sharedMoodToday: true })
    expect(calculateDailyTrust(user)).toBe(8)
  })

  // ── 完成每日任务 ──

  it('完成每日任务(>=3个): +5', () => {
    const user = makeUser({ dailyTasksCompleted: 3 })
    expect(calculateDailyTrust(user)).toBe(5)
  })

  it('每日任务不足3个: +0', () => {
    const user = makeUser({ dailyTasksCompleted: 2 })
    expect(calculateDailyTrust(user)).toBe(0)
  })

  // ── 送礼 ──

  it('送礼信赖值直接叠加，不受倍率影响', () => {
    const user = makeUser({ todayGiftTrust: 45 })
    expect(calculateDailyTrust(user)).toBe(45)
  })

  // ── 月卡加成 ──

  it('月卡每日: +15', () => {
    const user = makeUser({ isMonthlyCard: true })
    expect(calculateDailyTrust(user)).toBe(15)
  })

  it('月卡签到加成: +3 (总签到=5+3=8)', () => {
    const user = makeUser({
      isMonthlyCard: true,
      checkedInToday: true,
      streakDays: 1,
    })
    // 签到5 + 月卡签到3 + 月卡每日15 = 23
    expect(calculateDailyTrust(user)).toBe(23)
  })

  it('月卡对话倍率: x1.5 向下取整', () => {
    // 10轮 × 1 × 1.5 = 15
    const user = makeUser({ isMonthlyCard: true, todayChatRounds: 10 })
    // floor(10 * 1.5) = 15, + 月卡每日15 = 30
    expect(calculateDailyTrust(user)).toBe(30)
  })

  it('月卡对话倍率: 奇数轮向下取整 → 7轮 × 1.5 = floor(10.5) = 10', () => {
    const user = makeUser({ isMonthlyCard: true, todayChatRounds: 7 })
    // floor(7 * 1.5) = 10, + 月卡每日15 = 25
    expect(calculateDailyTrust(user)).toBe(25)
  })

  // ── 免费日上限验证 ──

  it('免费日上限: 签到5 + 对话15 + 深度10 + 心情8 + 任务5 = 43', () => {
    const user = makeUser({
      checkedInToday: true,
      streakDays: 1,
      todayChatRounds: 15,
      todayMaxSessionRounds: 10,
      deepChatRewardedToday: false,
      sharedMoodToday: true,
      dailyTasksCompleted: 3,
    })
    expect(calculateDailyTrust(user)).toBe(43)
  })

  // ── 双倍卡 ──

  it('双倍卡: base部分x2', () => {
    const user = makeUser({
      checkedInToday: true,
      streakDays: 1,
      hasDoubleCard: true,
    })
    // base=5, × 2.0 = 10
    expect(calculateDailyTrust(user)).toBe(10)
  })

  it('双倍卡不影响送礼信赖', () => {
    const user = makeUser({
      checkedInToday: true,
      streakDays: 1,
      hasDoubleCard: true,
      todayGiftTrust: 45,
    })
    // floor(5 * 1.0 * 2.0 + 45) = 55
    expect(calculateDailyTrust(user)).toBe(55)
  })

  // ── 组合场景 ──

  it('月卡 + 全免费活动 + 连续7天', () => {
    const user = makeUser({
      isMonthlyCard: true,
      checkedInToday: true,
      streakDays: 7,
      todayChatRounds: 15,
      todayMaxSessionRounds: 12,
      deepChatRewardedToday: false,
      sharedMoodToday: true,
      dailyTasksCompleted: 3,
    })
    // 签到5 + 月卡签到3 + 连续7天加成8 + floor(15*1.5)=22 + 深度10 + 心情8 + 任务5 + 月卡每日15 = 76
    expect(calculateDailyTrust(user)).toBe(76)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. calculateDailyTrust Demo模式
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('calculateDailyTrust Demo模式 (x8倍率)', () => {
  it('Demo模式: 签到5 → base=5 × 8 = 40', () => {
    const user = makeUser({
      isDemo: true,
      checkedInToday: true,
      streakDays: 1,
    })
    expect(calculateDailyTrust(user)).toBe(40)
  })

  it('Demo模式: 全免费活动 = 43 × 8 = 344', () => {
    const user = makeUser({
      isDemo: true,
      checkedInToday: true,
      streakDays: 1,
      todayChatRounds: 15,
      todayMaxSessionRounds: 10,
      deepChatRewardedToday: false,
      sharedMoodToday: true,
      dailyTasksCompleted: 3,
    })
    expect(calculateDailyTrust(user)).toBe(344)
  })

  it('Demo模式: 送礼不受x8倍率影响', () => {
    const user = makeUser({
      isDemo: true,
      todayGiftTrust: 200,
    })
    // base=0, ×8=0, + gift 200 = 200
    expect(calculateDailyTrust(user)).toBe(200)
  })

  it('Demo模式 + 月卡: 全免费活动', () => {
    const user = makeUser({
      isDemo: true,
      isMonthlyCard: true,
      checkedInToday: true,
      streakDays: 1,
      todayChatRounds: 15,
      todayMaxSessionRounds: 10,
      deepChatRewardedToday: false,
      sharedMoodToday: true,
      dailyTasksCompleted: 3,
    })
    // base = 5 + 3(月卡签到) + floor(15*1.5)=22 + 10 + 8 + 5 + 15(月卡每日) = 68
    // Demo: 68 × 8 = 544
    expect(calculateDailyTrust(user)).toBe(544)
  })

  it('Demo模式 + 双倍卡: 乘法叠加', () => {
    const user = makeUser({
      isDemo: true,
      hasDoubleCard: true,
      checkedInToday: true,
      streakDays: 1,
    })
    // base=5, ×8=40, × doubleCard 2.0 = 80
    expect(calculateDailyTrust(user)).toBe(80)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. calculateTrustDecay 衰减计算
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('calculateTrustDecay 衰减计算', () => {
  // ── 暂停模式 ──

  it('暂停模式: 任何天数均返回0', () => {
    expect(calculateTrustDecay(30, false, true)).toBe(0)
    expect(calculateTrustDecay(100, true, true)).toBe(0)
  })

  // ── 普通用户衰减 ──

  describe('普通用户', () => {
    it('1-4天(宽限期): 衰减=0', () => {
      expect(calculateTrustDecay(1, false, false)).toBe(0)
      expect(calculateTrustDecay(2, false, false)).toBe(0)
      expect(calculateTrustDecay(3, false, false)).toBe(0)
      expect(calculateTrustDecay(4, false, false)).toBe(0)
    })

    it('第5天: 超过宽限1天 → -3', () => {
      expect(calculateTrustDecay(5, false, false)).toBe(3)
    })

    it('第6天: 超过宽限2天 → -3×2 = -6', () => {
      expect(calculateTrustDecay(6, false, false)).toBe(6)
    })

    it('第7天: 超过宽限3天 → -3×3 = -9', () => {
      expect(calculateTrustDecay(7, false, false)).toBe(9)
    })

    it('第8天: 超过宽限4天 → 3×3 + 8×1 = 17', () => {
      // effective days: 1-3 → 3/天(×3=9), day 4 → 8/天(×1=8)
      expect(calculateTrustDecay(8, false, false)).toBe(17)
    })

    it('第14天: 超过宽限10天 → 3×3 + 8×7 = 65', () => {
      // effective days: 1-3 → 3×3=9, 4-10 → 8×7=56, total=65
      expect(calculateTrustDecay(14, false, false)).toBe(65)
    })

    it('第15天: 超过宽限11天 → 3×3 + 8×7 + 15×1 = 80', () => {
      expect(calculateTrustDecay(15, false, false)).toBe(80)
    })

    it('第30天: 超过宽限26天 → 3×3 + 8×7 + 15×16 = 305', () => {
      // 1-3: 9, 4-10: 56, 11-26: 240, total=305
      expect(calculateTrustDecay(30, false, false)).toBe(305)
    })

    it('第31天: 超过宽限27天 → 3×3 + 8×7 + 15×16 + 20×1 = 325', () => {
      expect(calculateTrustDecay(31, false, false)).toBe(325)
    })

    it('第34天: 超过宽限30天 → 9 + 56 + 240 + 20×4 = 385', () => {
      expect(calculateTrustDecay(34, false, false)).toBe(385)
    })
  })

  // ── 月卡用户衰减 ──

  describe('月卡用户', () => {
    it('1-7天(宽限期): 衰减=0', () => {
      for (let d = 1; d <= 7; d++) {
        expect(calculateTrustDecay(d, true, false)).toBe(0)
      }
    })

    it('第8天: 超过宽限1天 → -1', () => {
      expect(calculateTrustDecay(8, true, false)).toBe(1)
    })

    it('第10天: 超过宽限3天 → 1×3 = 3', () => {
      expect(calculateTrustDecay(10, true, false)).toBe(3)
    })

    it('第11天: 超过宽限4天 → 1×3 + 4×1 = 7', () => {
      expect(calculateTrustDecay(11, true, false)).toBe(7)
    })

    it('第17天: 超过宽限10天 → 1×3 + 4×7 = 31', () => {
      // effective 1-3: 1×3=3, 4-10: 4×7=28, total=31
      expect(calculateTrustDecay(17, true, false)).toBe(31)
    })

    it('第18天: 超过宽限11天 → 1×3 + 4×7 + 8×1 = 39', () => {
      expect(calculateTrustDecay(18, true, false)).toBe(39)
    })

    it('第33天: 超过宽限26天 → 1×3 + 4×7 + 8×16 = 159', () => {
      // 1-3: 3, 4-10: 28, 11-26: 128, total=159
      expect(calculateTrustDecay(33, true, false)).toBe(159)
    })

    it('第34天: 超过宽限27天 → 3 + 28 + 128 + 12×1 = 171', () => {
      expect(calculateTrustDecay(34, true, false)).toBe(171)
    })

    it('第40天: 超过宽限33天 → 3 + 28 + 128 + 12×7 = 243', () => {
      expect(calculateTrustDecay(40, true, false)).toBe(243)
    })
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. getDecayFloor 衰减下限
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('getDecayFloor 衰减下限', () => {
  // 公式: floor((当前等级起始值 + 上一等级起始值) / 2)

  it('Lv1: 下限=0', () => {
    expect(getDecayFloor(1)).toBe(0)
  })

  it('Lv2: floor((100 + 0) / 2) = 50', () => {
    expect(getDecayFloor(2)).toBe(50)
  })

  it('Lv3: floor((350 + 100) / 2) = 225', () => {
    expect(getDecayFloor(3)).toBe(225)
  })

  it('Lv4: floor((700 + 350) / 2) = 525', () => {
    expect(getDecayFloor(4)).toBe(525)
  })

  it('Lv5: floor((1200 + 700) / 2) = 950', () => {
    expect(getDecayFloor(5)).toBe(950)
  })

  it('Lv6: floor((2000 + 1200) / 2) = 1600', () => {
    expect(getDecayFloor(6)).toBe(1600)
  })

  it('Lv7: floor((3500 + 2000) / 2) = 2750', () => {
    expect(getDecayFloor(7)).toBe(2750)
  })

  it('Lv8: floor((6000 + 3500) / 2) = 4750', () => {
    expect(getDecayFloor(8)).toBe(4750)
  })

  it('Lv9: floor((10000 + 6000) / 2) = 8000', () => {
    expect(getDecayFloor(9)).toBe(8000)
  })

  it('Lv10: floor((16000 + 10000) / 2) = 13000', () => {
    expect(getDecayFloor(10)).toBe(13000)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. determineTrustLevel 等级判定（边界值测试）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('determineTrustLevel 等级判定', () => {
  it.each([
    // 下边界 & 上边界
    { points: 0, level: 1 },
    { points: 99, level: 1 },
    { points: 100, level: 2 },
    { points: 349, level: 2 },
    { points: 350, level: 3 },
    { points: 699, level: 3 },
    { points: 700, level: 4 },
    { points: 1199, level: 4 },
    { points: 1200, level: 5 },
    { points: 1999, level: 5 },
    { points: 2000, level: 6 },
    { points: 3499, level: 6 },
    { points: 3500, level: 7 },
    { points: 5999, level: 7 },
    { points: 6000, level: 8 },
    { points: 9999, level: 8 },
    { points: 10000, level: 9 },
    { points: 15999, level: 9 },
    { points: 16000, level: 10 },
    { points: 99999, level: 10 },
  ])('信赖值 $points → 等级 $level', ({ points, level }) => {
    expect(determineTrustLevel(points)).toBe(level)
  })
})

// ━━━━━━━━━━━━━━━━━━━��━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. checkLevelUp 升级冷却
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('checkLevelUp 升级冷却', () => {
  // 无冷却等级 (Lv1-4, cooldownDays=0)

  it('Lv1→Lv2: 无冷却，信赖够即升', () => {
    const result = checkLevelUp(1, 100, 0)
    expect(result.canLevelUp).toBe(true)
    expect(result.targetLevel).toBe(2)
    expect(result.cooldownRemaining).toBe(0)
  })

  it('Lv1→Lv2: 信赖不够不升', () => {
    const result = checkLevelUp(1, 99, 10)
    expect(result.canLevelUp).toBe(false)
    expect(result.targetLevel).toBe(1)
  })

  it('Lv4→Lv5: 无冷却(Lv4冷却=0)，够就升', () => {
    const result = checkLevelUp(4, 1200, 0)
    expect(result.canLevelUp).toBe(true)
    expect(result.targetLevel).toBe(5)
    expect(result.cooldownRemaining).toBe(0)
  })

  // 有冷却等级

  it('Lv5→Lv6: Lv5冷却3天，已待3天可升', () => {
    const result = checkLevelUp(5, 2000, 3)
    expect(result.canLevelUp).toBe(true)
    expect(result.targetLevel).toBe(6)
    expect(result.cooldownRemaining).toBe(0)
  })

  it('Lv5→Lv6: Lv5冷却3天，仅待2天不可升', () => {
    const result = checkLevelUp(5, 2000, 2)
    expect(result.canLevelUp).toBe(false)
    expect(result.targetLevel).toBe(6)
    expect(result.cooldownRemaining).toBe(1)
  })

  it('Lv6→Lv7: Lv6冷却5天，已待5天可升', () => {
    const result = checkLevelUp(6, 3500, 5)
    expect(result.canLevelUp).toBe(true)
    expect(result.targetLevel).toBe(7)
    expect(result.cooldownRemaining).toBe(0)
  })

  it('Lv6→Lv7: Lv6冷却5天，仅待3天不可升', () => {
    const result = checkLevelUp(6, 3500, 3)
    expect(result.canLevelUp).toBe(false)
    expect(result.targetLevel).toBe(7)
    expect(result.cooldownRemaining).toBe(2)
  })

  it('Lv7→Lv8: Lv7冷却7天', () => {
    const result = checkLevelUp(7, 6000, 7)
    expect(result.canLevelUp).toBe(true)
    expect(result.targetLevel).toBe(8)
  })

  it('Lv8→Lv9: Lv8冷却7天', () => {
    const result = checkLevelUp(8, 10000, 7)
    expect(result.canLevelUp).toBe(true)
    expect(result.targetLevel).toBe(9)
  })

  it('Lv9→Lv10: Lv9冷却14天，已待14天可升', () => {
    const result = checkLevelUp(9, 16000, 14)
    expect(result.canLevelUp).toBe(true)
    expect(result.targetLevel).toBe(10)
    expect(result.cooldownRemaining).toBe(0)
  })

  it('Lv9→Lv10: Lv9冷却14天，仅待10天不可升', () => {
    const result = checkLevelUp(9, 16000, 10)
    expect(result.canLevelUp).toBe(false)
    expect(result.targetLevel).toBe(10)
    expect(result.cooldownRemaining).toBe(4)
  })

  it('Lv10满级: 无法再升', () => {
    const result = checkLevelUp(10, 99999, 100)
    expect(result.canLevelUp).toBe(false)
    expect(result.targetLevel).toBe(10)
    expect(result.cooldownRemaining).toBe(0)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. getTrustEventValue 事件值验证
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('getTrustEventValue 事件值验证', () => {
  it.each([
    { event: 'daily_checkin' as const, value: 5 },
    { event: 'chat_round' as const, value: 1 },
    { event: 'deep_chat' as const, value: 10 },
    { event: 'share_mood' as const, value: 8 },
    { event: 'daily_task' as const, value: 5 },
    { event: 'gift_small' as const, value: 8 },
    { event: 'gift_warm' as const, value: 45 },
    { event: 'gift_love' as const, value: 200 },
    { event: 'gift_forever' as const, value: 550 },
  ])('$event → $value', ({ event, value }) => {
    expect(getTrustEventValue(event)).toBe(value)
  })

  // 送礼与币价对照
  it('小心意(10币): +8', () => {
    expect(getTrustEventValue('gift_small')).toBe(8)
  })

  it('暖暖的(50币): +45', () => {
    expect(getTrustEventValue('gift_warm')).toBe(45)
  })

  it('超爱你(200币): +200', () => {
    expect(getTrustEventValue('gift_love')).toBe(200)
  })

  it('一辈子(520币): +550', () => {
    expect(getTrustEventValue('gift_forever')).toBe(550)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. applyTrustChange 综合变更
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('applyTrustChange 综合变更', () => {
  it('纯获取: 无衰减，当日签到+对话', () => {
    const result = applyTrustChange(
      { trustPoints: 50, trustLevel: 1, streakDays: 2 },
      makeUser({
        checkedInToday: true,
        streakDays: 2,
        todayChatRounds: 10,
      }),
      1, // 昨天互动过
      5,
    )
    // streak 2→3 (连续), checkin5 + streak3天bonus3 + chat10 = 18
    expect(result.gained).toBe(18)
    expect(result.decayed).toBe(0)
    expect(result.trustPoints).toBe(68) // 50 + 18
    expect(result.streakDays).toBe(3)
  })

  it('纯衰减: 长期不活跃，但有衰减下限保护', () => {
    const result = applyTrustChange(
      { trustPoints: 400, trustLevel: 3, streakDays: 0 },
      makeUser(), // 无任何活动
      20, // 20天未互动
      30,
    )
    // 衰减: 普通用户20天不活跃 → 超出宽限16天
    // 1-3: 9, 4-10: 56, 11-16: 90, total=155
    // Lv3衰减下限: floor((350+100)/2) = 225
    // 400 - 155 = 245 > 225, 所以衰减=155
    expect(result.decayed).toBe(155)
    expect(result.trustPoints).toBe(245) // 400 - 155 + 0(无活动)
    expect(result.streakDays).toBe(1) // 重置
  })

  it('衰减下限保护: 信赖值不低于下限', () => {
    const result = applyTrustChange(
      { trustPoints: 260, trustLevel: 3, streakDays: 0 },
      makeUser(), // 无活动
      30, // 30天不活跃
      60,
    )
    // 普通用户30天 → 超出宽限26天 → 9+56+240=305
    // Lv3下限=225
    // 260 - 305 = -45 → 钳位到225
    // 实际衰减 = 260 - 225 = 35
    expect(result.decayed).toBe(35)
    expect(result.trustPoints).toBe(225)
  })

  it('升级: 信赖达到下一等级门槛', () => {
    const result = applyTrustChange(
      { trustPoints: 90, trustLevel: 1, streakDays: 5 },
      makeUser({
        checkedInToday: true,
        streakDays: 5,
        todayChatRounds: 5,
      }),
      1,
      10,
    )
    // streak 5→6, checkin5 + streak3天bonus3 + chat5 = 13
    // 90 + 13 = 103 >= 100 → 升到Lv2
    expect(result.trustPoints).toBe(103)
    expect(result.trustLevel).toBe(2)
    expect(result.leveledUp).toBe(true)
  })

  it('升级被冷却阻止: 信赖够但冷却未满', () => {
    const result = applyTrustChange(
      { trustPoints: 1190, trustLevel: 4, streakDays: 10 },
      makeUser({
        checkedInToday: true,
        streakDays: 10,
        todayChatRounds: 10,
      }),
      1,
      0, // 刚到Lv4, daysAtCurrentLevel=0, Lv4冷却=0 所以实际无冷却
    )
    // Lv4 cooldown=0, 所以可以升
    // streak 10→11, checkin5 + streak7天bonus8 + chat10 = 23
    // 1190 + 23 = 1213 >= 1200 → 可升Lv5
    expect(result.trustPoints).toBe(1213)
    expect(result.trustLevel).toBe(5)
    expect(result.leveledUp).toBe(true)
  })

  it('Lv5→Lv6 冷却阻止: Lv5冷却3天，只待了1天', () => {
    const result = applyTrustChange(
      { trustPoints: 1990, trustLevel: 5, streakDays: 20 },
      makeUser({
        checkedInToday: true,
        streakDays: 20,
        todayChatRounds: 15,
      }),
      1,
      1, // 只在Lv5待了1天
    )
    // inactiveDays=1 → streakDays 20→21
    // checkin5 + streak21天bonus20 + chat15 = 40
    // 1990 + 40 = 2030 >= 2000 → 想升Lv6
    // 但 Lv5 冷却=3天, daysAtCurrentLevel=1, remaining=2 → 不可升
    expect(result.trustPoints).toBe(2030)
    expect(result.trustLevel).toBe(5) // 保持Lv5
    expect(result.leveledUp).toBe(false)
  })

  it('动摇状态: 信赖值低于当前等级阈值', () => {
    const result = applyTrustChange(
      { trustPoints: 360, trustLevel: 3, streakDays: 0 },
      makeUser(), // 无活动
      10, // 10天不活跃
      30,
    )
    // 普通用户10天 → 超出宽限6天 → 3×3 + 8×3 = 33
    // 360 - 33 = 327 < 350(Lv3阈值) → 动摇
    expect(result.trustPoints).toBe(327)
    expect(result.trustLevel).toBe(3) // 不掉等级
    expect(result.isShaken).toBe(true)
  })

  it('非动摇: 衰减后仍高于等级阈值', () => {
    const result = applyTrustChange(
      { trustPoints: 400, trustLevel: 3, streakDays: 0 },
      makeUser(), // 无活动
      5, // 5天不活跃
      30,
    )
    // 超出宽限1天 → -3
    // 400 - 3 = 397 >= 350 → 不动摇
    expect(result.trustPoints).toBe(397)
    expect(result.trustLevel).toBe(3)
    expect(result.isShaken).toBe(false)
  })

  it('连续天数: 隔天互动保持连续', () => {
    const result = applyTrustChange(
      { trustPoints: 50, trustLevel: 1, streakDays: 5 },
      makeUser({ checkedInToday: true, streakDays: 5 }),
      1, // 昨天互动
      3,
    )
    expect(result.streakDays).toBe(6)
  })

  it('连续天数: 超过1天未互动则重置', () => {
    const result = applyTrustChange(
      { trustPoints: 50, trustLevel: 1, streakDays: 10 },
      makeUser({ checkedInToday: true, streakDays: 10 }),
      3, // 3天没互动
      3,
    )
    // streakDays重置为1，签到bonus用streakDays=1
    expect(result.streakDays).toBe(1)
  })

  it('连续天数: 当天已互动(inactiveDays=0)保持不变', () => {
    const result = applyTrustChange(
      { trustPoints: 50, trustLevel: 1, streakDays: 7 },
      makeUser({ checkedInToday: true, streakDays: 7 }),
      0, // 当天已互动
      3,
    )
    expect(result.streakDays).toBe(7)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 额外: getLevelProgress 进度百分比
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('getLevelProgress 进度百分比', () => {
  it('Lv1 起点: 0/100 → 0%', () => {
    expect(getLevelProgress(0, 1)).toBe(0)
  })

  it('Lv1 中途: 50/100 → 50%', () => {
    expect(getLevelProgress(50, 1)).toBe(50)
  })

  it('Lv1 满: 99/100 → 99%', () => {
    expect(getLevelProgress(99, 1)).toBe(99)
  })

  it('Lv1 恰好达到Lv2: 100/100 → 100%', () => {
    expect(getLevelProgress(100, 1)).toBe(100)
  })

  it('Lv2: 200/(350-100)=100/250 → 40%', () => {
    expect(getLevelProgress(200, 2)).toBe(40)
  })

  it('Lv9: 13000/(16000-10000)=3000/6000 → 50%', () => {
    expect(getLevelProgress(13000, 9)).toBe(50)
  })

  it('Lv10 满级: 始终100%', () => {
    expect(getLevelProgress(16000, 10)).toBe(100)
    expect(getLevelProgress(99999, 10)).toBe(100)
  })

  it('不超过100%', () => {
    // 如果信赖值远超当前等级范围
    expect(getLevelProgress(500, 1)).toBe(100)
  })

  it('不低于0%', () => {
    // 边界保护（理论上不应出现负值，但测试防御性）
    expect(getLevelProgress(0, 2)).toBe(0)
  })
})
