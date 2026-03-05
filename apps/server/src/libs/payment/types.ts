// ─── 支付系统类型定义 ──────────────────────────────────────────────────────

/** 支付提供者标识 */
export type PaymentProvider = 'mock' | 'wechat' | 'alipay'

/** 支付订单状态机 */
export type PaymentOrderStatus = 'created' | 'paying' | 'paid' | 'fulfilled' | 'closed' | 'refunded'

/** 支付订单 */
export interface PaymentOrder {
  orderId: string
  userId: string
  packId: string
  /** 金额，单位：分 */
  amount: number
  provider: PaymentProvider
  status: PaymentOrderStatus
  /** 前端唤起支付所需的参数 */
  paymentParams?: Record<string, unknown>
  createdAt: Date
  paidAt?: Date
  expireAt: Date
}

/** 创建订单输入 */
export interface CreateOrderInput {
  userId: string
  packId: string
  /** 金额，单位：分 */
  amount: number
  provider: PaymentProvider
  description: string
}

/** 创建订单输出 */
export interface CreateOrderOutput {
  amount: number
  status: PaymentOrderStatus
  paymentParams?: Record<string, unknown>
  expireAt: Date
}

/** 回调解析结果 */
export interface CallbackResult {
  orderId: string
  status: 'success' | 'fail'
  transactionId?: string
}

/** 支付提供者接口 */
export interface PaymentProviderInterface {
  createOrder(input: CreateOrderInput): Promise<CreateOrderOutput>
  verifyCallback(rawBody: string, signature: string): boolean
  parseCallback(rawBody: string): CallbackResult
}

/** 支付配置 */
export interface PaymentConfig {
  wechat?: {
    appId: string
    mchId: string
    apiKey: string
    notifyUrl: string
  }
  alipay?: {
    appId: string
    privateKey: string
    publicKey: string
    notifyUrl: string
  }
  defaultProvider?: PaymentProvider
}
