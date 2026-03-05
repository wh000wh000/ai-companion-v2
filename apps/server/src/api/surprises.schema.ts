import { literal, maxLength, maxValue, minLength, minValue, number, object, optional, pipe, string, union } from 'valibot'

/**
 * 惊喜状态
 */
const SurpriseStatusSchema = union([
  literal('sent'),
  literal('clicked'),
  literal('completed'),
])

/**
 * 惊喜触发检查校验
 */
export const SurpriseCheckSchema = object({
  characterId: pipe(string(), minLength(1)),
})

/**
 * 惊喜状态更新校验
 */
export const SurpriseStatusUpdateSchema = object({
  status: SurpriseStatusSchema,
  feedback: optional(pipe(string(), maxLength(500))),
})

/**
 * 惊喜查询参数校验
 */
export const SurpriseQuerySchema = object({
  limit: optional(pipe(number(), minValue(1), maxValue(50)), 20),
  offset: optional(pipe(number(), minValue(0)), 0),
})
