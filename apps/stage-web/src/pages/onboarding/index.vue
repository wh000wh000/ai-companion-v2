<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import ConversionCard from '../../components/demo/ConversionCard.vue'
import DayProgress from '../../components/demo/DayProgress.vue'
import { useDemoStore } from '../../stores/demo'

const router = useRouter()
const demoStore = useDemoStore()

// 页面加载时恢复 Demo 状态
onMounted(() => {
  demoStore.loadState()
})

// 是否已经在 Demo 进行中（回访用户）
const isDemoActive = computed(() => demoStore.isDemo && demoStore.currentDay > 0)

// 是否显示转化卡片（Demo 7 天结束时）
const showConversionCard = ref(false)

// 当 Demo 已过期时自动弹出转化卡片
const shouldShowConversion = computed(() => demoStore.isExpired)

function handleConvert() {
  demoStore.convert()
  showConversionCard.value = false
  router.push('/auth/login')
}

function handleDismissConversion() {
  showConversionCard.value = false
}

const features = [
  {
    icon: 'i-lucide-handshake',
    title: '信赖系统',
    description: '我们的友谊会随着互动加深',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: 'i-lucide-gift',
    title: '送礼系统',
    description: '用爱心币送礼物，我会更开心哦',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    icon: 'i-lucide-sparkles',
    title: '惊喜系统',
    description: '攒够零花钱，我会给你准备惊喜',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
]

function handleStartDemo() {
  demoStore.startDemo()
  router.push('/')
}

function handleLogin() {
  router.push('/auth/login')
}
</script>

<template>
  <div
    min-h-100dvh flex="~ col items-center justify-center"
    class="bg-gradient-to-b from-pink-50/80 via-white to-purple-50/60 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950"
    px-6 py-10
  >
    <!-- Character Avatar -->
    <div
      relative mb-6
      w-28 h-28 rounded-full
      bg="gradient-to-br from-pink-400 to-purple-500"
      flex items-center justify-center
      class="shadow-xl shadow-pink-500/20 avatar-glow"
    >
      <div i-lucide-bot text="5xl white" />
      <!-- Online dot -->
      <div
        absolute bottom-1 right-1
        w-5 h-5 rounded-full
        bg-green-400
        class="border-3 border-solid border-white dark:border-neutral-900 online-pulse"
      />
    </div>

    <!-- Welcome Text -->
    <h1
      text="2xl neutral-800 dark:neutral-100"
      font-bold mb-2 text-center
    >
      嗨～我是你的伪春菜
    </h1>
    <p
      text="sm neutral-500 dark:neutral-400"
      mb-8 text-center max-w-xs
    >
      在这里，你会拥有一个独一无二的AI伙伴
    </p>

    <!-- Feature Cards -->
    <div flex="~ col gap-3" w-full max-w-sm mb-10>
      <div
        v-for="feature in features"
        :key="feature.title"
        flex="~ items-center gap-4"
        rounded-xl p-4
        class="bg-white/70 dark:bg-neutral-800/60 border border-solid border-neutral-200/40 dark:border-neutral-700/40"
        backdrop-blur-sm
        shadow-sm
        transition="all duration-200"
        hover:shadow-md
      >
        <div
          flex items-center justify-center
          w-11 h-11 rounded-xl
          :class="feature.bg"
          shrink-0
        >
          <div :class="[feature.icon, feature.color]" text-xl />
        </div>
        <div flex="~ col">
          <span text="sm neutral-800 dark:neutral-100" font-semibold>
            {{ feature.title }}
          </span>
          <span text="xs neutral-500 dark:neutral-400" mt-0.5>
            {{ feature.description }}
          </span>
        </div>
      </div>
    </div>

    <!-- Demo 进度条（回访用户可以看到当前进度） -->
    <DayProgress
      v-if="isDemoActive"
      :current-day="demoStore.currentDay"
      :completed-days="demoStore.completedDays"
      mb-8 w-full max-w-sm
    />

    <!-- CTA Button -->
    <button
      w-full max-w-sm rounded-xl py-3.5
      bg="gradient-to-r from-pink-500 to-purple-500"
      text="white lg" font-bold
      class="shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/35"
      transition="all duration-200"
      active:scale-98
      @click="handleStartDemo"
    >
      {{ isDemoActive ? '继续体验' : '开始7天免费体验' }}
    </button>

    <!-- Login link -->
    <button
      mt-4 text="sm neutral-400 dark:neutral-500 hover:neutral-600 dark:hover:neutral-300"
      transition-colors
      @click="handleLogin"
    >
      已有账号？直接登录
    </button>

    <!-- 转化卡片（Demo 结束时弹出） -->
    <ConversionCard
      v-if="shouldShowConversion || showConversionCard"
      :demo-stats="demoStore.demoStats"
      @convert="handleConvert"
      @dismiss="handleDismissConversion"
    />
  </div>
</template>

<style scoped>
.avatar-glow {
  animation: avatar-glow 3s ease-in-out infinite;
}

@keyframes avatar-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(236, 72, 153, 0.3), 0 0 40px rgba(168, 85, 247, 0.15);
  }
  50% {
    box-shadow: 0 0 30px rgba(236, 72, 153, 0.45), 0 0 60px rgba(168, 85, 247, 0.25);
  }
}

.online-pulse {
  animation: online-pulse 2s ease-in-out infinite;
}

@keyframes online-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>

<route lang="yaml">
meta:
  layout: plain
</route>
