import type { HonoEnv } from './types/hono'

import process from 'node:process'

import { initLogger, LoggerFormat, LoggerLevel, useLogger } from '@guiiai/logg'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { createLoggLogger, injeca } from 'injeca'

import { createAuth } from './libs/auth'
import { createDrizzle, migrateDatabase } from './libs/db'
import { parsedEnv } from './libs/env'
import { createOpenClawClient } from './libs/openclaw-client'
import { sessionMiddleware } from './middlewares/auth'
import { closeAllConnections, setupWebSocketServer } from './libs/ws-push'
import { createOpenClawFallback } from './middlewares/openclaw-fallback'
import { createChannelSyncRoutes } from './routes/channel-sync'
import { createCharacterRoutes } from './routes/characters'
import { createChatRoute } from './routes/chat'
import { createChatRoutes } from './routes/chats'
import { createMemoryRoutes } from './routes/memory'
import { createNarrativePaymentRoutes } from './routes/narrative-payment'
import { createO2ORoutes } from './routes/o2o'
import { createPaymentRoutes } from './routes/payment'
import { createProactiveRoutes } from './routes/proactive'
import { createProviderRoutes } from './routes/providers'
import { createSkillsRoutes } from './routes/skills'
import { createSurpriseRoutes } from './routes/surprises'
import { createTrustRoutes } from './routes/trust'
import { createTTSRoutes } from './routes/tts'
import { createWalletRoutes } from './routes/wallet'
import { seedPresetCharacters } from './seeds/characters'
import { createChannelSyncService } from './services/channel-sync'
import { createCharacterService } from './services/characters'
import { createChatService } from './services/chats'
import { createEconomyService } from './services/economy'
import { createMemoryService } from './services/memory'
import { createNarrativePaymentService } from './services/narrative-payment'
import { createO2OService } from './services/o2o'
import { createOpenClawService } from './services/openclaw'
import { createOpenRouterService } from './services/openrouter'
import { createPaymentService } from './services/payment'
import { createProviderService } from './services/providers'
import { createSurpriseService } from './services/surprises'
import { createTrustService } from './services/trust'
import { createTTSService } from './services/tts'
import { ApiError, createInternalError } from './utils/error'
import { getTrustedOrigin } from './utils/origin'

type AuthService = ReturnType<typeof createAuth>
type CharacterService = ReturnType<typeof createCharacterService>
type ChatService = ReturnType<typeof createChatService>
type ProviderService = ReturnType<typeof createProviderService>
type EconomyService = ReturnType<typeof createEconomyService>
type TrustService = ReturnType<typeof createTrustService>
type SurpriseService = ReturnType<typeof createSurpriseService>
type OpenClawService = ReturnType<typeof createOpenClawService>
type OpenClawFallbackType = ReturnType<typeof createOpenClawFallback>
type TTSServiceType = ReturnType<typeof createTTSService>
type MemoryServiceType = ReturnType<typeof createMemoryService>
type O2OServiceType = ReturnType<typeof createO2OService>
type PaymentServiceType = ReturnType<typeof createPaymentService>
type NarrativePaymentServiceType = ReturnType<typeof createNarrativePaymentService>
type ChannelSyncServiceType = ReturnType<typeof createChannelSyncService>
type OpenRouterServiceType = ReturnType<typeof createOpenRouterService>

interface AppDeps {
  auth: AuthService
  characterService: CharacterService
  chatService: ChatService
  providerService: ProviderService
  economyService: EconomyService
  trustService: TrustService
  surpriseService: SurpriseService
  memoryService: MemoryServiceType
  openclawService: OpenClawService
  openclawFallback: OpenClawFallbackType
  openclawToken: string | undefined
  ttsService: TTSServiceType
  o2oService: O2OServiceType
  paymentService: PaymentServiceType
  narrativePaymentService: NarrativePaymentServiceType
  channelSyncService: ChannelSyncServiceType
  openrouterService: OpenRouterServiceType
  defaultCharacterId: string
}

function buildApp({ auth, characterService, chatService, providerService, economyService, trustService, surpriseService, memoryService, openclawService, openclawFallback, openclawToken, ttsService, o2oService, paymentService, narrativePaymentService, channelSyncService, openrouterService, defaultCharacterId }: AppDeps) {
  const logger = useLogger('app').useGlobalConfig()

  return new Hono<HonoEnv>()
    .use(
      '/api/*',
      cors({
        origin: origin => getTrustedOrigin(origin),
        credentials: true,
      }),
    )
    .use(honoLogger())
    .use('*', sessionMiddleware(auth))
    .use('*', bodyLimit({ maxSize: 1024 * 1024 }))
    .onError((err, c) => {
      if (err instanceof ApiError) {
        logger.withError(err).warn('API error occurred')

        return c.json({
          error: err.errorCode,
          message: err.message,
          details: err.details,
        }, err.statusCode)
      }

      logger.withError(err).error('Unhandled error')
      const internalError = createInternalError()
      return c.json({
        error: internalError.errorCode,
        message: internalError.message,
      }, internalError.statusCode)
    })

    /**
     * Health check route.
     */
    .on('GET', '/health', c => c.json({ status: 'ok' }))

    /**
     * Auth routes are handled by the auth instance directly,
     * Powered by better-auth.
     */
    .on(['POST', 'GET'], '/api/auth/*', async (c) => {
      try {
        return await auth.handler(c.req.raw)
      }
      catch (err) {
        logger.withError(err).error('Auth handler error')
        return c.json({ error: 'AUTH_ERROR', message: String(err) }, 500)
      }
    })

    /**
     * Character routes are handled by the character service.
     */
    .route('/api/characters', createCharacterRoutes(characterService))

    /**
     * Provider routes are handled by the provider service.
     */
    .route('/api/providers', createProviderRoutes(providerService))

    /**
     * Chat routes are handled by the chat service.
     */
    .route('/api/chats', createChatRoutes(chatService))

    /**
     * Wallet routes are handled by the economy service.
     */
    .route('/api/wallet', createWalletRoutes(economyService, trustService))

    /**
     * 支付路由 — 创建订单/回调/查询/Mock支付
     */
    .route('/api/payment', createPaymentRoutes(paymentService, economyService))

    /**
     * 叙事支付路由 — 去商业化付费体验，每一笔都是"为角色做一件事"
     */
    .route('/api/narrative', createNarrativePaymentRoutes(narrativePaymentService))

    /**
     * Trust routes are handled by the trust service.
     */
    .route('/api/trust', createTrustRoutes(trustService))

    /**
     * Surprise routes are handled by the surprise service.
     */
    .route('/api/surprises', createSurpriseRoutes(surpriseService, o2oService))

    /**
     * TTS 语音合成路由 — CosyVoice V2 封装（Lv.7+ 门控）
     */
    .route('/api/tts', createTTSRoutes(ttsService, trustService))

    /**
     * 记忆管理路由 — 保存/搜索/查询/删除记忆（Gateway Token 认证）
     */
    .route('/api/memory', createMemoryRoutes(memoryService, openclawToken))

    /**
     * OpenClaw Skills API — Agent 通过 HTTP 调用引擎能力（Gateway Token 认证）
     */
    .route('/api/skills', createSkillsRoutes(trustService, economyService, surpriseService, openclawToken, memoryService))

    /**
     * O2O 惊喜选品 API — 智能选品 + 链接生成 + 惊喜推送（Gateway Token 认证）
     */
    .route('/api/skills/o2o', createO2ORoutes(o2oService, openclawToken))

    /**
     * 主动消息推送 API — Agent 通过 HTTP 推送消息给在线用户（Gateway Token 认证）
     */
    .route('/api/skills/proactive', createProactiveRoutes(openclawToken))

    /**
     * 渠道同步路由 — 绑定/解绑/查询/解析跨渠道用户身份
     */
    .route('/api/channels', createChannelSyncRoutes(channelSyncService, openclawToken))

    /**
     * OpenClaw chat routes — dual-channel (OpenClaw Agent / fallback LLM).
     */
    .route('/api/chat', createChatRoute(openclawService, openclawFallback, openrouterService, characterService, defaultCharacterId))
}

export type AppType = ReturnType<typeof buildApp>

async function createApp() {
  initLogger(LoggerLevel.Debug, LoggerFormat.Pretty)
  injeca.setLogger(createLoggLogger(useLogger('injeca').useGlobalConfig()))
  const logger = useLogger('app').useGlobalConfig()

  const db = injeca.provide('services:db', {
    dependsOn: { env: parsedEnv },
    build: async ({ dependsOn }) => {
      const dbInstance = createDrizzle(dependsOn.env.DATABASE_URL)
      await dbInstance.execute('SELECT 1')
      logger.log('Connected to database')
      await migrateDatabase(dbInstance)
      logger.log('Applied schema')

      // 预置角色种子数据（幂等）
      await seedPresetCharacters(dbInstance)
      logger.log('Preset characters seeded')

      return dbInstance
    },
  })

  const auth = injeca.provide('services:auth', {
    dependsOn: { db, env: parsedEnv },
    build: ({ dependsOn }) => createAuth(dependsOn.db, dependsOn.env),
  })

  const characterService = injeca.provide('services:characters', {
    dependsOn: { db },
    build: ({ dependsOn }) => createCharacterService(dependsOn.db),
  })

  const providerService = injeca.provide('services:providers', {
    dependsOn: { db },
    build: ({ dependsOn }) => createProviderService(dependsOn.db),
  })

  const chatService = injeca.provide('services:chats', {
    dependsOn: { db },
    build: ({ dependsOn }) => createChatService(dependsOn.db),
  })

  const economyService = injeca.provide('services:economy', {
    dependsOn: { db },
    build: ({ dependsOn }) => createEconomyService(dependsOn.db),
  })

  const trustService = injeca.provide('services:trust', {
    dependsOn: { db },
    build: ({ dependsOn }) => createTrustService(dependsOn.db),
  })

  const surpriseService = injeca.provide('services:surprises', {
    dependsOn: { db },
    build: ({ dependsOn }) => createSurpriseService(dependsOn.db),
  })

  const memoryService = injeca.provide('services:memory', {
    dependsOn: { db },
    build: ({ dependsOn }) => createMemoryService(dependsOn.db),
  })

  const paymentService = injeca.provide('services:payment', {
    dependsOn: { db },
    build: ({ dependsOn }) => createPaymentService(dependsOn.db),
  })

  const narrativePaymentService = injeca.provide('services:narrative-payment', {
    dependsOn: { db },
    build: ({ dependsOn }) => createNarrativePaymentService(dependsOn.db),
  })

  const channelSyncService = injeca.provide('services:channel-sync', {
    dependsOn: { db },
    build: ({ dependsOn }) => createChannelSyncService(dependsOn.db),
  })

  const o2oService = injeca.provide('services:o2o', {
    dependsOn: {},
    build: () => createO2OService(),
  })

  const ttsService = injeca.provide('services:tts', {
    dependsOn: { env: parsedEnv },
    build: ({ dependsOn }) => createTTSService({
      apiKey: dependsOn.env.COSYVOICE_API_KEY,
      apiUrl: dependsOn.env.COSYVOICE_API_URL,
    }),
  })

  const openclawService = injeca.provide('services:openclaw', {
    dependsOn: { env: parsedEnv },
    build: ({ dependsOn }) => {
      const url = dependsOn.env.OPENCLAW_URL
      const token = dependsOn.env.OPENCLAW_TOKEN

      if (!url || !token) {
        logger.warn('OPENCLAW_URL or OPENCLAW_TOKEN not set — OpenClaw channel disabled')
        // Return a stub service that always falls back
        const stubClient = createOpenClawClient({ url: 'ws://localhost:0', token: '' })
        return createOpenClawService(stubClient)
      }

      const client = createOpenClawClient({ url, token })
      const service = createOpenClawService(client)

      // Attempt initial connection in background — don't block app start
      service.ensureConnected().catch((err) => {
        logger.withError(err).warn('Initial OpenClaw connection failed — will retry via reconnect')
      })

      return service
    },
  })

  // OpenClaw 降级管理器 — 在 openclawService 之后创建
  const openclawFallback = injeca.provide('services:openclaw-fallback', {
    dependsOn: { openclawService, env: parsedEnv },
    build: ({ dependsOn }) => createOpenClawFallback(
      dependsOn.openclawService,
      Number(dependsOn.env.OPENCLAW_RETRY_INTERVAL_MS) || undefined,
    ),
  })

  // OpenRouter LLM 服务 — fallback 通道，OpenClaw 不可用时直连 LLM
  const openrouterService = injeca.provide('services:openrouter', {
    dependsOn: { env: parsedEnv },
    build: ({ dependsOn }) => {
      const service = createOpenRouterService({
        apiKey: dependsOn.env.OPENROUTER_API_KEY ?? '',
        baseUrl: dependsOn.env.OPENROUTER_BASE_URL,
        model: dependsOn.env.OPENROUTER_MODEL,
        maxTokens: Number(dependsOn.env.OPENROUTER_MAX_TOKENS) || 1024,
      })

      if (service.isAvailable()) {
        logger.log('OpenRouter LLM fallback channel enabled')
      }
      else {
        logger.warn('OPENROUTER_API_KEY not set — fallback LLM channel disabled')
      }

      return service
    },
  })

  await injeca.start()
  const resolved = await injeca.resolve({
    auth,
    characterService,
    chatService,
    providerService,
    economyService,
    trustService,
    surpriseService,
    memoryService,
    ttsService,
    o2oService,
    paymentService,
    narrativePaymentService,
    channelSyncService,
    openclawService,
    openclawFallback,
    openrouterService,
    env: parsedEnv,
  })
  const app = buildApp({
    auth: resolved.auth,
    characterService: resolved.characterService,
    chatService: resolved.chatService,
    providerService: resolved.providerService,
    economyService: resolved.economyService,
    trustService: resolved.trustService,
    surpriseService: resolved.surpriseService,
    memoryService: resolved.memoryService,
    ttsService: resolved.ttsService,
    o2oService: resolved.o2oService,
    paymentService: resolved.paymentService,
    narrativePaymentService: resolved.narrativePaymentService,
    channelSyncService: resolved.channelSyncService,
    openclawService: resolved.openclawService,
    openclawFallback: resolved.openclawFallback,
    openclawToken: resolved.env.OPENCLAW_TOKEN,
    openrouterService: resolved.openrouterService,
    defaultCharacterId: resolved.env.DEFAULT_CHARACTER_ID,
  })

  const port = Number(resolved.env.PORT) || 3001
  logger.withFields({ port }).log('Server started')

  return { app, port, auth: resolved.auth }
}

// eslint-disable-next-line antfu/no-top-level-await
const { app, port, auth } = await createApp()
const server = serve({ fetch: app.fetch, port })

// ─── WebSocket 推送服务初始化 ────────────────────────────────────────────────

setupWebSocketServer(server, async (token) => {
  try {
    // 使用 better-auth 验证 session token
    const session = await auth.api.getSession({ headers: new Headers({ authorization: `Bearer ${token}` }) })
    return session?.user?.id ?? null
  }
  catch {
    return null
  }
})

// ─── 优雅关闭 ──────────────────────────────────────────────────────────────

const SHUTDOWN_TIMEOUT_MS = 30_000

function gracefulShutdown(signal: string) {
  const logger = useLogger('shutdown').useGlobalConfig()
  logger.log(`Received ${signal}, starting graceful shutdown...`)

  const forceExit = setTimeout(() => {
    logger.warn('Graceful shutdown timed out, forcing exit')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  // 允许进程在 timer 到期前自然退出
  forceExit.unref()

  // 1. 停止接受新连接
  server.close(() => {
    logger.log('HTTP server closed')
  })

  // 2. 关闭所有 WebSocket 连接
  closeAllConnections()

  // 3. 停止 injeca 容器（关闭 DB 连接等）
  injeca.stop().then(() => {
    logger.log('DI container stopped')
    process.exit(0)
  }).catch((err) => {
    logger.withError(err).error('Error during DI container shutdown')
    process.exit(1)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

function handleError(error: unknown, type: string) {
  useLogger().withError(error).error(type)
}

process.on('uncaughtException', error => handleError(error, 'Uncaught exception'))
process.on('unhandledRejection', error => handleError(error, 'Unhandled rejection'))
