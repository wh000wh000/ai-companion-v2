<script setup lang="ts">
import { Button } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { usePaymentStore } from '../../stores/payment'
import { CHARGE_PACKAGES, useWalletStore } from '../../stores/wallet'

const router = useRouter()
const walletStore = useWalletStore()
const paymentStore = usePaymentStore()
const { wallet } = storeToRefs(walletStore)

const selectedPackId = ref<string | null>(null)
const isCharging = ref(false)

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
    return (coins + bonus) * 2
  return coins + bonus
}

async function handleCharge() {
  if (!selectedPackId.value)
    return

  isCharging.value = true
  try {
    const idempotencyKey = crypto.randomUUID()

    // 1. 创建支付订单
    const { order } = await paymentStore.createOrder(selectedPackId.value, idempotencyKey)

    // 2. Mock 支付（开发模式直接调用，正式环境替换为真实支付网关）
    await paymentStore.mockPay(order.id)

    // 3. 刷新钱包余额
    await walletStore.fetchWallet()

    const pack = CHARGE_PACKAGES.find(p => p.packId === selectedPackId.value)
    toast.success(`充值成功！获得 ${getEffectiveCoins(pack?.coins ?? 0, pack?.bonus ?? 0).toLocaleString('zh-CN')} 爱心币`)

    selectedPackId.value = null
    paymentStore.clearOrder()
  }
  catch {
    toast.error('充值失败，请稍后重试')
  }
  finally {
    isCharging.value = false
  }
}
</script>

<template>
  <div flex="~ col gap-6" p-4 max-w-lg mx-auto w-full>
    <!-- Header -->
    <div flex="~ items-center gap-2">
      <button
        p-2.5 rounded-lg min-w-11 min-h-11
        bg="transparent hover:neutral-100/50 dark:hover:neutral-800/50"
        @click="router.back()"
      >
        <div i-lucide-arrow-left text="lg neutral-600 dark:neutral-300" />
      </button>
      <span text="xl neutral-800 dark:neutral-100" font-bold>充值中心</span>
    </div>

    <!-- Current Balance -->
    <div
      flex="~ items-center justify-between"
      rounded-xl p-4
      bg="neutral-50/60 dark:neutral-800/50"
      border="1 solid neutral-200/30 dark:neutral-700/30"
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
      bg="gradient-to-r from-amber-500/15 to-orange-500/15 dark:from-amber-700/20 dark:to-orange-700/20"
      border="1 solid amber-300/40 dark:amber-700/30"
      flex="~ items-center gap-3"
    >
      <div
        flex items-center justify-center
        w-10 h-10 rounded-full
        bg="amber-500/20"
      >
        <div i-lucide-zap text="xl amber-500" />
      </div>
      <div flex="~ col">
        <span text="sm amber-700 dark:amber-200" font-bold>首充双倍</span>
        <span text="xs amber-600/80 dark:amber-300/70">首次充值任意档位，爱心币翻倍！</span>
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
          absolute top--2 right-2
          rounded-full px-2 py-0.5
          text="xs white"
          :class="[
            pack.tag === '最受欢迎' ? 'bg-pink-500' : '',
            pack.tag === '体验档' ? 'bg-blue-500' : '',
            pack.tag === '顶级档' ? 'bg-amber-500' : '',
          ]"
          font-medium
        >
          {{ pack.tag }}
        </div>

        <!-- Pack Name -->
        <div text="sm neutral-800 dark:neutral-100" font-semibold mb-2>
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
      </div>
    </div>

    <!-- Confirm Button -->
    <div sticky bottom-4>
      <Button
        variant="primary"
        block
        size="lg"
        :disabled="!selectedPackId || isCharging"
        :loading="isCharging"
        @click="handleCharge"
      >
        <span v-if="selectedPackId">
          确认充值 ¥{{ CHARGE_PACKAGES.find(p => p.packId === selectedPackId)?.price }}
        </span>
        <span v-else>请选择充值套餐</span>
      </Button>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
