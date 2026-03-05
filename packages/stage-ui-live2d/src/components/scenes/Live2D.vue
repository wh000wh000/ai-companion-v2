<script setup lang="ts">
import { Screen } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'

import Live2DCanvas from './live2d/Canvas.vue'
import Live2DModel from './live2d/Model.vue'

import { useLive2d } from '../../stores/live2d'

import '../../utils/live2d-zip-loader'
import '../../utils/live2d-opfs-registration'

const props = withDefaults(defineProps<{
  modelSrc?: string
  modelId?: string

  paused?: boolean
  mouthOpenSize?: number
  focusAt?: { x: number, y: number }
  disableFocusAt?: boolean
  scale?: number
  themeColorsHue?: number
  themeColorsHueDynamic?: boolean
  live2dIdleAnimationEnabled?: boolean
  live2dAutoBlinkEnabled?: boolean
  live2dForceAutoBlinkEnabled?: boolean
  live2dShadowEnabled?: boolean
  live2dMaxFps?: number
  /** Static fallback image URL shown when Live2D model fails to load */
  fallbackAvatarUrl?: string
}>(), {
  paused: false,
  focusAt: () => ({ x: 0, y: 0 }),
  mouthOpenSize: 0,
  scale: 1,
  themeColorsHue: 220.44,
  themeColorsHueDynamic: false,
  live2dIdleAnimationEnabled: true,
  live2dAutoBlinkEnabled: true,
  live2dForceAutoBlinkEnabled: false,
  live2dShadowEnabled: true,
  live2dMaxFps: 0,
})

const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })
const componentStateCanvas = defineModel<'pending' | 'loading' | 'mounted'>('canvasState', { default: 'pending' })
const componentStateModel = defineModel<'pending' | 'loading' | 'mounted'>('modelState', { default: 'pending' })

const live2dCanvasRef = ref<InstanceType<typeof Live2DCanvas>>()

/** Tracks whether the Live2D model failed to load, triggering fallback UI */
const modelLoadFailed = ref(false)
/** Tracks whether the model is currently loading (for loading indicator) */
const isLoading = ref(true)

const live2d = useLive2d()
const { position } = storeToRefs(live2d)

watch([componentStateModel, componentStateCanvas], () => {
  componentState.value = (componentStateModel.value === 'mounted' && componentStateCanvas.value === 'mounted')
    ? 'mounted'
    : 'loading'
})

// Track loading/failure state based on model source and component state
watch([componentStateModel, () => props.modelSrc], ([modelState, src]) => {
  if (!src) {
    // No model source provided
    modelLoadFailed.value = true
    isLoading.value = false
    return
  }
  if (modelState === 'loading' || modelState === 'pending') {
    isLoading.value = true
    modelLoadFailed.value = false
  }
  else if (modelState === 'mounted') {
    isLoading.value = false
    // Model mounted state alone does not indicate failure;
    // failure is detected via the @error event from Model.vue
  }
}, { immediate: true })

function handleModelLoadError() {
  modelLoadFailed.value = true
  isLoading.value = false
  console.warn('[Live2D] Model load failed, displaying fallback UI')
}

defineExpose({
  canvasElement: () => {
    return live2dCanvasRef.value?.canvasElement()
  },
})
</script>

<template>
  <Screen v-slot="{ width, height }" relative>
    <!-- Fallback: static avatar when Live2D model fails to load -->
    <div
      v-if="modelLoadFailed"
      h-full w-full flex items-center justify-center
    >
      <div flex flex-col items-center gap-3>
        <div
          w-32 h-32 rounded-full overflow-hidden
          bg="gray-200 dark:gray-700"
          flex items-center justify-center
          border="2 primary-300 dark:primary-600"
        >
          <img
            v-if="fallbackAvatarUrl"
            :src="fallbackAvatarUrl"
            alt="Character Avatar"
            w-full h-full object-cover
          >
          <div v-else text-4xl op-50>
            :)
          </div>
        </div>
        <span text-sm op-60>Live2D model unavailable</span>
      </div>
    </div>

    <!-- Loading indicator -->
    <div
      v-else-if="isLoading"
      h-full w-full flex items-center justify-center
    >
      <div flex flex-col items-center gap-2>
        <div
          w-8 h-8 rounded-full
          border="2 primary-400 dark:primary-500"
          border-t-transparent
          animate-spin
        />
        <span text-sm op-50>Loading...</span>
      </div>
    </div>

    <!-- Normal Live2D rendering -->
    <Live2DCanvas
      v-show="!modelLoadFailed && !isLoading"
      ref="live2dCanvasRef"
      v-slot="{ app }"
      v-model:state="componentStateCanvas"
      :width="width"
      :height="height"
      :resolution="2"
      :max-fps="live2dMaxFps"
      max-h="100dvh"
    >
      <Live2DModel
        v-model:state="componentStateModel"
        :model-src="modelSrc"
        :model-id="modelId"
        :app="app"
        :mouth-open-size="mouthOpenSize"
        :width="width"
        :height="height"
        :paused="paused"
        :focus-at="focusAt"
        :x-offset="position.x"
        :y-offset="position.y"
        :scale="scale"
        :disable-focus-at="disableFocusAt"
        :theme-colors-hue="themeColorsHue"
        :theme-colors-hue-dynamic="themeColorsHueDynamic"
        :live2d-idle-animation-enabled="live2dIdleAnimationEnabled"
        :live2d-auto-blink-enabled="live2dAutoBlinkEnabled"
        :live2d-force-auto-blink-enabled="live2dForceAutoBlinkEnabled"
        :live2d-shadow-enabled="live2dShadowEnabled"
        @error="handleModelLoadError"
      />
    </Live2DCanvas>
  </Screen>
</template>
