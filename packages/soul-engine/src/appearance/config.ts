/**
 * 外观等级系统配置
 *
 * 10级外观体系，与信赖等级一一对应。
 * 每个等级定义了外观阶层(tier)、配饰列表、服装和解锁提示。
 * 升级时提供过渡动画配置。
 */

/** 外观阶层 */
export interface AppearanceTier {
  tier: 'default' | 'enhanced' | 'premium' | 'luxury' | 'legendary'
  accessories: string[]
  outfit: string
  unlockLabel: string
}

/** ���级过渡动画配置 */
export interface TransitionConfig {
  type: 'fade' | 'glow' | 'legendary'
  duration: number  // ms
  particleCount: number
  soundEffect?: string
}

/** 外观阶层变化结果 */
export interface TierChangeResult {
  changed: boolean
  fromTier: string
  toTier: string
}

// ============================================================
// 10级外观配置表
// ============================================================

export const APPEARANCE_BY_LEVEL: Record<number, AppearanceTier> = {
  1:  { tier: 'default',   accessories: [],                                              outfit: 'casual_basic',    unlockLabel: '初始外观' },
  2:  { tier: 'default',   accessories: ['hairpin_simple'],                               outfit: 'casual_basic',    unlockLabel: '简约发饰' },
  3:  { tier: 'default',   accessories: ['hairpin_simple', 'bracelet'],                   outfit: 'casual_enhanced', unlockLabel: '新服装解锁' },
  4:  { tier: 'enhanced',  accessories: ['hairpin_flower', 'bracelet'],                   outfit: 'semi_formal',     unlockLabel: '花饰+新装' },
  5:  { tier: 'enhanced',  accessories: ['hairpin_flower', 'earring'],                    outfit: 'semi_formal',     unlockLabel: '耳饰解锁' },
  6:  { tier: 'premium',   accessories: ['hairpin_crystal', 'earring', 'necklace'],       outfit: 'elegant',         unlockLabel: '水晶饰品+优雅装' },
  7:  { tier: 'premium',   accessories: ['hairpin_crystal', 'earring_gem', 'necklace'],   outfit: 'premium_casual',  unlockLabel: '高级系列解锁' },
  8:  { tier: 'luxury',    accessories: ['tiara', 'earring_gem', 'necklace_pendant'],     outfit: 'premium_formal',  unlockLabel: '皇冠+礼服' },
  9:  { tier: 'luxury',    accessories: ['tiara_diamond', 'earring_diamond', 'necklace_star'], outfit: 'gala',       unlockLabel: '钻石套装' },
  10: { tier: 'legendary', accessories: ['crown', 'earring_constellation', 'necklace_cosmos'], outfit: 'legendary',  unlockLabel: '传说外观' },
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 获取指定等级的外观配置
 *
 * 等级超出范围时 clamp 到 1-10
 */
export function getAppearanceForLevel(level: number): AppearanceTier {
  const clamped = Math.max(1, Math.min(10, Math.floor(level)))
  return APPEARANCE_BY_LEVEL[clamped]
}

/**
 * 获取两个等级间新增的配饰列表
 *
 * 返回 toLevel 中存在但 fromLevel 中不存在的配饰
 */
export function getNewAccessories(fromLevel: number, toLevel: number): string[] {
  const fromConfig = getAppearanceForLevel(fromLevel)
  const toConfig = getAppearanceForLevel(toLevel)

  const fromSet = new Set(fromConfig.accessories)
  return toConfig.accessories.filter(a => !fromSet.has(a))
}

/**
 * 获取升级过渡动画配置
 *
 * - 同 tier 内升级: fade, 500ms, 0 particles
 * - 跨 tier 升级: glow, 1500ms, 20 particles
 * - 到 legendary: legendary, 3000ms, 50 particles, sound
 */
export function getLevelTransition(fromLevel: number, toLevel: number): TransitionConfig {
  const fromConfig = getAppearanceForLevel(fromLevel)
  const toConfig = getAppearanceForLevel(toLevel)

  // 到 legendary 的特殊过渡
  if (toConfig.tier === 'legendary' && fromConfig.tier !== 'legendary') {
    return {
      type: 'legendary',
      duration: 3000,
      particleCount: 50,
      soundEffect: 'legendary_unlock',
    }
  }

  // 跨 tier 升级
  if (fromConfig.tier !== toConfig.tier) {
    return {
      type: 'glow',
      duration: 1500,
      particleCount: 20,
    }
  }

  // 同 tier 内升级
  return {
    type: 'fade',
    duration: 500,
    particleCount: 0,
  }
}

/**
 * 获取外观 tier 变化
 */
export function getTierChange(fromLevel: number, toLevel: number): TierChangeResult {
  const fromConfig = getAppearanceForLevel(fromLevel)
  const toConfig = getAppearanceForLevel(toLevel)

  return {
    changed: fromConfig.tier !== toConfig.tier,
    fromTier: fromConfig.tier,
    toTier: toConfig.tier,
  }
}
