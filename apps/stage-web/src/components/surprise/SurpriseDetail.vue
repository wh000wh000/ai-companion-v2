<!-- G23: SurpriseDetail 详情组件 — 底部抽屉展示惊喜完整信息 -->
<script setup lang="ts">
import type { SurpriseRecord, SurpriseType } from '../../stores/surprise'

import { computed } from 'vue'

const props = defineProps<{
  surprise: SurpriseRecord | null
}>()

const show = defineModel<boolean>('show', { default: false })

// 类型配置
const typeConfig = computed(() => {
  if (!props.surprise)
    return { emoji: '🎁', label: '惊喜', color: 'text-neutral-500' }

  const configs: Record<SurpriseType, { emoji: string, label: string, color: string }> = {
    virtual: { emoji: '⭐', label: '虚拟惊喜', color: 'text-amber-500' },
    electronic: { emoji: '📱', label: '电子惊喜', color: 'text-blue-500' },
    physical: { emoji: '🎁', label: '实物惊喜', color: 'text-pink-500' },
    personalized: { emoji: '💝', label: '个性化惊喜', color: 'text-rose-500' },
  }
  return configs[props.surprise.type] || { emoji: '🎁', label: '惊喜', color: 'text-neutral-500' }
})

// 状态配置
const statusLabel = computed(() => {
  if (!props.surprise)
    return ''
  const map: Record<string, string> = {
    pending: '待发送',
    sent: '已发送',
    clicked: '已查看',
    completed: '已完成',
  }
  return map[props.surprise.status] || props.surprise.status
})

// 反馈文案
const feedbackLabel = computed(() => {
  if (!props.surprise?.feedback)
    return null
  const map: Record<string, string> = {
    love: '💕 好喜欢',
    ok: '😊 还行',
    change: '🤔 不太合适',
  }
  return map[props.surprise.feedback] || props.surprise.feedback
})

// 金额格式化
const formattedAmount = computed(() => {
  if (!props.surprise)
    return '0.00'
  return (props.surprise.amount / 100).toFixed(2)
})

// 时间格式化
const formattedDate = computed(() => {
  if (!props.surprise)
    return ''
  const date = new Date(props.surprise.createdAt)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
})

function close() {
  show.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="detail-drawer">
      <div
        v-if="show && surprise"
        fixed inset-0 z-200
        flex items-end justify-center
        @click.self="close"
      >
        <!-- 背景遮罩 -->
        <div absolute inset-0 bg="black/50" class="detail-backdrop" @click="close" />

        <!-- 底部抽屉 -->
        <div

          bg="white dark:neutral-900"
          relative z-1 max-w-lg w-full rounded-t-2xl shadow-2xl
          class="detail-sheet"
        >
          <!-- 拖拽指示条 -->
          <div flex justify-center pb-2 pt-3>
            <div
              h-1 w-10 rounded-full
              bg="neutral-300 dark:neutral-600"
            />
          </div>

          <!-- 内容区 -->
          <div flex="~ col gap-4" px-6 pb-8>
            <!-- 标题行 -->
            <div flex items-center justify-between>
              <div flex items-center gap-2>
                <span text-2xl>{{ typeConfig.emoji }}</span>
                <span text="lg neutral-800 dark:neutral-100" font-bold>
                  {{ surprise.productName }}
                </span>
              </div>
              <button
                min-h-11 min-w-11 rounded-lg p-2
                class="bg-transparent hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
                @click="close"
              >
                <div i-lucide-x text="lg neutral-400 dark:neutral-500" />
              </button>
            </div>

            <!-- 类型与状态 -->
            <div flex items-center gap-3>
              <span
                rounded-full px-3 py-1
                text="xs" font-medium
                :class="typeConfig.color"
                class="bg-neutral-100 dark:bg-neutral-800"
              >
                {{ typeConfig.label }}
              </span>
              <span
                rounded-full px-3 py-1
                text="xs neutral-600 dark:neutral-400" font-medium
                class="bg-neutral-100 dark:bg-neutral-800"
              >
                {{ statusLabel }}
              </span>
              <span text="xs neutral-400 dark:neutral-500">
                {{ formattedDate }}
              </span>
            </div>

            <!-- 金额 -->
            <div
              flex items-center justify-between
              rounded-xl p-4
              class="border border-neutral-200/30 border-solid bg-neutral-50/60 dark:border-neutral-700/30 dark:bg-neutral-800/50"
            >
              <span text="sm neutral-500 dark:neutral-400">惊喜价值</span>
              <span text="lg pink-500 dark:pink-400" font-bold>
                ¥{{ formattedAmount }}
              </span>
            </div>

            <!-- 角色留言 -->
            <div v-if="surprise.message" flex="~ col gap-2">
              <span text="sm neutral-500 dark:neutral-400" font-medium>角色留言</span>
              <div
                rounded-xl p-4
                class="border border-primary-200/30 border-solid bg-primary-50/60 dark:border-primary-700/30 dark:bg-primary-900/20"
              >
                <p text="sm neutral-600 dark:neutral-300" leading-relaxed>
                  {{ surprise.message }}
                </p>
              </div>
            </div>

            <!-- 用户反馈 -->
            <div v-if="feedbackLabel" flex="~ col gap-2">
              <span text="sm neutral-500 dark:neutral-400" font-medium>你的反馈</span>
              <div
                rounded-xl p-3
                class="border border-neutral-200/30 border-solid bg-neutral-50/60 dark:border-neutral-700/30 dark:bg-neutral-800/50"
              >
                <span text="sm neutral-700 dark:neutral-200">{{ feedbackLabel }}</span>
              </div>
            </div>

            <!-- 平台链接 -->
            <div v-if="surprise.productUrl" flex="~ col gap-2">
              <span text="sm neutral-500 dark:neutral-400" font-medium>商品链接</span>
              <a
                :href="surprise.productUrl"
                target="_blank"
                rel="noopener noreferrer"
                flex="~ items-center gap-2"
                rounded-xl p-3
                class="border border-primary-200/30 border-solid bg-primary-50/30 dark:border-primary-700/30 dark:bg-primary-900/10 hover:bg-primary-50/60 dark:hover:bg-primary-900/20"
                transition="colors duration-150"
              >
                <div i-lucide-external-link text="sm primary-500" />
                <span text="sm primary-600 dark:primary-400" font-medium>查看详情</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 底部抽屉动画 */
.detail-drawer-enter-active {
  transition: opacity 0.3s ease;
}
.detail-drawer-leave-active {
  transition: opacity 0.2s ease;
}
.detail-drawer-enter-from,
.detail-drawer-leave-to {
  opacity: 0;
}

.detail-drawer-enter-active .detail-sheet {
  animation: sheet-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.detail-drawer-leave-active .detail-sheet {
  animation: sheet-slide-down 0.25s ease both;
}

@keyframes sheet-slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
@keyframes sheet-slide-down {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

.detail-drawer-enter-active .detail-backdrop {
  animation: backdrop-fade-in 0.3s ease both;
}
.detail-drawer-leave-active .detail-backdrop {
  animation: backdrop-fade-out 0.2s ease both;
}

@keyframes backdrop-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes backdrop-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
