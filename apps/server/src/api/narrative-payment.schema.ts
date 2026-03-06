import { maxValue, minLength, minValue, number, object, optional, picklist, pipe, string } from 'valibot'

/**
 * 叙事支付类型枚举
 */
const NarrativeTypeSchema = picklist(['book', 'gift', 'care', 'experience', 'course'])

/**
 * 创建叙事支付请求校验
 */
export const CreateNarrativePaymentSchema = object({
  /** 关联角色 ID */
  characterId: pipe(string(), minLength(1, 'characterId is required')),
  /** 叙事类型 */
  type: NarrativeTypeSchema,
  /** 叙事标题，如"为令仪找到那本书" */
  storyTitle: pipe(string(), minLength(1, 'storyTitle is required')),
  /** 叙事详细描述 */
  storyDescription: optional(string()),
  /** 角色的话 */
  characterQuote: optional(string()),
  /** 叙事图标 emoji */
  itemEmoji: optional(string()),
  /** 金额，单位：人民币分 */
  amountCents: pipe(number(), minValue(1, 'amountCents must be positive')),
})

/**
 * 推进叙事进度请求校验
 */
export const AdvanceNarrativeSchema = object({
  /** 叙事阶段 */
  phase: picklist(['in_progress', 'delivered', 'reflected']),
  /** 角色的进度消息 */
  message: pipe(string(), minLength(1, 'message is required')),
})

/**
 * 历史查询参数校验
 */
export const NarrativeHistoryQuerySchema = object({
  limit: optional(pipe(number(), minValue(1), maxValue(50)), 20),
  offset: optional(pipe(number(), minValue(0)), 0),
})

/**
 * 进行中叙事查询参数校验
 */
export const ActiveNarrativesQuerySchema = object({
  characterId: pipe(string(), minLength(1, 'characterId is required')),
})

/**
 * 创建记忆瞬间请求校验
 */
export const CreateMemoryMomentSchema = object({
  /** 关联角色 ID */
  characterId: pipe(string(), minLength(1, 'characterId is required')),
  /** 对话发生的时间（ISO 8601 字符串） */
  conversationDate: pipe(string(), minLength(1, 'conversationDate is required')),
  /** 对话摘要 */
  summary: pipe(string(), minLength(1, 'summary is required')),
  /** 角色的批注 */
  characterNote: optional(string()),
  /** 情感密度评分 1-10 */
  emotionalDensity: optional(pipe(number(), minValue(1), maxValue(10))),
})

/**
 * 记忆瞬间查询参数校验
 */
export const MemoryMomentsQuerySchema = object({
  characterId: pipe(string(), minLength(1, 'characterId is required')),
  limit: optional(pipe(number(), minValue(1), maxValue(50)), 20),
  offset: optional(pipe(number(), minValue(0)), 0),
})
