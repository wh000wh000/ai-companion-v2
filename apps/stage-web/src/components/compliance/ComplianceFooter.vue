<script setup lang="ts">
/**
 * 合规底部组件
 * 用于充值页等涉及消费的页面底部，展示理性消费提示、未成年人保护、隐私政策等合规文案
 */
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <div mt-4 px-4 py-3 text-center text="xs gray-400 dark:gray-500" space-y-1>
    <p>{{ t('economy.compliance.rationalConsumption') }}</p>
    <p>{{ t('economy.compliance.minorProtection') }}</p>
    <div flex justify-center gap-4>
      <a
        href="/privacy"
        class="text-blue-400 dark:text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline cursor-pointer"
        @click.prevent="router.push('/privacy')"
      >
        {{ t('economy.compliance.privacyPolicy') }}
      </a>
      <a
        href="/terms"
        class="text-blue-400 dark:text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline cursor-pointer"
        @click.prevent="router.push('/terms')"
      >
        {{ t('economy.compliance.termsOfService') }}
      </a>
    </div>
    <p text="gray-500 dark:gray-600">
      {{ t('economy.compliance.serviceProvider') }}
    </p>
  </div>
</template>
