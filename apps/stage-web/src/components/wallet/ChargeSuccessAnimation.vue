<!-- G4: 充值成功动画 — 4阶段数字动画：基础到账→赠送叠加→首充翻倍爆发→最终确认 -->
<!-- G17: 首充庆祝动画 — 首充时添加额外的粒子爆发效果（星星emoji） -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  /** 基础爱心币 */
  baseCoins: number
  /** 赠送爱心币 */
  bonusCoins: number
  /** 是否首充（翻倍） */
  isFirstCharge: boolean
}>()

const emit = defineEmits<{
  complete: []
}>()

const show = defineModel<boolean>('show', { default: false })

/** 动画阶段: idle → base → bonus → double → final */
type Phase = 'idle' | 'base' | 'bonus' | 'double' | 'final'
const phase = ref<Phase>('idle')
const displayNumber = ref(0)
let animationFrame = 0
let phaseTimer = 0

// G4: 计算各阶段目标值
const baseTarget = computed(() => props.baseCoins)
const bonusTarget = computed(() => props.baseCoins + props.bonusCoins)
const doubleTarget = computed(() => {
  if (props.isFirstCharge)
    return props.baseCoins * 2 + props.bonusCoins
  return bonusTarget.value
})
// G17: 首充粒子控制
const showParticles = ref(false)

/** 使用 requestAnimationFrame 实现 CountUp 动画（easeOutCubic） */
function animateCount(from: number, to: number, duration: number, onDone?: () => void) {
  const startTime = performance.now()
  const diff = to - from

  function tick(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    // easeOutCubic
    const eased = 1 - (1 - progress) ** 3
    displayNumber.value = Math.round(from + diff * eased)

    if (progress < 1) {
      animationFrame = requestAnimationFrame(tick)
    }
    else {
      displayNumber.value = to
      onDone?.()
    }
  }

  animationFrame = requestAnimationFrame(tick)
}

/** 启动4阶段动画序列，总时长约3秒 */
function startSequence() {
  displayNumber.value = 0
  phase.value = 'base'

  // 阶段1: 基础到账 (0 → baseCoins) 800ms
  animateCount(0, baseTarget.value, 800, () => {
    if (props.bonusCoins > 0) {
      // 阶段2: 赠送叠加 (baseCoins → baseCoins+bonus) 600ms
      phaseTimer = window.setTimeout(() => {
        phase.value = 'bonus'
        animateCount(baseTarget.value, bonusTarget.value, 600, () => {
          proceedToDoubleOrFinal()
        })
      }, 200)
    }
    else {
      proceedToDoubleOrFinal()
    }
  })
}

function proceedToDoubleOrFinal() {
  if (props.isFirstCharge) {
    // 阶段3: 首充翻倍爆发 (bonusTarget → doubleTarget) 800ms
    phaseTimer = window.setTimeout(() => {
      phase.value = 'double'
      // G17: 首充时触发粒子爆发
      showParticles.value = true
      animateCount(bonusTarget.value, doubleTarget.value, 800, () => {
        goFinal()
      })
    }, 200)
  }
  else {
    goFinal()
  }
}

function goFinal() {
  phaseTimer = window.setTimeout(() => {
    phase.value = 'final'
    // 1.5秒后自动关闭
    phaseTimer = window.setTimeout(() => {
      show.value = false
      emit('complete')
    }, 1500)
  }, 300)
}

watch(show, (val) => {
  if (val) {
    startSequence()
  }
  else {
    phase.value = 'idle'
    showParticles.value = false
    cancelAnimationFrame(animationFrame)
    clearTimeout(phaseTimer)
  }
})

onMounted(() => {
  if (show.value)
    startSequence()
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrame)
  clearTimeout(phaseTimer)
})

const phaseLabel = computed(() => {
  switch (phase.value) {
    case 'base': return '基础爱心币到账'
    case 'bonus': return '赠送叠加中...'
    case 'double': return '首充翻倍！'
    case 'final': return '充值成功'
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

        <!-- 数字动画内容 -->
        <div
          relative z-1
          flex="~ col items-center gap-4"
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
              phase === 'double' ? 'bg-amber-500/20 charge-icon-burst' : 'bg-pink-500/15',
              phase === 'final' ? 'bg-green-500/15' : '',
            ]"
          >
            <div
              v-if="phase === 'final'"
              i-lucide-check-circle
              text="3xl green-500"
            />
            <div
              v-else-if="phase === 'double'"
              i-lucide-zap
              text="3xl amber-500"
              class="charge-icon-pulse"
            />
            <div
              v-else
              i-lucide-heart
              text="3xl pink-500"
              class="charge-icon-pulse"
            />
          </div>

          <!-- 阶段标签 -->
          <span
            text="sm"
            font-medium
            :class="[
              phase === 'double' ? 'text-amber-600 dark:text-amber-400' : '',
              phase === 'final' ? 'text-green-600 dark:text-green-400' : '',
              phase !== 'double' && phase !== 'final' ? 'text-neutral-500 dark:text-neutral-400' : '',
            ]"
          >
            {{ phaseLabel }}
          </span>

          <!-- 数字显示 -->
          <div
            text="5xl pink-600 dark:pink-300"
            font-bold tracking-tight
            class="charge-number"
            :class="{
              'charge-number-burst': phase === 'double',
              'charge-number-final': phase === 'final',
            }"
          >
            {{ displayNumber.toLocaleString('zh-CN') }}
          </div>

          <span text="sm neutral-400 dark:neutral-500">
            爱心币
          </span>

          <!-- 首充翻倍明细（阶段3时显示） -->
          <div
            v-if="phase === 'double' || (phase === 'final' && isFirstCharge)"
            text="xs amber-600 dark:amber-400"
            font-medium
            class="charge-detail-fade"
          >
            基础 {{ baseCoins.toLocaleString('zh-CN') }} × 2 + 赠送 {{ bonusCoins.toLocaleString('zh-CN') }}
          </div>

          <!-- 最终确认提示 -->
          <div
            v-if="phase === 'final'"
            text="xs neutral-400 dark:neutral-500"
            mt-2
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

/* 数字跳动 */
.charge-number {
  transition: transform 0.2s ease, color 0.3s ease;
}
.charge-number-burst {
  animation: number-burst 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  color: #d97706; /* amber-600 */
}
.charge-number-final {
  animation: number-final 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  color: #16a34a; /* green-600 */
}

@keyframes number-burst {
  0% { transform: scale(1); }
  40% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
@keyframes number-final {
  0% { transform: scale(1); }
  30% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

/* 图标脉冲 */
.charge-icon-pulse {
  animation: icon-pulse 1s ease-in-out infinite;
}
@keyframes icon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 首充图标爆发 */
.charge-icon-burst {
  animation: icon-burst 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes icon-burst {
  0% { transform: scale(1); }
  30% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

/* 明细淡入 */
.charge-detail-fade {
  animation: detail-fade 0.4s ease both;
}
@keyframes detail-fade {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
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
