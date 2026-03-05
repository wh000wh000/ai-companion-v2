import { minLength, object, optional, picklist, pipe, string } from 'valibot'

/** 创建支付订单请求校验 */
export const CreatePaymentOrderSchema = object({
  /** 充值套餐 ID */
  packId: pipe(string(), minLength(1, 'packId is required')),
  /** 支付提供者（默认 mock） */
  provider: optional(picklist(['mock', 'wechat', 'alipay'])),
  /** 幂等键（防重复提交） */
  idempotencyKey: optional(string()),
})
