<script setup lang="ts">
import type { SurpriseType } from '../../stores/surprise'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** 零花钱余额（单位：分） */
  pocketMoney: number
  characterName: string
}>(), {
  pocketMoney: 0,
  characterName: '角色',
})

/**
 * 惊喜档位阈值（分）
 * 虚拟: 0 → 电子: 1500 → 实物: 3000 → 个性化: 5000
 */
const thresholds: { type: SurpriseType, min: number, label: string, icon: string }[] = [
  { type: 'virtual', min: 0, label: '虚拟惊喜', icon: '⭐' },
  { type: 'electronic', min: 1500, label: '电子惊喜', icon: '📱' },
  { type: 'physical', min: 3000, label: '实物惊喜', icon: '🎁' },
  { type: 'personalized', min: 5000, label: '个性化惊喜', icon: '💝' },
]

const balanceYuan = computed(() => {
  return (props.pocketMoney / 100).toFixed(2)
})

/** 找到下一个未解锁的档位 */
const nextThreshold = computed(() => {
  for (const t of thresholds) {
    if (props.pocketMoney < t.min)
      return t
  }
  return null
})

/** 当前档位（已解锁的最高档） */
const currentTier = computed(() => {
  let current = thresholds[0]
  for (const t of thresholds) {
    if (props.pocketMoney >= t.min)
      current = t
  }
  return current
})

/** 进度百分比（向下一档的进度） */
const progress = computed(() => {
  if (!nextThreshold.value)
    return 100

  const prevMin = currentTier.value.min
  const nextMin = nextThreshold.value.min
  const range = nextMin - prevMin
  if (range <= 0)
    return 100

  const current = props.pocketMoney - prevMin
  return Math.min(100, Math.max(0, (current / range) * 100))
})

/** 角色台词随进度变化 */
const characterLine = computed(() => {
  const p = progress.value
  if (!nextThreshold.value)
    return '嘿嘿，准备了一个小惊喜...'
  if (p < 30)
    return '在攒零花钱呢~'
  if (p < 60)
    return '快攒够啦!'
  if (p < 90)
    return '还差一点点就能给你买东西啦~'
  return '嘿嘿，准备了一个小惊喜...'
})

/** 下一档所需金额（元） */
const nextAmountYuan = computed(() => {
  if (!nextThreshold.value)
    return null
  return (nextThreshold.value.min / 100).toFixed(0)
})
</script>

<template>
  <div
    flex="~ col gap-2"
    w-full rounded-2xl p-4
    class="bg-gradient-to-br from-amber-500/8 to-pink-500/8 dark:from-amber-700/15 dark:to-pink-700/15 border border-solid border-amber-200/30 dark:border-amber-700/30"
  >
    <!-- Header -->
    <div flex items-center justify-between>
      <div flex items-center gap-2>
        <div i-lucide-piggy-bank text-amber-500 text-lg />
        <span text="sm neutral-700 dark:neutral-200" font-semibold>
          {{ characterName }}的零花钱
        </span>
      </div>
      <span text="lg amber-600 dark:amber-300" font-bold>
        {{ balanceYuan }}元
      </span>
    </div>

    <!-- Tier progress dots -->
    <div flex items-center gap-1 px-1>
      <template v-for="(t, idx) in thresholds" :key="t.type">
        <div
          flex items-center justify-center
          w-6 h-6 rounded-full
          :class="[
            pocketMoney >= t.min
              ? 'bg-amber-500/20 dark:bg-amber-600/30'
              : 'bg-neutral-200/60 dark:bg-neutral-700/40',
          ]"
        >
          <span text="xs" :class="pocketMoney >= t.min ? 'opacity-100' : 'opacity-40'">
            {{ t.icon }}
          </span>
        </div>
        <div
          v-if="idx < thresholds.length - 1"
          flex-1 h-0.5 rounded-full
          :class="[
            pocketMoney >= thresholds[idx + 1].min
              ? 'bg-amber-400/60 dark:bg-amber-500/50'
              : 'bg-neutral-200/60 dark:bg-neutral-700/40',
          ]"
        />
      </template>
    </div>

    <!-- Progress bar to next tier -->
    <div v-if="nextThreshold" flex="~ col gap-1">
      <div flex items-center justify-between>
        <span text="xs neutral-500 dark:neutral-400">
          距{{ nextThreshold.label }}
        </span>
        <span text="xs neutral-400 dark:neutral-500">
          {{ nextAmountYuan }}元
        </span>
      </div>
      <div
        relative h-1.5 w-full overflow-hidden rounded-full
        class="bg-neutral-200/60 dark:bg-neutral-700/40"
      >
        <div
          absolute left-0 top-0 h-full rounded-full
          bg="gradient-to-r from-amber-400 to-pink-400 dark:from-amber-500 dark:to-pink-500"
          transition="width duration-500 ease-out"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <!-- All unlocked -->
    <div v-else flex items-center gap-1 justify-center>
      <div i-lucide-sparkles text-amber-500 text-xs />
      <span text="xs amber-600 dark:amber-400" font-medium>
        全部档位已解锁
      </span>
    </div>

    <!-- Character line -->
    <div
      flex items-center gap-2
      rounded-lg px-3 py-2
      class="bg-white/50 dark:bg-neutral-800/50"
    >
      <div
        w-6 h-6 rounded-full
        class="bg-primary-100 dark:bg-primary-900/40"
        flex items-center justify-center
        flex-shrink-0
      >
        <div i-lucide-message-circle text-primary-500 text="xs" />
      </div>
      <p text="xs neutral-600 dark:neutral-300" class="character-line">
        {{ characterLine }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.character-line {
  animation: line-fade-in 0.5s ease-out both;
}

@keyframes line-fade-in {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
