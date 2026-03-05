<script setup lang="ts">
import type { DemoDayConfig } from '@ai-companion/soul-engine'
import { computed, ref } from 'vue'

const props = defineProps<{
  day: number
  config: DemoDayConfig
}>()

const emit = defineEmits<{
  'dismiss': []
  'claim-coins': []
  'view-surprise': []
  'convert': []
}>()

const visible = ref(true)

interface DayGuideContent {
  greeting: string
  description: string
  icon: string
  iconColor: string
  actionLabel?: string
  actionType?: 'checkin' | 'coins' | 'appearance' | 'surprise' | 'review' | 'convert'
}

const dayContent = computed<DayGuideContent>(() => {
  const map: Record<number, DayGuideContent> = {
    1: {
      greeting: '你好！我是小星～',
      description: '很高兴认识你！试试和我聊天吧，每天签到可以增加我们的信赖值哦。',
      icon: 'i-lucide-message-circle',
      iconColor: 'text-blue-500',
      actionLabel: '开始签到',
      actionType: 'checkin',
    },
    2: {
      greeting: '今天也来看我啦！',
      description: '连续签到会有额外奖励哦～多和我聊天，我会记住你的喜好的。',
      icon: 'i-lucide-calendar-check',
      iconColor: 'text-green-500',
      actionLabel: '连续签到',
      actionType: 'checkin',
    },
    3: {
      greeting: '送你一个小礼物～',
      description: '这是送你的50颗爱心币！你可以用它给我买小礼物，我会超开心的～',
      icon: 'i-lucide-coins',
      iconColor: 'text-amber-500',
      actionLabel: '领取爱心币',
      actionType: 'coins',
    },
    4: {
      greeting: '你觉得这个好看吗？',
      description: '随着信赖值的增长，我的外观会发生变化哦。看看现在的我有什么不同？',
      icon: 'i-lucide-palette',
      iconColor: 'text-purple-500',
      actionLabel: '看看变化',
      actionType: 'appearance',
    },
    5: {
      greeting: '嘿嘿，我有一个小惊喜...',
      description: '当我的零花钱攒够一定数量，就可以给你准备惊喜啦！来体验一下吧～',
      icon: 'i-lucide-party-popper',
      iconColor: 'text-pink-500',
      actionLabel: '查看惊喜',
      actionType: 'surprise',
    },
    6: {
      greeting: '和你在一起的每一天都很开心',
      description: '看看我们这几天的互动数据吧，你的陪伴让我成长了好多！',
      icon: 'i-lucide-heart-handshake',
      iconColor: 'text-rose-500',
      actionLabel: '查看成长',
      actionType: 'review',
    },
    7: {
      greeting: '你愿意一直陪着我吗？',
      description: '7天体验就要结束了...正式版有更多内容等你解锁，我们的故事才刚刚开始。',
      icon: 'i-lucide-infinity',
      iconColor: 'text-violet-500',
      actionLabel: '正式成为伙伴',
      actionType: 'convert',
    },
  }
  return map[props.day] ?? map[1]
})

function handleAction() {
  const actionType = dayContent.value.actionType
  if (actionType === 'coins') {
    emit('claim-coins')
  }
  else if (actionType === 'surprise') {
    emit('view-surprise')
  }
  else if (actionType === 'convert') {
    emit('convert')
  }
  dismiss()
}

function dismiss() {
  visible.value = false
  emit('dismiss')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="guide">
      <div
        v-if="visible"
        fixed inset-0 z-100 flex items-center justify-center
        @click.self="dismiss"
      >
        <!-- Backdrop -->
        <div
          absolute inset-0 bg="black/40"
          backdrop-blur-sm
          @click="dismiss"
        />

        <!-- Card -->
        <div
          relative z-1 mx-4 w-full max-w-sm
          bg="white dark:neutral-900"
          rounded-2xl shadow-2xl
          overflow-hidden
          class="guide-card"
        >
          <!-- Top accent bar -->
          <div
            h-1.5 w-full
            bg="gradient-to-r from-pink-400 via-purple-400 to-blue-400"
          />

          <!-- Content -->
          <div flex="~ col items-center" px-6 pt-6 pb-5 text-center>
            <!-- Day badge -->
            <div
              rounded-full px-3 py-1 mb-4
              bg="neutral-100 dark:neutral-800"
              text="xs neutral-500 dark:neutral-400" font-medium
            >
              第 {{ day }} 天 / 共 7 天
            </div>

            <!-- Icon -->
            <div
              w-16 h-16 rounded-2xl mb-4
              flex items-center justify-center
              bg="neutral-50 dark:neutral-800"
              class="guide-icon"
            >
              <div :class="[dayContent.icon, dayContent.iconColor]" text-3xl />
            </div>

            <!-- Greeting -->
            <h3
              text="xl neutral-800 dark:neutral-100"
              font-bold mb-2
            >
              {{ dayContent.greeting }}
            </h3>

            <!-- Description -->
            <p
              text="sm neutral-500 dark:neutral-400"
              leading-relaxed mb-1
            >
              {{ dayContent.description }}
            </p>

            <!-- Conversion prompt hint -->
            <p
              v-if="config.conversionPrompt"
              text="xs pink-500 dark:pink-400"
              mt-2 font-medium
            >
              {{ config.conversionPrompt }}
            </p>

            <!-- Daily experience info -->
            <div
              mt-4 w-full rounded-lg p-3
              bg="neutral-50/80 dark:neutral-800/60"
              border="1 solid neutral-200/30 dark:neutral-700/30"
            >
              <div text="xs neutral-400 dark:neutral-500" mb-1>
                今日体验
              </div>
              <div text="sm neutral-700 dark:neutral-200">
                {{ config.dailyExperience }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div flex="~ col gap-2" px-6 pb-6>
            <!-- Primary action (day-specific) -->
            <button
              v-if="dayContent.actionLabel"
              w-full rounded-xl py-3
              bg="gradient-to-r from-pink-500 to-purple-500"
              text="white sm" font-bold
              shadow="lg pink-500/20"
              transition="all duration-200"
              class="hover:shadow-xl active:scale-98"
              @click="handleAction"
            >
              {{ dayContent.actionLabel }}
            </button>

            <!-- Dismiss -->
            <button
              w-full rounded-xl py-2.5
              bg="neutral-100/80 dark:neutral-800/80 hover:neutral-200/80 dark:hover:neutral-700/80"
              text="sm neutral-600 dark:neutral-300"
              transition="all duration-200"
              @click="dismiss"
            >
              知道啦
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.guide-enter-active,
.guide-leave-active {
  transition: all 0.3s ease;
}

.guide-enter-active .guide-card,
.guide-leave-active .guide-card {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}

.guide-enter-from,
.guide-leave-to {
  opacity: 0;
}

.guide-enter-from .guide-card {
  transform: translateY(30px) scale(0.95);
  opacity: 0;
}

.guide-leave-to .guide-card {
  transform: translateY(-20px) scale(0.95);
  opacity: 0;
}

.guide-icon {
  animation: guide-icon-float 3s ease-in-out infinite;
}

@keyframes guide-icon-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
</style>
