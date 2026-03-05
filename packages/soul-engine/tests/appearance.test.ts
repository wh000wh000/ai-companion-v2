/**
 * 外观等级系统测试
 *
 * 验证10级外观配置的完整性、tier递进合理性、
 * 升级过渡动画配置和配饰差异计算。
 */

import { describe, expect, it } from 'vitest'
import {
  APPEARANCE_BY_LEVEL,
  getAppearanceForLevel,
  getNewAccessories,
  getLevelTransition,
  getTierChange,
} from '../src/appearance'
import type { AppearanceTier } from '../src/appearance'

// ============================================================
// 1. APPEARANCE_BY_LEVEL 常量验证
// ============================================================

describe('APPEARANCE_BY_LEVEL 常量验证', () => {
  it('应包含10个等级的完整外观配置', () => {
    for (let level = 1; level <= 10; level++) {
      const config = APPEARANCE_BY_LEVEL[level]
      expect(config).toBeDefined()
      expect(config.tier).toBeTruthy()
      expect(config.outfit).toBeTruthy()
      expect(config.unlockLabel).toBeTruthy()
      expect(Array.isArray(config.accessories)).toBe(true)
    }
  })

  it('每个等级的 accessories 是字符串数组', () => {
    for (let level = 1; level <= 10; level++) {
      const config = APPEARANCE_BY_LEVEL[level]
      for (const acc of config.accessories) {
        expect(typeof acc).toBe('string')
      }
    }
  })

  it('配饰数量随等级递增（非严格递增，但不减少）', () => {
    let prevCount = 0
    for (let level = 1; level <= 10; level++) {
      const count = APPEARANCE_BY_LEVEL[level].accessories.length
      expect(count).toBeGreaterThanOrEqual(prevCount)
      prevCount = count
    }
  })

  it('Lv.1 无配饰', () => {
    expect(APPEARANCE_BY_LEVEL[1].accessories).toHaveLength(0)
  })

  it('Lv.10 有3个传说配饰', () => {
    expect(APPEARANCE_BY_LEVEL[10].accessories).toHaveLength(3)
    expect(APPEARANCE_BY_LEVEL[10].accessories).toContain('crown')
    expect(APPEARANCE_BY_LEVEL[10].accessories).toContain('earring_constellation')
    expect(APPEARANCE_BY_LEVEL[10].accessories).toContain('necklace_cosmos')
  })
})

// ============================================================
// 2. Tier 递进合理性验证
// ============================================================

describe('Tier 递进验证', () => {
  it('Lv.1-3 为 default 阶层', () => {
    expect(APPEARANCE_BY_LEVEL[1].tier).toBe('default')
    expect(APPEARANCE_BY_LEVEL[2].tier).toBe('default')
    expect(APPEARANCE_BY_LEVEL[3].tier).toBe('default')
  })

  it('Lv.4-5 为 enhanced 阶层', () => {
    expect(APPEARANCE_BY_LEVEL[4].tier).toBe('enhanced')
    expect(APPEARANCE_BY_LEVEL[5].tier).toBe('enhanced')
  })

  it('Lv.6-7 为 premium 阶层', () => {
    expect(APPEARANCE_BY_LEVEL[6].tier).toBe('premium')
    expect(APPEARANCE_BY_LEVEL[7].tier).toBe('premium')
  })

  it('Lv.8-9 为 luxury 阶层', () => {
    expect(APPEARANCE_BY_LEVEL[8].tier).toBe('luxury')
    expect(APPEARANCE_BY_LEVEL[9].tier).toBe('luxury')
  })

  it('Lv.10 为 legendary 阶层', () => {
    expect(APPEARANCE_BY_LEVEL[10].tier).toBe('legendary')
  })

  it('tier 递进顺序: default → enhanced → premium → luxury → legendary', () => {
    const tiers = [
      APPEARANCE_BY_LEVEL[1].tier,
      APPEARANCE_BY_LEVEL[4].tier,
      APPEARANCE_BY_LEVEL[6].tier,
      APPEARANCE_BY_LEVEL[8].tier,
      APPEARANCE_BY_LEVEL[10].tier,
    ]
    expect(tiers).toEqual(['default', 'enhanced', 'premium', 'luxury', 'legendary'])
  })
})

// ============================================================
// 3. getAppearanceForLevel 函数测试
// ============================================================

describe('getAppearanceForLevel', () => {
  it('Lv.1-10 均能正确返回配置', () => {
    for (let level = 1; level <= 10; level++) {
      const config = getAppearanceForLevel(level)
      expect(config).toEqual(APPEARANCE_BY_LEVEL[level])
    }
  })

  it('Lv.0（低于下限） → clamp 到 Lv.1', () => {
    const config = getAppearanceForLevel(0)
    expect(config).toEqual(APPEARANCE_BY_LEVEL[1])
  })

  it('Lv.-5（负数） → clamp 到 Lv.1', () => {
    const config = getAppearanceForLevel(-5)
    expect(config).toEqual(APPEARANCE_BY_LEVEL[1])
  })

  it('Lv.11（超出上限） → clamp 到 Lv.10', () => {
    const config = getAppearanceForLevel(11)
    expect(config).toEqual(APPEARANCE_BY_LEVEL[10])
  })

  it('Lv.100（远超上限） → clamp 到 Lv.10', () => {
    const config = getAppearanceForLevel(100)
    expect(config).toEqual(APPEARANCE_BY_LEVEL[10])
  })

  it('小数等级 → 向下取整', () => {
    const config = getAppearanceForLevel(5.9)
    expect(config).toEqual(APPEARANCE_BY_LEVEL[5])
  })
})

// ============================================================
// 4. getNewAccessories 差异配饰测试
// ============================================================

describe('getNewAccessories', () => {
  it('Lv.1 → Lv.2：新增 hairpin_simple', () => {
    const newAcc = getNewAccessories(1, 2)
    expect(newAcc).toEqual(['hairpin_simple'])
  })

  it('Lv.2 → Lv.3：新增 bracelet', () => {
    const newAcc = getNewAccessories(2, 3)
    expect(newAcc).toEqual(['bracelet'])
  })

  it('Lv.3 → Lv.4：新增 hairpin_flower（替换 hairpin_simple）', () => {
    const newAcc = getNewAccessories(3, 4)
    expect(newAcc).toContain('hairpin_flower')
    // hairpin_simple 被移除，bracelet 保留
    expect(newAcc).not.toContain('bracelet')
  })

  it('Lv.1 → Lv.10：所有 Lv.10 配饰都是新增的', () => {
    const newAcc = getNewAccessories(1, 10)
    expect(newAcc).toEqual(['crown', 'earring_constellation', 'necklace_cosmos'])
  })

  it('同等级 → 无新增配饰', () => {
    const newAcc = getNewAccessories(5, 5)
    expect(newAcc).toHaveLength(0)
  })

  it('高等级 → 低等级：返回低等级中高等级没有的', () => {
    // Lv.10 有 crown, earring_constellation, necklace_cosmos
    // Lv.1 无配饰，所以 Lv.1 中没有任何 Lv.10 缺少的
    const newAcc = getNewAccessories(10, 1)
    expect(newAcc).toHaveLength(0)
  })

  it('Lv.5 → Lv.6：新增 hairpin_crystal, necklace（earring 替换为带 necklace 的组合）', () => {
    const newAcc = getNewAccessories(5, 6)
    expect(newAcc).toContain('hairpin_crystal')
    expect(newAcc).toContain('necklace')
  })

  it('Lv.9 → Lv.10：全部配饰更新为传说级', () => {
    const newAcc = getNewAccessories(9, 10)
    expect(newAcc).toContain('crown')
    expect(newAcc).toContain('earring_constellation')
    expect(newAcc).toContain('necklace_cosmos')
  })
})

// ============================================================
// 5. getLevelTransition 过渡动画测试
// ============================================================

describe('getLevelTransition', () => {
  describe('同 tier 内升级 → fade 过渡', () => {
    it('Lv.1 → Lv.2（default→default）：fade, 500ms, 0 particles', () => {
      const transition = getLevelTransition(1, 2)
      expect(transition.type).toBe('fade')
      expect(transition.duration).toBe(500)
      expect(transition.particleCount).toBe(0)
      expect(transition.soundEffect).toBeUndefined()
    })

    it('Lv.2 → Lv.3（default→default）：fade', () => {
      const transition = getLevelTransition(2, 3)
      expect(transition.type).toBe('fade')
    })

    it('Lv.4 → Lv.5（enhanced→enhanced）：fade', () => {
      const transition = getLevelTransition(4, 5)
      expect(transition.type).toBe('fade')
    })

    it('Lv.6 → Lv.7（premium→premium）：fade', () => {
      const transition = getLevelTransition(6, 7)
      expect(transition.type).toBe('fade')
    })

    it('Lv.8 → Lv.9（luxury→luxury）：fade', () => {
      const transition = getLevelTransition(8, 9)
      expect(transition.type).toBe('fade')
    })
  })

  describe('跨 tier 升级 → glow 过渡', () => {
    it('Lv.3 → Lv.4（default→enhanced）：glow, 1500ms, 20 particles', () => {
      const transition = getLevelTransition(3, 4)
      expect(transition.type).toBe('glow')
      expect(transition.duration).toBe(1500)
      expect(transition.particleCount).toBe(20)
      expect(transition.soundEffect).toBeUndefined()
    })

    it('Lv.5 → Lv.6（enhanced→premium）：glow', () => {
      const transition = getLevelTransition(5, 6)
      expect(transition.type).toBe('glow')
    })

    it('Lv.7 → Lv.8（premium→luxury）：glow', () => {
      const transition = getLevelTransition(7, 8)
      expect(transition.type).toBe('glow')
    })
  })

  describe('到 legendary → legendary 过渡', () => {
    it('Lv.9 → Lv.10（luxury→legendary）：legendary, 3000ms, 50 particles, sound', () => {
      const transition = getLevelTransition(9, 10)
      expect(transition.type).toBe('legendary')
      expect(transition.duration).toBe(3000)
      expect(transition.particleCount).toBe(50)
      expect(transition.soundEffect).toBe('legendary_unlock')
    })

    it('Lv.1 → Lv.10（跨多级到legendary）：legendary', () => {
      const transition = getLevelTransition(1, 10)
      expect(transition.type).toBe('legendary')
      expect(transition.soundEffect).toBe('legendary_unlock')
    })
  })

  describe('同等级 → fade（无变化）', () => {
    it('Lv.5 → Lv.5：fade', () => {
      const transition = getLevelTransition(5, 5)
      expect(transition.type).toBe('fade')
    })

    it('Lv.10 → Lv.10：fade（同 tier 内）', () => {
      const transition = getLevelTransition(10, 10)
      expect(transition.type).toBe('fade')
    })
  })
})

// ============================================================
// 6. getTierChange 阶层变化测试
// ============================================================

describe('getTierChange', () => {
  it('同 tier 内 → changed=false', () => {
    const result = getTierChange(1, 2)
    expect(result.changed).toBe(false)
    expect(result.fromTier).toBe('default')
    expect(result.toTier).toBe('default')
  })

  it('default → enhanced → changed=true', () => {
    const result = getTierChange(3, 4)
    expect(result.changed).toBe(true)
    expect(result.fromTier).toBe('default')
    expect(result.toTier).toBe('enhanced')
  })

  it('enhanced → premium → changed=true', () => {
    const result = getTierChange(5, 6)
    expect(result.changed).toBe(true)
    expect(result.fromTier).toBe('enhanced')
    expect(result.toTier).toBe('premium')
  })

  it('premium → luxury → changed=true', () => {
    const result = getTierChange(7, 8)
    expect(result.changed).toBe(true)
    expect(result.fromTier).toBe('premium')
    expect(result.toTier).toBe('luxury')
  })

  it('luxury → legendary → changed=true', () => {
    const result = getTierChange(9, 10)
    expect(result.changed).toBe(true)
    expect(result.fromTier).toBe('luxury')
    expect(result.toTier).toBe('legendary')
  })

  it('default → legendary（跨多级） → changed=true', () => {
    const result = getTierChange(1, 10)
    expect(result.changed).toBe(true)
    expect(result.fromTier).toBe('default')
    expect(result.toTier).toBe('legendary')
  })

  it('同等级 → changed=false', () => {
    const result = getTierChange(5, 5)
    expect(result.changed).toBe(false)
    expect(result.fromTier).toBe('enhanced')
    expect(result.toTier).toBe('enhanced')
  })
})
