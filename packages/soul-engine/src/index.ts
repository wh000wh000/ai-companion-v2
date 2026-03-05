/**
 * @ai-companion/soul-engine
 *
 * 灵魂经济引擎 — 伪春菜的核心差异化系统
 *
 * 包含四大子系统：
 * - Trust（信赖）：10级等级体系 + 衰减 + 冷却 + 连续签到
 * - Economy（经济）：充值 + 送礼 + 零花钱分成 + 消费限额
 * - Surprise（惊喜）：确定性阈值触发 + 预算控制 + 冷却
 * - Demo（体验）：7天Demo模式 + 转化引导
 */

// ── Trust 信赖系统 ──
export {
  calculateDailyTrust,
  getStreakBonus,
  calculateTrustDecay,
  getDecayFloor,
  determineTrustLevel,
  checkLevelUp,
  applyTrustChange,
  getTrustEventValue,
  getTrustLevelName,
  getRequiredPoints,
  getLevelProgress,
} from './trust/calculator'
export type {
  TrustEventType,
  TrustUserContext,
  LevelUpCheckResult,
  TrustChangeResult,
} from './trust/calculator'

// ── Economy 经济系统 ──
export {
  processCharge,
  processGift,
  getPocketMoneyRatio,
  checkSpendingLimit,
  getChargePack,
  coinsToYuan,
  yuanToCoins,
  coinsToCents,
  getGiftTrustGain,
  getGiftCoinCost,
  getPackValuePerYuan,
} from './economy/engine'
export type {
  ChargeResult,
  GiftSendResult,
  SpendingLimitCheck,
} from './economy/engine'

// ── Surprise 惊喜系统 ──
export {
  checkThresholdTrigger,
  selectSurpriseType,
  calculateBudget,
  checkCooldown,
  generateCharacterMessage,
} from './surprise/engine'
export type {
  SurpriseTriggerContext,
  TriggerCheckResult,
} from './surprise/engine'

// ── Demo 体验系统 ──
export {
  DEMO_SCHEDULE,
  getDemoDay,
  getDemoState,
  getDemoMultiplier,
  shouldReceiveGiftCoins,
  shouldTriggerDemoSurprise,
  getDemoEndMessage,
  convertToFormal,
  getDemoDayConfig,
  getConversionPrompt,
} from './demo/manager'
export type {
  DemoDayConfig,
  DemoState,
} from './demo/manager'

// ── Appearance 外观等级系统 ──
export {
  APPEARANCE_BY_LEVEL,
  getAppearanceForLevel,
  getNewAccessories,
  getLevelTransition,
  getTierChange,
} from './appearance'
export type {
  AppearanceTier,
  TransitionConfig,
  TierChangeResult,
} from './appearance'

// ── Emotion 情感映射系统 ──
export {
  EMOTION_LIVE2D_MAP,
  getEmotionForEvent,
  getLive2DConfigForEmotion,
  getLive2DConfigForEvent,
} from './emotion/mapping'
export type {
  Live2DEmotionConfig,
  EmotionTriggerEvent,
} from './emotion/mapping'
export {
  DEFAULT_MODEL_PARAMS,
  mapExpressionToModelParams,
  createLive2DEmotionController,
} from './emotion/useLive2DEmotion'
export type {
  Live2DEmotionState,
} from './emotion/useLive2DEmotion'

// ── Types 类型定义 ──
export type {
  PersonalityTag,
  SpeakingStyle,
  CharacterTemplate,
  EmotionState,
  CharacterAppearance,
  Character,
  TrustLevelDefinition,
  TrustLevel,
  CharacterTemplateConfig,
  CharacterCreateForm,
  ChatMessage,
  GiftTier,
  GiftDefinition,
  UserWallet,
  CharacterPocket,
  GiftRecord,
  PaymentMethod,
  ChargePack,
  TransactionType,
  Transaction,
  SurpriseStatus,
  SurpriseType,
  O2OPlatform,
  PlatformConfig,
  SurpriseThreshold,
  SurpriseRecord,
  SurpriseTriggerCondition,
  ScoringWeights,
  BudgetControl,
  SubscriptionPlan,
  SubscriptionConfig,
  UserSubscription,
} from './types'
export {
  TRUST_LEVEL_CONFIG,
  CHARACTER_TEMPLATES,
  GIFT_CONFIG,
  CHARGE_PACKS,
  POCKET_MONEY_RATIO,
  FIRST_CHARGE_BONUS_MULTIPLIER,
  DAILY_CHARGE_LIMIT,
  MONTHLY_CHARGE_LIMIT,
  PLATFORM_CONFIGS,
  SURPRISE_THRESHOLDS,
  MONTHLY_SUBSCRIBER_COOLDOWN_DAYS,
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_BUDGET_CONTROL,
  SUBSCRIPTION_CONFIGS,
} from './types'
