<!-- G4: 充值成功动画 — 去商业化改造：移除数字展示，用温暖文案替代 -->
<!-- G17: 首充庆祝动画 — 首充时添加额外的粒子爆发效果（星星emoji） -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  /** 基础爱心币（保留接口兼容，不再在UI中展示） */
  baseCoins: number
  /** 赠送爱心币（保留接口兼容，不再在UI中展示） */
  bonusCoins: number
  /** 是否首充（翻倍） */
  isFirstCharge: boolean
}>()

const emit = defineEmits<{
  complete: []
}>()

const show = defineModel<boolean>('show', { default: false })

/** 动画阶段: idle → warmup → final */
type Phase = 'idle' | 'warmup' | 'final'
const phase = ref<Phase>('idle')
let phaseTimer = 0

// G17: 首充粒子控制
const showParticles = ref(false)

/** 启动动画序列 — 简化为2阶段：温暖过渡 → 最终确认 */
function startSequence() {
  phase.value = 'warmup'

  // 首充时触发粒子效果
  if (props.isFirstCharge) {
    showParticles.value = true
  }

  // 1.5秒后进入最终确认
  phaseTimer = window.setTimeout(() => {
    phase.value = 'final'
    // 2秒后自动关闭
    phaseTimer = window.setTimeout(() => {
      show.value = false
      emit('complete')
    }, 2000)
  }, 1500)
}

watch(show, (val) => {
  if (val) {
    startSequence()
  }
  else {
    phase.value = 'idle'
    showParticles.value = false
    clearTimeout(phaseTimer)
  }
})

onMounted(() => {
  if (show.value)
    startSequence()
})

onUnmounted(() => {
  clearTimeout(phaseTimer)
})

const phaseLabel = computed(() => {
  switch (phase.value) {
    case 'warmup': return props.isFirstCharge ? '第一次心意，加倍珍惜' : '心意传递中...'
    case 'final': return '心意已送达'
    default: return ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="charge-overlay">
      <div
        v-if="show"
        fixed inset-0 z-200
        flex="~ col items-center justify-center"
        @click.self="() => { if (phase === 'final') { show = false; emit('complete') } }"
      >
        <!-- 背景遮罩 -->
        <div absolute inset-0 bg="black/60" />

        <!-- G17: 首充粒子爆发效果 -->
        <div v-if="showParticles" pointer-events-none absolute inset-0 overflow-hidden>
          <div
            v-for="i in 20"
            :key="i"
            class="first-charge-particle"
            :style="{
              '--delay': `${i * 0.08}s`,
              '--angle': `${(i / 20) * 360}deg`,
              '--distance': `${100 + (i % 4) * 40}px`,
            }"
          >
            {{ i % 3 === 0 ? '⭐' : i % 3 === 1 ? '✨' : '💛' }}
          </div>
        </div>

        <!-- 温暖内容 — 无数字 -->
        <div
          relative z-1
          flex="~ col items-center gap-5"
          w="80vw" max-w-sm
          rounded-2xl p-8
          bg="white dark:neutral-900"
          shadow-2xl
          class="charge-content"
        >
          <!-- 图标 -->
          <div
            h-16 w-16 flex items-center justify-center rounded-full
            :class="[
              phase === 'final' ? 'bg-green-500/15' : 'bg-pink-500/10',
            ]"
          >
            <div
              v-if="phase === 'final'"
              i-lucide-heart
              text="3xl pink-500"
            />
            <div
              v-else
              i-lucide-sparkles
              text="3xl pink-400"
              class="charge-icon-pulse"
            />
          </div>

          <!-- 温暖文案 -->
          <span
            text="lg"
            font-medium text-center
            :class="[
              phase === 'final' ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-500 dark:text-neutral-400',
            ]"
          >
            {{ phaseLabel }}
          </span>

          <!-- 最终确认的爱心符号 -->
          <div v-if="phase === 'final'" text="2xl" class="heart-appear">
            ♥
          </div>

          <!-- 最终确认提示 -->
          <div
            v-if="phase === 'final'"
            text="xs neutral-400 dark:neutral-500"
          >
            点击任意处关闭
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 入场/退场 */
.charge-overlay-enter-active,
.charge-overlay-leave-active {
  transition: opacity 0.3s ease;
}
.charge-overlay-enter-from,
.charge-overlay-leave-to {
  opacity: 0;
}

/* 内容容器入场 */
.charge-content {
  animation: charge-content-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes charge-content-in {
  from {
    opacity: 0;
    transform: scale(0.85) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 图标脉冲 */
.charge-icon-pulse {
  animation: icon-pulse 1s ease-in-out infinite;
}
@keyframes icon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 爱心出现动画 */
.heart-appear {
  animation: heart-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  color: #ec4899;
}
@keyframes heart-pop {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* G17: 首充粒子爆发 */
.first-charge-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 1.4rem;
  animation: first-charge-burst 1.5s ease-out var(--delay) both;
  pointer-events: none;
}
@keyframes first-charge-burst {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0) scale(0);
  }
  30% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(var(--distance) * -0.7)) scale(1.3);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(var(--distance) * -1.2)) scale(0.4);
  }
}
</style>
