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
} from './character'

export {
  TRUST_LEVEL_CONFIG,
  CHARACTER_TEMPLATES,
} from './character'

export type {
  GiftTier,
  GiftDefinition,
  UserWallet,
  CharacterPocket,
  GiftRecord,
  PaymentMethod,
  ChargePack,
  TransactionType,
  Transaction,
} from './wallet'

export {
  GIFT_CONFIG,
  CHARGE_PACKS,
  POCKET_MONEY_RATIO,
  FIRST_CHARGE_BONUS_MULTIPLIER,
  DAILY_CHARGE_LIMIT,
  MONTHLY_CHARGE_LIMIT,
} from './wallet'

export type {
  SurpriseStatus,
  SurpriseType,
  O2OPlatform,
  PlatformConfig,
  SurpriseThreshold,
  SurpriseRecord,
  SurpriseTriggerCondition,
  ScoringWeights,
  BudgetControl,
} from './surprise'

export {
  PLATFORM_CONFIGS,
  SURPRISE_THRESHOLDS,
  MONTHLY_SUBSCRIBER_COOLDOWN_DAYS,
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_BUDGET_CONTROL,
} from './surprise'

export type {
  SubscriptionPlan,
  SubscriptionConfig,
  UserSubscription,
} from './subscription'

export {
  SUBSCRIPTION_CONFIGS,
} from './subscription'
