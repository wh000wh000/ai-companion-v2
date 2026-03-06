import type { CallbackResult, CreateOrderInput, CreateOrderOutput, PaymentConfig, PaymentProviderInterface } from './types'

import { useLogger } from '@guiiai/logg'

/**
 * 支付宝 H5 支付实现（Skeleton）
 *
 * 接入支付宝 H5 支付 API 步骤:
 *
 * 1. **申请商户号**: https://open.alipay.com
 *    - 创建应用 → 获取 AppID
 *    - 配置 RSA2 密钥对 → 上传应用公钥、下载支付宝公钥
 *    - 签约"手机网站支付"能力
 *
 * 2. **必需配置** (PaymentConfig.alipay):
 *    - appId:      支付宝应用 AppID
 *    - privateKey: 应用私钥 (RSA2, PKCS8 格式)
 *    - publicKey:  支付宝公钥 (用于验签)
 *    - notifyUrl:  异步通知 URL (需 HTTPS)
 *
 * 3. **推荐依赖**: alipay-sdk (npm)
 *    - 自动处理 RSA2 签名
 *    - 封装 OpenAPI 调用
 *
 * 4. **核心 API**:
 *    - 手机网站支付: alipay.trade.wap.pay (返回表单 HTML，前端提交跳转)
 *    - 查询订单:     alipay.trade.query
 *    - 关闭订单:     alipay.trade.close
 *    - 退款:         alipay.trade.refund
 *    - 退款查询:     alipay.trade.fastpay.refund.query
 *
 * 5. **签名算法**: RSA2 (SHA256WithRSA)
 *    - 请求签名: 所有参数按 key 排序后拼接，用应用私钥签名
 *    - 回调验签: 使用支付宝公钥验证 sign 字段
 *
 * 6. **回调处理**:
 *    - Content-Type: application/x-www-form-urlencoded
 *    - 验签 → 解析 trade_status → 处理 → 返回 "success"
 *    - trade_status: TRADE_SUCCESS (即时到账) / TRADE_FINISHED (不可退款)
 *
 * 7. **环境变量**:
 *    - ALIPAY_APP_ID
 *    - ALIPAY_PRIVATE_KEY (应用私钥内容或文件路径)
 *    - ALIPAY_PUBLIC_KEY (支付宝公钥内容)
 *    - ALIPAY_NOTIFY_URL
 *    - ALIPAY_GATEWAY (可选，默认 https://openapi.alipay.com/gateway.do)
 *    - ALIPAY_SANDBOX (可选，'true' 使用沙箱环境)
 */
export function createAlipayProvider(config?: PaymentConfig['alipay']): PaymentProviderInterface {
  const logger = useLogger('payment-alipay').useGlobalConfig()

  return {
    /**
     * 创建支付宝 H5 支付订单
     *
     * 实现时需调用:
     *   alipay.trade.wap.pay
     *   参数: { subject, out_trade_no, total_amount, product_code: 'QUICK_WAP_WAY', quit_url }
     *
     * 返回: form HTML 字符串 → 前端 innerHTML + 自动提交跳转到支付宝收银台
     */
    async createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
      if (!config) {
        throw new Error('支付宝支付未配置：需要 appId, privateKey, publicKey, notifyUrl')
      }

      logger.withFields({ amount: input.amount, packId: input.packId }).log('支付宝支付下单（Skeleton，待实现）')
      throw new Error('支付宝支付尚未实现，请使用 Mock 模式')
    },

    /**
     * 验证支付宝回调签名
     *
     * 实现时需:
     *   1. 从 POST body 提取所有参数
     *   2. 去除 sign, sign_type 字段
     *   3. 按 key 字母序排列后拼接
     *   4. 使用支付宝公钥 RSA2 验证 sign 值
     */
    verifyCallback(_rawBody: string, _signature: string): boolean {
      logger.warn('支付宝回调验签（Skeleton，待实现）')
      return false
    },

    /**
     * 解析支付宝回调内容
     *
     * 实现时需:
     *   1. 解析 urlencoded body
     *   2. 提取 out_trade_no, trade_no, trade_status
     *   3. trade_status === 'TRADE_SUCCESS' || 'TRADE_FINISHED' → 成功
     */
    parseCallback(_rawBody: string): CallbackResult {
      throw new Error('支付宝回调解析（Skeleton，待实现）')
    },
  }
}
