import type { InferOutput } from 'valibot'

import { env, exit } from 'node:process'

import { useLogger } from '@guiiai/logg'
import { injeca } from 'injeca'
import { nonEmpty, object, optional, parse, pipe, string } from 'valibot'

const EnvSchema = object({
  PORT: optional(string(), '3002'),
  API_SERVER_URL: optional(string(), 'http://localhost:3002'),

  DATABASE_URL: pipe(string(), nonEmpty('DATABASE_URL is required')),

  AUTH_GOOGLE_CLIENT_ID: optional(string(), 'not-configured'),
  AUTH_GOOGLE_CLIENT_SECRET: optional(string(), 'not-configured'),
  AUTH_GITHUB_CLIENT_ID: optional(string(), 'not-configured'),
  AUTH_GITHUB_CLIENT_SECRET: optional(string(), 'not-configured'),

  /** OpenClaw WebSocket Gateway URL (e.g. ws://192.168.3.196:3000). Optional — if unset, OpenClaw channel is disabled. */
  OPENCLAW_URL: optional(string()),
  /** OpenClaw Gateway Token for authentication. Optional — if unset, OpenClaw channel is disabled. */
  OPENCLAW_TOKEN: optional(string()),

  /** CosyVoice V2 API Key（阿里云 DashScope）。可选 — 未设置时 TTS 使用 Mock 模式。 */
  COSYVOICE_API_KEY: optional(string()),
  /** CosyVoice V2 API URL。可选 — 默认使用阿里云 DashScope 端点。 */
  COSYVOICE_API_URL: optional(string()),

  /** OpenRouter API Key。可选 — 用于 fallback LLM 通道（OpenClaw 不可用时）。 */
  OPENROUTER_API_KEY: optional(string()),
  /** OpenRouter API Base URL。可选 — 默认 https://openrouter.ai/api/v1 */
  OPENROUTER_BASE_URL: optional(string(), 'https://openrouter.ai/api/v1'),
  /** OpenRouter 默认模型。可选 — 默认 anthropic/claude-sonnet-4 */
  OPENROUTER_MODEL: optional(string(), 'anthropic/claude-sonnet-4'),
})

export type Env = InferOutput<typeof EnvSchema>

export function parseEnv(inputEnv: Record<string, string> | typeof env): Env {
  try {
    return parse(EnvSchema, inputEnv)
  }
  catch (err) {
    useLogger().withError(err).error('Invalid environment variables')
    exit(1)
  }
}

export const parsedEnv = injeca.provide('env', () => parseEnv(env))
