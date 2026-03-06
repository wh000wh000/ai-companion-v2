import { defineStore } from 'pinia'
import { ref } from 'vue'

// 支付订单类型定义
export interface PaymentOrder {
  orderId: string
  userId: string
  packId: string
  amount: number
  provider: string
  status: 'created' | 'paying' | 'paid' | 'fulfilled' | 'closed' | 'refunded'
  paymentParams?: Record<string, unknown>
  createdAt: string
  paidAt?: string
  expireAt: string
}

export const usePaymentStore = defineStore('payment', () => {
  // 当前支付订单
  const currentOrder = ref<PaymentOrder | null>(null)
  // 是否正在处理支付
  const isProcessing = ref(false)
  // 错误信息
  const error = ref<string | null>(null)

  /**
   * 创建支付订单
   * 调用 POST /api/payment/create-order
   */
  async function createOrder(packId: string, idempotencyKey: string) {
    isProcessing.value = true
    error.value = null
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId, provider: 'mock', idempotencyKey }),
      })
      if (!res.ok)
        throw new Error(`Create order failed: ${res.status}`)
      const data = await res.json()
      currentOrder.value = data.order
      return data
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    }
    finally {
      isProcessing.value = false
    }
  }

  /**
   * Mock 支付完成（开发模式）
   * 调用 POST /api/payment/mock-pay/:id
   */
  async function mockPay(orderId: string) {
    isProcessing.value = true
    error.value = null
    try {
      const res = await fetch(`/api/payment/mock-pay/${orderId}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok)
        throw new Error(`Mock pay failed: ${res.status}`)
      const data = await res.json()
      // 更新本地订单状态
      if (currentOrder.value) {
        currentOrder.value.status = 'paid'
      }
      return data
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    }
    finally {
      isProcessing.value = false
    }
  }

  /**
   * 查询订单状态
   * 调用 GET /api/payment/order/:id
   */
  async function checkOrderStatus(orderId: string) {
    try {
      const res = await fetch(`/api/payment/order/${orderId}`, {
        credentials: 'include',
      })
      if (!res.ok)
        throw new Error(`Check order failed: ${res.status}`)
      const data = await res.json()
      currentOrder.value = data.order
      return data.order
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    }
  }

  /**
   * 清除当前订单和错误状态
   */
  function clearOrder() {
    currentOrder.value = null
    error.value = null
  }

  return {
    currentOrder,
    isProcessing,
    error,
    createOrder,
    mockPay,
    checkOrderStatus,
    clearOrder,
  }
})
