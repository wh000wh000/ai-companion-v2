<script setup lang="ts">
import type { SurpriseRecord, SurpriseType } from '../../stores/surprise'
import { computed, ref, watch } from 'vue'
import { useSurpriseStore } from '../../stores/surprise'

const props = defineProps<{
  surprise: SurpriseRecord
}>()

const show = defineModel<boolean>('show', { default: false })

const emit = defineEmits<{
  'feedback': [feedbackText: string]
}>()

const surpriseStore = useSurpriseStore()

const phase = ref<'enter' | 'open' | 'reveal'>('enter')
const submitting = ref(false)

const effectClass = computed(() => {
  const effects: Record<SurpriseType, string> = {
    virtual: 'effect-stars',
    electronic: 'effect-glow',
    physical: 'effect-unbox',
    personalized: 'effect-hearts',
  }
  return effects[props.surprise.type] || 'effect-stars'
})

const typeEmoji = computed(() => {
  const emojis: Record<SurpriseType, string> = {
    virtual: '⭐',
    electronic: '📱',
    physical: '🎁',
    personalized: '💝',
  }
  return emojis[props.surprise.type] || '🎁'
})

const formattedAmount = computed(() => {
  return (props.surprise.amount / 100).toFixed(2)
})

watch(show, (val) => {
  if (val) {
    phase.value = 'enter'
    setTimeout(() => {
      phase.value = 'open'
    }, 800)
  }
})

function openBox() {
  if (phase.value === 'open') {
    phase.value = 'reveal'
  }
}

async function handleFeedback(feedback: 'love' | 'ok' | 'change') {
  if (submitting.value)
    return
  submitting.value = true

  const feedbackLabels: Record<string, string> = {
    love: 'love',
    ok: 'ok',
    change: 'change',
  }

  try {
    await surpriseStore.submitFeedback(
      props.surprise.id,
      'completed',
      feedbackLabels[feedback],
    )
    emit('feedback', feedbackLabels[feedback])
  }
  finally {
    submitting.value = false
    show.value = false
  }
}

function dismiss() {
  show.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="surprise-overlay">
      <div
        v-if="show"
        fixed inset-0 z-200
        flex items-center justify-center
        @click.self="dismiss"
      >
        <!-- Backdrop -->
        <div absolute inset-0 class="surprise-backdrop bg-black/60" />

        <!-- Effect particles -->
        <div v-if="phase === 'reveal'" absolute inset-0 pointer-events-none :class="effectClass">
          <!-- Stars for virtual -->
          <template v-if="surprise.type === 'virtual'">
            <div v-for="i in 12" :key="i" class="star-particle" :style="{ '--delay': `${i * 0.15}s`, '--x': `${(i % 4 - 1.5) * 80}px`, '--y': `${Math.floor(i / 4 - 1) * -100}px` }">
              ⭐
            </div>
          </template>
          <!-- Glow for electronic -->
          <template v-if="surprise.type === 'electronic'">
            <div class="glow-ring" />
            <div class="glow-ring glow-ring-2" />
          </template>
          <!-- Hearts for personalized -->
          <template v-if="surprise.type === 'personalized'">
            <div v-for="i in 16" :key="i" class="heart-particle" :style="{ '--delay': `${i * 0.1}s`, '--angle': `${(i / 16) * 360}deg`, '--distance': `${100 + (i % 3) * 40}px` }">
              💕
            </div>
          </template>
        </div>

        <!-- Content -->
        <div relative z-1 flex="~ col items-center gap-4" max-w-sm w-full mx-3 sm:mx-4>
          <!-- Gift box phase: enter + open -->
          <div
            v-if="phase !== 'reveal'"
            class="gift-box"
            :class="{ 'gift-box-bounce': phase === 'enter', 'gift-box-shake': phase === 'open' }"
            flex="~ col items-center gap-3"
            cursor-pointer
            @click="openBox"
          >
            <div text-8xl class="gift-emoji">
              {{ typeEmoji }}
            </div>
            <span
              v-if="phase === 'open'"
              text="sm"
              class="tap-hint text-white/80"
            >
              点击打开
            </span>
          </div>

          <!-- Reveal phase -->
          <Transition name="surprise-reveal">
            <div
              v-if="phase === 'reveal'"
              flex="~ col items-center gap-4"
              rounded-2xl p-6
              bg="white dark:neutral-900"
              shadow-2xl
              w-full
              class="surprise-content"
            >
              <!-- Product display -->
              <div text-5xl mb-1>
                {{ typeEmoji }}
              </div>
              <h3 text="xl neutral-800 dark:neutral-100" font-bold text-center>
                {{ surprise.productName }}
              </h3>
              <span text="lg pink-500 dark:pink-400" font-semibold>
                {{ formattedAmount }}元
              </span>

              <!-- Character message -->
              <div
                w-full rounded-xl p-4
                class="bg-primary-50/60 dark:bg-primary-900/20 border border-solid border-primary-200/30 dark:border-primary-700/30"
              >
                <p text="sm neutral-600 dark:neutral-300" leading-relaxed text-center>
                  {{ surprise.message }}
                </p>
              </div>

              <!-- Feedback buttons -->
              <div flex="~ gap-2 sm:gap-3" w-full>
                <button
                  flex="~ 1 col items-center gap-1"
                  rounded-xl py-3
                  class="bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-800/30 border border-solid border-rose-200/40 dark:border-rose-700/40"
                  transition="all duration-200"
                  active="scale-95"
                  :disabled="submitting"
                  @click="handleFeedback('love')"
                >
                  <span text-lg>💕</span>
                  <span text="xs rose-600 dark:rose-400" font-medium>好喜欢</span>
                </button>
                <button
                  flex="~ 1 col items-center gap-1"
                  rounded-xl py-3
                  class="bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 border border-solid border-neutral-200/40 dark:border-neutral-700/40"
                  transition="all duration-200"
                  active="scale-95"
                  :disabled="submitting"
                  @click="handleFeedback('ok')"
                >
                  <span text-lg>😊</span>
                  <span text="xs neutral-600 dark:neutral-400" font-medium>还行</span>
                </button>
                <button
                  flex="~ 1 col items-center gap-1"
                  rounded-xl py-3
                  class="bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 border border-solid border-neutral-200/40 dark:border-neutral-700/40"
                  transition="all duration-200"
                  active="scale-95"
                  :disabled="submitting"
                  @click="handleFeedback('change')"
                >
                  <span text-lg>🤔</span>
                  <span text="xs neutral-600 dark:neutral-400" font-medium>不太合适</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Overlay transitions */
.surprise-overlay-enter-active,
.surprise-overlay-leave-active {
  transition: all 0.4s ease;
}

.surprise-overlay-enter-active .surprise-backdrop,
.surprise-overlay-leave-active .surprise-backdrop {
  transition: opacity 0.4s ease;
}

.surprise-overlay-enter-from .surprise-backdrop,
.surprise-overlay-leave-to .surprise-backdrop {
  opacity: 0;
}

.surprise-overlay-enter-from,
.surprise-overlay-leave-to {
  opacity: 0;
}

/* Reveal transition */
.surprise-reveal-enter-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.surprise-reveal-leave-active {
  transition: all 0.3s ease;
}

.surprise-reveal-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.surprise-reveal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Gift box animations */
.gift-box-bounce {
  animation: box-bounce-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes box-bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(40px);
  }
  50% {
    transform: scale(1.1) translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.gift-box-shake {
  animation: box-shake 0.6s ease-in-out infinite;
}

@keyframes box-shake {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-5deg); }
  40% { transform: rotate(5deg); }
  60% { transform: rotate(-3deg); }
  80% { transform: rotate(3deg); }
}

.gift-emoji {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
}

.tap-hint {
  animation: hint-pulse 1.5s ease-in-out infinite;
}

@keyframes hint-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Star particles */
.star-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 1.5rem;
  animation: star-burst 1.2s ease-out var(--delay) both;
  pointer-events: none;
}

@keyframes star-burst {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0);
  }
  50% {
    opacity: 1;
    transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--x) * 1.5), calc(-50% + var(--y) * 1.5)) scale(0.5);
  }
}

/* Glow effect */
.glow-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  border: 3px solid rgba(96, 165, 250, 0.6);
  transform: translate(-50%, -50%) scale(0);
  animation: glow-expand 1s ease-out both;
  pointer-events: none;
}

.glow-ring-2 {
  animation-delay: 0.3s;
  border-color: rgba(147, 197, 253, 0.4);
}

@keyframes glow-expand {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(3);
    opacity: 0;
  }
}

/* Heart particles */
.heart-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 1.2rem;
  animation: heart-burst 1.5s ease-out var(--delay) both;
  pointer-events: none;
}

@keyframes heart-burst {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0) scale(0);
  }
  40% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(var(--distance) * -0.8)) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(var(--distance) * -1)) scale(0.6);
  }
}

/* Surprise content animation */
.surprise-content {
  animation: content-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes content-reveal {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
