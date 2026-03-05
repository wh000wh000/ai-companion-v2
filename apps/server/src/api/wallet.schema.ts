import { literal, maxLength, maxValue, minLength, minValue, number, object, optional, pipe, string, union } from 'valibot'

/**
 * 充值档位 ID（7档，对齐 CHARGE_PACKS）
 */
const PackIdSchema = union([
  literal('pack_1'),
  literal('pack_6'),
  literal('pack_30'),
  literal('pack_68'),
  literal('pack_128'),
  literal('pack_328'),
  literal('pack_648'),
])

/**
 * 礼物等级（4档）
 */
const GiftTierSchema = union([
  literal('small'),
  literal('warm'),
  literal('love'),
  literal('forever'),
])

/**
 * 充值请求校验
 */
export const ChargeSchema = object({
  packId: PackIdSchema,
  idempotencyKey: pipe(string(), minLength(1), maxLength(64)),
})

/**
 * 送礼请求校验
 */
export const GiftSchema = object({
  characterId: pipe(string(), minLength(1)),
  giftTier: GiftTierSchema,
  idempotencyKey: pipe(string(), minLength(1), maxLength(64)),
})

/**
 * 历史查询参数校验
 */
export const HistoryQuerySchema = object({
  limit: optional(pipe(number(), minValue(1), maxValue(50)), 20),
  offset: optional(pipe(number(), minValue(0)), 0),
})
