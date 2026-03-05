/**
 * 情感 -> Live2D 映射引擎
 *
 * 将 soul-engine 的 8 种 EmotionState 映射为 Live2D 动作组 + 表情参数。
 * 参数名对齐 AIRI stage-ui-live2d 的 defaultModelParameters 和 Cubism4 标准参数。
 *
 * motionGroup 对齐 AIRI constants/emotions.ts 中的 EmotionMotionName（如 'Happy', 'Idle', 'Sad' 等）
 * expression 使用 Live2D 标准 Param 简写，前端 composable 会映射为 'ParamXxx' 格式
 */

import type { EmotionState } from '../types/character'

// ────────────────────────────── 类型定义 ──────────────────────────────

export interface Live2DEmotionConfig {
  /** Live2D 动作组名（对齐 AIRI Emotion motion name） */
  motionGroup: string
  /** 表情参数（键为简写，值 0-1 范围） */
  expression: Record<string, number>
  /** 过渡时长 ms */
  transitionDuration: number
  /** 动作优先级 (1=idle, 2=normal, 3=forced) */
  priority: number
}

// ────────────────────────────── 核心映射表 ──────────────────────────────

/** 8 种情感 -> Live2D 配置映射 */
export const EMOTION_LIVE2D_MAP: Record<EmotionState, Live2DEmotionConfig> = {
  happy: {
    motionGroup: 'Happy',
    expression: { happy: 1.0, mouth_open: 0.3 },
    transitionDuration: 300,
    priority: 2,
  },
  calm: {
    motionGroup: 'Idle',
    expression: { neutral: 1.0 },
    transitionDuration: 500,
    priority: 1,
  },
  caring: {
    motionGroup: 'Think',
    expression: { sad: 0.3, happy: 0.5 },
    transitionDuration: 400,
    priority: 2,
  },
  curious: {
    motionGroup: 'Curious',
    expression: { surprised: 0.5, eye_open: 0.8 },
    transitionDuration: 300,
    priority: 2,
  },
  missing: {
    motionGroup: 'Sad',
    expression: { sad: 0.6, eye_close: 0.3 },
    transitionDuration: 600,
    priority: 2,
  },
  clingy: {
    motionGroup: 'Happy',
    expression: { happy: 0.8, mouth_open: 0.5 },
    transitionDuration: 300,
    priority: 2,
  },
  shy: {
    motionGroup: 'Awkward',
    expression: { surprised: 0.4, blush: 0.7 },
    transitionDuration: 400,
    priority: 2,
  },
  touched: {
    motionGroup: 'Surprise',
    expression: { happy: 0.9, mouth_open: 0.4, blush: 0.5 },
    transitionDuration: 200,
    priority: 3,
  },
}

// ────────────────────────────── 事件类型 ──────────────────────────────

/** 可触发情感变化的事件 */
export type EmotionTriggerEvent =
  | 'gift_received'
  | 'checkin'
  | 'daily_chat'
  | 'deep_conversation'
  | 'share_mood'
  | 'absent_1day'
  | 'absent_3days'
  | 'level_up'
  | 'compliment'
  | 'confession'

// ────────────────────────────── 事件 -> 情感映射 ──────────────────────────────

/** 事件 -> 情感内部映射表 */
const EVENT_EMOTION_MAP: Record<EmotionTriggerEvent, EmotionState> = {
  gift_received: 'touched',
  checkin: 'happy',
  daily_chat: 'calm',
  deep_conversation: 'caring',
  share_mood: 'caring',
  absent_1day: 'missing',
  absent_3days: 'missing',
  level_up: 'happy',
  compliment: 'shy',
  confession: 'touched',
}

/** 根据事件获取对应的情感状态 */
export function getEmotionForEvent(event: EmotionTriggerEvent): EmotionState {
  return EVENT_EMOTION_MAP[event]
}

// ────────────────────────────── 便捷函数 ──────────────────────────────

/** 根据情感获取 Live2D 配置 */
export function getLive2DConfigForEmotion(emotion: EmotionState): Live2DEmotionConfig {
  return EMOTION_LIVE2D_MAP[emotion]
}

/** 根据事件直接获取 Live2D 配置（组合便捷函数） */
export function getLive2DConfigForEvent(event: EmotionTriggerEvent): Live2DEmotionConfig {
  return getLive2DConfigForEmotion(getEmotionForEvent(event))
}
