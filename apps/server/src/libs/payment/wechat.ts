import type { CallbackResult, CreateOrderInput, CreateOrderOutput, PaymentConfig, PaymentProviderInterface } from './types'

import { useLogger } from '@guiiai/logg'

/**
 * 微信支付 JSAPI 实现（Skeleton）
 *
 * TODO: 接入微信支付 v3 API
 * - 统一下单: POST /v3/pay/transactions/jsapi
 * - 签名算法: RSA-SHA256
 * - 回调验签: 微信平台证书
 */
export function createWechatProvider(config?: PaymentConfig['wechat']): PaymentProviderInterface {
  const logger = useLogger('payment-wechat').useGlobalConfig()

  return {
    async createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
      if (!config) {
        throw new Error('微信支付未配置：需要 appId, mchId, apiKey, notifyUrl')
      }

      logger.withFields({ amount: input.amount }).log('TODO: 调用微信统一下单 API')
      throw new Error('微信支付尚未实现，请使用 Mock 模式')
    },

    verifyCallback(_rawBody: string, _signature: string): boolean {
      logger.warn('TODO: 微信支付回调验签未实现')
      return false
    },

    parseCallback(_rawBody: string): CallbackResult {
      throw new Error('微信支付回调解析未实现')
    },
  }
}
