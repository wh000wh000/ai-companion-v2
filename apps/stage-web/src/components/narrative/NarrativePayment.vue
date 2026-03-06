<!-- 叙事支付确认页 — 半屏底部抽屉，角色视角的行动确认 -->
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  show: boolean
  type: 'book' | 'gift' | 'care' | 'experience' | 'course'
  characterName: string
  characterQuote: string
  itemEmoji: string
  itemName: string
  itemDescription: string
  amount: number
}>()

const emit = defineEmits<{
  confirm: []
  close: []
}>()

// 按钮文案：不出现"支付""购买"等商业用语
const actionLabel = computed(() => {
  const labels: Record<typeof props.type, string> = {
    book: `让${props.characterName}找到`,
    gift: `让${props.characterName}送出`,
    care: `让${props.characterName}照顾你`,
    experience: `为${props.characterName}安排`,
    course: `和${props.characterName}一起学`,
  }
  return labels[props.type]
})

// 格式化金额
const formattedAmount = computed(() => {
  return props.amount.toFixed(2)
})

function handleConfirm() {
  emit('confirm')
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="payment-drawer">
      <div
        v-if="show"
        fixed inset-0 z-200
        flex items-end justify-center
        @click.self="handleClose"
      >
        <!-- 毛玻璃背景遮罩 -->
        <div
          absolute inset-0
          class="payment-backdrop"
          @click="handleClose"
        />

        <!-- 底部抽屉面板 -->
        <div
          relative z-1 max-w-lg w-full
          bg="white/95 dark:neutral-900/95"
          class="payment-sheet backdrop-blur-xl"
          rounded-t-3xl
        >
          <!-- 拖拽指示条 -->
          <div flex justify-center pt-3 pb-1>
            <div
              h-1 w-8 rounded-full
              bg="stone-200 dark:stone-700"
            />
          </div>

          <!-- 关闭按钮 — 右上角，不显眼 -->
          <button
            absolute top-3 right-4
            w-8 h-8
            flex items-center justify-center
            rounded-full
            bg-transparent
            text="stone-300 dark:stone-600"
            border-none cursor-pointer
            class="close-btn"
            @click="handleClose"
          >
            <div i-lucide-x w-4 h-4 />
          </button>

          <!-- 内容区 -->
          <div flex="~ col" px-6 pb-8 pt-2>
            <!-- 角色的话 -->
            <p
              text="lg stone-600 dark:stone-300"
              text-center
              leading-relaxed
              mb-5
              class="handwriting-font"
            >
              "{{ characterQuote }}"
            </p>

            <!-- 物品展示区 -->
            <div
              flex="~ col items-center gap-2"
              rounded-2xl px-5 py-5 mb-5
              bg="amber-50/60 dark:stone-800/60"
              class="item-card"
            >
              <!-- 物品emoji图标 -->
              <span text-5xl mb-1 class="item-emoji">
                {{ itemEmoji }}
              </span>

              <!-- 物品名称 -->
              <span
                text="base stone-800 dark:stone-100"
                font-medium
              >
                {{ itemName }}
              </span>

              <!-- 物品描述 -->
              <p
                text="sm stone-500 dark:stone-400"
                text-center leading-relaxed
              >
                {{ itemDescription }}
              </p>
            </div>

            <!-- 金额与行动 -->
            <div flex="~ col items-center gap-4">
              <!-- 金额 -->
              <div flex items-baseline gap-1>
                <span text="xs stone-400 dark:stone-500">
                  ¥
                </span>
                <span
                  text="2xl stone-700 dark:stone-200"
                  font-light tracking-tight
                >
                  {{ formattedAmount }}
                </span>
              </div>

              <!-- 行动按钮 — 叙事化文案 -->
              <button
                w-full
                rounded-xl py-3.5
                bg="amber-600 dark:amber-700"
                text="base white"
                font-medium
                border-none cursor-pointer
                class="action-btn"
                transition="all duration-200"
                active="scale-98"
                @click="handleConfirm"
              >
                {{ actionLabel }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 手写体 */
.handwriting-font {
  font-family: 'STKaiti', 'KaiTi', 'STSong', 'SimSun', cursive;
}

/* 毛玻璃背景 */
.payment-backdrop {
  background: rgba(30, 25, 20, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* 物品卡片 — 手绘风格边框 */
.item-card {
  border: 1px dashed rgba(180, 160, 120, 0.25);
}

/* 物品emoji的微妙动效 */
.item-emoji {
  filter: drop-shadow(0 2px 6px rgba(120, 80, 40, 0.12));
}

/* 行动按钮 — 温暖的样式 */
.action-btn {
  box-shadow: 0 2px 12px rgba(180, 120, 40, 0.15);
  letter-spacing: 0.05em;
}

.action-btn:hover {
  box-shadow: 0 4px 16px rgba(180, 120, 40, 0.25);
}

/* 关闭按钮 — 低存在感 */
.close-btn {
  opacity: 0.4;
  transition: opacity 0.2s ease;
}

.close-btn:hover {
  opacity: 0.8;
}

/* 底部抽屉动画 */
.payment-drawer-enter-active {
  transition: opacity 0.35s ease;
}
.payment-drawer-leave-active {
  transition: opacity 0.25s ease;
}
.payment-drawer-enter-from,
.payment-drawer-leave-to {
  opacity: 0;
}

.payment-drawer-enter-active .payment-sheet {
  animation: payment-slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.payment-drawer-leave-active .payment-sheet {
  animation: payment-slide-down 0.3s ease both;
}

@keyframes payment-slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes payment-slide-down {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

.payment-drawer-enter-active .payment-backdrop {
  animation: payment-backdrop-in 0.35s ease both;
}
.payment-drawer-leave-active .payment-backdrop {
  animation: payment-backdrop-out 0.25s ease both;
}

@keyframes payment-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes payment-backdrop-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* 深色模式调整 */
:root.dark .item-card,
.dark .item-card {
  border-color: rgba(100, 90, 70, 0.2);
}
</style>
