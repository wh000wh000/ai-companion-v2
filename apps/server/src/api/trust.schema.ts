import { literal, minLength, minValue, number, object, optional, pipe, string, union } from 'valibot'

/**
 * 信赖事件类型
 */
const TrustEventSchema = union([
  literal('chat'),
  literal('deep_chat'),
  literal('share_mood'),
  literal('daily_task'),
  literal('gift'),
  literal('checkin'),
])

/**
 * 签到请求校验
 */
export const CheckinSchema = object({
  characterId: pipe(string(), minLength(1)),
})

/**
 * 信赖查询参数校验（URL param 验证）
 */
export const TrustQuerySchema = object({
  characterId: pipe(string(), minLength(1)),
})

/**
 * 信赖手动更新校验（管理接口）
 */
export const TrustUpdateSchema = object({
  characterId: pipe(string(), minLength(1)),
  event: TrustEventSchema,
  value: optional(pipe(number(), minValue(0))),
})
