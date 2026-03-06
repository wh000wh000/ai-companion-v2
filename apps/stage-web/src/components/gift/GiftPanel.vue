<script setup lang="ts">
import { GIFT_TIERS, useTrustStore } from '../../stores/trust'
import { useWalletStore } from '../../stores/wallet'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  characterId: string
}>()

const visible = defineModel<boolean>('visible', { default: false })

const emit = defineEmits<{
  'gift-sent': [tier: string, result: unknown]
}>()

const trustStore = useTrustStore()
const walletStore = useWalletStore()
const router = useRouter()
const selectedTier = ref<string | null>(null)
const sending = ref(false)
const giftError = ref<string | null>(null)

// 从 walletStore 获取真实余额（API 字段名为 coinBalance）
const balance = computed(() => walletStore.wallet?.coinBalance ?? 0)

const insufficientBalance = computed(() => {
  if (!selectedTier.value) return false
  const tier = GIFT_TIERS.find(t => t.id === selectedTier.value)
  return tier ? balance.value < tier.cost : false
})

/** 礼物温度描述映射 — 用温暖文案替代数字 */
const tierDescriptions: Record<string, string> = {
  small: '一份默默的关心',
  warm: '让TA今天更开心',
  love: '满满的爱意',
  forever: '最珍贵的心意',
}

onMounted(async () => {
  // 确保钱包数据已加载
  if (!walletStore.wallet) {
    await walletStore.fetchWallet()
  }
})

function selectTier(tierId: string) {
  selectedTier.value = selectedTier.value === tierId ? null : tierId
  giftError.value = null
}

async function confirmGift() {
  if (!selectedTier.value || sending.value || insufficientBalance.value)
    return

  sending.value = true
  giftError.value = null
  try {
    // 通过 walletStore 执行扣款（服务端自动处理信赖增长）
    const idempotencyKey = crypto.randomUUID()
    const walletResult = await walletStore.sendGift(props.characterId, selectedTier.value, idempotencyKey)

    // 刷新信赖状态（服务端 /api/wallet/gift 已自动加信赖，这里只拉取最新数据）
    await trustStore.refreshAfterGift(props.characterId)

    emit('gift-sent', selectedTier.value, walletResult)
    selectedTier.value = null
    visible.value = false
  }
  catch (e) {
    giftError.value = e instanceof Error ? e.message : '送礼失败，请重试'
  }
  finally {
    sending.value = false
  }
}

function goToCharge() {
  visible.value = false
  router.push('/wallet/charge')
}

function close() {
  visible.value = false
  selectedTier.value = null
  giftError.value = null
}
</script>

<template>
  <Teleport to="body">
    <Transition name="gift-panel">
      <div
        v-if="visible"
        fixed inset-0 z-100 flex items-end justify-center
        @click.self="close"
      >
        <!-- Backdrop -->
        <div
          absolute inset-0 bg="black/40"
          class="gift-backdrop"
          @click="close"
        />

        <!-- Panel -->
        <div
          relative z-1 w-full max-w-lg
          bg="white dark:neutral-900"
          rounded="t-2xl"
          shadow-2xl
          class="gift-panel-content"
          max-h-85vh sm:max-h-none
          overflow-y-auto
        >
          <!-- Header — 去商业化 -->
          <div flex items-center justify-between px-5 pt-5 pb-2>
            <h3 text="lg neutral-800 dark:neutral-100" font-bold>
              送一份心意
            </h3>
            <button
              text="sm neutral-400 hover:neutral-600 dark:hover:neutral-300"
              class="bg-transparent"
              transition-colors
              @click="close"
            >
              关闭
            </button>
          </div>

          <!-- Gift Grid — 温暖描述替代数字 -->
          <div grid grid-cols-2 gap-3 px-5 py-4>
            <button
              v-for="tier in GIFT_TIERS"
              :key="tier.id"
              :class="[
                'gift-card',
                'flex flex-col items-center gap-2 rounded-xl p-4 min-h-[88px]',
                'border-2 transition-all duration-200',
                'active:scale-95',
                selectedTier === tier.id
                  ? 'border-primary-400 bg-primary-50/80 dark:bg-primary-900/30 dark:border-primary-500 shadow-md'
                  : 'border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-50/50 dark:bg-neutral-800/50 hover:border-primary-200 dark:hover:border-primary-700',
                balance < tier.cost ? 'opacity-50' : '',
              ]"
              @click="selectTier(tier.id)"
            >
              <span text="3xl" class="gift-emoji">{{ tier.emoji }}</span>
              <span text="sm neutral-800 dark:neutral-100" font-medium>{{ tier.name }}</span>
              <!-- 温暖描述替代"消耗XX爱心币" -->
              <span text="xs neutral-400 dark:neutral-500">{{ tierDescriptions[tier.id] || '' }}</span>
            </button>
          </div>

          <!-- Footer -->
          <div px-5 pb-5 flex flex-col gap-2>
            <button
              :disabled="!selectedTier || sending || insufficientBalance"
              :class="[
                'w-full rounded-xl py-3 font-bold text-white transition-all duration-200',
                !selectedTier || sending || insufficientBalance
                  ? 'bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed'
                  : 'bg-primary-500 hover:bg-primary-600 active:scale-[0.98] shadow-lg shadow-primary-500/25',
              ]"
              @click="confirmGift"
            >
              <span v-if="sending">送出中...</span>
              <span v-else-if="insufficientBalance">心意不够了</span>
              <span v-else-if="!selectedTier">选一份心意吧</span>
              <span v-else>确认送出</span>
            </button>
            <!-- 错误提示 -->
            <div
              v-if="giftError"
              text="sm neutral-500 dark:neutral-400"
              text-center py-1
            >
              {{ giftError }}
            </div>
            <!-- 余额不足 — 柔和链接风格 -->
            <button
              v-if="insufficientBalance && selectedTier"
              text="sm primary-500 hover:primary-600"
              w-full py-1 transition-colors
              @click="goToCharge"
            >
              心意不够了？去添加一些吧
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.gift-panel-enter-active,
.gift-panel-leave-active {
  transition: all 0.3s ease;
}

.gift-panel-enter-active .gift-backdrop,
.gift-panel-leave-active .gift-backdrop {
  transition: opacity 0.3s ease;
}

.gift-panel-enter-active .gift-panel-content,
.gift-panel-leave-active .gift-panel-content {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.gift-panel-enter-from .gift-backdrop,
.gift-panel-leave-to .gift-backdrop {
  opacity: 0;
}

.gift-panel-enter-from .gift-panel-content,
.gift-panel-leave-to .gift-panel-content {
  transform: translateY(100%);
}

.gift-emoji {
  animation: gift-float 2s ease-in-out infinite;
}

@keyframes gift-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.gift-card:hover .gift-emoji {
  animation-duration: 0.8s;
}
</style>
