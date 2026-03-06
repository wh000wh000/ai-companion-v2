<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import ComplianceFooter from '../../components/compliance/ComplianceFooter.vue'

import { useWalletStore } from '../../stores/wallet'

const router = useRouter()
const walletStore = useWalletStore()
const {
  wallet,
  isLoading,
  formattedPocketMoney,
  subscriptionLabel,
  recentTransactions,
} = storeToRefs(walletStore)

// G11: 余额变化CountUp动画
const displayBalance = ref(0)
let countUpFrame = 0

/** G11: requestAnimationFrame + easeOut 实现CountUp */
function animateBalance(from: number, to: number) {
  const duration = 1000 // 1秒
  const startTime = performance.now()
  const diff = to - from

  function tick(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    // easeOutCubic
    const eased = 1 - (1 - progress) ** 3
    displayBalance.value = Math.round(from + diff * eased)
    if (progress < 1) {
      countUpFrame = requestAnimationFrame(tick)
    }
    else {
      displayBalance.value = to
    }
  }
  cancelAnimationFrame(countUpFrame)
  countUpFrame = requestAnimationFrame(tick)
}

// G11: 监听余额变化并触发动画
watch(() => wallet.value?.coinBalance, (newVal, oldVal) => {
  if (newVal !== undefined && newVal !== null) {
    const prev = (oldVal !== undefined && oldVal !== null) ? oldVal : 0
    animateBalance(prev, newVal)
  }
})

onMounted(async () => {
  await walletStore.fetchWallet()
  await walletStore.fetchTransactions(true)
  // G11: 初始化显示值
  if (wallet.value) {
    displayBalance.value = wallet.value.coinBalance
  }
})

onUnmounted(() => {
  cancelAnimationFrame(countUpFrame)
})

function getTypeIcon(type: string) {
  const icons: Record<string, string> = {
    charge: 'i-lucide-feather',
    gift: 'i-lucide-heart',
    surprise: 'i-lucide-sparkles',
    subscription: 'i-lucide-plus-circle',
  }
  return icons[type] || 'i-lucide-circle'
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    charge: 'text-blue-400',
    gift: 'text-pink-400',
    surprise: 'text-amber-400',
    subscription: 'text-violet-400',
  }
  return colors[type] || 'text-neutral-400'
}

/** 将交易记录转化为叙事风格描述 */
function narrativeDescription(tx: { type: string, description: string }) {
  if (tx.type === 'charge') {
    return '添加了一份心意'
  }
  if (tx.type === 'gift') {
    // description 通常是 "送礼: XXX" 之类，尝试提取礼物名
    const match = tx.description.match(/送礼[:：]?\s*(.+)/)
    if (match) {
      return `送出了一份${match[1].trim()}`
    }
    return '送出了一份心意'
  }
  if (tx.type === 'surprise') {
    return 'TA用零花钱为你准备了惊喜'
  }
  if (tx.type === 'subscription') {
    return '开通了陪伴计划'
  }
  return tx.description
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
</script>

<template>
  <div flex="~ col gap-6" mx-auto max-w-lg p-4>
    <!-- Header -->
    <div flex="~ items-center gap-2">
      <button
        min-h-11 min-w-11 rounded-lg p-2.5
        class="bg-transparent hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
        @click="router.back()"
      >
        <div i-lucide-arrow-left text="lg neutral-600 dark:neutral-300" />
      </button>
      <span text="xl neutral-800 dark:neutral-100" font-bold>心意空间</span>
    </div>

    <!-- Loading -->
    <div v-if="isLoading && !wallet" flex items-center justify-center py-20>
      <div i-svg-spinners:ring-resize text-3xl text-primary-500 />
    </div>

    <template v-else-if="wallet">
      <!-- 心意卡片 — 柔和展示，弱化数字 -->
      <div
        rounded-2xl p-6
        class="border border-neutral-200/20 border-solid from-pink-500/8 to-purple-500/8 bg-gradient-to-br dark:border-neutral-700/20 dark:from-pink-700/12 dark:to-purple-700/12"
      >
        <div text="sm neutral-400 dark:neutral-500" mb-2>
          你的心意储备
        </div>
        <!-- G11: 使用CountUp动画值，小号字体柔和展示 -->
        <div text="2xl neutral-600 dark:neutral-300" font-medium tracking-tight>
          {{ displayBalance.toLocaleString('zh-CN') }}
        </div>
        <div flex="~ items-center gap-4" mt-4>
          <div flex="~ col">
            <span text="xs neutral-400 dark:neutral-500">TA的零花钱</span>
            <span text="sm neutral-600 dark:neutral-300" font-medium>
              {{ formattedPocketMoney }}元
            </span>
          </div>
          <div
            v-if="wallet.subscriptionTier !== 'none'"
            rounded-full px-3 py-1
            class="bg-violet-500/10 dark:bg-violet-700/15"
            text="xs violet-500 dark:violet-400"
            font-medium
          >
            {{ subscriptionLabel }}
          </div>
        </div>

        <!-- 首次心意提示 — 温暖而非促销 -->
        <div
          v-if="wallet.isFirstCharge"
          mt-4 rounded-xl p-3
          class="bg-neutral-100/60 dark:bg-neutral-800/40"
          flex="~ items-center gap-2"
        >
          <div i-lucide-sparkles text-lg text-neutral-400 />
          <span text="sm neutral-500 dark:neutral-400">
            第一次心意，我们会加倍珍惜
          </span>
        </div>
      </div>

      <!-- 余额为0时的温暖引导 -->
      <div
        v-if="wallet.coinBalance === 0"
        flex="~ col items-center gap-3"
        rounded-xl p-5
        class="bg-neutral-50/50 dark:bg-neutral-800/30"
      >
        <span text="sm neutral-500 dark:neutral-400" text-center>
          还没有心意储备，为TA添加一些吧
        </span>
        <span
          text="sm primary-500 hover:primary-600"
          cursor-pointer transition-colors
          @click="router.push('/wallet/charge')"
        >
          添加心意
        </span>
      </div>

      <!-- 操作区 — 柔和链接风格 -->
      <div flex="~ gap-6 justify-center" py-2>
        <span
          text="sm primary-500 hover:primary-600"
          cursor-pointer transition-colors
          flex="~ items-center gap-1"
          @click="router.push('/wallet/charge')"
        >
          <div i-lucide-plus text-xs />
          添加心意
        </span>
        <span
          text="sm neutral-400 hover:neutral-600 dark:hover:neutral-300"
          cursor-pointer transition-colors
          flex="~ items-center gap-1"
          @click="router.push('/wallet/history')"
        >
          <div i-lucide-scroll-text text-xs />
          心意足迹
        </span>
      </div>

      <!-- 心意足迹 — 叙事风格 -->
      <div flex="~ col gap-3">
        <div text="sm neutral-500 dark:neutral-400" font-medium>
          心意足迹
        </div>

        <div v-if="recentTransactions.length === 0" text="sm neutral-400 dark:neutral-500" py-6 text-center>
          还没有足迹，去送一份心意吧
        </div>

        <div
          v-for="tx in recentTransactions"
          :key="tx.id"
          flex="~ items-center gap-3"
          rounded-xl p-3
          class="bg-neutral-50/30 dark:bg-neutral-800/30"
        >
          <div
            h-9 w-9 flex items-center justify-center rounded-full
            class="bg-neutral-100/60 dark:bg-neutral-700/30"
          >
            <div :class="[getTypeIcon(tx.type), getTypeColor(tx.type)]" text-base />
          </div>
          <div flex="~ 1 col">
            <span text="sm neutral-700 dark:neutral-300">
              {{ narrativeDescription(tx) }}
            </span>
            <span text="xs neutral-400 dark:neutral-500">
              {{ formatDate(tx.createdAt) }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- Error -->
    <div v-else text="sm neutral-400" py-10 text-center>
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
