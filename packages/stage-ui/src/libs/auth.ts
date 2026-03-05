import { createAuthClient } from 'better-auth/vue'

import { useAuthStore } from '../stores/auth'

export type OAuthProvider = 'google' | 'github'

// Vercel 部署时 VITE_SERVER_URL 留空，使用 window.location.origin（同域代理）
// 本地开发时由 vite.config.ts server.proxy 代理 /api -> localhost:3002
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://airi-api.moeru.ai')

export const authClient = createAuthClient({
  baseURL: SERVER_URL,
  credentials: 'include',
})

export async function fetchSession() {
  const { data } = await authClient.getSession()
  if (data) {
    const authStore = useAuthStore()

    authStore.user = data.user
    authStore.session = data.session
    return true
  }

  return false
}

export async function listSessions() {
  return await authClient.listSessions()
}

export async function signOut() {
  await authClient.signOut()

  const authStore = useAuthStore()
  authStore.user = undefined
  authStore.session = undefined
}

export async function signIn(provider: OAuthProvider) {
  return await authClient.signIn.social({
    provider,
    callbackURL: window.location.origin,
  })
}

export async function signInWithEmail(email: string, password: string) {
  const result = await authClient.signIn.email({
    email,
    password,
  })

  if (result.data) {
    await fetchSession()
  }

  return result
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  const result = await authClient.signUp.email({
    email,
    password,
    name,
  })

  if (result.data) {
    await fetchSession()
  }

  return result
}
