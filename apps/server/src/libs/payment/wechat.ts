import type { CallbackResult, CreateOrderInput, CreateOrderOutput, PaymentConfig, PaymentProviderInterface } from './types'

import { useLogger } from '@guiiai/logg'

/**
 * 微信支付 JSAPI 实现（Skeleton）
 *
 * 接入微信支付 v3 API 步骤:
 *
 * 1. **申请商户号**: https://pay.weixin.qq.com
 *    - 需要营业执照 + 对公账户
 *    - 开通 JSAPI 支付权限
 *
 * 2. **必需配置** (PaymentConfig.wechat):
 *    - appId:     微信公众号/小程序 AppID
 *    - mchId:     微信支付商户号
 *    - apiKey:    APIv3 密钥（非 v2 密钥）
 *    - notifyUrl: 支付结果回调 URL (需 HTTPS)
 *
 * 3. **推荐依赖**: wechatpay-node-v3 (npm)
 *    - 自动处理 RSA-SHA256 签名
 *    - 自动下载/缓存微信平台证书
 *
 * 4. **核心 API**:
 *    - 统一下单: POST /v3/pay/transactions/jsapi
 *    - 查询订单: GET /v3/pay/transactions/out-trade-no/{out_trade_no}
 *    - 关闭订单: POST /v3/pay/transactions/out-trade-no/{out_trade_no}/close
 *    - 退款:     POST /v3/refund/domestic/refunds
 *
 * 5. **签名算法**: RSA-SHA256 (APIv3)
 *    - 请求签名: HTTP方法\n请求URL\n时间戳\n随机串\n请求体\n
 *    - 回调验签: 使用微信平台证书验证 Wechatpay-Signature 头
 *
 * 6. **回调处理**:
 *    - Content-Type: application/json
 *    - AES-256-GCM 解密通知体
 *    - 验签 → 解密 → 处理 → 返回 HTTP 200
 *
 * 7. **环境变量**:
 *    - WECHAT_APP_ID
 *    - WECHAT_MCH_ID
 *    - WECHAT_API_KEY (APIv3 密钥)
 *    - WECHAT_NOTIFY_URL
 *    - WECHAT_SERIAL_NO (商户证书序列号，可选)
 *    - WECHAT_PRIVATE_KEY_PATH (商户私钥路径，可选)
 */
export function createWechatProvider(config?: PaymentConfig['wechat']): PaymentProviderInterface {
  const logger = useLogger('payment-wechat').useGlobalConfig()

  return {
    /**
     * 创建微信支付订单
     *
     * 实现时需调用:
     *   POST https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi
     *   Body: { appid, mchid, description, out_trade_no, notify_url, amount: { total, currency }, payer: { openid } }
     *
     * 返回: prepay_id → 前端使用 wx.requestPayment() 唤起支付
     */
    async createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
      if (!config) {
        throw new Error('微信支付未配置：需要 appId, mchId, apiKey, notifyUrl')
      }

      logger.withFields({ amount: input.amount, packId: input.packId }).log('微信支付下单（Skeleton，待实现）')
      throw new Error('微信支付尚未实现，请使用 Mock 模式')
    },

    /**
     * 验证微信支付回调签名
     *
     * 实现时需:
     *   1. 从 HTTP 头提取: Wechatpay-Timestamp, Wechatpay-Nonce, Wechatpay-Signature, Wechatpay-Serial
     *   2. 构造验签串: timestamp\nnonce\nbody\n
     *   3. 使用微信平台证书 (RSA) 验证签名
     */
    verifyCallback(_rawBody: string, _signature: string): boolean {
      logger.warn('微信支付回调验签（Skeleton，待实现）')
      return false
    },

    /**
     * 解析微信支付回调内容
     *
     * 实现时需:
     *   1. AES-256-GCM 解密 resource 字段（key=APIv3密钥, nonce=resource.nonce, aad=resource.associated_data）
     *   2. 解密后得到: { out_trade_no, transaction_id, trade_state, amount }
     *   3. trade_state === 'SUCCESS' → 支付成功
     */
    parseCallback(_rawBody: string): CallbackResult {
      throw new Error('微信支付回调解析（Skeleton，待实现）')
    },
  }
}
