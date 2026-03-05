<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

interface Props {
  audioBase64?: string
  format?: string
  duration?: number
  /** Lv.7 以下锁定，显示解锁提示 */
  locked?: boolean
  /** Mock 模式标记（无实际音频） */
  mockMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  audioBase64: '',
  format: 'mp3',
  duration: 0,
  locked: false,
  mockMode: false,
})

const emit = defineEmits<{
  unlock: []
}>()

const playing = ref(false)
const progress = ref(0)
const audioRef = ref<HTMLAudioElement | null>(null)
let animFrame: number | null = null

const formattedDuration = computed(() => {
  const secs = Math.ceil(props.duration)
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
})

function togglePlay() {
  if (props.locked) {
    emit('unlock')
    return
  }

  // Mock 模式或无音频数据时不播放
  if (!props.audioBase64 || props.mockMode)
    return

  if (!audioRef.value) {
    audioRef.value = new Audio(`data:audio/${props.format};base64,${props.audioBase64}`)
    audioRef.value.onended = () => {
      playing.value = false
      progress.value = 0
    }
  }

  if (playing.value) {
    audioRef.value.pause()
    playing.value = false
  }
  else {
    audioRef.value.play()
    playing.value = true
    updateProgress()
  }
}

function updateProgress() {
  if (!audioRef.value || !playing.value)
    return
  progress.value = (audioRef.value.currentTime / audioRef.value.duration) * 100
  animFrame = requestAnimationFrame(updateProgress)
}

onUnmounted(() => {
  if (animFrame)
    cancelAnimationFrame(animFrame)
  audioRef.value?.pause()
})
</script>

<template>
  <div
    inline-flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer select-none
    transition-all duration-200
    :class="[
      locked ? 'bg-gray-100 op-60' : 'bg-purple-50 hover:bg-purple-100',
      playing ? 'ring-2 ring-purple-300' : '',
    ]"
    @click="togglePlay"
  >
    <!-- 锁定状态：显示锁图标 + 提示 -->
    <template v-if="locked">
      <div i-carbon-locked w-5 h-5 text-gray-400 />
      <span text-xs text-gray-400>Lv.7 解锁语音</span>
    </template>

    <!-- 正常播放状态 -->
    <template v-else>
      <!-- 播放/暂停按钮 -->
      <div
        w-6 h-6 transition-transform
        :class="playing ? 'i-carbon-pause-filled text-purple-600' : 'i-carbon-play-filled-alt text-purple-500'"
      />

      <!-- 波形动画条 -->
      <div flex items-end gap-0.5 h-4>
        <div
          v-for="i in 6"
          :key="i"
          w-0.5 bg-purple-400 rounded-full transition-all duration-150
          :style="{
            height: playing
              ? `${4 + Math.sin((Date.now() / 200) + i) * 8}px`
              : '4px',
          }"
        />
      </div>

      <!-- 播放进度条 -->
      <div w-16 h-1 bg-purple-200 rounded-full overflow-hidden>
        <div
          h-full bg-purple-500 rounded-full transition-all duration-100
          :style="{ width: `${progress}%` }"
        />
      </div>

      <!-- 时长显示 -->
      <span text-xs text-purple-600 tabular-nums>
        {{ mockMode ? '模拟' : formattedDuration }}
      </span>
    </template>
  </div>
</template>
