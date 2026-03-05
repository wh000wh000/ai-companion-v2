<script setup lang="ts">
import { computed, watch, ref, onUnmounted } from 'vue'
import { TRUST_LEVEL_NAMES } from '../../stores/trust'

const props = withDefaults(defineProps<{
  fromLevel?: number
  toLevel?: number
}>(), {
  fromLevel: 1,
  toLevel: 2,
})

const show = defineModel<boolean>('show', { default: false })

const levelName = computed(() => TRUST_LEVEL_NAMES[props.toLevel] ?? '未知')

const unlockHints: Record<number, string> = {
  2: '角色现在会记住你的名字了！',
  3: '角色会记住你的喜好，新服装解锁！',
  4: '角色愿意和你分享心事了~',
  5: '解锁专属昵称和虚拟惊喜！',
  6: '角色现在能猜到你的心情了~',
  7: '语音消息和高级服装解锁！',
  8: '角色会用零花钱给你买实物惊喜！',
  9: '角色会记住你们所有的重要日子~',
  10: '恭喜！解锁全部功能和独特互动方式！',
}

const unlockText = computed(() => unlockHints[props.toLevel] ?? '新的互动方式已解锁！')

interface Star {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
}

const stars = ref<Star[]>([])
let autoCloseTimer: ReturnType<typeof setTimeout> | undefined

function generateStars() {
  const result: Star[] = []
  for (let i = 0; i < 20; i++) {
    result.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 8,
      delay: Math.random() * 0.8,
      duration: 0.8 + Math.random() * 1.2,
    })
  }
  stars.value = result
}

function dismiss() {
  show.value = false
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = undefined
  }
}

watch(show, (val) => {
  if (val) {
    generateStars()
    autoCloseTimer = setTimeout(() => {
      show.value = false
    }, 4000)
  }
  else {
    stars.value = []
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer)
      autoCloseTimer = undefined
    }
  }
})

onUnmounted(() => {
  if (autoCloseTimer) clearTimeout(autoCloseTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ceremony">
      <div
        v-if="show"
        fixed inset-0 z-200
        flex items-center justify-center
        @click="dismiss"
      >
        <!-- Backdrop -->
        <div absolute inset-0 bg="black/60" class="ceremony-backdrop" />

        <!-- Stars -->
        <div absolute inset-0 overflow-hidden pointer-events-none>
          <div
            v-for="star in stars"
            :key="star.id"
            absolute
            class="ceremony-star"
            :style="{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }"
          />
        </div>

        <!-- Content -->
        <div
          relative z-1 flex flex-col items-center gap-4 pointer-events-none
        >
          <!-- Level up text -->
          <div text="sm neutral-300" font-medium class="ceremony-fade-in" tracking-widest uppercase>
            信赖升级
          </div>

          <!-- Level number -->
          <div
            class="ceremony-bounce"
            flex items-center gap-3
          >
            <span text="4xl neutral-400/60" font-bold class="ceremony-fade-in" style="animation-delay: 0.2s">
              Lv.{{ fromLevel }}
            </span>
            <span text="2xl neutral-400/40" class="ceremony-fade-in" style="animation-delay: 0.3s">
              →
            </span>
            <span
              text="6xl"
              font-bold
              class="ceremony-number"
              bg="gradient-to-r from-primary-400 to-pink-400"
              bg-clip-text text-transparent
            >
              Lv.{{ toLevel }}
            </span>
          </div>

          <!-- Level name -->
          <div
            class="ceremony-fade-in"
            style="animation-delay: 0.5s"
            text="2xl white"
            font-bold
          >
            {{ levelName }}
          </div>

          <!-- Unlock text -->
          <div
            class="ceremony-fade-in"
            style="animation-delay: 0.8s"
            text="sm neutral-300"
            max-w-xs text-center
          >
            {{ unlockText }}
          </div>

          <!-- Tap hint -->
          <div
            class="ceremony-fade-in"
            style="animation-delay: 1.2s"
            text="xs neutral-500"
            mt-4
          >
            点击任意处关闭
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ceremony-enter-active {
  transition: opacity 0.3s ease;
}

.ceremony-leave-active {
  transition: opacity 0.5s ease;
}

.ceremony-enter-from,
.ceremony-leave-to {
  opacity: 0;
}

.ceremony-star {
  background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, transparent 70%);
  border-radius: 50%;
  animation: star-burst var(--duration, 1s) ease-out forwards;
  opacity: 0;
}

@keyframes star-burst {
  0% {
    transform: scale(0) rotate(0deg);
    opacity: 0;
  }
  30% {
    opacity: 1;
    transform: scale(1.5) rotate(90deg);
  }
  70% {
    opacity: 0.8;
  }
  100% {
    transform: scale(0.5) rotate(180deg);
    opacity: 0;
  }
}

.ceremony-number {
  animation: level-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s forwards;
  transform: scale(0);
  opacity: 0;
}

@keyframes level-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.3);
    opacity: 1;
  }
  80% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.ceremony-fade-in {
  animation: fade-slide-up 0.5s ease-out forwards;
  opacity: 0;
  transform: translateY(10px);
}

@keyframes fade-slide-up {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ceremony-bounce {
  animation: gentle-bounce 2s ease-in-out infinite;
  animation-delay: 1s;
}

@keyframes gentle-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
</style>
