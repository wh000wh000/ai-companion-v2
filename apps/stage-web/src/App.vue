<script setup lang="ts">
import type { SurpriseRecord } from './stores/surprise'

import type { NarrativeType } from './stores/narrative'

import { OnboardingDialog, ToasterRoot } from '@proj-airi/stage-ui/components'
import { useSharedAnalyticsStore } from '@proj-airi/stage-ui/stores/analytics'
import { useCharacterOrchestratorStore } from '@proj-airi/stage-ui/stores/character'
import { useChatSessionStore } from '@proj-airi/stage-ui/stores/chat/session-store'
import { useDisplayModelsStore } from '@proj-airi/stage-ui/stores/display-models'
import { useModsServerChannelStore } from '@proj-airi/stage-ui/stores/mods/api/channel-server'
import { useContextBridgeStore } from '@proj-airi/stage-ui/stores/mods/api/context-bridge'
import { useAiriCardStore } from '@proj-airi/stage-ui/stores/modules/airi-card'
import { useOnboardingStore } from '@proj-airi/stage-ui/stores/onboarding'
import { useSettings } from '@proj-airi/stage-ui/stores/settings'
import { useTheme } from '@proj-airi/ui'
import { StageTransitionGroup } from '@proj-airi/ui-transitions'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterView } from 'vue-router'
import { toast, Toaster } from 'vue-sonner'

import HandwrittenCard from './components/narrative/HandwrittenCard.vue'
import NarrativePayment from './components/narrative/NarrativePayment.vue'
import PerformanceOverlay from './components/Devtools/PerformanceOverlay.vue'
import SurpriseAnimation from './components/surprise/SurpriseAnimation.vue'

import { useAgentPush } from './composables/useAgentPush'
import { useAutoProviderSetup } from './composables/useAutoProviderSetup'
import { useCharacterLoader } from './composables/useCharacterLoader'
import { useNarrativeStore } from './stores/narrative'
import { usePWAStore } from './stores/pwa'
import { useSurpriseStore } from './stores/surprise'

usePWAStore()

// Auto-configure OpenRouter provider if VITE_OPENROUTER_API_KEY is set
useAutoProviderSetup()

// 惊喜 store：用于 WebSocket 推送触发开箱动画
const surpriseStore = useSurpriseStore()

// 叙事支付 store：全局手写卡片和支付确认入口
const narrativeStore = useNarrativeStore()

// 角色人格加载器：从服务器获取预置角色并注入 systemPrompt
const characterLoader = useCharacterLoader()

// 初始化 Agent 主动推送（WebSocket），连接失败时静默降级，不影响正常使用
const { lastMessage: agentPushLastMessage } = useAgentPush()

const contextBridgeStore = useContextBridgeStore()
const i18n = useI18n()
const displayModelsStore = useDisplayModelsStore()
const settingsStore = useSettings()
const settings = storeToRefs(settingsStore)
const onboardingStore = useOnboardingStore()
const chatSessionStore = useChatSessionStore()
const serverChannelStore = useModsServerChannelStore()
const characterOrchestratorStore = useCharacterOrchestratorStore()
const { shouldShowSetup } = storeToRefs(onboardingStore)
const { isDark } = useTheme()
const cardStore = useAiriCardStore()
const analyticsStore = useSharedAnalyticsStore()

const primaryColor = computed(() => {
  return isDark.value
    ? `color-mix(in srgb, oklch(95% var(--chromatic-chroma-900) calc(var(--chromatic-hue) + ${0})) 70%, oklch(50% 0 360))`
    : `color-mix(in srgb, oklch(95% var(--chromatic-chroma-900) calc(var(--chromatic-hue) + ${0})) 90%, oklch(90% 0 360))`
})

const secondaryColor = computed(() => {
  return isDark.value
    ? `color-mix(in srgb, oklch(95% var(--chromatic-chroma-900) calc(var(--chromatic-hue) + ${180})) 70%, oklch(50% 0 360))`
    : `color-mix(in srgb, oklch(95% var(--chromatic-chroma-900) calc(var(--chromatic-hue) + ${180})) 90%, oklch(90% 0 360))`
})

const tertiaryColor = computed(() => {
  return isDark.value
    ? `color-mix(in srgb, oklch(95% var(--chromatic-chroma-900) calc(var(--chromatic-hue) + ${60})) 70%, oklch(50% 0 360))`
    : `color-mix(in srgb, oklch(95% var(--chromatic-chroma-900) calc(var(--chromatic-hue) + ${60})) 90%, oklch(90% 0 360))`
})

const colors = computed(() => {
  return [primaryColor.value, secondaryColor.value, tertiaryColor.value, isDark.value ? '#121212' : '#FFFFFF']
})

// 监听 Agent 推送消息，惊喜触发展示开箱动画，其余显示 toast 通知
watch(agentPushLastMessage, (msg) => {
  if (!msg)
    return
  if (msg.type === 'surprise_trigger') {
    // 惊喜触发 → 展示开箱动画（而非 toast）
    if (msg.metadata?.surprise && typeof msg.metadata.surprise === 'object' && 'id' in msg.metadata.surprise && 'type' in msg.metadata.surprise) {
      surpriseStore.showSurprise(msg.metadata.surprise as SurpriseRecord)
    }
    else {
      toast.success(msg.content)
    }
  }
  else if (msg.type === 'level_up') {
    toast.success(msg.content)
  }
  else if (msg.type === 'decay_warning') {
    toast.warning(msg.content)
  }
  else if (msg.type === 'proactive_message') {
    toast.info(msg.content)
  }
})

watch(settings.language, () => {
  i18n.locale.value = settings.language.value
})

watch(settings.themeColorsHue, () => {
  document.documentElement.style.setProperty('--chromatic-hue', settings.themeColorsHue.value.toString())
}, { immediate: true })

watch(settings.themeColorsHueDynamic, () => {
  document.documentElement.classList.toggle('dynamic-hue', settings.themeColorsHueDynamic.value)
}, { immediate: true })

// Initialize first-time setup check when app mounts
onMounted(async () => {
  analyticsStore.initialize()
  cardStore.initialize()

  // 加载预置角色（公开端点，无需认证），静默失败不阻塞启动
  characterLoader.fetchPresets().catch(err => console.error('Failed to load preset characters:', err))

  onboardingStore.initializeSetupCheck()

  await chatSessionStore.initialize()
  await serverChannelStore.initialize({ possibleEvents: ['ui:configure'] }).catch(err => console.error('Failed to initialize Mods Server Channel in App.vue:', err))
  await contextBridgeStore.initialize()
  characterOrchestratorStore.initialize()

  await displayModelsStore.loadDisplayModelsFromIndexedDB()
  await settingsStore.initializeStageModel()
})

onUnmounted(() => {
  contextBridgeStore.dispose()
})

// Handle first-time setup events
function handleSetupConfigured() {
  onboardingStore.markSetupCompleted()
}

function handleSetupSkipped() {
  onboardingStore.markSetupSkipped()
}
</script>

<template>
  <StageTransitionGroup
    :primary-color="primaryColor"
    :secondary-color="secondaryColor"
    :tertiary-color="tertiaryColor"
    :colors="colors"
    :z-index="100"
    :disable-transitions="settings.disableTransitions.value"
    :use-page-specific-transitions="settings.usePageSpecificTransitions.value"
  >
    <RouterView v-slot="{ Component }">
      <KeepAlive :include="['IndexScenePage', 'StageScenePage']">
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </StageTransitionGroup>

  <ToasterRoot @close="id => toast.dismiss(id)">
    <Toaster />
  </ToasterRoot>

  <!-- First Time Setup Dialog -->
  <OnboardingDialog
    v-model="shouldShowSetup"
    @configured="handleSetupConfigured"
    @skipped="handleSetupSkipped"
  />

  <PerformanceOverlay />

  <!-- 全局惊喜动画（WebSocket 推送触发） -->
  <SurpriseAnimation
    v-if="surpriseStore.pendingSurprise"
    v-model:show="surpriseStore.showAnimation"
    :surprise="surpriseStore.pendingSurprise"
  />

  <!-- 全局叙事手写卡片（情感节奏系统触发） -->
  <HandwrittenCard
    v-if="narrativeStore.pendingCard"
    :show="!!narrativeStore.pendingCard"
    :message="narrativeStore.pendingCard.message"
    :action-text="narrativeStore.pendingCard.actionText"
    :character-name="narrativeStore.pendingCard.characterName"
    @action="narrativeStore.showPaymentSheet = true"
    @dismiss="narrativeStore.dismiss()"
  />

  <!-- 全局叙事支付确认（HandwrittenCard 行动后展示） -->
  <NarrativePayment
    v-if="narrativeStore.showPaymentSheet && narrativeStore.pendingCard"
    :show="narrativeStore.showPaymentSheet"
    :type="(narrativeStore.pendingCard.paymentData.type as NarrativeType) || 'gift'"
    :character-name="narrativeStore.pendingCard.characterName"
    :character-quote="narrativeStore.pendingCard.paymentData.characterQuote || ''"
    :item-emoji="narrativeStore.pendingCard.paymentData.itemEmoji || ''"
    :item-name="narrativeStore.pendingCard.paymentData.storyTitle || ''"
    :item-description="narrativeStore.pendingCard.paymentData.storyDescription || ''"
    :amount="(narrativeStore.pendingCard.paymentData.amountCents || 0) / 100"
    @confirm="narrativeStore.confirmPayment()"
    @close="narrativeStore.showPaymentSheet = false"
  />
</template>

<style>
/* We need this to properly animate the CSS variable */
@property --chromatic-hue {
  syntax: '<number>';
  initial-value: 0;
  inherits: true;
}

@keyframes hue-anim {
  from {
    --chromatic-hue: 0;
  }
  to {
    --chromatic-hue: 360;
  }
}

.dynamic-hue {
  animation: hue-anim 10s linear infinite;
}
</style>
