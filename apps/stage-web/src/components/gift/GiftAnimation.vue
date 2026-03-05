<script setup lang="ts">
import { computed, watch, ref, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  count?: number
  show?: boolean
}>(), {
  count: 5,
  show: false,
})

interface Particle {
  id: number
  x: number
  delay: number
  size: number
  duration: number
}

const particles = ref<Particle[]>([])
let nextId = 0
let cleanupTimer: ReturnType<typeof setTimeout> | undefined

const activeParticles = computed(() => particles.value)

function spawnParticles() {
  const newParticles: Particle[] = []
  const particleCount = Math.min(props.count, 12)

  for (let i = 0; i < particleCount; i++) {
    newParticles.push({
      id: nextId++,
      x: 30 + Math.random() * 40, // 30%-70% horizontal range
      delay: i * 0.08 + Math.random() * 0.15,
      size: 16 + Math.random() * 12,
      duration: 1.2 + Math.random() * 0.6,
    })
  }

  particles.value = [...particles.value, ...newParticles]

  // Cleanup after animation completes
  if (cleanupTimer) clearTimeout(cleanupTimer)
  cleanupTimer = setTimeout(() => {
    particles.value = []
  }, 2500)
}

watch(() => props.show, (val) => {
  if (val) {
    spawnParticles()
  }
})

onUnmounted(() => {
  if (cleanupTimer) clearTimeout(cleanupTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="activeParticles.length > 0"
      fixed inset-0 z-99 pointer-events-none
    >
      <div
        v-for="particle in activeParticles"
        :key="particle.id"
        absolute
        class="gift-particle"
        :style="{
          left: `${particle.x}%`,
          bottom: '10%',
          fontSize: `${particle.size}px`,
          animationDelay: `${particle.delay}s`,
          animationDuration: `${particle.duration}s`,
        }"
      >
        <svg
          :width="particle.size"
          :height="particle.size"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gift-particle {
  animation: fly-up var(--duration, 1.5s) cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  color: #f472b6;
  filter: drop-shadow(0 0 4px rgba(244, 114, 182, 0.5));
  will-change: transform, opacity;
}

.gift-particle:nth-child(2n) {
  color: #fb7185;
}

.gift-particle:nth-child(3n) {
  color: #f9a8d4;
}

.gift-particle:nth-child(4n) {
  color: #c084fc;
}

@keyframes fly-up {
  0% {
    transform: translateY(0) scale(0.3) rotate(0deg);
    opacity: 0;
  }
  15% {
    opacity: 1;
    transform: translateY(-10vh) scale(1) rotate(-15deg);
  }
  50% {
    opacity: 1;
    transform: translateY(-40vh) scale(0.9) rotate(10deg);
  }
  85% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-70vh) scale(0.4) rotate(-20deg);
    opacity: 0;
  }
}
</style>
