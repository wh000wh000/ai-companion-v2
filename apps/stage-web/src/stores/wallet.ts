import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// 与 API GET /api/wallet 返回的字段完全对齐
export interface WalletState {
  id: string
  userId: string
  coinBalance: number
  pocketMoney: number
  isFirstCharge: boolean
  subscriptionTier: 'none' | 'monthly' | 'quarterly' | 'yearly'
  totalCharged: number
  totalGifted: number
  costumeTickets: number
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  type: 'charge' | 'gift' | 'surprise' | 'subscription'
  amount: number
  coins: number
  description: string
  createdAt: string
}

export interface ChargePackage {
  packId: string
  name: string
  price: number
  coins: number
  bonus: number
  tag: string
}

export const CHARGE_PACKAGES: ChargePackage[] = [
  { packId: 'pack_1', name: '小小心意', price: 1, coins: 10, bonus: 0, tag: '体验档' },
  { packId: 'pack_6', name: '甜蜜起步', price: 6, coins: 60, bonus: 10, tag: '' },
  { packId: 'pack_30', name: '暖心之选', price: 30, coins: 300, bonus: 70, tag: '' },
  { packId: 'pack_68', name: '真心以待', price: 68, coins: 680, bonus: 180, tag: '最受欢迎' },
  { packId: 'pack_128', name: '浓情蜜意', price: 128, coins: 1280, bonus: 420, tag: '' },
  { packId: 'pack_328', name: '至死不渝', price: 328, coins: 3280, bonus: 1020, tag: '' },
  { packId: 'pack_648', name: '命中注定', price: 648, coins: 6480, bonus: 2520, tag: '顶级档' },
]

export const useWalletStore = defineStore('wallet', () => {
  const wallet = ref<WalletState | null>(null)
  const transactions = ref<Transaction[]>([])
  const isLoading = ref(false)
  const hasMore = ref(true)
  const error = ref<string | null>(null)

  const formattedBalance = computed(() => {
    if (!wallet.value)
      return '0'
    return wallet.value.coinBalance.toLocaleString('zh-CN')
  })

  const formattedPocketMoney = computed(() => {
    if (!wallet.value)
      return '0.00'
    return wallet.value.pocketMoney.toFixed(2)
  })

  const subscriptionLabel = computed(() => {
    if (!wallet.value)
      return ''
    const map: Record<string, string> = {
      none: '未订阅',
      monthly: '月卡',
      quarterly: '季卡',
      yearly: '年卡',
    }
    return map[wallet.value.subscriptionTier] || '未订阅'
  })

  const recentTransactions = computed(() => {
    return transactions.value.slice(0, 5)
  })

  async function fetchWallet() {
    isLoading.value = true
    error.value = null
    try {
      const res = await fetch('/api/wallet', { credentials: 'include' })
      if (!res.ok)
        throw new Error(`Failed to fetch wallet: ${res.status}`)
      const data = await res.json()
      wallet.value = data
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    }
    finally {
      isLoading.value = false
    }
  }

  async function charge(packId: string, idempotencyKey: string) {
    isLoading.value = true
    error.value = null
    try {
      const res = await fetch('/api/wallet/charge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId, idempotencyKey }),
      })
      if (!res.ok)
        throw new Error(`Charge failed: ${res.status}`)
      const data = await res.json()
      // API 返回 { transaction, chargeResult, duplicate }，无 wallet 字段
      // 用 chargeResult.newBalance 即时更新余额，再异步刷新完整状态
      if (wallet.value && data.chargeResult) {
        wallet.value.coinBalance = data.chargeResult.newBalance
        wallet.value.isFirstCharge = false
      }
      // 异步刷新完整钱包状态和交易记录
      fetchWallet()
      fetchTransactions(true)
      return data
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    }
    finally {
      isLoading.value = false
    }
  }

  async function sendGift(characterId: string, tier: string, idempotencyKey: string) {
    isLoading.value = true
    error.value = null
    try {
      const res = await fetch('/api/wallet/gift', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, giftTier: tier, idempotencyKey }),
      })
      if (!res.ok)
        throw new Error(`Gift failed: ${res.status}`)
      const data = await res.json()
      // 异步刷新钱包和交易记录
      fetchWallet()
      fetchTransactions(true)
      return data
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    }
    finally {
      isLoading.value = false
    }
  }

  async function fetchTransactions(reset?: boolean) {
    if (!hasMore.value && !reset)
      return

    isLoading.value = true
    error.value = null

    const offset = reset ? 0 : transactions.value.length
    const limit = 20

    try {
      const res = await fetch(`/api/wallet/history?limit=${limit}&offset=${offset}`, {
        credentials: 'include',
      })
      if (!res.ok)
        throw new Error(`Failed to fetch transactions: ${res.status}`)
      const data: Transaction[] = await res.json()

      if (reset)
        transactions.value = data
      else
        transactions.value.push(...data)

      hasMore.value = data.length >= limit
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    wallet,
    transactions,
    isLoading,
    hasMore,
    error,
    formattedBalance,
    formattedPocketMoney,
    subscriptionLabel,
    recentTransactions,
    fetchWallet,
    charge,
    sendGift,
    fetchTransactions,
  }
})
