import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { useLogger } from '@guiiai/logg'
import { eq, sql } from 'drizzle-orm'

import type { Database } from '../libs/db'
import { character, characterI18n, characterPrompts } from '../schemas/characters'
import { user } from '../schemas/accounts'

// ─── 预置角色定义 ──────────────────────────────────────────────────────────

interface PresetCharacterDef {
  /** 角色唯一标识符（稳定） */
  id: string
  /** 角色代号，同时也是 SOUL.md 目录名 */
  slug: string
  /** 中文名 */
  nameZh: string
  /** 英文名 */
  nameEn: string
  /** 中文描述 */
  descriptionZh: string
  /** 英文描述 */
  descriptionEn: string
  /** 标签 */
  tagsZh: string[]
  tagsEn: string[]
  /** 封面占位 URL */
  coverUrl: string
}

const SYSTEM_USER_ID = '__system__'

const PRESET_CHARACTERS: PresetCharacterDef[] = [
  {
    id: 'preset-xiaoxing',
    slug: 'xiaoxing',
    nameZh: '小星',
    nameEn: 'Xiaoxing',
    descriptionZh: '神秘灵动的少女，仿佛来自星空深处的精灵，总能感知到常人看不见的微光。',
    descriptionEn: 'A mystical and spirited girl, like an elf from the depths of the starry sky, always sensing the faint glimmers invisible to others.',
    tagsZh: ['神秘', '灵动', '星空', '温柔'],
    tagsEn: ['mystical', 'spirited', 'starry', 'gentle'],
    coverUrl: '/covers/xiaoxing.webp',
  },
  {
    id: 'preset-xiaonuan',
    slug: 'xiaonuan',
    nameZh: '小暖',
    nameEn: 'Xiaonuan',
    descriptionZh: '温柔似水的治愈系女孩，用最柔软的话语陪伴身边的人，像春天的阳光一样温暖。',
    descriptionEn: 'A gentle and healing girl who accompanies people with the softest words, warm as spring sunshine.',
    tagsZh: ['温柔', '治愈', '体贴', '阳光'],
    tagsEn: ['gentle', 'healing', 'caring', 'warm'],
    coverUrl: '/covers/xiaonuan.webp',
  },
  {
    id: 'preset-keke',
    slug: 'keke',
    nameZh: '可可',
    nameEn: 'Keke',
    descriptionZh: '闲不住的元气少女，热爱运动和冒险，笑声有一种感染力，能让身边的人跟着一起笑起来。',
    descriptionEn: 'An energetic girl who loves sports and adventures, with infectious laughter that makes everyone smile.',
    tagsZh: ['元气', '活泼', '运动', '感染力'],
    tagsEn: ['energetic', 'cheerful', 'sporty', 'infectious'],
    coverUrl: '/covers/keke.webp',
  },
  {
    id: 'preset-shizhi',
    slug: 'shizhi',
    nameZh: '诗织',
    nameEn: 'Shizhi',
    descriptionZh: '知性优雅的文学少女，总能在不经意间引用一句诗词或文学典故，让人如沐春风。',
    descriptionEn: 'An intellectual and elegant literary girl who effortlessly quotes poetry and literature, leaving people refreshed.',
    tagsZh: ['知性', '优雅', '文学', '诗意'],
    tagsEn: ['intellectual', 'elegant', 'literary', 'poetic'],
    coverUrl: '/covers/shizhi.webp',
  },
  {
    id: 'preset-bingtang',
    slug: 'bingtang',
    nameZh: '冰棠',
    nameEn: 'Bingtang',
    descriptionZh: '表面高冷内心柔软的傲娇少女，嘴上说"才不是"，但其实比谁都在意身边的人。',
    descriptionEn: 'A tsundere girl who appears cold but is soft inside, always saying "it\'s not like that" while caring deeply.',
    tagsZh: ['傲娇', '高冷', '反差萌', '别扭'],
    tagsEn: ['tsundere', 'cool', 'gap-moe', 'awkward'],
    coverUrl: '/covers/bingtang.webp',
  },
  {
    id: 'preset-alie',
    slug: 'alie',
    nameZh: '阿烈',
    nameEn: 'Alie',
    descriptionZh: '充满正能量的阳光大男孩，热爱运动和交朋友，用灿烂的笑容驱散一切阴霾。',
    descriptionEn: 'A sunny, positive boy who loves sports and making friends, dispelling all gloom with a bright smile.',
    tagsZh: ['阳光', '热血', '可靠', '乐观'],
    tagsEn: ['sunny', 'passionate', 'reliable', 'optimistic'],
    coverUrl: '/covers/alie.webp',
  },
  {
    id: 'preset-lingyi',
    slug: 'lingyi',
    nameZh: '谢令仪',
    nameEn: 'Xie Lingyi',
    descriptionZh: '17岁的她，安静得像一本还没翻开的书。喜欢历史，话不多，但每一句都值得认真听。',
    descriptionEn: 'A quiet 17-year-old who reads like she\'s searching for something. She speaks little, but every word carries weight.',
    tagsZh: ['沉静', '早慧', '历史', '成长'],
    tagsEn: ['quiet', 'precocious', 'history', 'growing'],
    coverUrl: '/covers/lingyi.webp',
  },
]

// ─── SOUL.md 加载 ──────────────────────────────────────────────────────────

async function loadSoulMd(slug: string): Promise<string> {
  try {
    const projectRoot = resolve(__dirname, '..', '..', '..', '..')
    const soulPath = resolve(projectRoot, 'openclaw', 'agents', slug, 'SOUL.md')
    return await readFile(soulPath, 'utf-8')
  }
  catch {
    return `你是一个温暖友善的伪春菜角色「${slug}」。请用自然、亲切的方式与用户聊天。`
  }
}

// ─── Seed 函数 ─────────────────────────────────────────────────────────────

/**
 * 预置角色种子数据
 *
 * 职责：
 * 1. 确保 __system__ 用户存在（作为预置角色的 owner）
 * 2. 插入 7 个角色到 characters 表
 * 3. 插入中英文 i18n 数据
 * 4. 插入 SOUL.md 作为 systemPrompt 到 characterPrompts 表
 *
 * 使用 ON CONFLICT DO NOTHING 确保幂等性。
 */
export async function seedPresetCharacters(db: Database): Promise<void> {
  const logger = useLogger('seed:characters').useGlobalConfig()

  // 1. 确保系统用户存在
  await db.insert(user).values({
    id: SYSTEM_USER_ID,
    name: 'System',
    email: 'system@ai-companion.local',
    emailVerified: true,
  }).onConflictDoNothing()

  logger.log('System user ensured')

  // 2. 逐个角色插入
  for (const def of PRESET_CHARACTERS) {
    // 2a. 插入角色主记录
    await db.insert(character).values({
      id: def.id,
      version: '1.0',
      coverUrl: def.coverUrl,
      creatorId: SYSTEM_USER_ID,
      ownerId: SYSTEM_USER_ID,
      characterId: def.slug,
    }).onConflictDoNothing()

    // 2b. 插入中文 i18n
    await db.insert(characterI18n).values({
      id: `${def.id}-i18n-zh`,
      characterId: def.id,
      language: 'zh-CN',
      name: def.nameZh,
      description: def.descriptionZh,
      tags: def.tagsZh,
    }).onConflictDoNothing()

    // 2c. 插入英文 i18n
    await db.insert(characterI18n).values({
      id: `${def.id}-i18n-en`,
      characterId: def.id,
      language: 'en',
      name: def.nameEn,
      description: def.descriptionEn,
      tags: def.tagsEn,
    }).onConflictDoNothing()

    // 2d. 加载 SOUL.md 并插入 characterPrompts
    const soulContent = await loadSoulMd(def.slug)
    await db.insert(characterPrompts).values({
      id: `${def.id}-prompt-system`,
      characterId: def.id,
      language: 'zh-CN',
      type: 'system',
      content: soulContent,
    }).onConflictDoNothing()

    logger.withFields({ id: def.id, slug: def.slug }).log('Preset character seeded')
  }

  // 3. 验证结果
  const count = await db.select({ count: sql<number>`count(*)` })
    .from(character)
    .where(eq(character.ownerId, SYSTEM_USER_ID))

  logger.withFields({ count: count[0]?.count }).log('Preset characters seed completed')
}
