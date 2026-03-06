<!-- 安静陪伴模式 — 全屏沉浸式陪伴，呼吸感光晕 -->
<script setup lang="ts">
import { ref, watch } from 'vue'

import HandwrittenCard from './HandwrittenCard.vue'

const props = defineProps<{
  show: boolean
  characterName: string
}>()

// 可选的文字输入
const inputText = ref('')

// 延迟显示的便签卡片
const showCard = ref(false)
let cardTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.show, (val) => {
  if (val) {
    showCard.value = false
    // 2-3分钟后可能滑入HandwrittenCard（取随机值）
    const delay = (120 + Math.floor(Math.random() * 60)) * 1000
    cardTimer = setTimeout(() => {
      showCard.value = true
    }, delay)
  }
  else {
    showCard.value = false
    if (cardTimer) {
      clearTimeout(cardTimer)
      cardTimer = null
    }
  }
})

function handleCardAction() {
  showCard.value = false
  // 此处可扩展：触发具体行为
}

function handleCardDismiss() {
  showCard.value = false
}
</script>

<template>
  <Transition name="quiet-fade">
    <div
      v-if="show"
      fixed inset-0 z-150
      flex="~ col items-center justify-center"
      class="quiet-bg"
    >
      <!-- 呼吸感光晕 -->
      <div class="glow-orb glow-orb-1" />
      <div class="glow-orb glow-orb-2" />

      <!-- 中央内容 -->
      <div
        flex="~ col items-center gap-4"
        relative z-1
        text-center
        px-6
      >
        <!-- 角色名 -->
        <span
          text="lg warm-gray-300"
          font-light tracking-widest
          class="handwriting-font"
        >
          {{ characterName }}
        </span>

        <!-- 陪伴提示语 -->
        <p
          text="sm warm-gray-500"
          font-light
          leading-relaxed
          class="companion-text"
        >
          {{ characterName }}在旁边安静地陪着你
        </p>
      </div>

      <!-- 底部输入框(可选) -->
      <div
        absolute bottom-12 left-0 right-0
        flex justify-center
        px-8
      >
        <div
          relative
          max-w-sm w-full
        >
          <input
            v-model="inputText"
            type="text"
            placeholder="想说什么就说..."
            w-full
            rounded-xl
            px-4 py-3
            bg="white/8"
            text="sm warm-gray-400"
            class="placeholder-warm-gray-600"
            border="1 solid warm-gray-700/30"
            outline-none
            class="quiet-input"
          >
        </div>
      </div>

      <!-- 延迟滑入的手写卡片 -->
      <HandwrittenCard
        :show="showCard"
        :message="`${characterName}想起一件事想告诉你。`"
        action-text="听听看"
        :character-name="characterName"
        @action="handleCardAction"
        @dismiss="handleCardDismiss"
      />
    </div>
  </Transition>
</template>

<style scoped>
/* 手写体 */
.handwriting-font {
  font-family: 'STKaiti', 'KaiTi', 'STSong', 'SimSun', cursive;
}

/* 全屏暖灰背景 */
.quiet-bg {
  background: #1c1a17;
}

/* 呼吸感光晕 */
.glow-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(80px);
}

.glow-orb-1 {
  width: 300px;
  height: 300px;
  top: 35%;
  left: 50%;
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(180, 140, 80, 0.12) 0%, transparent 70%);
  animation: breathe 6s ease-in-out infinite;
}

.glow-orb-2 {
  width: 200px;
  height: 200px;
  top: 40%;
  left: 45%;
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(160, 120, 90, 0.08) 0%, transparent 70%);
  animation: breathe 6s ease-in-out 3s infinite;
}

@keyframes breathe {
  0%, 100% {
    opacity: 0.3;
    transform: translateX(-50%) scale(1);
  }
  50% {
    opacity: 0.5;
    transform: translateX(-50%) scale(1.08);
  }
}

/* 陪伴文字淡入 */
.companion-text {
  animation: text-appear 1.2s ease both;
  animation-delay: 0.5s;
  opacity: 0;
}

@keyframes text-appear {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 输入框样式 */
.quiet-input {
  transition: border-color 0.3s ease, background-color 0.3s ease;
  font-family: inherit;
}

.quiet-input:focus {
  border-color: rgba(180, 140, 80, 0.3);
  background-color: rgba(255, 255, 255, 0.05);
}

.quiet-input::placeholder {
  font-style: italic;
}

/* 页面进出动画 */
.quiet-fade-enter-active {
  transition: opacity 1s ease;
}
.quiet-fade-leave-active {
  transition: opacity 0.6s ease;
}
.quiet-fade-enter-from,
.quiet-fade-leave-to {
  opacity: 0;
}
</style>
