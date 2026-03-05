import type { CallbackResult, CreateOrderInput, CreateOrderOutput, PaymentConfig, PaymentProviderInterface } from './types'

import { useLogger } from '@guiiai/logg'

/**
 * 支付宝 H5 支付实现（Skeleton）
 *
 * TODO: 接入支付宝 H5 支付 API
 * - 手机网站支付: alipay.trade.wap.pay
 * - 签名算法: RSA2 (SHA256WithRSA)
 * - 回调验签: 支付宝公钥
 */
export function createAlipayProvider(config?: PaymentConfig['alipay']): PaymentProviderInterface {
  const logger = useLogger('payment-alipay').useGlobalConfig()

  return {
    async createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
      if (!config) {
        throw new Error('支付宝支付未配置：需要 appId, privateKey, publicKey, notifyUrl')
      }

      logger.withFields({ amount: input.amount }).log('TODO: 调用支付宝 H5 下单 API')
      throw new Error('支付宝支付尚未实现，请使用 Mock 模式')
    },

    verifyCallback(_rawBody: string, _signature: string): boolean {
      logger.warn('TODO: 支付宝回调验签未实现')
      return false
    },

    parseCallback(_rawBody: string): CallbackResult {
      throw new Error('支付宝回调解析未实现')
    },
  }
}
