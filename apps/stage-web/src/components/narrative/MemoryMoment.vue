<!-- 记忆瞬间卡片 — 老照片/明信片风格，承载对话记忆 -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  date: string
  summary: string
  characterNote: string
  show: boolean
}>()

const emit = defineEmits<{
  save: []
  dismiss: []
}>()

const visible = ref(false)

// 解析日期为"X月X日"格式
const formattedDate = computed(() => {
  try {
    const d = new Date(props.date)
    if (Number.isNaN(d.getTime())) {
      return props.date
    }
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }
  catch {
    return props.date
  }
})

watch(() => props.show, (val) => {
  if (val) {
    requestAnimationFrame(() => {
      visible.value = true
    })
  }
  else {
    visible.value = false
  }
})

function handleSave() {
  emit('save')
}

function handleDismiss() {
  visible.value = false
  setTimeout(() => {
    emit('dismiss')
  }, 600)
}
</script>

<template>
  <Transition name="memory-fade">
    <div
      v-if="show"
      fixed inset-0 z-150
      flex items-center justify-center
      px-6
      @click.self="handleDismiss"
    >
      <!-- 半透明背景 -->
      <div
        absolute inset-0
        class="memory-backdrop"
        @click="handleDismiss"
      />

      <!-- 明信片主体 -->
      <div
        class="memory-card"
        :class="{ 'card-visible': visible }"
        relative z-1
        max-w-sm w-full
      >
        <div
          relative
          rounded-lg overflow-hidden
          class="postcard"
        >
          <!-- 泛黄滤镜层 -->
          <div absolute inset-0 class="aged-overlay" pointer-events-none z-2 />

          <!-- 内容层 -->
          <div
            relative z-1
            bg="amber-50 dark:stone-800"
            px-5 py-5
          >
            <!-- 日期标注 -->
            <div flex items-center gap-2 mb-4>
              <div
                h-px flex-1
                bg="stone-300/40 dark:stone-600/40"
              />
              <span
                text="xs stone-400 dark:stone-500"
                font-light tracking-wider
              >
                {{ formattedDate }}
              </span>
              <div
                h-px flex-1
                bg="stone-300/40 dark:stone-600/40"
              />
            </div>

            <!-- 对话摘要 -->
            <div
              mb-4 px-2
            >
              <p
                text="sm stone-600 dark:stone-300"
                leading-relaxed
                class="summary-text"
              >
                {{ summary }}
              </p>
            </div>

            <!-- 分隔线 -->
            <div
              h-px mx-2 mb-3
              bg="stone-200/60 dark:stone-700/40"
            />

            <!-- 角色批注(手写风格) -->
            <p
              text="sm amber-700 dark:amber-500"
              leading-relaxed
              px-2 mb-4
              class="handwriting-font character-note"
            >
              {{ characterNote }}
            </p>

            <!-- 底部操作区 -->
            <div flex items-center justify-between px-1>
              <!-- "留住这个瞬间" -->
              <button
                bg-transparent border-none cursor-pointer
                text="xs stone-400 dark:stone-500"
                class="save-link"
                @click="handleSave"
              >
                留住这个瞬间
              </button>

              <!-- 关闭 -->
              <button
                bg-transparent border-none cursor-pointer
                w-6 h-6
                flex items-center justify-center
                text="stone-300 dark:stone-600"
                class="dismiss-btn"
                @click="handleDismiss"
              >
                <div i-lucide-x w-3 h-3 />
              </button>
            </div>
          </div>
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

/* 明信片纸张效果 */
.postcard {
  box-shadow:
    0 4px 16px rgba(120, 80, 40, 0.1),
    0 1px 4px rgba(120, 80, 40, 0.08);
  transform: rotate(0.5deg);
  border: 1px solid rgba(180, 160, 120, 0.2);
}

/* 泛黄老照片滤镜 */
.aged-overlay {
  background: linear-gradient(
    135deg,
    rgba(180, 150, 80, 0.06) 0%,
    rgba(160, 130, 70, 0.03) 50%,
    rgba(140, 110, 60, 0.08) 100%
  );
}

/* 摘要文字的排版 */
.summary-text {
  text-indent: 2em;
  line-height: 1.8;
}

/* 角色批注的手写感 */
.character-note {
  transform: rotate(-0.3deg);
  position: relative;
}

.character-note::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(180, 140, 80, 0.2);
  border-radius: 1px;
}

/* "留住这个瞬间"文字效果 */
.save-link {
  transition: color 0.2s ease;
  letter-spacing: 0.08em;
}

.save-link:hover {
  color: rgba(180, 140, 80, 0.8);
}

/* 关闭按钮 */
.dismiss-btn {
  opacity: 0.4;
  transition: opacity 0.2s ease;
}

.dismiss-btn:hover {
  opacity: 0.8;
}

/* 半透明背景 */
.memory-backdrop {
  background: rgba(20, 18, 15, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* 卡片进入动画 */
.memory-card {
  transform: scale(0.92) translateY(20px);
  opacity: 0;
  transition:
    transform 0.8s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.8s ease;
}

.memory-card.card-visible {
  transform: scale(1) translateY(0) rotate(0.5deg);
  opacity: 1;
}

/* Vue Transition */
.memory-fade-enter-active {
  transition: opacity 0.6s ease;
}
.memory-fade-leave-active {
  transition: opacity 0.5s ease;
}
.memory-fade-enter-from,
.memory-fade-leave-to {
  opacity: 0;
}

.memory-fade-enter-active .memory-backdrop {
  animation: memory-bg-in 0.6s ease both;
}
.memory-fade-leave-active .memory-backdrop {
  animation: memory-bg-out 0.5s ease both;
}

@keyframes memory-bg-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes memory-bg-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* 深色模式 */
:root.dark .postcard,
.dark .postcard {
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.25),
    0 1px 4px rgba(0, 0, 0, 0.15);
  border-color: rgba(100, 90, 70, 0.2);
}

:root.dark .aged-overlay,
.dark .aged-overlay {
  background: linear-gradient(
    135deg,
    rgba(80, 60, 30, 0.08) 0%,
    rgba(60, 50, 25, 0.04) 50%,
    rgba(50, 40, 20, 0.1) 100%
  );
}

:root.dark .character-note::before,
.dark .character-note::before {
  background: rgba(140, 110, 60, 0.15);
}
</style>
