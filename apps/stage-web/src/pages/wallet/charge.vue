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

function getEffectiveCoins(coins: number, bonus: number) {
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
    toast.error('充值失败，请稍后重试')
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
      <span text="xl neutral-800 dark:neutral-100" font-bold>充值中心</span>
    </div>

    <!-- G16: Demo模式引导提示条 -->
    <div
      v-if="isDemoMode"
      flex="~ items-center gap-2"
      rounded-xl p-3
      class="border border-blue-300/30 border-solid from-blue-500/10 to-purple-500/10 bg-gradient-to-r dark:border-blue-700/30 dark:from-blue-700/15 dark:to-purple-700/15"
    >
      <div i-lucide-info text="lg blue-500" />
      <span text="xs blue-700 dark:blue-300" font-medium>
        演示模式：选择任意套餐体验充值流程（无需真实支付）
      </span>
    </div>

    <!-- Current Balance -->
    <div
      flex="~ items-center justify-between"
      rounded-xl p-4
      class="border border-neutral-200/30 border-solid bg-neutral-50/60 dark:border-neutral-700/30 dark:bg-neutral-800/50"
    >
      <div flex="~ items-center gap-2">
        <div i-lucide-heart text="pink-500" />
        <span text="sm neutral-500 dark:neutral-400">当前余额</span>
      </div>
      <span text="lg pink-600 dark:pink-300" font-bold>
        {{ wallet?.coinBalance?.toLocaleString('zh-CN') ?? '0' }}
      </span>
    </div>

    <!-- First Charge Banner -->
    <div
      v-if="wallet?.isFirstCharge"
      rounded-xl p-4
      class="border border-amber-300/40 border-solid from-amber-500/15 to-orange-500/15 bg-gradient-to-r dark:border-amber-700/30 dark:from-amber-700/20 dark:to-orange-700/20"
      flex="~ items-center gap-3"
    >
      <div

        h-10 w-10 flex items-center justify-center rounded-full
        class="bg-amber-500/20"
      >
        <div i-lucide-zap text="xl amber-500" />
      </div>
      <div flex="~ col">
        <span text="sm amber-700 dark:amber-200" font-bold>首充双倍</span>
        <span text="xs" class="text-amber-600/80 dark:text-amber-300/70">首次充值任意档位，爱心币翻倍！</span>
      </div>
    </div>

    <!-- Charge Packages Grid -->
    <div grid="~ cols-2 gap-3" sm="cols-2" md="cols-3">
      <div
        v-for="pack in CHARGE_PACKAGES"
        :key="pack.packId"
        relative cursor-pointer rounded-xl p-4
        transition="all duration-200"
        :class="[
          selectedPackId === pack.packId
            ? 'bg-pink-500/15 dark:bg-pink-700/25 border-2 border-solid border-pink-400/50 dark:border-pink-600/50 ring-2 ring-pink-300/30 dark:ring-pink-700/30'
            : 'bg-neutral-50/60 dark:bg-neutral-800/50 border-2 border-solid border-neutral-200/30 dark:border-neutral-700/30 hover:border-pink-300/40 dark:hover:border-pink-700/40',
        ]"
        @click="selectPack(pack.packId)"
      >
        <!-- Tag Badge -->
        <div
          v-if="pack.tag"

          text="xs white"
          :class="[
            pack.tag === '最受欢迎' ? 'bg-pink-500' : '',
            pack.tag === '体验档' ? 'bg-blue-500' : '',
            pack.tag === '顶级档' ? 'bg-amber-500' : '',
          ]"
          absolute right-2 top--2 rounded-full px-2 py-0.5 font-medium
        >
          {{ pack.tag }}
        </div>

        <!-- Pack Name -->
        <div text="sm neutral-800 dark:neutral-100" mb-2 font-semibold>
          {{ pack.name }}
        </div>

        <!-- Coins -->
        <div flex="~ items-baseline gap-1">
          <span text="2xl pink-600 dark:pink-300" font-bold>
            {{ pack.coins.toLocaleString('zh-CN') }}
          </span>
          <span text="xs neutral-400 dark:neutral-500">爱心币</span>
        </div>

        <!-- Bonus -->
        <div v-if="pack.bonus > 0" text="xs green-500 dark:green-400" mt-1 font-medium>
          +{{ pack.bonus.toLocaleString('zh-CN') }} 赠送
        </div>

        <!-- First Charge Doubled -->
        <div
          v-if="wallet?.isFirstCharge"
          text="xs amber-600 dark:amber-400" mt-1 font-medium
        >
          首充实得 {{ getEffectiveCoins(pack.coins, pack.bonus).toLocaleString('zh-CN') }}
        </div>

        <!-- Price -->
        <div mt-3 text="lg neutral-700 dark:neutral-200" font-bold>
          ¥{{ pack.price }}
        </div>

        <!-- G14: 性价比标注 -->
        <div text="xs neutral-400 dark:neutral-500" mt-1>
          约{{ (getEffectiveCoins(pack.coins, pack.bonus) / pack.price).toFixed(1) }}币/元
        </div>
        <!-- G14: 最划算标签（648档） -->
        <div
          v-if="pack.packId === 'pack_648'"
          text="xs green-600 dark:green-400"
          mt-1 font-bold
        >
          最划算
        </div>
      </div>
    </div>

    <!-- G15: 充值失败重试提示 -->
    <div
      v-if="chargeFailed"
      flex="~ col items-center gap-3"
      rounded-xl p-4
      class="border border-red-300/40 border-solid bg-red-50/60 dark:border-red-700/30 dark:bg-red-900/20"
    >
      <div flex="~ items-center gap-2">
        <div i-lucide-alert-circle text="lg red-500" />
        <span text="sm red-600 dark:red-400" font-medium>支付失败</span>
      </div>
      <button
        min-h-11 rounded-lg px-6 py-2
        text="sm white"
        bg="red-500 hover:red-600"
        font-medium
        transition="colors duration-150"
        @click="retryCharge"
      >
        重试充值（{{ CHARGE_PACKAGES.find(p => p.packId === lastFailedPackId)?.name ?? '' }}）
      </button>
    </div>

    <!-- Confirm Button -->
    <div sticky bottom-4>
      <Button
        variant="primary"
        block
        size="lg"
        :disabled="!selectedPackId || isCharging"
        @click="showConfirm = true"
      >
        <span v-if="selectedPackId">
          确认充值 ¥{{ CHARGE_PACKAGES.find(p => p.packId === selectedPackId)?.price }}
        </span>
        <span v-else>请选择充值套餐</span>
      </Button>
    </div>

    <!-- Compliance Footer -->
    <ComplianceFooter />
  </div>

  <!-- 充值确认弹窗 -->
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="showConfirm && selectedPack" fixed inset-0 z-100 flex items-center justify-center>
        <div absolute inset-0 bg="black/40" @click="showConfirm = false" />
        <div relative z-1 w="80vw" max-w-sm rounded-2xl p-6 bg="white dark:neutral-900" shadow-2xl>
          <!-- 弹窗标题 -->
          <div text="lg neutral-800 dark:neutral-100" mb-4 text-center font-bold>
            确认充值
          </div>

          <!-- 套餐信息 -->
          <div
            mb-4 rounded-xl p-4
            class="border border-neutral-200/30 border-solid bg-neutral-50/80 dark:border-neutral-700/30 dark:bg-neutral-800/60"
            flex="~ col gap-2"
          >
            <div flex="~ items-center justify-between">
              <span text="sm neutral-500 dark:neutral-400">套餐</span>
              <span text="sm neutral-800 dark:neutral-100" font-semibold>{{ selectedPack.name }}</span>
            </div>
            <div flex="~ items-center justify-between">
              <span text="sm neutral-500 dark:neutral-400">基础爱心币</span>
              <span text="sm pink-600 dark:pink-300" font-semibold>{{ selectedPack.coins.toLocaleString('zh-CN') }}</span>
            </div>
            <div v-if="selectedPack.bonus > 0" flex="~ items-center justify-between">
              <span text="sm neutral-500 dark:neutral-400">赠送</span>
              <span text="sm green-500 dark:green-400" font-semibold>+{{ selectedPack.bonus.toLocaleString('zh-CN') }}</span>
            </div>

            <!-- 首充翻倍明细 -->
            <template v-if="wallet?.isFirstCharge">
              <div
                my-1 h-px
                class="bg-neutral-200/50 dark:bg-neutral-700/50"
              />
              <div flex="~ items-center justify-between">
                <span text="sm amber-600 dark:amber-400" font-medium>首充基础币翻倍</span>
                <span text="sm amber-600 dark:amber-400" font-semibold>{{ selectedPack.coins.toLocaleString('zh-CN') }} × 2 = {{ (selectedPack.coins * 2).toLocaleString('zh-CN') }}</span>
              </div>
              <div v-if="selectedPack.bonus > 0" flex="~ items-center justify-between">
                <span text="sm neutral-500 dark:neutral-400">+ 赠送</span>
                <span text="sm green-500 dark:green-400" font-semibold>+{{ selectedPack.bonus.toLocaleString('zh-CN') }}</span>
              </div>
              <div flex="~ items-center justify-between" pt-1>
                <span text="sm neutral-700 dark:neutral-200" font-bold>实得总计</span>
                <span text="base pink-600 dark:pink-300" font-bold>{{ getEffectiveCoins(selectedPack.coins, selectedPack.bonus).toLocaleString('zh-CN') }} 爱心币</span>
              </div>
            </template>

            <!-- 非首充总计 -->
            <template v-else>
              <div
                my-1 h-px
                class="bg-neutral-200/50 dark:bg-neutral-700/50"
              />
              <div flex="~ items-center justify-between">
                <span text="sm neutral-700 dark:neutral-200" font-bold>总计</span>
                <span text="base pink-600 dark:pink-300" font-bold>{{ getEffectiveCoins(selectedPack.coins, selectedPack.bonus).toLocaleString('zh-CN') }} 爱心币</span>
              </div>
            </template>
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
              确认支付 ¥{{ selectedPack.price }}
            </Button>
            <button
              w-full rounded-lg py-2
              text="sm neutral-500 dark:neutral-400"
              class="bg-transparent hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
              transition="colors duration-150"
              :disabled="isCharging"
              @click="showConfirm = false"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 支付处理中全屏遮罩 -->
  <Teleport to="body">
    <div v-if="isCharging" fixed inset-0 z-150 flex items-center justify-center bg="black/30">
      <div bg="white dark:neutral-900" rounded-2xl p-6 flex="~ col items-center gap-3">
        <div i-svg-spinners:ring-resize text-3xl text-primary-500 />
        <span text="sm neutral-600 dark:neutral-300">支付处理中...</span>
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
