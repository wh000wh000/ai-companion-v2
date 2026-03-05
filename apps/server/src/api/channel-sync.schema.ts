import { literal, minLength, object, optional, pipe, string, union } from 'valibot'

/**
 * 渠道类型枚举
 */
const ChannelSchema = union([
  literal('feishu'),
  literal('telegram'),
  literal('wechat'),
  literal('web'),
])

/**
 * 绑定渠道请求校验
 */
export const BindChannelSchema = object({
  channel: ChannelSchema,
  externalId: pipe(string(), minLength(1)),
  metadata: optional(string()),
})

/**
 * 解绑渠道请求校验
 */
export const UnbindChannelSchema = object({
  channel: ChannelSchema,
})

/**
 * 解析用户请求校验（Gateway Token 认证）
 */
export const ResolveUserSchema = object({
  channel: ChannelSchema,
  externalId: pipe(string(), minLength(1)),
})
