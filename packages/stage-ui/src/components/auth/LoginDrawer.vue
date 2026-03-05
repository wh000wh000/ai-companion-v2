<script setup lang="ts">
import type { OAuthProvider } from '../../libs/auth'

import { Button } from '@proj-airi/ui'
import { useResizeObserver, useScreenSafeArea } from '@vueuse/core'
import { DrawerContent, DrawerHandle, DrawerOverlay, DrawerPortal, DrawerRoot } from 'vaul-vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

import { signIn, signInWithEmail, signUpWithEmail } from '../../libs/auth'

const open = defineModel<boolean>('open', { required: true })

const screenSafeArea = useScreenSafeArea()
useResizeObserver(document.documentElement, () => screenSafeArea.update())

const loading = ref<Record<OAuthProvider, boolean>>({
  google: false,
  github: false,
})

const isSignUp = ref(false)
const emailLoading = ref(false)
const email = ref('')
const password = ref('')
const name = ref('')

async function handleSignIn(provider: OAuthProvider) {
  loading.value[provider] = true
  try {
    await signIn(provider)
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : '发生未知错误')
  }
  finally {
    loading.value[provider] = false
  }
}

async function handleEmailAuth() {
  if (!email.value.trim() || !password.value.trim()) {
    toast.error('请填写所有字段')
    return
  }

  if (isSignUp.value && !name.value.trim()) {
    toast.error('请输入昵称')
    return
  }

  emailLoading.value = true
  try {
    if (isSignUp.value) {
      const result = await signUpWithEmail(email.value, password.value, name.value)
      if (result.error) {
        toast.error(result.error.message || '注册失败')
      }
      else {
        toast.success('账号创建成功')
      }
    }
    else {
      const result = await signInWithEmail(email.value, password.value)
      if (result.error) {
        toast.error(result.error.message || '登录失败')
      }
    }
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : '发生未知错误')
  }
  finally {
    emailLoading.value = false
  }
}

function toggleMode() {
  isSignUp.value = !isSignUp.value
}
</script>

<template>
  <DrawerRoot v-model:open="open" should-scale-background>
    <DrawerPortal>
      <DrawerOverlay class="fixed inset-0 z-1000 bg-black/40" />
      <DrawerContent
        class="fixed bottom-0 left-0 right-0 z-1001 flex flex-col rounded-t-3xl bg-white outline-none dark:bg-neutral-900"
        :style="{ paddingBottom: `${Math.max(Number.parseFloat(screenSafeArea.bottom.value.replace('px', '')), 24)}px` }"
      >
        <div class="px-6 pt-2">
          <DrawerHandle class="mb-6" />
          <div class="mb-6 text-2xl font-bold">
            {{ isSignUp ? '创建账号' : '登录' }}
          </div>
          <!-- OAuth Buttons -->
          <div class="flex flex-col gap-4">
            <Button
              :class="['w-full', 'py-4', 'flex', 'items-center', 'justify-center', 'gap-3', 'text-lg', 'rounded-2xl']"
              :loading="loading.google"
              @click="handleSignIn('google')"
            >
              <div v-if="!loading.google" class="i-simple-icons-google text-xl" />
              <span>Google 登录</span>
            </Button>
            <Button
              :class="['w-full', 'py-4', 'flex', 'items-center', 'justify-center', 'gap-3', 'text-lg', 'rounded-2xl']"
              :loading="loading.github"
              @click="handleSignIn('github')"
            >
              <div v-if="!loading.github" class="i-simple-icons-github text-xl" />
              <span>GitHub 登录</span>
            </Button>
          </div>

          <!-- Divider -->
          <div class="my-6 flex items-center gap-4">
            <div class="h-px flex-1 bg-gray-200 dark:bg-neutral-700" />
            <span class="text-sm text-gray-400">或使用邮箱登录</span>
            <div class="h-px flex-1 bg-gray-200 dark:bg-neutral-700" />
          </div>

          <!-- Email Form -->
          <form class="flex flex-col gap-3" @submit.prevent="handleEmailAuth">
            <input
              v-if="isSignUp"
              v-model="name"
              type="text"
              placeholder="昵称"
              autocomplete="name"
              class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none transition-colors focus:border-blue-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-blue-500 dark:focus:bg-neutral-700"
            >
            <input
              v-model="email"
              type="email"
              placeholder="邮箱"
              autocomplete="email"
              class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none transition-colors focus:border-blue-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-blue-500 dark:focus:bg-neutral-700"
            >
            <input
              v-model="password"
              type="password"
              placeholder="密码"
              autocomplete="current-password"
              class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none transition-colors focus:border-blue-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-blue-500 dark:focus:bg-neutral-700"
            >
            <Button
              type="submit"
              :class="['w-full', 'py-4', 'flex', 'items-center', 'justify-center', 'text-lg', 'rounded-2xl']"
              :loading="emailLoading"
            >
              {{ isSignUp ? '创建账号' : '邮箱登录' }}
            </Button>
          </form>

          <!-- Toggle Sign Up / Sign In -->
          <div class="mt-4 text-center text-sm">
            <span class="text-gray-400">{{ isSignUp ? '已有账号？' : '还没有账号？' }}</span>
            <button
              type="button"
              class="ml-1 text-blue-500 underline hover:text-blue-600"
              @click="toggleMode"
            >
              {{ isSignUp ? '去登录' : '去注册' }}
            </button>
          </div>

          <div class="mt-6 pb-2 text-center text-xs text-gray-400">
            继续即表示您同意我们的<a href="#" class="underline">服务条款</a>和<a href="#" class="underline">隐私政策</a>。
          </div>
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>
