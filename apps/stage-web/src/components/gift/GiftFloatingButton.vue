<script setup lang="ts">
import { onMounted, ref } from 'vue'

import GiftAnimation from './GiftAnimation.vue'
import GiftPanel from './GiftPanel.vue'
import { GIFT_TIERS, useTrustStore } from '../../stores/trust'
import { useWalletStore } from '../../stores/wallet'
import { storeToRefs } from 'pinia'

import TrustBar from '../trust/TrustBar.vue'
import LevelUpCeremony from '../trust/LevelUpCeremony.vue'

const props = withDefaults(defineProps<{
  characterId?: string
}>(), {
  characterId: 'default',
})

const trustStore = useTrustStore()
const walletStore = useWalletStore()
const { trustRecord, showLevelUp, levelUpInfo } = storeToRefs(trustStore)
const { formattedBalance } = storeToRefs(walletStore)

const showGiftPanel = ref(false)
const showAnimation = ref(false)
const animationCount = ref(5)
const showTrustBar = ref(false)

onMounted(async () => {
  // 加载钱包和信赖数据
  if (!walletStore.wallet) {
    walletStore.fetchWallet()
  }
  if (!trustRecord.value) {
    trustStore.fetchTrust(props.characterId)
  }
})

function openGiftPanel() {
  showGiftPanel.value = true
}

function handleGiftSent(tierId: string, _result: unknown) {
  const tier = GIFT_TIERS.find(t => t.id === tierId)
  if (tier) {
    animationCount.value = Math.min(Math.ceil(tier.trustGain / 30), 12)
  }
  showAnimation.value = true
  showTrustBar.value = true

  setTimeout(() => {
    showAnimation.value = false
  }, 2000)
}

function toggleTrustBar() {
  showTrustBar.value = !showTrustBar.value
}
</script>

<template>
  <div>
    <!-- Trust Bar (collapsible, shown near bottom-right) -->
    <Transition name="trust-bar-slide">
      <div
        v-if="showTrustBar && trustRecord"
        fixed z-50
        class="bottom-20 right-4 md:bottom-24 md:right-6 bg-white/90 dark:bg-neutral-900/90 border-neutral-200/40 dark:border-neutral-700/40"
        w="56 md:64"
        backdrop-blur-md
        rounded-xl
        shadow-lg
        px-3 py-2.5
      >
        <TrustBar
          :trust-points="trustRecord.trustPoints"
          :trust-level="trustRecord.trustLevel"
          :is-shaken="trustRecord.isShaken"
        />
      </div>
    </Transition>

    <!-- Floating buttons -->
    <div
      fixed z-50
      class="bottom-4 right-4 md:bottom-6 md:right-6"
      flex="~ col" gap-2 items-end
    >
      <!-- Trust info toggle with level badge -->
      <div relative>
        <!-- 信赖等级小标签 -->
        <div
          v-if="trustRecord"
          absolute z-1
          class="-top-2 -left-3 border border-solid border-neutral-200/60 dark:border-neutral-700/60"
          rounded-full px-1.5 py-0.5
          bg="white dark:neutral-800"
          shadow-sm
          text="xs neutral-600 dark:neutral-300"
          font-medium
          whitespace-nowrap
        >
          Lv.{{ trustRecord.trustLevel }}
        </div>
        <button
          class="floating-btn border-2 border-solid border-neutral-100/60 dark:border-neutral-800/30 bg-neutral-50/70 dark:bg-neutral-800/70"
          w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md
          shadow-md
          transition="all duration-200"
          hover:shadow-lg
          active:scale-95
          :title="showTrustBar ? '隐藏信赖度' : '显示信赖度'"
          @click="toggleTrustBar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="text-neutral-500 dark:text-neutral-400">
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </button>
      </div>

      <!-- Gift button with balance badge -->
      <div relative>
        <!-- 余额小标签 -->
        <div
          v-if="walletStore.wallet"
          absolute z-1
          class="-top-2 -left-3 border border-solid border-neutral-200/60 dark:border-neutral-700/60"
          rounded-full px-1.5 py-0.5
          bg="white dark:neutral-800"
          shadow-sm
          text="xs neutral-600 dark:neutral-300"
          font-medium
          whitespace-nowrap
        >
          {{ formattedBalance }}
        </div>
        <button
          class="floating-btn gift-btn shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40"
          bg="primary-500 hover:primary-600"
          w-12 h-12 flex items-center justify-center rounded-full
          transition="all duration-200"
          active:scale-90
          title="送礼物"
          @click="openGiftPanel"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"
              stroke="white"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Gift Panel -->
    <GiftPanel
      v-model:visible="showGiftPanel"
      :character-id="props.characterId"
      @gift-sent="handleGiftSent"
    />

    <!-- Gift Animation -->
    <GiftAnimation
      :show="showAnimation"
      :count="animationCount"
    />

    <!-- Level Up Ceremony -->
    <LevelUpCeremony
      v-model:show="showLevelUp"
      :from-level="levelUpInfo.from"
      :to-level="levelUpInfo.to"
    />
  </div>
</template>

<style scoped>
.trust-bar-slide-enter-active,
.trust-bar-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.trust-bar-slide-enter-from,
.trust-bar-slide-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.95);
}

.gift-btn {
  animation: gift-pulse 2s ease-in-out infinite;
}

@keyframes gift-pulse {
  0%, 100% { box-shadow: 0 4px 14px -2px rgba(var(--un-primary-500), 0.3); }
  50% { box-shadow: 0 6px 20px -2px rgba(var(--un-primary-500), 0.5); }
}

.floating-btn {
  transition: transform 0.2s, box-shadow 0.2s;
}
</style>
