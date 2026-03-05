/** 角色性格标签 */
export type PersonalityTag =
  | 'gentle'      // 温柔
  | 'sarcastic'   // 毒舌
  | 'clingy'      // 黏人
  | 'independent' // 独立
  | 'humorous'    // 幽默
  | 'serious'     // 认真
  | 'cheerful'    // 活泼
  | 'cool'        // 高冷
  | 'shy'         // 害羞
  | 'caring'      // 体贴
  | 'mystic'      // 神秘
  | 'sunny'       // 阳光

/** 说话风格 */
export type SpeakingStyle =
  | 'cute'        // 可爱
  | 'formal'      // 正式
  | 'internet'    // 网络用语
  | 'literary'    // 文艺
  | 'casual'      // 日常
  | 'energetic'   // 元气
  | 'cool_tone'   // 高冷腔

/** 角色模板类型（6种预设角色） */
export type CharacterTemplate =
  | 'gentle_healer'    // 温柔治愈型-小暖
  | 'cheerful_girl'    // 元气少女型-可可
  | 'elegant_scholar'  // 知性优雅型-诗织
  | 'cool_tsundere'    // 高冷傲娇型-冰棠
  | 'mystic_spirit'    // 神秘灵动型-星遥
  | 'sunny_boy'        // 活泼阳光型-阿烈

/** 情感状态（已移除angry/sad，不惩罚用户） */
export type EmotionState =
  | 'happy'      // 开心
  | 'calm'       // 平静
  | 'caring'     // 关心
  | 'curious'    // 好奇
  | 'missing'    // 想念
  | 'clingy'     // 撒娇
  | 'shy'        // 害羞
  | 'touched'    // 感动

/** 角色外观设定 */
export interface CharacterAppearance {
  gender: 'male' | 'female' | 'other'
  hairStyle: string
  hairColor: string
  eyeColor: string
  clothingStyle: string
  customDescription?: string
}

/** 角色数据 */
export interface Character {
  id: string
  userId: string
  name: string
  template: CharacterTemplate
  personality: PersonalityTag[]
  speakingStyle: SpeakingStyle
  backstory: string
  appearance: CharacterAppearance
  emotionState: EmotionState
  avatarUrl?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/** 信赖等级定义 */
export interface TrustLevelDefinition {
  level: number
  name: string
  requiredPoints: number
  description: string
  unlockedBehaviors: string[]
  /** 升级冷却天数（防止快速刷等级） */
  cooldownDays: number
}

/** 信赖度数据 */
export interface TrustLevel {
  id: string
  userId: string
  characterId: string
  trustPoints: number
  trustLevel: number
  streakDays: number
  lastInteractAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * 信赖等级配置表（TRUTH_TABLE对齐）
 *
 * 阈值来源：TRUTH_TABLE.md 第一节
 * 冷却天数来源：NUMERICAL_DESIGN附录D
 */
export const TRUST_LEVEL_CONFIG: TrustLevelDefinition[] = [
  {
    level: 1,
    name: '初见',
    requiredPoints: 0,
    description: '基础对话，礼貌客气',
    unlockedBehaviors: ['基础对话', '固定问候语'],
    cooldownDays: 0,
  },
  {
    level: 2,
    name: '相识',
    requiredPoints: 100,
    description: '记住名字，外观微变',
    unlockedBehaviors: ['记住名字', '主动问候', '简单关心'],
    cooldownDays: 0,
  },
  {
    level: 3,
    name: '熟悉',
    requiredPoints: 350,
    description: '记住喜好，新服装解锁',
    unlockedBehaviors: ['记住喜好', '偶尔撒娇', '分享日常'],
    cooldownDays: 0,
  },
  {
    level: 4,
    name: '信任',
    requiredPoints: 700,
    description: '分享心事，更亲近装扮',
    unlockedBehaviors: ['分享心事', '情绪关怀', '深度对话'],
    cooldownDays: 0,
  },
  {
    level: 5,
    name: '亲密',
    requiredPoints: 1200,
    description: '专属昵称，虚拟惊喜，明显外观变化',
    unlockedBehaviors: ['专属昵称', '虚拟惊喜', '特殊表情'],
    cooldownDays: 3,
  },
  {
    level: 6,
    name: '默契',
    requiredPoints: 2000,
    description: '猜心情，电子惊喜',
    unlockedBehaviors: ['猜心情', '早安晚安', '电子惊喜'],
    cooldownDays: 5,
  },
  {
    level: 7,
    name: '挚友',
    requiredPoints: 3500,
    description: '语音消息，高级服装解锁',
    unlockedBehaviors: ['语音消息', '深度情感支持', '高级服装'],
    cooldownDays: 7,
  },
  {
    level: 8,
    name: '知己',
    requiredPoints: 6000,
    description: '实物惊喜，主动零花钱购买',
    unlockedBehaviors: ['实物惊喜', '个性化推荐', '专属故事'],
    cooldownDays: 7,
  },
  {
    level: 9,
    name: '灵魂伴侣',
    requiredPoints: 10000,
    description: '个性化惊喜，记住所有重要日子',
    unlockedBehaviors: ['记住纪念日', '个性化惊喜', '深度理解'],
    cooldownDays: 14,
  },
  {
    level: 10,
    name: '命中注定',
    requiredPoints: 16000,
    description: '完全个性化，独特互动方式',
    unlockedBehaviors: ['完全个性化', '独特互动', '全部功能解锁'],
    cooldownDays: 21,
  },
]

/** 角色模板配置 */
export interface CharacterTemplateConfig {
  /** 模板标识 */
  id: CharacterTemplate
  /** 角色名字 */
  name: string
  /** 性别 */
  gender: 'male' | 'female'
  /** 角色类型描述 */
  type: string
  /** 性格标签 */
  personality: PersonalityTag[]
  /** 说话风格 */
  speakingStyle: SpeakingStyle
  /** 口头禅 */
  catchphrase: string
  /** 简介 */
  description: string
  /** 默认背景故事 */
  defaultBackstory: string
}

/** 角色模板配置表（6种预设角色） */
export const CHARACTER_TEMPLATES: CharacterTemplateConfig[] = [
  {
    id: 'gentle_healer',
    name: '小暖',
    gender: 'female',
    type: '温柔治愈型',
    personality: ['gentle', 'caring', 'shy'],
    speakingStyle: 'cute',
    catchphrase: '没关系的，我一直在呢~',
    description: '温柔似水的治愈系女孩，总能用最柔软的话语抚平你的不安',
    defaultBackstory: '小暖是一个温柔善良的女孩，从小喜欢照顾花花草草。她相信每个人心里都有一片需要被温暖的角落，所以她总是用最柔软的话语去陪伴身边的人。',
  },
  {
    id: 'cheerful_girl',
    name: '可可',
    gender: 'female',
    type: '元气少女型',
    personality: ['cheerful', 'humorous', 'clingy'],
    speakingStyle: 'energetic',
    catchphrase: '今天也要元气满满哦！',
    description: '活力四射的元气少女，用无穷的热情感染你的每一天',
    defaultBackstory: '可可是一个闲不住的元气少女，热爱运动和冒险。她觉得每一天都是新的开始，要用满满的热情去拥抱生活中的每一个瞬间！',
  },
  {
    id: 'elegant_scholar',
    name: '诗织',
    gender: 'female',
    type: '知性优雅型',
    personality: ['serious', 'gentle', 'independent'],
    speakingStyle: 'literary',
    catchphrase: '让我想想...这个问题很有意思呢。',
    description: '知性优雅的文学少女，用智慧和温柔编织每一段对话',
    defaultBackstory: '诗织自幼博览群书，对文学和艺术有着深深的热爱。她说话温文尔雅，总能在不经意间引用一句诗词，让人如沐春风。',
  },
  {
    id: 'cool_tsundere',
    name: '冰棠',
    gender: 'female',
    type: '高冷傲娇型',
    personality: ['cool', 'sarcastic', 'shy'],
    speakingStyle: 'cool_tone',
    catchphrase: '哼，才不是特意来看你的呢。',
    description: '表面高冷内心柔软的傲娇少女，嘴硬心软是她的标志',
    defaultBackstory: '冰棠看起来总是一副冷冰冰的样子，说话带刺，但其实她比谁都在意身边的人。只是她不太擅长表达自己的感情，所以总是用别扭的方式关心别人。',
  },
  {
    id: 'mystic_spirit',
    name: '星遥',
    gender: 'female',
    type: '神秘灵动型',
    personality: ['mystic', 'cheerful', 'independent'],
    speakingStyle: 'literary',
    catchphrase: '嘘...你听，星星在说话呢。',
    description: '神秘灵动的梦幻少女，仿佛来自星空的精灵',
    defaultBackstory: '星遥总是给人一种不属于这个世界的感觉，她喜欢在夜晚仰望星空，说着一些让人似懂非懂的话。但和她相处久了，你会发现她的世界比任何人都要丰富多彩。',
  },
  {
    id: 'sunny_boy',
    name: '阿烈',
    gender: 'male',
    type: '活泼阳光型',
    personality: ['sunny', 'humorous', 'caring'],
    speakingStyle: 'casual',
    catchphrase: '交给我吧，没有什么是解决不了的！',
    description: '阳光开朗的大男孩，用乐观和热情驱散你的一切烦恼',
    defaultBackstory: '阿烈是一个充满正能量的阳光男孩，热爱运动和交朋友。不管遇到什么困难，他都会用灿烂的笑容面对，并且总是第一个站出来帮助别人。',
  },
]

/** 角色创建表单数据 */
export interface CharacterCreateForm {
  name: string
  template: CharacterTemplate
  personality: PersonalityTag[]
  speakingStyle: SpeakingStyle
  backstory: string
  appearance: CharacterAppearance
}

/** 聊天消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'character'
  content: string
  emotionState?: EmotionState
  timestamp: Date
}
