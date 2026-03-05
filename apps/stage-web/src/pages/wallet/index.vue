<script setup lang="ts">
import { Button } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import ComplianceFooter from '../../components/compliance/ComplianceFooter.vue'
import { useWalletStore } from '../../stores/wallet'

const router = useRouter()
const walletStore = useWalletStore()
const {
  wallet,
  isLoading,
  formattedBalance,
  formattedPocketMoney,
  subscriptionLabel,
  recentTransactions,
} = storeToRefs(walletStore)

onMounted(async () => {
  await walletStore.fetchWallet()
  await walletStore.fetchTransactions(true)
})

function getTypeIcon(type: string) {
  const icons: Record<string, string> = {
    charge: 'i-lucide-arrow-up-circle',
    gift: 'i-lucide-heart',
    surprise: 'i-lucide-sparkles',
    subscription: 'i-lucide-plus-circle',
  }
  return icons[type] || 'i-lucide-circle'
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    charge: 'text-green-500',
    gift: 'text-pink-500',
    surprise: 'text-amber-500',
    subscription: 'text-blue-500',
  }
  return colors[type] || 'text-neutral-500'
}

function formatAmount(tx: { type: string, amount: number, coins?: number }) {
  // 充值: 显示获得的爱心币数; 其他: 显示消耗的爱心币数
  if (tx.type === 'charge') {
    const display = tx.coins ?? tx.amount
    return `+${display.toLocaleString('zh-CN')}`
  }
  const display = tx.coins ?? tx.amount
  return `-${display.toLocaleString('zh-CN')}`
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
</script>

<template>
  <div flex="~ col gap-6" p-4 max-w-lg mx-auto>
    <!-- Header -->
    <div flex="~ items-center gap-2">
      <button
        p-2.5 rounded-lg min-w-11 min-h-11
        bg="transparent hover:neutral-100/50 dark:hover:neutral-800/50"
        @click="router.back()"
      >
        <div i-lucide-arrow-left text="lg neutral-600 dark:neutral-300" />
      </button>
      <span text="xl neutral-800 dark:neutral-100" font-bold>我的钱包</span>
    </div>

    <!-- Loading -->
    <div v-if="isLoading && !wallet" flex items-center justify-center py-20>
      <div i-svg-spinners:ring-resize text-3xl text-primary-500 />
    </div>

    <template v-else-if="wallet">
      <!-- Balance Card -->
      <div
        rounded-2xl p-6
        bg="gradient-to-br from-pink-500/15 to-purple-500/15 dark:from-pink-700/25 dark:to-purple-700/25"
        border="2 solid pink-200/30 dark:pink-800/30"
      >
        <div text="sm neutral-500 dark:neutral-400" mb-1>
          爱心币余额
        </div>
        <div text="4xl pink-600 dark:pink-300" font-bold tracking-tight>
          {{ formattedBalance }}
        </div>
        <div flex="~ items-center gap-4" mt-4>
          <div flex="~ col">
            <span text="xs neutral-400 dark:neutral-500">零花钱</span>
            <span text="lg neutral-700 dark:neutral-200" font-semibold>
              {{ formattedPocketMoney }}元
            </span>
          </div>
          <div
            v-if="wallet.subscriptionTier !== 'none'"
            rounded-full px-3 py-1
            bg="blue-500/15 dark:blue-700/25"
            text="xs blue-600 dark:blue-300"
            font-medium
          >
            {{ subscriptionLabel }}
          </div>
        </div>

        <!-- First Charge Banner -->
        <div
          v-if="wallet.isFirstCharge"
          mt-4 rounded-xl p-3
          bg="amber-500/10 dark:amber-700/20"
          border="1 solid amber-300/30 dark:amber-700/30"
          flex="~ items-center gap-2"
        >
          <div i-lucide-gift text-amber-500 text-lg />
          <span text="sm amber-700 dark:amber-300" font-medium>
            首充翻倍！任意档位爱心币 x2
          </span>
        </div>
      </div>

      <!-- Quick Actions -->
      <div flex="~ gap-3">
        <Button
          variant="primary"
          block
          size="lg"
          icon="i-lucide-coins"
          label="充值"
          @click="router.push('/wallet/charge')"
        />
        <Button
          variant="secondary"
          block
          size="lg"
          icon="i-lucide-scroll-text"
          label="全部记录"
          @click="router.push('/wallet/history')"
        />
      </div>

      <!-- Recent Transactions -->
      <div flex="~ col gap-3">
        <div text="lg neutral-800 dark:neutral-100" font-semibold>
          最近交易
        </div>

        <div v-if="recentTransactions.length === 0" text="sm neutral-400 dark:neutral-500" py-6 text-center>
          暂无交易记录
        </div>

        <div
          v-for="tx in recentTransactions"
          :key="tx.id"
          flex="~ items-center gap-3"
          rounded-xl p-3
          bg="neutral-50/50 dark:neutral-800/50"
          border="1 solid neutral-200/30 dark:neutral-700/30"
        >
          <div
            flex items-center justify-center
            w-10 h-10 rounded-full
            bg="neutral-100 dark:neutral-700/50"
          >
            <div :class="[getTypeIcon(tx.type), getTypeColor(tx.type)]" text-lg />
          </div>
          <div flex="~ 1 col">
            <span text="sm neutral-800 dark:neutral-200" font-medium>
              {{ tx.description }}
            </span>
            <span text="xs neutral-400 dark:neutral-500">
              {{ formatDate(tx.createdAt) }}
            </span>
          </div>
          <span
            text="sm font-semibold"
            :class="tx.type === 'charge' ? 'text-green-500' : 'text-pink-500'"
          >
            {{ formatAmount(tx) }}
          </span>
        </div>
      </div>
    </template>

    <!-- Error -->
    <div v-else text="sm red-500" text-center py-10>
      加载失败，请刷新重试
    </div>

    <!-- 合规底部提示 -->
    <ComplianceFooter />
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
