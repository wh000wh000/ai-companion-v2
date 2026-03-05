<script setup lang="ts">
import type { SurpriseRecord, SurpriseStatus, SurpriseType } from '../../stores/surprise'
import { computed } from 'vue'

const props = defineProps<{
  surprise: SurpriseRecord
}>()

const emit = defineEmits<{
  'click': [surprise: SurpriseRecord]
}>()

const typeIcon = computed(() => {
  const icons: Record<SurpriseType, string> = {
    virtual: 'i-lucide-star',
    electronic: 'i-lucide-smartphone',
    physical: 'i-lucide-gift',
    personalized: 'i-lucide-heart',
  }
  return icons[props.surprise.type] || 'i-lucide-sparkles'
})

const typeLabel = computed(() => {
  const labels: Record<SurpriseType, string> = {
    virtual: '虚拟',
    electronic: '电子',
    physical: '实物',
    personalized: '个性化',
  }
  return labels[props.surprise.type] || '惊喜'
})

const typeColor = computed(() => {
  const colors: Record<SurpriseType, string> = {
    virtual: 'text-amber-500',
    electronic: 'text-blue-500',
    physical: 'text-pink-500',
    personalized: 'text-rose-500',
  }
  return colors[props.surprise.type] || 'text-neutral-500'
})

const typeBg = computed(() => {
  const bgs: Record<SurpriseType, string> = {
    virtual: 'bg-amber-500/10 dark:bg-amber-700/20',
    electronic: 'bg-blue-500/10 dark:bg-blue-700/20',
    physical: 'bg-pink-500/10 dark:bg-pink-700/20',
    personalized: 'bg-rose-500/10 dark:bg-rose-700/20',
  }
  return bgs[props.surprise.type] || 'bg-neutral-100 dark:bg-neutral-800'
})

const statusConfig = computed(() => {
  const configs: Record<SurpriseStatus, { label: string, classes: string }> = {
    pending: {
      label: '待发送',
      classes: 'bg-neutral-200/60 dark:bg-neutral-700/60 text-neutral-500 dark:text-neutral-400',
    },
    sent: {
      label: '已发送',
      classes: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    },
    clicked: {
      label: '已查看',
      classes: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    },
    completed: {
      label: '已完成',
      classes: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    },
  }
  return configs[props.surprise.status] || configs.pending
})

const formattedAmount = computed(() => {
  return (props.surprise.amount / 100).toFixed(2)
})

const relativeTime = computed(() => {
  const now = Date.now()
  const created = new Date(props.surprise.createdAt).getTime()
  const diff = now - created
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1)
    return '刚刚'
  if (minutes < 60)
    return `${minutes}分钟前`
  if (hours < 24)
    return `${hours}小时前`
  if (days < 30)
    return `${days}天前`
  return `${Math.floor(days / 30)}个月前`
})

function handleClick() {
  if (props.surprise.productUrl) {
    window.open(props.surprise.productUrl, '_blank', 'noopener,noreferrer')
  }
  else {
    emit('click', props.surprise)
  }
}
</script>

<template>
  <div
    flex="~ col gap-3"
    rounded-2xl p-4
    bg="white dark:neutral-900"
    shadow="sm"
    transition="all duration-200"
    hover="shadow-md"
    cursor-pointer
    class="surprise-card border border-solid border-neutral-200/40 dark:border-neutral-700/40"
    @click="handleClick"
  >
    <!-- Header: type + status + time -->
    <div flex items-center justify-between>
      <div flex items-center gap-2>
        <div
          flex items-center justify-center
          w-8 h-8 rounded-full
          :class="typeBg"
        >
          <div :class="[typeIcon, typeColor]" text-base />
        </div>
        <span text="sm neutral-800 dark:neutral-100" font-medium>
          {{ typeLabel }}
        </span>
      </div>
      <div flex items-center gap-2>
        <span
          rounded-full px-2 py-0.5
          text="xs" font-medium
          :class="statusConfig.classes"
        >
          {{ statusConfig.label }}
        </span>
        <span text="xs neutral-400 dark:neutral-500">
          {{ relativeTime }}
        </span>
      </div>
    </div>

    <!-- Product info -->
    <div flex items-center gap-3>
      <div flex="~ 1 col gap-0.5">
        <span text="base neutral-800 dark:neutral-100" font-semibold>
          {{ surprise.productName }}
        </span>
        <span text="sm pink-500 dark:pink-400" font-medium>
          {{ formattedAmount }}元
        </span>
      </div>
    </div>

    <!-- Character message bubble -->
    <div
      v-if="surprise.message"
      relative rounded-xl p-3
      class="bg-primary-50/60 dark:bg-primary-900/20 border border-solid border-primary-200/30 dark:border-primary-700/30"
    >
      <div
        absolute top="-1.5" left-3
        w-3 h-3 rotate-45
        class="bg-primary-50/60 dark:bg-primary-900/20 border-l border-t border-solid border-primary-200/30 dark:border-primary-700/30"
      />
      <p text="sm neutral-600 dark:neutral-300" leading-relaxed>
        {{ surprise.message }}
      </p>
    </div>

    <!-- Click hint -->
    <div
      v-if="surprise.productUrl"
      flex items-center gap-1
      text="xs primary-500 dark:primary-400"
    >
      <div i-lucide-external-link text-xs />
      <span>点击查看详情</span>
    </div>
  </div>
</template>

<style scoped>
.surprise-card {
  animation: card-in 0.3s ease-out both;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
