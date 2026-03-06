<script setup lang="ts">
/**
 * 心意足迹页面
 *
 * 用时间线布局展示用户与角色之间的叙事支付历史。
 * 每个节点是一次"心意"，包含日期、故事标题、角色 quote、状态标签。
 * 进行中的叙事有呼吸动画。
 */
import type { NarrativePayment } from '../../stores/narrative'

import { useLocalStorage } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import {
  NARRATIVE_PHASE_CONFIG,
  NARRATIVE_TYPE_CONFIG,
  useNarrativeStore,
} from '../../stores/narrative'

const router = useRouter()
const narrativeStore = useNarrativeStore()
const { allNarratives, isLoading, error } = storeToRefs(narrativeStore)

// 当前选中的角色（与 characterLoader 对齐）
const selectedCharacterId = useLocalStorage<string>('selected_character_id', 'preset-xiaoxing')

// 角色名称映射（简化版，实际应从 characterLoader 获取）
const characterNameMap: Record<string, string> = {
  'preset-xiaoxing': '小星',
  'preset-xiaonuan': '小暖',
  'preset-keke': '可可',
  'preset-shiori': '诗织',
  'preset-bingtang': '冰棠',
  'preset-alie': '阿烈',
}

const characterName = computed(() => {
  return characterNameMap[selectedCharacterId.value] || '角色'
})

onMounted(async () => {
  // 同时拉取进行中和历史叙事
  await Promise.all([
    narrativeStore.fetchActiveNarratives(selectedCharacterId.value),
    narrativeStore.fetchHistory(),
  ])
})

// 格式化日期为 "X月X日" 格式
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime()))
      return dateStr
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }
  catch {
    return dateStr
  }
}

// 格式化日期为完整格式 "XXXX年X月X日"
function formatDateFull(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime()))
      return dateStr
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }
  catch {
    return dateStr
  }
}

// 判断叙事是否进行中（需要呼吸动画）
function isActive(narrative: NarrativePayment): boolean {
  return narrative.status === 'pending'
    && (narrative.narrativePhase === 'initiated' || narrative.narrativePhase === 'in_progress')
}

// 获取类型配置
function getTypeConfig(type: NarrativePayment['type']) {
  return NARRATIVE_TYPE_CONFIG[type] || NARRATIVE_TYPE_CONFIG.gift
}

// 获取阶段配置
function getPhaseConfig(phase: NarrativePayment['narrativePhase']) {
  return NARRATIVE_PHASE_CONFIG[phase] || NARRATIVE_PHASE_CONFIG.initiated
}

// 重试加载
async function retryFetch() {
  await Promise.all([
    narrativeStore.fetchActiveNarratives(selectedCharacterId.value),
    narrativeStore.fetchHistory(),
  ])
}
</script>

<template>
  <div flex="~ col" mx-auto h-full max-w-lg>
    <!-- 顶部导航 -->
    <div flex="~ items-center gap-2" px-4 pb-2 pt-4>
      <button
        min-h-11 min-w-11 rounded-lg p-2.5
        class="bg-transparent hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
        @click="router.back()"
      >
        <div i-lucide-arrow-left text="lg neutral-600 dark:neutral-300" />
      </button>
      <h2 text="xl neutral-800 dark:neutral-100" font-bold>
        与{{ characterName }}的心意足迹
      </h2>
    </div>

    <!-- 错误状态 -->
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

    <!-- 内容区域 -->
    <div flex="~ 1 col" overflow-y-auto px-4 pb-6 class="hide-scrollbar">
      <!-- 加载状态 -->
      <div v-if="isLoading && allNarratives.length === 0" flex items-center justify-center py-20>
        <div i-svg-spinners:ring-resize text-3xl text-primary-500 />
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="allNarratives.length === 0"
        flex="~ col items-center gap-4"
        py-20 px-6
      >
        <div
          h-20 w-20 flex items-center justify-center rounded-full
          class="bg-amber-50/80 dark:bg-stone-800/60"
        >
          <div i-lucide-heart-handshake text="3xl amber-400/60 dark:amber-500/40" />
        </div>
        <p
          text="sm neutral-400 dark:neutral-500"
          text-center leading-relaxed
          class="empty-text"
        >
          还没有心意足迹呢。<br>不急，缘分到了自然会有的。
        </p>
      </div>

      <!-- 时间线 -->
      <div v-else relative pl-6>
        <!-- 时间线竖线 -->
        <div
          absolute left-2.5 top-2 bottom-2 w-px
          class="bg-neutral-200/60 dark:bg-neutral-700/40"
        />

        <!-- 时间线节点 -->
        <div
          v-for="narrative in allNarratives"
          :key="narrative.id"
          relative mb-6 last:mb-0
          class="timeline-node"
        >
          <!-- 节点圆点 -->
          <div
            absolute top-1.5 w-5 h-5
            flex items-center justify-center
            class="-left-6"
          >
            <div
              h-2.5 w-2.5 rounded-full
              :class="[
                getPhaseConfig(narrative.narrativePhase).dotClass,
                isActive(narrative) ? 'breathing-dot' : '',
              ]"
            />
          </div>

          <!-- 节点卡片 -->
          <div
            rounded-xl p-4
            class="timeline-card border border-neutral-200/30 border-solid bg-neutral-50/50 dark:border-neutral-700/30 dark:bg-neutral-800/50"
            :class="{ 'active-card': isActive(narrative) }"
          >
            <!-- 日期与状态标签 -->
            <div flex items-center justify-between mb-2>
              <span text="xs neutral-400 dark:neutral-500" font-light>
                {{ formatDateFull(narrative.createdAt) }}
              </span>
              <span
                rounded-full px-2.5 py-0.5
                text="xs"
                :class="[
                  isActive(narrative)
                    ? 'bg-amber-100/80 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                    : narrative.status === 'completed'
                      ? 'bg-green-100/80 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-neutral-100/80 text-neutral-500 dark:bg-neutral-800/80 dark:text-neutral-400',
                ]"
                font-medium
              >
                {{ getPhaseConfig(narrative.narrativePhase).label }}
              </span>
            </div>

            <!-- 类型图标 + 故事标题 -->
            <div flex items-center gap-2 mb-2>
              <span text="lg">{{ getTypeConfig(narrative.type).emoji }}</span>
              <span
                text="base neutral-800 dark:neutral-100"
                font-medium
              >
                {{ narrative.storyTitle }}
              </span>
            </div>

            <!-- 故事描述 -->
            <p
              v-if="narrative.storyDescription"
              text="sm neutral-500 dark:neutral-400"
              leading-relaxed mb-2
            >
              {{ narrative.storyDescription }}
            </p>

            <!-- 角色 quote -->
            <p
              v-if="narrative.characterQuote"
              text="sm amber-700 dark:amber-500"
              leading-relaxed
              class="handwriting-font"
              pl-3
            >
              "{{ narrative.characterQuote }}"
            </p>

            <!-- 叙事进度更新（进行中的叙事展示） -->
            <div
              v-if="narrative.narrativeUpdates && narrative.narrativeUpdates.length > 0"
              mt-3 pt-3
              class="border-t border-neutral-200/30 border-solid dark:border-neutral-700/30"
            >
              <div
                v-for="(update, idx) in narrative.narrativeUpdates"
                :key="idx"
                flex="~ items-start gap-2"
                mb-1.5 last:mb-0
              >
                <div
                  mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full
                  class="bg-neutral-300 dark:bg-neutral-600"
                />
                <div flex="~ col">
                  <span text="xs neutral-600 dark:neutral-300">{{ update.message }}</span>
                  <span text="xs neutral-400 dark:neutral-500">{{ formatDate(update.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部文案 -->
      <div
        v-if="allNarratives.length > 0"
        mt-4 py-6 text-center
      >
        <p
          text="xs neutral-300 dark:neutral-600"
          font-light tracking-wider
        >
          每一份心意，都是关系的证据
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 手写体 */
.handwriting-font {
  font-family: 'STKaiti', 'KaiTi', 'STSong', 'SimSun', cursive;
  letter-spacing: 0.02em;
}

/* 隐藏滚动条 */
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

/* 呼吸圆点 */
.breathing-dot {
  animation: breathe 2.5s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
    box-shadow: 0 0 0 0 currentColor;
  }
  50% {
    opacity: 1;
    transform: scale(1.3);
    box-shadow: 0 0 8px 2px rgba(251, 191, 36, 0.2);
  }
}

/* 进行中的卡片有微妙的边框呼吸 */
.active-card {
  animation: card-glow 3s ease-in-out infinite;
}

@keyframes card-glow {
  0%, 100% {
    border-color: rgba(251, 191, 36, 0.15);
  }
  50% {
    border-color: rgba(251, 191, 36, 0.35);
  }
}

/* 时间线节点进入动画 */
.timeline-node {
  animation: node-appear 0.5s ease both;
}

.timeline-node:nth-child(1) { animation-delay: 0.05s; }
.timeline-node:nth-child(2) { animation-delay: 0.1s; }
.timeline-node:nth-child(3) { animation-delay: 0.15s; }
.timeline-node:nth-child(4) { animation-delay: 0.2s; }
.timeline-node:nth-child(5) { animation-delay: 0.25s; }

@keyframes node-appear {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 空状态文字 */
.empty-text {
  font-style: italic;
  letter-spacing: 0.03em;
}

/* 时间线卡片悬浮效果 */
.timeline-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.timeline-card:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

:root.dark .timeline-card:hover,
.dark .timeline-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}
</style>

<route lang="yaml">
meta:
  layout: default
</route>
