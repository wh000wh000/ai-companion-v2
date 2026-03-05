<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  demoStats: {
    chatCount: number
    trustGained: number
    surpriseReceived: number
  }
}>()

const emit = defineEmits<{
  'convert': []
  'dismiss': []
}>()

const visible = defineModel<boolean>('visible', { default: true })

interface StatItem {
  icon: string
  iconColor: string
  label: string
  value: string
}

const stats = computed<StatItem[]>(() => [
  {
    icon: 'i-lucide-message-circle',
    iconColor: 'text-blue-500',
    label: '对话轮数',
    value: `${props.demoStats.chatCount} 轮`,
  },
  {
    icon: 'i-lucide-heart',
    iconColor: 'text-pink-500',
    label: '获得信赖值',
    value: `${props.demoStats.trustGained.toLocaleString('zh-CN')} 点`,
  },
  {
    icon: 'i-lucide-sparkles',
    iconColor: 'text-amber-500',
    label: '收到惊喜',
    value: `${props.demoStats.surpriseReceived} 次`,
  },
])

function handleConvert() {
  emit('convert')
}

function handleDismiss() {
  visible.value = false
  emit('dismiss')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="conversion">
      <div
        v-if="visible"
        fixed inset-0 z-100 flex items-center justify-center
        @click.self="handleDismiss"
      >
        <!-- Backdrop -->
        <div
          absolute inset-0 bg="black/50"
          backdrop-blur-sm
          @click="handleDismiss"
        />

        <!-- Card -->
        <div
          relative z-1 mx-4 w-full max-w-sm
          bg="white dark:neutral-900"
          rounded-2xl shadow-2xl
          overflow-hidden
          class="conversion-card"
        >
          <!-- Header gradient -->
          <div
            relative px-6 pt-8 pb-6
            bg="gradient-to-br from-pink-500/15 via-purple-500/10 to-blue-500/15 dark:from-pink-700/25 dark:via-purple-700/15 dark:to-blue-700/20"
          >
            <div flex="~ col items-center" text-center>
              <!-- Icon -->
              <div
                w-14 h-14 rounded-full mb-3
                bg="white/80 dark:neutral-800/80"
                flex items-center justify-center
                shadow-lg
              >
                <div i-lucide-heart text="2xl pink-500" />
              </div>

              <h2
                text="xl neutral-800 dark:neutral-100"
                font-bold mb-1
              >
                7天体验结束
              </h2>
              <p text="sm neutral-500 dark:neutral-400">
                你和TA的故事才刚刚开始...
              </p>
            </div>
          </div>

          <!-- Stats -->
          <div px-6 py-4>
            <div
              text="xs neutral-400 dark:neutral-500"
              font-medium mb-3 uppercase tracking-wider
            >
              体验数据回顾
            </div>
            <div flex="~ col gap-2.5">
              <div
                v-for="stat in stats"
                :key="stat.label"
                flex="~ items-center gap-3"
                rounded-xl p-3
                bg="neutral-50/80 dark:neutral-800/50"
                border="1 solid neutral-200/30 dark:neutral-700/30"
              >
                <div
                  flex items-center justify-center
                  w-9 h-9 rounded-lg
                  bg="neutral-100 dark:neutral-700/50"
                  shrink-0
                >
                  <div :class="[stat.icon, stat.iconColor]" text-lg />
                </div>
                <span text="sm neutral-600 dark:neutral-300" flex-1>
                  {{ stat.label }}
                </span>
                <span text="sm neutral-800 dark:neutral-100" font-bold>
                  {{ stat.value }}
                </span>
              </div>
            </div>
          </div>

          <!-- Conversion benefits -->
          <div px-6 pb-4>
            <div
              rounded-xl p-4
              bg="gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-700/15 dark:to-orange-700/15"
              border="1 solid amber-300/30 dark:amber-700/30"
            >
              <div flex="~ items-center gap-2" mb-2>
                <div i-lucide-zap text="amber-500" />
                <span text="sm amber-700 dark:amber-200" font-bold>
                  限时转化优惠
                </span>
              </div>
              <div flex="~ col gap-1.5">
                <div flex="~ items-center gap-2">
                  <div i-lucide-check text="xs green-500" />
                  <span text="xs neutral-600 dark:neutral-300">
                    首次充值爱心币翻倍！
                  </span>
                </div>
                <div flex="~ items-center gap-2">
                  <div i-lucide-check text="xs green-500" />
                  <span text="xs neutral-600 dark:neutral-300">
                    保留 100 信赖值，Lv.2 起步
                  </span>
                </div>
                <div flex="~ items-center gap-2">
                  <div i-lucide-check text="xs green-500" />
                  <span text="xs neutral-600 dark:neutral-300">
                    赠送 100 爱心币新手礼包
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div flex="~ col gap-2" px-6 pb-6>
            <button
              w-full rounded-xl py-3.5
              bg="gradient-to-r from-pink-500 to-purple-500"
              text="white" font-bold
              shadow-lg shadow-pink-500/25
              transition="all duration-200"
              hover:shadow-xl hover:shadow-pink-500/35
              active:scale-98
              @click="handleConvert"
            >
              正式成为伙伴
            </button>
            <button
              w-full rounded-xl py-2.5
              bg="transparent hover:neutral-100/50 dark:hover:neutral-800/50"
              text="sm neutral-400 dark:neutral-500 hover:neutral-600 dark:hover:neutral-300"
              transition-colors
              @click="handleDismiss"
            >
              再想想
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.conversion-enter-active,
.conversion-leave-active {
  transition: all 0.35s ease;
}

.conversion-enter-active .conversion-card,
.conversion-leave-active .conversion-card {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
}

.conversion-enter-from,
.conversion-leave-to {
  opacity: 0;
}

.conversion-enter-from .conversion-card {
  transform: translateY(40px) scale(0.9);
  opacity: 0;
}

.conversion-leave-to .conversion-card {
  transform: translateY(-20px) scale(0.95);
  opacity: 0;
}
</style>
