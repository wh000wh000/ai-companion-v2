import type { CallbackResult, CreateOrderInput, CreateOrderOutput, PaymentProviderInterface } from './types'

// ─── Mock 支付内存状态 ─────────────────────────────────────────────────────

/** 模拟支付订单状态存储（进程内） */
const mockOrders = new Map<string, 'created' | 'paid'>()

/** 模拟支付完成（仅开发/测试模式使用） */
export function mockCompletePayment(orderId: string): void {
  mockOrders.set(orderId, 'paid')
}

/** 查询 mock 订单状态 */
export function getMockOrderStatus(orderId: string): string | undefined {
  return mockOrders.get(orderId)
}

// ─── Mock 支付提供者 ──────────────────────────────────────────────────────

export function createMockProvider(): PaymentProviderInterface {
  return {
    async createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
      const orderId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      mockOrders.set(orderId, 'created')

      return {
        amount: input.amount,
        status: 'created',
        paymentParams: {
          mockOrderId: orderId,
          mockPayUrl: `/api/payment/mock-pay/${orderId}`,
        },
        expireAt: new Date(Date.now() + 30 * 60 * 1000),
      }
    },

    verifyCallback(_rawBody: string, _signature: string): boolean {
      return true
    },

    parseCallback(rawBody: string): CallbackResult {
      const data = JSON.parse(rawBody)
      return {
        orderId: data.orderId,
        status: data.status ?? 'success',
        transactionId: `mock_tx_${Date.now()}`,
      }
    },
  }
}
