<script setup lang="ts">
import type { Transaction } from '../../stores/wallet'

import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useWalletStore } from '../../stores/wallet'

const router = useRouter()
const walletStore = useWalletStore()
const { transactions, isLoading, hasMore } = storeToRefs(walletStore)

const sentinelRef = ref<HTMLDivElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(async () => {
  await walletStore.fetchTransactions(true)
  setupObserver()
})

onUnmounted(() => {
  observer?.disconnect()
})

function setupObserver() {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !isLoading.value)
        walletStore.fetchTransactions()
    },
    { rootMargin: '100px' },
  )

  if (sentinelRef.value)
    observer.observe(sentinelRef.value)
}

interface DateGroup {
  date: string
  label: string
  items: Transaction[]
}

const groupedTransactions = computed<DateGroup[]>(() => {
  const groups = new Map<string, Transaction[]>()

  for (const tx of transactions.value) {
    const date = new Date(tx.createdAt)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    if (!groups.has(key))
      groups.set(key, [])
    groups.get(key)!.push(tx)
  }

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  return Array.from(groups.entries()).map(([date, items]) => {
    let label = date
    if (date === todayKey)
      label = '今天'
    else if (date === yesterdayKey)
      label = '昨天'

    return { date, label, items }
  })
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

function getTypeBg(type: string) {
  const bgs: Record<string, string> = {
    charge: 'bg-green-500/10 dark:bg-green-700/20',
    gift: 'bg-pink-500/10 dark:bg-pink-700/20',
    surprise: 'bg-amber-500/10 dark:bg-amber-700/20',
    subscription: 'bg-blue-500/10 dark:bg-blue-700/20',
  }
  return bgs[type] || 'bg-neutral-100 dark:bg-neutral-800'
}

function formatAmount(type: string, amount: number) {
  if (type === 'charge')
    return `+${amount.toLocaleString('zh-CN')}`
  return `-${amount.toLocaleString('zh-CN')}`
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
</script>

<template>
  <div flex="~ col gap-4" p-4 max-w-lg mx-auto>
    <!-- Header -->
    <div flex="~ items-center gap-2">
      <button
        p-2.5 rounded-lg min-w-11 min-h-11
        class="bg-transparent hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
        @click="router.back()"
      >
        <div i-lucide-arrow-left text="lg neutral-600 dark:neutral-300" />
      </button>
      <span text="xl neutral-800 dark:neutral-100" font-bold>交易记录</span>
    </div>

    <!-- Loading Initial -->
    <div v-if="isLoading && transactions.length === 0" flex items-center justify-center py-20>
      <div i-svg-spinners:ring-resize text-3xl text-primary-500 />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="transactions.length === 0"
      flex="~ col items-center gap-3" py-20
    >
      <div i-lucide-inbox text="4xl neutral-300 dark:neutral-600" />
      <span text="sm neutral-400 dark:neutral-500">暂无交易记录</span>
    </div>

    <!-- Transaction Timeline -->
    <template v-else>
      <div
        v-for="group in groupedTransactions"
        :key="group.date"
        flex="~ col gap-2"
      >
        <!-- Date Label -->
        <div
          text="xs neutral-400 dark:neutral-500"
          font-semibold uppercase tracking-wide
          pl-1 pt-2
        >
          {{ group.label }}
        </div>

        <!-- Transaction Items -->
        <div flex="~ col gap-2">
          <div
            v-for="tx in group.items"
            :key="tx.id"
            flex="~ items-center gap-3"
            rounded-xl p-3
            class="bg-neutral-50/50 dark:bg-neutral-800/40 border border-solid border-neutral-200/20 dark:border-neutral-700/20"
          >
            <!-- Type Icon -->
            <div
              flex items-center justify-center
              w-10 h-10 rounded-full
              :class="getTypeBg(tx.type)"
            >
              <div :class="[getTypeIcon(tx.type), getTypeColor(tx.type)]" text-lg />
            </div>

            <!-- Details -->
            <div flex="~ 1 col">
              <span text="sm neutral-800 dark:neutral-200" font-medium>
                {{ tx.description }}
              </span>
              <span text="xs neutral-400 dark:neutral-500">
                {{ formatTime(tx.createdAt) }}
              </span>
            </div>

            <!-- Amount -->
            <span
              text="sm font-bold"
              :class="tx.type === 'charge' ? 'text-green-500' : 'text-pink-500'"
            >
              {{ formatAmount(tx.type, tx.amount) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Load More Sentinel -->
      <div ref="sentinelRef" h-1>
        <div v-if="isLoading" flex items-center justify-center py-4>
          <div i-svg-spinners:ring-resize text-xl text-primary-500 />
        </div>
        <div v-else-if="!hasMore" text="xs neutral-400 dark:neutral-500" text-center py-4>
          没有更多记录了
        </div>
      </div>
    </template>
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
