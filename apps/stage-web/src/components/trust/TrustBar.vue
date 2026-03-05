<script setup lang="ts">
import { computed } from 'vue'
import { TRUST_LEVEL_NAMES, TRUST_LEVEL_THRESHOLDS } from '../../stores/trust'

const props = withDefaults(defineProps<{
  trustPoints?: number
  trustLevel?: number
  isShaken?: boolean
  maxLevel?: number
}>(), {
  trustPoints: 0,
  trustLevel: 1,
  isShaken: false,
  maxLevel: 10,
})

const levelName = computed(() => TRUST_LEVEL_NAMES[props.trustLevel] ?? '未知')

const currentThreshold = computed(() => TRUST_LEVEL_THRESHOLDS[props.trustLevel] ?? 0)
const nextThreshold = computed(() => {
  if (props.trustLevel >= props.maxLevel) return currentThreshold.value
  return TRUST_LEVEL_THRESHOLDS[props.trustLevel + 1] ?? currentThreshold.value
})

const progressInLevel = computed(() => {
  if (props.trustLevel >= props.maxLevel) return 100
  const needed = nextThreshold.value - currentThreshold.value
  if (needed <= 0) return 100
  const current = props.trustPoints - currentThreshold.value
  return Math.min(100, Math.max(0, (current / needed) * 100))
})

const progressLabel = computed(() => {
  if (props.trustLevel >= props.maxLevel) return 'MAX'
  const current = props.trustPoints - currentThreshold.value
  const needed = nextThreshold.value - currentThreshold.value
  return `${Math.max(0, current)} / ${needed}`
})
</script>

<template>
  <div
    flex="~ col"
    gap-1.5
    w-full
  >
    <!-- Level info row -->
    <div flex items-center justify-between>
      <div flex items-center gap-2>
        <!-- Level badge -->
        <span
          :class="[
            'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold',
            isShaken
              ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
              : 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400',
          ]"
        >
          Lv.{{ trustLevel }}
        </span>
        <!-- Level name -->
        <span
          :class="[
            'text-sm font-medium',
            isShaken
              ? 'text-red-500 dark:text-red-400'
              : 'text-neutral-700 dark:text-neutral-200',
          ]"
        >
          {{ levelName }}
        </span>
        <!-- Shaken indicator -->
        <span
          v-if="isShaken"
          text="xs red-500 dark:red-400"
          class="trust-pulse"
          font-medium
        >
          动摇中
        </span>
      </div>
      <!-- Progress label -->
      <span text="xs neutral-400 dark:neutral-500">
        {{ progressLabel }}
      </span>
    </div>

    <!-- Progress bar -->
    <div
      relative h-2 w-full overflow-hidden rounded-full
      :class="[
        isShaken
          ? 'bg-red-100 dark:bg-red-900/30'
          : 'bg-neutral-200/60 dark:bg-neutral-700/40',
      ]"
    >
      <div
        absolute left-0 top-0 h-full rounded-full
        transition="width duration-500 ease-out"
        :class="[
          isShaken
            ? 'bg-red-500 dark:bg-red-400 trust-bar-pulse'
            : 'bg-primary-500 dark:bg-primary-400',
        ]"
        :style="{ width: `${progressInLevel}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.trust-pulse {
  animation: pulse-text 1.5s ease-in-out infinite;
}

@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.trust-bar-pulse {
  animation: bar-pulse 1.5s ease-in-out infinite;
}

@keyframes bar-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
