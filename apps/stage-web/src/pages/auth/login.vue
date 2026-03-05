<script setup lang="ts">
import type { OAuthProvider } from '@proj-airi/stage-ui/libs/auth'

import { LoginDrawer } from '@proj-airi/stage-ui/components/auth'
import { fetchSession, signIn, signInWithEmail, signUpWithEmail } from '@proj-airi/stage-ui/libs/auth'
import { Button } from '@proj-airi/ui'
import { useMediaQuery } from '@vueuse/core'
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

const router = useRouter()

const isDesktop = useMediaQuery('(min-width: 768px)')

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
        router.replace('/')
      }
    }
    else {
      const result = await signInWithEmail(email.value, password.value)
      if (result.error) {
        toast.error(result.error.message || '登录失败')
      }
      else {
        router.replace('/')
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

onMounted(() => {
  fetchSession()
    .then((authenticated) => {
      if (authenticated || !isDesktop.value) {
        router.replace('/')
      }
    })
    .catch(() => {})
})

watch(isDesktop, (val) => {
  if (!val) {
    router.replace('/')
  }
})
</script>

<template>
  <div v-if="isDesktop" class="min-h-screen flex flex-col items-center justify-center">
    <div class="mb-8 text-3xl font-bold">
      {{ isSignUp ? '创建账号' : '登录 伪春菜' }}
    </div>
    <div class="max-w-xs w-full flex flex-col gap-3">
      <!-- OAuth Buttons -->
      <Button
        :class="['w-full', 'py-2', 'flex', 'items-center', 'justify-center']"
        :loading="loading.google"
        @click="handleSignIn('google')"
      >
        <div v-if="!loading.google" class="i-simple-icons-google" />
        <span>Google</span>
      </Button>
      <Button
        :class="['w-full', 'py-2', 'flex', 'items-center', 'justify-center']"
        :loading="loading.github"
        @click="handleSignIn('github')"
      >
        <div v-if="!loading.github" class="i-simple-icons-github" />
        <span>GitHub</span>
      </Button>

      <!-- Divider -->
      <div class="my-4 flex items-center gap-3">
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
          class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-blue-500 dark:focus:bg-neutral-700"
        >
        <input
          v-model="email"
          type="email"
          placeholder="邮箱"
          autocomplete="email"
          class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-blue-500 dark:focus:bg-neutral-700"
        >
        <input
          v-model="password"
          type="password"
          placeholder="密码"
          autocomplete="current-password"
          class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-blue-500 dark:focus:bg-neutral-700"
        >
        <Button
          type="submit"
          :class="['w-full', 'py-2', 'flex', 'items-center', 'justify-center']"
          :loading="emailLoading"
        >
          {{ isSignUp ? '创建账号' : '登录' }}
        </Button>
      </form>

      <!-- Toggle Sign Up / Sign In -->
      <div class="mt-2 text-center text-sm">
        <span class="text-gray-400">{{ isSignUp ? '已有账号？' : '还没有账号？' }}</span>
        <button
          type="button"
          class="ml-1 text-blue-500 underline hover:text-blue-600"
          @click="toggleMode"
        >
          {{ isSignUp ? '去登录' : '去注册' }}
        </button>
      </div>
    </div>
    <div class="mt-8 text-xs text-gray-400">
      继续即表示您同意我们的<a href="#" class="underline">服务条款</a>和<a href="#" class="underline">隐私政策</a>。
    </div>
  </div>

  <div v-else class="min-h-screen flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-950">
    <div class="mb-12 flex flex-col items-center gap-4">
      <img src="../../assets/logo.svg" class="h-24 w-24 rounded-3xl shadow-lg">
      <div class="text-3xl font-bold">
        伪春菜
      </div>
    </div>

    <LoginDrawer :open="true" />
  </div>
</template>
