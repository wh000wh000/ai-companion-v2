<script setup lang="ts">
import type { SurpriseRecord, SurpriseType } from '../../stores/surprise'

import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import PocketMoneyBar from '../../components/surprise/PocketMoneyBar.vue'
import SurpriseAnimation from '../../components/surprise/SurpriseAnimation.vue'
import SurpriseCard from '../../components/surprise/SurpriseCard.vue'
// G23: 惊喜详情底部抽屉
import SurpriseDetail from '../../components/surprise/SurpriseDetail.vue'

import { useSurpriseStore } from '../../stores/surprise'
import { useWalletStore } from '../../stores/wallet'

const router = useRouter()

const surpriseStore = useSurpriseStore()
const walletStore = useWalletStore()
const {
  filteredSurprises,
  isLoading,
  hasMore,
  showAnimation,
  pendingSurprise,
  filter,
  error,
} = storeToRefs(surpriseStore)

// G23: 详情抽屉状态
const showDetail = ref(false)
const detailSurprise = ref<SurpriseRecord | null>(null)

const filterTabs: { key: 'all' | SurpriseType, label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'virtual', label: '虚拟' },
  { key: 'electronic', label: '电子' },
  { key: 'physical', label: '实物' },
  { key: 'personalized', label: '个性化' },
]

onMounted(async () => {
  // 加载钱包数据（如果尚未加载），用于展示零花钱进度条
  if (!walletStore.wallet)
    walletStore.fetchWallet()
  await surpriseStore.fetchSurprises(true)
})

function switchFilter(key: 'all' | SurpriseType) {
  filter.value = key
}

async function loadMore() {
  if (isLoading.value || !hasMore.value)
    return
  await surpriseStore.fetchSurprises()
}

function handleCardClick(surprise: SurpriseRecord) {
  // G23: 打开详情抽屉（替代直接触发动画）
  detailSurprise.value = surprise
  showDetail.value = true
}

// G31: 错误重试
async function retryFetch() {
  await surpriseStore.fetchSurprises(true)
}

function handleScroll(e: Event) {
  const target = e.target as HTMLElement
  if (!target)
    return
  const { scrollTop, scrollHeight, clientHeight } = target
  if (scrollHeight - scrollTop - clientHeight < 100) {
    loadMore()
  }
}
</script>

<template>
  <div flex="~ col" mx-auto h-full max-w-lg>
    <!-- Header -->
    <div flex="~ items-center gap-2" px-4 pb-2 pt-4>
      <button
        min-h-11 min-w-11 rounded-lg p-2.5
        class="bg-transparent hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
        @click="router.back()"
      >
        <div i-lucide-arrow-left text="lg neutral-600 dark:neutral-300" />
      </button>
      <h2 text="xl neutral-800 dark:neutral-100" font-bold>
        惊喜记录
      </h2>
    </div>

    <!-- G31: 错误状态展示 -->
    <div
      v-if="error"
      flex="~ items-center justify-between"
      mx-4 mb-2 rounded-xl px-4 py-3
      class="border border-red-300/40 border-solid bg-red-50/80 dark:border-red-700/30 dark:bg-red-900/20"
    >
      <div flex="~ items-center gap-2">
        <div i-lucide-alert-circle text="lg red-500" />
        <span text="sm red-600 dark:red-400" font-medium>{{ error }}</span>
      </div>
      <button
        min-h-9 rounded-lg px-3 py-1
        text="xs white"
        bg="red-500 hover:red-600"
        font-medium
        transition="colors duration-150"
        @click="retryFetch"
      >
        重试
      </button>
    </div>

    <!-- 零花钱进度条 -->
    <div v-if="walletStore.wallet" px-4 pb-2>
      <PocketMoneyBar
        :pocket-money="walletStore.wallet.pocketMoney ?? 0"
        character-name="角色"
      />
    </div>

    <!-- Filter tabs -->
    <!-- G32: 筛选Tab添加 min-h-11（44px）满足移动端触控标准 -->
    <div flex items-center gap-2 overflow-x-auto px-4 pb-3 class="hide-scrollbar">
      <button
        v-for="tab in filterTabs"
        :key="tab.key"

        text="sm"

        transition="all duration-200"
        min-h-11 min-w-11 whitespace-nowrap rounded-full px-4 py-2 font-medium
        :class="[
          filter === tab.key
            ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/25'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700',
        ]"
        @click="switchFilter(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Content area -->
    <div
      flex="~ 1 col"
      overflow-y-auto px-4 pb-4
      class="hide-scrollbar"
      @scroll="handleScroll"
    >
      <!-- Loading state (initial) -->
      <div v-if="isLoading && filteredSurprises.length === 0" flex items-center justify-center py-20>
        <div i-svg-spinners:ring-resize text-3xl text-primary-500 />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filteredSurprises.length === 0"
        flex="~ col items-center gap-3"
        py-20
      >
        <div text-5xl opacity-40>
          🎁
        </div>
        <p text="sm neutral-400 dark:neutral-500" text-center>
          还没有收到惊喜哦~多和角色互动吧
        </p>
      </div>

      <!-- Surprise list -->
      <div v-else flex="~ col gap-3">
        <SurpriseCard
          v-for="surprise in filteredSurprises"
          :key="surprise.id"
          :surprise="surprise"
          @click="handleCardClick(surprise)"
        />

        <!-- Load more indicator -->
        <div v-if="isLoading && filteredSurprises.length > 0" flex items-center justify-center py-4>
          <div i-svg-spinners:ring-resize text-xl text-primary-500 />
        </div>

        <!-- No more data -->
        <div
          v-else-if="!hasMore && filteredSurprises.length > 0"
          text="xs neutral-400 dark:neutral-500"
          py-4 text-center
        >
          没有更多了
        </div>
      </div>
    </div>

    <!-- Surprise animation overlay -->
    <SurpriseAnimation
      v-if="pendingSurprise"
      v-model:show="showAnimation"
      :surprise="pendingSurprise"
    />

    <!-- G23: 惊喜详情底部抽屉 -->
    <SurpriseDetail
      v-model:show="showDetail"
      :surprise="detailSurprise"
    />
  </div>
</template>

<style scoped>
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>

<route lang="yaml">
meta:
  layout: default
</route>
