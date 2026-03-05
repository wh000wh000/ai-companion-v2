<script setup lang="ts">
import type { SurpriseRecord, SurpriseType } from '../../stores/surprise'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import SurpriseAnimation from '../../components/surprise/SurpriseAnimation.vue'
import SurpriseCard from '../../components/surprise/SurpriseCard.vue'
import { useSurpriseStore } from '../../stores/surprise'

const router = useRouter()

const surpriseStore = useSurpriseStore()
const {
  filteredSurprises,
  isLoading,
  hasMore,
  showAnimation,
  pendingSurprise,
  filter,
} = storeToRefs(surpriseStore)

const filterTabs: { key: 'all' | SurpriseType, label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'virtual', label: '虚拟' },
  { key: 'electronic', label: '电子' },
  { key: 'physical', label: '实物' },
  { key: 'personalized', label: '个性化' },
]

onMounted(async () => {
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
  surpriseStore.showSurprise(surprise)
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
  <div flex="~ col" h-full max-w-lg mx-auto>
    <!-- Header -->
    <div flex="~ items-center gap-2" px-4 pt-4 pb-2>
      <button
        p-2.5 rounded-lg min-w-11 min-h-11
        bg="transparent hover:neutral-100/50 dark:hover:neutral-800/50"
        @click="router.back()"
      >
        <div i-lucide-arrow-left text="lg neutral-600 dark:neutral-300" />
      </button>
      <h2 text="xl neutral-800 dark:neutral-100" font-bold>
        惊喜记录
      </h2>
    </div>

    <!-- Filter tabs -->
    <div flex items-center gap-2 px-4 pb-3 overflow-x-auto class="hide-scrollbar">
      <button
        v-for="tab in filterTabs"
        :key="tab.key"
        rounded-full px-4 py-2 min-h-11
        text="sm"
        font-medium
        transition="all duration-200"
        whitespace-nowrap
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
          text-center py-4
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
