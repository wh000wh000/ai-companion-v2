<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  currentDay: number
  completedDays: number[]
  totalDays?: number
}>(), {
  totalDays: 7,
})

interface DayDot {
  day: number
  status: 'completed' | 'current' | 'future'
}

const days = computed<DayDot[]>(() => {
  const result: DayDot[] = []
  for (let i = 1; i <= props.totalDays; i++) {
    if (props.completedDays.includes(i)) {
      result.push({ day: i, status: 'completed' })
    }
    else if (i === props.currentDay) {
      result.push({ day: i, status: 'current' })
    }
    else {
      result.push({ day: i, status: 'future' })
    }
  }
  return result
})

const remainingDays = computed(() => {
  return Math.max(0, props.totalDays - props.currentDay)
})
</script>

<template>
  <div flex="~ col items-center gap-3" w-full>
    <!-- Day dots row -->
    <div flex="~ items-center gap-1 sm:gap-2" w-full justify-center px-2>
      <template v-for="(dot, idx) in days" :key="dot.day">
        <!-- Connector line -->
        <div
          v-if="idx > 0"
          h-0.5 flex-1 max-w-6 rounded-full
          :class="[
            dot.status === 'completed' || days[idx - 1].status === 'completed'
              ? 'bg-green-400 dark:bg-green-500'
              : 'bg-neutral-200 dark:bg-neutral-700',
          ]"
        />

        <!-- Day dot -->
        <div
          relative flex items-center justify-center
          w-8 h-8 sm:w-9 sm:h-9 rounded-full
          shrink-0
          transition="all duration-300"
          :class="[
            dot.status === 'completed'
              ? 'bg-green-500 shadow-md shadow-green-500/25'
              : dot.status === 'current'
                ? 'bg-gradient-to-br from-pink-500 to-purple-500 shadow-lg shadow-pink-500/30 current-pulse'
                : 'bg-neutral-200/80 dark:bg-neutral-700/80',
          ]"
        >
          <!-- Completed: check icon -->
          <div
            v-if="dot.status === 'completed'"
            i-lucide-check
            text="sm white"
          />

          <!-- Current: day number -->
          <span
            v-else-if="dot.status === 'current'"
            text="xs white" font-bold
          >
            {{ dot.day }}
          </span>

          <!-- Future: day number (muted) -->
          <span
            v-else
            text="xs neutral-400 dark:neutral-500" font-medium
          >
            {{ dot.day }}
          </span>
        </div>
      </template>
    </div>

    <!-- Progress text -->
    <div flex="~ items-center gap-2">
      <span text="sm neutral-700 dark:neutral-200" font-medium>
        第{{ currentDay }}天
      </span>
      <span text="xs neutral-400 dark:neutral-500">
        / 共{{ totalDays }}天
      </span>
      <span
        v-if="remainingDays > 0"
        text="xs pink-500 dark:pink-400"
        font-medium
      >
        还剩{{ remainingDays }}天体验
      </span>
      <span
        v-else
        text="xs amber-500 dark:amber-400"
        font-medium
      >
        体验已结束
      </span>
    </div>
  </div>
</template>

<style scoped>
.current-pulse {
  animation: current-pulse 2s ease-in-out infinite;
}

@keyframes current-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(236, 72, 153, 0);
  }
}
</style>
