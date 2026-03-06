<!-- 手写风格便签卡片 — 角色在对话中自然递出的纸条 -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  message: string
  actionText: string
  characterName: string
  show: boolean
}>()

const emit = defineEmits<{
  action: []
  dismiss: []
}>()

// 自动淡出计时器
let dismissTimer: ReturnType<typeof setTimeout> | null = null
const visible = ref(false)

// 控制内部可见性，实现滑入动画
watch(() => props.show, (val) => {
  if (val) {
    // 延迟一帧让 DOM 渲染后再触发动画
    requestAnimationFrame(() => {
      visible.value = true
    })
    // 30秒后自动淡出
    dismissTimer = setTimeout(() => {
      handleDismiss()
    }, 30000)
  }
  else {
    visible.value = false
    clearTimer()
  }
})

onMounted(() => {
  if (props.show) {
    requestAnimationFrame(() => {
      visible.value = true
    })
    dismissTimer = setTimeout(() => {
      handleDismiss()
    }, 30000)
  }
})

onUnmounted(() => {
  clearTimer()
})

function clearTimer() {
  if (dismissTimer) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

function handleAction() {
  clearTimer()
  emit('action')
}

function handleDismiss() {
  clearTimer()
  visible.value = false
  // 等淡出动画完成后通知父组件
  setTimeout(() => {
    emit('dismiss')
  }, 600)
}
</script>

<template>
  <Transition name="card-slide">
    <div
      v-if="show"
      fixed bottom-6 left-4 right-4 z-100
      flex justify-center
      pointer-events-none
    >
      <div
        class="handwritten-card"
        :class="{ 'card-visible': visible }"
        max-w-sm w-full
        pointer-events-auto
      >
        <!-- 便签纸主体 -->
        <div
          relative
          rounded-lg px-5 py-4
          bg="amber-50 dark:stone-800"
          class="paper-texture"
        >
          <!-- 角色留言 -->
          <p
            text="base stone-700 dark:stone-200"
            leading-relaxed mb-3
            class="handwriting-font"
          >
            {{ message }}
          </p>

          <!-- 行动按钮 — 手写风格的文字链接 -->
          <div flex items-center justify-between>
            <button
              text="sm amber-700 dark:amber-400"
              class="handwriting-font action-link"
              bg-transparent
              border-none cursor-pointer
              pb-0.5
              @click="handleAction"
            >
              {{ actionText }}
            </button>

            <!-- 角色署名 -->
            <span
              text="xs stone-400 dark:stone-500"
              class="handwriting-font"
            >
              -- {{ characterName }}
            </span>
          </div>

          <!-- 关闭区域(点击卡片空白处忽略) -->
          <button
            absolute top-2 right-2
            w-6 h-6
            flex items-center justify-center
            rounded-full
            bg-transparent
            text="xs stone-300 dark:stone-600"
            border-none cursor-pointer
            class="dismiss-btn"
            @click="handleDismiss"
          >
            <div i-lucide-x w-3 h-3 />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 手写体 */
.handwriting-font {
  font-family: 'STKaiti', 'KaiTi', 'STSong', 'SimSun', cursive;
  letter-spacing: 0.02em;
}

/* 便签纸质感 */
.paper-texture {
  box-shadow:
    0 2px 8px rgba(120, 80, 40, 0.08),
    0 1px 3px rgba(120, 80, 40, 0.06);
  transform: rotate(-0.7deg);
  /* 纸张边缘微妙的不规则感 */
  border: 1px solid rgba(180, 160, 120, 0.15);
}

/* 行动文字的下划线效果 */
.action-link {
  border-bottom: 1px dashed currentColor;
  transition: opacity 0.2s ease;
}

.action-link:hover {
  opacity: 0.7;
}

/* 关闭按钮默认隐藏，悬浮时显示 */
.dismiss-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.handwritten-card:hover .dismiss-btn {
  opacity: 0.6;
}

.dismiss-btn:hover {
  opacity: 1 !important;
}

/* 卡片滑入动画 */
.handwritten-card {
  transform: translateY(40px);
  opacity: 0;
  transition:
    transform 0.8s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.8s ease;
}

.handwritten-card.card-visible {
  transform: translateY(0);
  opacity: 1;
}

/* Vue Transition — 退出动画 */
.card-slide-leave-active {
  transition: opacity 0.6s ease;
}

.card-slide-leave-to {
  opacity: 0;
}

/* 深色模式下的纸张质感调整 */
:root.dark .paper-texture,
.dark .paper-texture {
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.2),
    0 1px 3px rgba(0, 0, 0, 0.15);
  border-color: rgba(100, 90, 70, 0.2);
}
</style>
