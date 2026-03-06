// ─── 支付系统类型定义 ──────────────────────────────────────────────────────

/** 支付提供者标识 */
export type PaymentProvider = 'mock' | 'wechat' | 'alipay'

/** 支付订单状态机 */
export type PaymentOrderStatus = 'created' | 'paying' | 'paid' | 'fulfilled' | 'closed' | 'refunded'

/**
 * 支付订单状态机流转:
 *
 *   created → paying → paid → fulfilled
 *     │                  │
 *     └── closed         └── refunded
 *
 * - created:   订单创建，等待用户发起支付
 * - paying:    用户已唤起支付（前端上报）
 * - paid:      支付成功（回调/Mock确认）
 * - fulfilled: 已发货（爱心币已到账）
 * - closed:    订单超时关闭（30分钟未支付）
 * - refunded:  已退款
 */

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
  /** 前端唤起支付所需的参数（不同 provider 返回不同结构） */
  paymentParams?: Record<string, unknown>
  expireAt: Date
}

/** 回调解析结果 */
export interface CallbackResult {
  orderId: string
  status: 'success' | 'fail'
  /** 第三方支付平台交易号 */
  transactionId?: string
}

/**
 * 支付提供者接口
 *
 * 所有支付 provider（Mock/微信/支付宝）必须实现此接口。
 * 通过 createPaymentProvider() 工厂函数实例化。
 */
export interface PaymentProviderInterface {
  /** 创建支付订单，返回前端唤起支付所需参数 */
  createOrder(input: CreateOrderInput): Promise<CreateOrderOutput>
  /** 验证支付回调签名（防伪造） */
  verifyCallback(rawBody: string, signature: string): boolean
  /** 解析支付回调内容（提取订单号和状态） */
  parseCallback(rawBody: string): CallbackResult
}

/**
 * 支付配置
 *
 * 从环境变量构建，传入 createPaymentProvider() 工厂函数。
 * 未配置的 provider 其对应字段为 undefined。
 */
export interface PaymentConfig {
  /** 微信支付 JSAPI 配置 */
  wechat?: {
    /** 微信公众号/小程序 AppID */
    appId: string
    /** 微信支付商户号 */
    mchId: string
    /** APIv3 密钥（32位，用于回调解密） */
    apiKey: string
    /** 支付结果异步通知 URL（需 HTTPS） */
    notifyUrl: string
    /** 商户 API 证书序列号（可选，用于请求签名） */
    serialNo?: string
    /** 商户私钥路径（可选，默认从环境变量读取） */
    privateKeyPath?: string
  }
  /** 支付宝 H5 支付配置 */
  alipay?: {
    /** 支付宝应用 AppID */
    appId: string
    /** 应用私钥（RSA2, PKCS8 格式） */
    privateKey: string
    /** 支付宝公钥（用于回调验签） */
    publicKey: string
    /** 异步通知 URL（需 HTTPS） */
    notifyUrl: string
    /** 支付宝网关（可选，默认生产环境） */
    gateway?: string
    /** 是否沙箱环境（可选） */
    sandbox?: boolean
  }
  /** 默认支付提供者（未指定时降级为 mock） */
  defaultProvider?: PaymentProvider
}
