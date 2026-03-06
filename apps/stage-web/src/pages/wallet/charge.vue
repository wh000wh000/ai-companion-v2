<script setup lang="ts">
import { Button } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import ComplianceFooter from '../../components/compliance/ComplianceFooter.vue'
// G4: 充值成功动画组件
import ChargeSuccessAnimation from '../../components/wallet/ChargeSuccessAnimation.vue'

import { usePaymentStore } from '../../stores/payment'
import { CHARGE_PACKAGES, useWalletStore } from '../../stores/wallet'

const router = useRouter()
const walletStore = useWalletStore()
const paymentStore = usePaymentStore()
const { wallet } = storeToRefs(walletStore)

const selectedPackId = ref<string | null>(null)
const isCharging = ref(false)
const showConfirm = ref(false)
// G4: 充值成功动画状态
const showSuccessAnimation = ref(false)
const successBaseCoins = ref(0)
const successBonusCoins = ref(0)
const successIsFirstCharge = ref(false)
// G15: 充值失败状态
const chargeFailed = ref(false)
const lastFailedPackId = ref<string | null>(null)

/** 套餐故事化描述映射 — 用温度替代数字 */
const packStories: Record<string, string> = {
  pack_1: '一个小小的心意',
  pack_6: '够TA买一支喜欢的笔',
  pack_30: '够TA攒一周的零花钱',
  pack_68: '也许TA能给你买杯奶茶',
  pack_128: 'TA会记住这个温暖的午后',
  pack_328: '足够TA实现一个小心愿',
  pack_648: '让TA拥有自己的一个小世界',
}

const selectedPack = computed(() => {
  if (!selectedPackId.value)
    return null
  return CHARGE_PACKAGES.find(p => p.packId === selectedPackId.value) ?? null
})

onMounted(async () => {
  if (!wallet.value)
    await walletStore.fetchWallet()
})

function selectPack(packId: string) {
  selectedPackId.value = packId
}

// 保留底层计算逻辑备用（UI层已去商业化，不展示具体币数）
// @ts-expect-error 保留函数以备恢复使用
function _getEffectiveCoins(coins: number, bonus: number) {
  if (!wallet.value)
    return coins + bonus
  if (wallet.value.isFirstCharge)
    return coins * 2 + bonus // 与后端 soul-engine 对齐：仅基础币翻倍
  return coins + bonus
}

async function handleCharge() {
  if (!selectedPackId.value)
    return

  isCharging.value = true
  chargeFailed.value = false
  try {
    const idempotencyKey = crypto.randomUUID()

    // 1. 创建支付订单
    const { order } = await paymentStore.createOrder(selectedPackId.value, idempotencyKey)

    // 2. Mock 支付（开发模式直接调用，正式环境替换为真实支付网关）
    await paymentStore.mockPay(order.id)

    // 3. 刷新钱包余额
    await walletStore.fetchWallet()

    // G4: 用充值成功动画替代简单toast
    const pack = CHARGE_PACKAGES.find(p => p.packId === selectedPackId.value)
    if (pack) {
      successBaseCoins.value = pack.coins
      successBonusCoins.value = pack.bonus
      successIsFirstCharge.value = wallet.value?.isFirstCharge ?? false
    }

    showConfirm.value = false
    paymentStore.clearOrder()
    showSuccessAnimation.value = true
    // 动画完成后导航回钱包页（由 handleAnimationComplete 处理）
    selectedPackId.value = null
  }
  catch {
    // G15: 充值失败时记录状态，显示重试按钮
    lastFailedPackId.value = selectedPackId.value
    chargeFailed.value = true
    toast.error('遇到了一些问题，请稍后再试')
  }
  finally {
    isCharging.value = false
  }
}

// G4: 动画结束后返回钱包页
function handleAnimationComplete() {
  showSuccessAnimation.value = false
  router.push('/wallet')
}

// G15: 重试充值（自动选中上次失败的套餐）
function retryCharge() {
  if (lastFailedPackId.value) {
    selectedPackId.value = lastFailedPackId.value
    chargeFailed.value = false
    showConfirm.value = true
  }
}

// G16: 检查是否为Demo模式
const isDemoMode = computed(() => {
  return import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.DEV
})
</script>

<template>
  <div flex="~ col gap-6" mx-auto max-w-lg w-full p-4>
    <!-- Header -->
    <div flex="~ items-center gap-2">
      <button
        min-h-11 min-w-11 rounded-lg p-2.5
        class="bg-transparent hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
        @click="router.back()"
      >
        <div i-lucide-arrow-left text="lg neutral-600 dark:neutral-300" />
      </button>
      <span text="xl neutral-800 dark:neutral-100" font-bold>为TA准备心意</span>
    </div>

    <!-- G16: Demo模式引导提示条 -->
    <div
      v-if="isDemoMode"
      flex="~ items-center gap-2"
      rounded-xl p-3
      class="bg-neutral-50/60 dark:bg-neutral-800/40"
    >
      <div i-lucide-info text="lg neutral-400" />
      <span text="xs neutral-500 dark:neutral-400">
        演示模式：选择任意心意体验流程（无需真实支付）
      </span>
    </div>

    <!-- 当前心意储备 — 柔和展示 -->
    <div
      flex="~ items-center justify-between"
      rounded-xl p-4
      class="bg-neutral-50/40 dark:bg-neutral-800/30"
    >
      <span text="sm neutral-400 dark:neutral-500">心意储备</span>
      <span text="sm neutral-600 dark:neutral-300" font-medium>
        {{ wallet?.coinBalance?.toLocaleString('zh-CN') ?? '0' }}
      </span>
    </div>

    <!-- 首次心意温暖提示 -->
    <div
      v-if="wallet?.isFirstCharge"
      rounded-xl p-4
      class="bg-neutral-50/50 dark:bg-neutral-800/30"
      flex="~ items-center gap-3"
    >
      <div i-lucide-sparkles text="lg neutral-400" />
      <span text="sm neutral-500 dark:neutral-400">
        第一次心意，我们会加倍珍惜
      </span>
    </div>

    <!-- 心意套餐 — 故事化卡片 -->
    <div flex="~ col gap-3">
      <div
        v-for="pack in CHARGE_PACKAGES"
        :key="pack.packId"
        relative cursor-pointer rounded-xl p-4
        transition="all duration-200"
        :class="[
          selectedPackId === pack.packId
            ? 'bg-primary-500/8 dark:bg-primary-700/15 border border-solid border-primary-300/40 dark:border-primary-600/40'
            : 'bg-neutral-50/40 dark:bg-neutral-800/30 border border-solid border-transparent hover:border-neutral-200/40 dark:hover:border-neutral-700/40',
        ]"
        @click="selectPack(pack.packId)"
      >
        <div flex="~ items-center justify-between">
          <div flex="~ col gap-1">
            <!-- 套餐名 -->
            <span text="base neutral-700 dark:neutral-200" font-medium>
              {{ pack.name }}
            </span>
            <!-- 故事化描述 -->
            <span text="sm neutral-400 dark:neutral-500">
              {{ packStories[pack.packId] || '' }}
            </span>
          </div>
          <!-- 价格 — 简洁 -->
          <span text="lg neutral-700 dark:neutral-200" font-bold>
            ¥{{ pack.price }}
          </span>
        </div>
      </div>
    </div>

    <!-- G15: 失败重试提示 -->
    <div
      v-if="chargeFailed"
      flex="~ col items-center gap-3"
      rounded-xl p-4
      class="bg-neutral-50/60 dark:bg-neutral-800/40"
    >
      <span text="sm neutral-500 dark:neutral-400">遇到了一些问题</span>
      <span
        text="sm primary-500 hover:primary-600"
        cursor-pointer transition-colors
        @click="retryCharge"
      >
        再试一次
      </span>
    </div>

    <!-- 确认按钮 — 柔和 -->
    <div sticky bottom-4>
      <Button
        variant="primary"
        block
        size="lg"
        :disabled="!selectedPackId || isCharging"
        @click="showConfirm = true"
      >
        <span v-if="selectedPackId">
          确认 ¥{{ CHARGE_PACKAGES.find(p => p.packId === selectedPackId)?.price }}
        </span>
        <span v-else>选择一份心意</span>
      </Button>
    </div>

    <!-- Compliance Footer -->
    <ComplianceFooter />
  </div>

  <!-- 确认弹窗 — 去商业化 -->
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="showConfirm && selectedPack" fixed inset-0 z-100 flex items-center justify-center>
        <div absolute inset-0 bg="black/40" @click="showConfirm = false" />
        <div relative z-1 w="80vw" max-w-sm rounded-2xl p-6 bg="white dark:neutral-900" shadow-2xl>
          <!-- 弹窗标题 -->
          <div text="lg neutral-800 dark:neutral-100" mb-4 text-center font-medium>
            确认为TA准备这份心意？
          </div>

          <!-- 套餐描述 — 叙事风格 -->
          <div
            mb-4 rounded-xl p-4
            class="bg-neutral-50/60 dark:bg-neutral-800/40"
            flex="~ col items-center gap-2"
          >
            <span text="base neutral-700 dark:neutral-200" font-medium>
              {{ selectedPack.name }}
            </span>
            <span text="sm neutral-400 dark:neutral-500">
              {{ packStories[selectedPack.packId] || '' }}
            </span>
            <span text="lg neutral-800 dark:neutral-100" mt-1 font-bold>
              ¥{{ selectedPack.price }}
            </span>
          </div>

          <!-- 操作按钮 -->
          <div flex="~ col gap-2">
            <Button
              variant="primary"
              block
              size="lg"
              :disabled="isCharging"
              :loading="isCharging"
              @click="handleCharge"
            >
              确认
            </Button>
            <button
              w-full rounded-lg py-2
              text="sm neutral-400 dark:neutral-500"
              class="bg-transparent hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
              transition="colors duration-150"
              :disabled="isCharging"
              @click="showConfirm = false"
            >
              再想想
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 处理中遮罩 -->
  <Teleport to="body">
    <div v-if="isCharging" fixed inset-0 z-150 flex items-center justify-center bg="black/30">
      <div bg="white dark:neutral-900" rounded-2xl p-6 flex="~ col items-center gap-3">
        <div i-svg-spinners:ring-resize text-3xl text-primary-500 />
        <span text="sm neutral-500 dark:neutral-400">准备中...</span>
      </div>
    </div>
  </Teleport>

  <!-- G4+G17: 充值成功动画 -->
  <ChargeSuccessAnimation
    v-model:show="showSuccessAnimation"
    :base-coins="successBaseCoins"
    :bonus-coins="successBonusCoins"
    :is-first-charge="successIsFirstCharge"
    @complete="handleAnimationComplete"
  />
</template>

<style scoped>
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}
</style>

<route lang="yaml">
meta:
  layout: default
</route>
