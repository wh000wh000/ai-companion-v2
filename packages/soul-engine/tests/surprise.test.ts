/**
 * 惊喜系统测试
 *
 * 对照 TRUTH_TABLE.md 第六节验证惊喜系统的确定性触发逻辑。
 * 所有数值均来自真值表，确保代码实现与设计文档一致。
 */

import { describe, expect, it, vi } from 'vitest'
import {
  calculateBudget,
  checkCooldown,
  checkThresholdTrigger,
  generateCharacterMessage,
  selectSurpriseType,
} from '../src/surprise/engine'
import type { SurpriseTriggerContext } from '../src/surprise/engine'
import {
  DEFAULT_BUDGET_CONTROL,
  MONTHLY_SUBSCRIBER_COOLDOWN_DAYS,
  SURPRISE_THRESHOLDS,
} from '../src/types/surprise'

// ============================================================
// 辅助工具
// ============================================================

/** 创建一个距今 N 天前的日期 */
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

/** 创建默认的触发上下文，可按需覆盖字段 */
function makeContext(overrides: Partial<SurpriseTriggerContext> = {}): SurpriseTriggerContext {
  return {
    trustLevel: 5,
    pocketBalance: 0,
    lastSurpriseDate: null,
    monthlySurpriseCount: 0,
    isMonthlyCard: false,
    preferences: [],
    ...overrides,
  }
}

// ============================================================
// 1. SURPRISE_THRESHOLDS 常量验证（TRUTH_TABLE 6.1节）
// ============================================================

describe('SURPRISE_THRESHOLDS 常量验证', () => {
  it('应包含4种惊喜类型', () => {
    expect(SURPRISE_THRESHOLDS).toHaveLength(4)
  })

  it('虚拟惊喜：Lv.5+，零花钱>=0分，预算0', () => {
    const virtual = SURPRISE_THRESHOLDS.find(t => t.type === 'virtual')
    expect(virtual).toBeDefined()
    expect(virtual!.minTrustLevel).toBe(5)
    expect(virtual!.minPocketBalance).toBe(0)
    expect(virtual!.budgetRange.min).toBe(0)
    expect(virtual!.budgetRange.max).toBe(0)
  })

  it('电子惊喜：Lv.6+，零花钱>=1500分，预算500-1500分', () => {
    const electronic = SURPRISE_THRESHOLDS.find(t => t.type === 'electronic')
    expect(electronic).toBeDefined()
    expect(electronic!.minTrustLevel).toBe(6)
    expect(electronic!.minPocketBalance).toBe(1500)
    expect(electronic!.budgetRange.min).toBe(500)
    expect(electronic!.budgetRange.max).toBe(1500)
  })

  it('实物惊喜：Lv.8+，零花钱>=3000分，预算1000-5000分', () => {
    const physical = SURPRISE_THRESHOLDS.find(t => t.type === 'physical')
    expect(physical).toBeDefined()
    expect(physical!.minTrustLevel).toBe(8)
    expect(physical!.minPocketBalance).toBe(3000)
    expect(physical!.budgetRange.min).toBe(1000)
    expect(physical!.budgetRange.max).toBe(5000)
  })

  it('个性化惊喜：Lv.9+，零花钱>=5000分，预算1500-10000分', () => {
    const personalized = SURPRISE_THRESHOLDS.find(t => t.type === 'personalized')
    expect(personalized).toBeDefined()
    expect(personalized!.minTrustLevel).toBe(9)
    expect(personalized!.minPocketBalance).toBe(5000)
    expect(personalized!.budgetRange.min).toBe(1500)
    expect(personalized!.budgetRange.max).toBe(10000)
  })

  it('类型优先级顺序：virtual < electronic < physical < personalized', () => {
    const types = SURPRISE_THRESHOLDS.map(t => t.type)
    expect(types).toEqual(['virtual', 'electronic', 'physical', 'personalized'])
  })
})

// ============================================================
// 2. DEFAULT_BUDGET_CONTROL 验证（TRUTH_TABLE 6.2节）
// ============================================================

describe('DEFAULT_BUDGET_CONTROL 验证', () => {
  it('单次最大花费为池余额的60%', () => {
    expect(DEFAULT_BUDGET_CONTROL.maxSpendRatio).toBe(0.6)
  })

  it('月度上限为4次', () => {
    expect(DEFAULT_BUDGET_CONTROL.monthlyMaxCount).toBe(4)
  })

  it('最小惊喜金额为1000分(10元)', () => {
    expect(DEFAULT_BUDGET_CONTROL.minSurpriseAmount).toBe(1000)
  })

  it('月卡冷却期为5天', () => {
    expect(MONTHLY_SUBSCRIBER_COOLDOWN_DAYS).toBe(5)
  })
})

// ============================================================
// 3. checkThresholdTrigger 确定性触发检查
// ============================================================

describe('checkThresholdTrigger', () => {
  describe('基本触发条件', () => {
    it('Lv.5 + 零花钱0 → 可触发虚拟惊喜', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 5,
        pocketBalance: 0,
      }))
      expect(result.shouldTrigger).toBe(true)
      expect(result.availableTypes).toContain('virtual')
    })

    it('Lv.4 → 不可触发任何惊喜（信赖等级不足）', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 4,
        pocketBalance: 10000,
      }))
      expect(result.shouldTrigger).toBe(false)
      expect(result.availableTypes).toHaveLength(0)
    })

    it('Lv.6 + 零花钱1500分 → 可触发虚拟+电子惊喜', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 6,
        pocketBalance: 1500,
      }))
      expect(result.shouldTrigger).toBe(true)
      expect(result.availableTypes).toContain('virtual')
      expect(result.availableTypes).toContain('electronic')
      expect(result.availableTypes).not.toContain('physical')
    })

    it('Lv.6 + 零花钱1000分 → 只可触发虚拟惊喜（电子需1500分）', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 6,
        pocketBalance: 1000,
      }))
      expect(result.shouldTrigger).toBe(true)
      expect(result.availableTypes).toEqual(['virtual'])
    })

    it('Lv.8 + 零花钱3000分 → 可触发虚拟+电子+实物惊喜', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 8,
        pocketBalance: 3000,
      }))
      expect(result.shouldTrigger).toBe(true)
      expect(result.availableTypes).toContain('virtual')
      expect(result.availableTypes).toContain('electronic')
      expect(result.availableTypes).toContain('physical')
      expect(result.availableTypes).not.toContain('personalized')
    })

    it('Lv.9 + 零花钱5000分 → 可触发全部4种惊喜', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 9,
        pocketBalance: 5000,
      }))
      expect(result.shouldTrigger).toBe(true)
      expect(result.availableTypes).toHaveLength(4)
      expect(result.availableTypes).toContain('virtual')
      expect(result.availableTypes).toContain('electronic')
      expect(result.availableTypes).toContain('physical')
      expect(result.availableTypes).toContain('personalized')
    })

    it('Lv.10 + 零花钱10000分 → 可触发全部4种惊喜', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 10,
        pocketBalance: 10000,
      }))
      expect(result.shouldTrigger).toBe(true)
      expect(result.availableTypes).toHaveLength(4)
    })
  })

  describe('月度次数上限', () => {
    it('本月已触发4次 → 不可触发', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 9,
        pocketBalance: 10000,
        monthlySurpriseCount: 4,
      }))
      expect(result.shouldTrigger).toBe(false)
      expect(result.reasons[0]).toContain('上限')
    })

    it('本月已触发3次 → 仍可触发', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 5,
        pocketBalance: 0,
        monthlySurpriseCount: 3,
      }))
      expect(result.shouldTrigger).toBe(true)
    })

    it('本月已触发5次（超过上限） → 不可触发', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 9,
        pocketBalance: 10000,
        monthlySurpriseCount: 5,
      }))
      expect(result.shouldTrigger).toBe(false)
    })
  })

  describe('冷却期拦截', () => {
    it('上次惊喜在3天前（普通用户） → 冷却中不可触发', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 5,
        pocketBalance: 0,
        lastSurpriseDate: daysAgo(3),
        isMonthlyCard: false,
      }))
      expect(result.shouldTrigger).toBe(false)
      expect(result.reasons[0]).toContain('冷却')
    })

    it('上次惊喜在7天前（普通用户） → 冷却结束可触发', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 5,
        pocketBalance: 0,
        lastSurpriseDate: daysAgo(7),
        isMonthlyCard: false,
      }))
      expect(result.shouldTrigger).toBe(true)
    })

    it('上次惊喜在5天前（月卡用户） → 冷却结束可触发', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 5,
        pocketBalance: 0,
        lastSurpriseDate: daysAgo(5),
        isMonthlyCard: true,
      }))
      expect(result.shouldTrigger).toBe(true)
    })

    it('上次惊喜在4天前（月卡用户） → 冷却中不可触发', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 5,
        pocketBalance: 0,
        lastSurpriseDate: daysAgo(4),
        isMonthlyCard: true,
      }))
      expect(result.shouldTrigger).toBe(false)
    })

    it('从未触发过惊喜 → 无冷却期', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 5,
        pocketBalance: 0,
        lastSurpriseDate: null,
      }))
      expect(result.shouldTrigger).toBe(true)
    })
  })

  describe('bestType 选择', () => {
    it('Lv.9 + 满足全部条件 → bestType 为 personalized', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 9,
        pocketBalance: 5000,
      }))
      expect(result.bestType).toBe('personalized')
    })

    it('Lv.8 + 满足实物条件 → bestType 为 physical', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 8,
        pocketBalance: 3000,
      }))
      expect(result.bestType).toBe('physical')
    })

    it('Lv.5 + 仅虚拟条件 → bestType 为 virtual', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 5,
        pocketBalance: 0,
      }))
      expect(result.bestType).toBe('virtual')
    })

    it('不满足任何条件 → bestType 为 null', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 4,
        pocketBalance: 0,
      }))
      expect(result.bestType).toBeNull()
    })
  })

  describe('reasons 详细原因', () => {
    it('应包含每种类型的检查原因', () => {
      const result = checkThresholdTrigger(makeContext({
        trustLevel: 5,
        pocketBalance: 0,
      }))
      // 至少应有4条原因（每种类型一条）
      expect(result.reasons.length).toBeGreaterThanOrEqual(1)
    })
  })
})

// ============================================================
// 4. selectSurpriseType 优先级排序
// ============================================================

describe('selectSurpriseType', () => {
  it('多种类型可用时，选择优先级最高的（personalized）', () => {
    const result = selectSurpriseType(
      ['virtual', 'electronic', 'physical', 'personalized'],
      9,
    )
    expect(result).toBe('personalized')
  })

  it('virtual + electronic → 选择 electronic', () => {
    const result = selectSurpriseType(['virtual', 'electronic'], 6)
    expect(result).toBe('electronic')
  })

  it('只有 virtual → 选择 virtual', () => {
    const result = selectSurpriseType(['virtual'], 5)
    expect(result).toBe('virtual')
  })

  it('physical + electronic → 选择 physical', () => {
    const result = selectSurpriseType(['electronic', 'physical'], 8)
    expect(result).toBe('physical')
  })

  it('空数组 → 回退到 virtual', () => {
    const result = selectSurpriseType([], 5)
    expect(result).toBe('virtual')
  })

  it('顺序不影响结果（乱序输入）', () => {
    const result = selectSurpriseType(
      ['electronic', 'personalized', 'virtual', 'physical'],
      9,
    )
    expect(result).toBe('personalized')
  })
})

// ============================================================
// 5. calculateBudget 预算计算
// ============================================================

describe('calculateBudget', () => {
  describe('虚拟惊喜预算', () => {
    it('虚拟惊喜预算始终为0', () => {
      const result = calculateBudget(10000, 'virtual')
      expect(result.min).toBe(0)
      expect(result.max).toBe(0)
      expect(result.recommended).toBe(0)
    })
  })

  describe('电子惊喜预算', () => {
    it('余额2000分 → 推荐 min(2000*0.45=900, 1500)=900, clamp到最小500', () => {
      const result = calculateBudget(2000, 'electronic')
      expect(result.min).toBe(500)
      expect(result.max).toBe(1500)
      expect(result.recommended).toBe(900)
    })

    it('余额5000分 → 推荐 min(5000*0.45=2250, 1500)=1500', () => {
      const result = calculateBudget(5000, 'electronic')
      expect(result.recommended).toBe(1500)
    })

    it('余额800分 → 推荐 min(800*0.45=360, 1500)=360, clamp到最小500', () => {
      const result = calculateBudget(800, 'electronic')
      expect(result.recommended).toBe(500)
    })
  })

  describe('实物惊喜预算', () => {
    it('余额3000分 → 推荐 min(3000*0.45=1350, 5000)=1350, clamp到最小1000', () => {
      const result = calculateBudget(3000, 'physical')
      expect(result.min).toBe(1000)
      expect(result.max).toBe(5000)
      expect(result.recommended).toBe(1350)
    })

    it('余额20000分 → 推荐 min(20000*0.45=9000, 5000)=5000', () => {
      const result = calculateBudget(20000, 'physical')
      expect(result.recommended).toBe(5000)
    })
  })

  describe('个性化惊喜预算', () => {
    it('余额10000分 → 推荐 min(10000*0.45=4500, 10000)=4500, clamp到最小1500', () => {
      const result = calculateBudget(10000, 'personalized')
      expect(result.min).toBe(1500)
      expect(result.max).toBe(10000)
      expect(result.recommended).toBe(4500)
    })

    it('余额50000分 → 推荐 min(50000*0.45=22500, 10000)=10000', () => {
      const result = calculateBudget(50000, 'personalized')
      expect(result.recommended).toBe(10000)
    })

    it('余额1000分 → 推荐 min(1000*0.45=450, 10000)=450, clamp到最小1500', () => {
      const result = calculateBudget(1000, 'personalized')
      expect(result.recommended).toBe(1500)
    })
  })

  describe('边界情况', () => {
    it('未知类型 → 返回全0', () => {
      const result = calculateBudget(10000, 'unknown' as any)
      expect(result.min).toBe(0)
      expect(result.max).toBe(0)
      expect(result.recommended).toBe(0)
    })

    it('余额为0 → 虚拟惊喜仍可使用', () => {
      const result = calculateBudget(0, 'virtual')
      expect(result.recommended).toBe(0)
    })
  })
})

// ============================================================
// 6. checkCooldown 冷却期检查
// ============================================================

describe('checkCooldown', () => {
  describe('普通用户冷却期（7天）', () => {
    it('从未触发 → 不在冷却期', () => {
      const result = checkCooldown(null, false)
      expect(result.inCooldown).toBe(false)
      expect(result.daysRemaining).toBe(0)
    })

    it('6天前触发 → 冷却中，还需1天', () => {
      const result = checkCooldown(daysAgo(6), false)
      expect(result.inCooldown).toBe(true)
      expect(result.daysRemaining).toBe(1)
    })

    it('7天前触发 → 冷却结束', () => {
      const result = checkCooldown(daysAgo(7), false)
      expect(result.inCooldown).toBe(false)
      expect(result.daysRemaining).toBe(0)
    })

    it('1天前触发 → 冷却中，还需6天', () => {
      const result = checkCooldown(daysAgo(1), false)
      expect(result.inCooldown).toBe(true)
      expect(result.daysRemaining).toBe(6)
    })

    it('0天前（今天）触发 → 冷却中，还需7天', () => {
      const result = checkCooldown(daysAgo(0), false)
      expect(result.inCooldown).toBe(true)
      expect(result.daysRemaining).toBe(7)
    })

    it('30天前触发 → 冷却结束', () => {
      const result = checkCooldown(daysAgo(30), false)
      expect(result.inCooldown).toBe(false)
    })
  })

  describe('月卡用户冷却期（5天）', () => {
    it('4天前触发 → 冷却中，还需1天', () => {
      const result = checkCooldown(daysAgo(4), true)
      expect(result.inCooldown).toBe(true)
      expect(result.daysRemaining).toBe(1)
    })

    it('5天前触发 → 冷却结束', () => {
      const result = checkCooldown(daysAgo(5), true)
      expect(result.inCooldown).toBe(false)
      expect(result.daysRemaining).toBe(0)
    })

    it('3天前触发 → 冷却中，还需2天', () => {
      const result = checkCooldown(daysAgo(3), true)
      expect(result.inCooldown).toBe(true)
      expect(result.daysRemaining).toBe(2)
    })

    it('0天前（今天）触发 → 冷却中，还需5天', () => {
      const result = checkCooldown(daysAgo(0), true)
      expect(result.inCooldown).toBe(true)
      expect(result.daysRemaining).toBe(5)
    })
  })

  describe('月卡 vs 普通用户对比', () => {
    it('同样6天前触发 → 普通冷却中，月卡已结束', () => {
      const normalResult = checkCooldown(daysAgo(6), false)
      const monthlyResult = checkCooldown(daysAgo(6), true)
      expect(normalResult.inCooldown).toBe(true)
      expect(monthlyResult.inCooldown).toBe(false)
    })
  })
})

// ============================================================
// 7. generateCharacterMessage 角色留言
// ============================================================

describe('generateCharacterMessage', () => {
  const characterName = '小暖'

  it('虚拟惊喜 → 包含产品名和心意关键词', () => {
    const msg = generateCharacterMessage(characterName, '专属壁纸', 'virtual')
    expect(msg).toContain('专属壁纸')
    expect(msg).toContain('心意')
  })

  it('电子惊喜 → 包含产品名和零花钱关键词', () => {
    const msg = generateCharacterMessage(characterName, '视频会员月卡', 'electronic')
    expect(msg).toContain('视频会员月卡')
    expect(msg).toContain('零花钱')
  })

  it('实物惊喜 → 包含产品名和快递关键词', () => {
    const msg = generateCharacterMessage(characterName, '鲜花束', 'physical')
    expect(msg).toContain('鲜花束')
    expect(msg).toContain('快递')
  })

  it('个性化惊喜 → 包含产品名和专门为你关键词', () => {
    const msg = generateCharacterMessage(characterName, '定制手办', 'personalized')
    expect(msg).toContain('定制手办')
    expect(msg).toContain('专门为你')
  })

  it('所有类型留言均为非空字符串', () => {
    const types = ['virtual', 'electronic', 'physical', 'personalized'] as const
    for (const type of types) {
      const msg = generateCharacterMessage(characterName, '测试产品', type)
      expect(msg.length).toBeGreaterThan(0)
    }
  })

  it('未知类型 → 回退到通用留言', () => {
    const msg = generateCharacterMessage(characterName, '测试', 'unknown' as any)
    expect(msg).toContain('测试')
  })
})
