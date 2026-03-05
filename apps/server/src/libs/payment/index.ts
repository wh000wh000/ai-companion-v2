import type { PaymentConfig, PaymentProviderInterface } from './types'

import { createAlipayProvider } from './alipay'
import { createMockProvider, mockCompletePayment as _mockCompletePayment } from './mock'
import { createWechatProvider } from './wechat'

// ─── Re-exports ──────────────────────────────────────────────────────────

export type { CallbackResult, CreateOrderInput, CreateOrderOutput, PaymentConfig, PaymentOrder, PaymentOrderStatus, PaymentProvider, PaymentProviderInterface } from './types'
export { mockCompletePayment } from './mock'

// ─── 工厂函数 ────────────────────────────────────────────────────────────

type ProviderType = 'mock' | 'wechat' | 'alipay'

/** 根据提供者类型创建支付提供者实例 */
export function createPaymentProvider(
  provider: ProviderType,
  config?: PaymentConfig,
): PaymentProviderInterface {
  switch (provider) {
    case 'mock':
      return createMockProvider()
    case 'wechat':
      return createWechatProvider(config?.wechat)
    case 'alipay':
      return createAlipayProvider(config?.alipay)
    default:
      throw new Error(`Unknown payment provider: ${provider}`)
  }
}

/** 获取默认支付提供者（未配置真实支付时降级为 mock） */
export function getDefaultProvider(config?: PaymentConfig): ProviderType {
  if (config?.defaultProvider)
    return config.defaultProvider
  return 'mock'
}
