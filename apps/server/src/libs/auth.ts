import type { Database } from './db'
import type { Env } from './env'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins'

import * as authSchema from '../schemas/accounts'

/**
 * 构建 OAuth social providers 配置
 * 仅当环境变量真正配置时才注册对应 provider，
 * 避免占位值 'not-configured' 导致 betterAuth 初始化异常
 */
function buildSocialProviders(env: Env): Record<string, { clientId: string, clientSecret: string }> {
  const providers: Record<string, { clientId: string, clientSecret: string }> = {}

  if (env.AUTH_GOOGLE_CLIENT_ID !== 'not-configured' && env.AUTH_GOOGLE_CLIENT_SECRET !== 'not-configured') {
    providers.google = {
      clientId: env.AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET,
    }
  }

  if (env.AUTH_GITHUB_CLIENT_ID !== 'not-configured' && env.AUTH_GITHUB_CLIENT_SECRET !== 'not-configured') {
    providers.github = {
      clientId: env.AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.AUTH_GITHUB_CLIENT_SECRET,
    }
  }

  return providers
}

export function createAuth(db: Database, env: Env) {
  const socialProviders = buildSocialProviders(env)

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        ...authSchema,
      },
    }),

    plugins: [
      bearer(),
    ],

    emailAndPassword: {
      enabled: true,
    },

    baseURL: env.API_SERVER_URL,
    trustedOrigins: ['*'],

    // To skip state-mismatch errors
    // https://github.com/better-auth/better-auth/issues/4969#issuecomment-3397804378
    advanced: {
      defaultCookieAttributes: {
        sameSite: 'None', // this enables cross-site cookies
        secure: true, // required for SameSite=None
      },
    },

    // 仅注册已配置的 OAuth provider（占位值 'not-configured' 会被过滤）
    ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
  })
}
