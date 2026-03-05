/**
 * 情感 -> Live2D 映射测试
 *
 * 覆盖：
 * - 所有 8 种情感都有映射配置
 * - 所有事件都返回合法的 EmotionState
 * - getLive2DConfigForEvent 返回完整的 Live2DEmotionConfig
 * - mapExpressionToModelParams 参数映射
 * - createLive2DEmotionController 状态管理
 */

import { describe, expect, it } from 'vitest'
import type { EmotionState } from '../src/types/character'
import type { EmotionTriggerEvent, Live2DEmotionConfig } from '../src/emotion/mapping'
import {
  EMOTION_LIVE2D_MAP,
  getEmotionForEvent,
  getLive2DConfigForEmotion,
  getLive2DConfigForEvent,
} from '../src/emotion/mapping'
import {
  createLive2DEmotionController,
  DEFAULT_MODEL_PARAMS,
  mapExpressionToModelParams,
} from '../src/emotion/useLive2DEmotion'

// ────────────────────────────── 常量 ──────────────────────────────

const ALL_EMOTIONS: EmotionState[] = [
  'happy', 'calm', 'caring', 'curious',
  'missing', 'clingy', 'shy', 'touched',
]

const ALL_EVENTS: EmotionTriggerEvent[] = [
  'gift_received', 'checkin', 'daily_chat', 'deep_conversation',
  'share_mood', 'absent_1day', 'absent_3days', 'level_up',
  'compliment', 'confession',
]

// ────────────────────────────── 辅助函数 ──────────────────────────────

/** 验证 Live2DEmotionConfig 结构完整性 */
function assertValidConfig(config: Live2DEmotionConfig) {
  expect(config).toBeDefined()
  expect(typeof config.motionGroup).toBe('string')
  expect(config.motionGroup.length).toBeGreaterThan(0)
  expect(typeof config.expression).toBe('object')
  expect(Object.keys(config.expression).length).toBeGreaterThan(0)
  expect(typeof config.transitionDuration).toBe('number')
  expect(config.transitionDuration).toBeGreaterThan(0)
  expect(typeof config.priority).toBe('number')
  expect(config.priority).toBeGreaterThanOrEqual(1)
  expect(config.priority).toBeLessThanOrEqual(3)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. EMOTION_LIVE2D_MAP 完整性
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('EMOTION_LIVE2D_MAP 完整性', () => {
  it('应包含全部 8 种情感的映射', () => {
    for (const emotion of ALL_EMOTIONS) {
      expect(EMOTION_LIVE2D_MAP[emotion]).toBeDefined()
    }
    expect(Object.keys(EMOTION_LIVE2D_MAP)).toHaveLength(8)
  })

  it.each(ALL_EMOTIONS)('情感 "%s" 应有完整的 Live2DEmotionConfig 结构', (emotion) => {
    assertValidConfig(EMOTION_LIVE2D_MAP[emotion])
  })

  it('calm 应映射到 Idle 动作组且 priority=1', () => {
    expect(EMOTION_LIVE2D_MAP.calm.motionGroup).toBe('Idle')
    expect(EMOTION_LIVE2D_MAP.calm.priority).toBe(1)
  })

  it('touched 应映射到 Surprise 动作组且 priority=3（强制）', () => {
    expect(EMOTION_LIVE2D_MAP.touched.motionGroup).toBe('Surprise')
    expect(EMOTION_LIVE2D_MAP.touched.priority).toBe(3)
  })

  it('所有表情参数值应在 0-1 范围内', () => {
    for (const emotion of ALL_EMOTIONS) {
      const { expression } = EMOTION_LIVE2D_MAP[emotion]
      for (const [key, value] of Object.entries(expression)) {
        expect(value, `${emotion}.expression.${key}`).toBeGreaterThanOrEqual(0)
        expect(value, `${emotion}.expression.${key}`).toBeLessThanOrEqual(1)
      }
    }
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. getEmotionForEvent 事件 -> 情感映射
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('getEmotionForEvent 事件映射', () => {
  it.each(ALL_EVENTS)('事件 "%s" 应返回合法的 EmotionState', (event) => {
    const emotion = getEmotionForEvent(event)
    expect(ALL_EMOTIONS).toContain(emotion)
  })

  it('gift_received -> touched', () => {
    expect(getEmotionForEvent('gift_received')).toBe('touched')
  })

  it('checkin -> happy', () => {
    expect(getEmotionForEvent('checkin')).toBe('happy')
  })

  it('absent_1day -> missing', () => {
    expect(getEmotionForEvent('absent_1day')).toBe('missing')
  })

  it('compliment -> shy', () => {
    expect(getEmotionForEvent('compliment')).toBe('shy')
  })

  it('confession -> touched', () => {
    expect(getEmotionForEvent('confession')).toBe('touched')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. getLive2DConfigForEmotion / getLive2DConfigForEvent
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('getLive2DConfigForEmotion', () => {
  it.each(ALL_EMOTIONS)('情感 "%s" 应返回完整配置', (emotion) => {
    const config = getLive2DConfigForEmotion(emotion)
    assertValidConfig(config)
    expect(config).toEqual(EMOTION_LIVE2D_MAP[emotion])
  })
})

describe('getLive2DConfigForEvent', () => {
  it.each(ALL_EVENTS)('事件 "%s" 应返回完整的 Live2DEmotionConfig', (event) => {
    const config = getLive2DConfigForEvent(event)
    assertValidConfig(config)
  })

  it('gift_received 应返回 touched 的配置', () => {
    const config = getLive2DConfigForEvent('gift_received')
    expect(config).toEqual(EMOTION_LIVE2D_MAP.touched)
  })

  it('absent_3days 应返回 missing 的配置', () => {
    const config = getLive2DConfigForEvent('absent_3days')
    expect(config).toEqual(EMOTION_LIVE2D_MAP.missing)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. mapExpressionToModelParams 参数映射
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('mapExpressionToModelParams', () => {
  it('neutral 应返回默认参数', () => {
    const params = mapExpressionToModelParams({ neutral: 1.0 })
    expect(params.leftEyeOpen).toBe(1)
    expect(params.rightEyeOpen).toBe(1)
    expect(params.cheek).toBe(0)
  })

  it('happy 应设置 eyeSmile 和 mouthForm', () => {
    const params = mapExpressionToModelParams({ happy: 1.0 })
    expect(params.leftEyeSmile).toBe(1.0)
    expect(params.rightEyeSmile).toBe(1.0)
    expect(params.mouthForm).toBeCloseTo(0.6)
  })

  it('blush 应设置 cheek', () => {
    const params = mapExpressionToModelParams({ blush: 0.7 })
    expect(params.cheek).toBe(0.7)
  })

  it('mouth_open 应设置 mouthOpen', () => {
    const params = mapExpressionToModelParams({ mouth_open: 0.5 })
    expect(params.mouthOpen).toBe(0.5)
  })

  it('eye_close 应降低 eyeOpen 值', () => {
    const params = mapExpressionToModelParams({ eye_close: 0.3 })
    expect(params.leftEyeOpen).toBe(0.7)
    expect(params.rightEyeOpen).toBe(0.7)
  })

  it('组合表情应正确叠加', () => {
    const params = mapExpressionToModelParams({ happy: 0.9, mouth_open: 0.4, blush: 0.5 })
    expect(params.leftEyeSmile).toBe(0.9)
    expect(params.mouthOpen).toBe(0.4)
    expect(params.cheek).toBe(0.5)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. createLive2DEmotionController 状态管理
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('createLive2DEmotionController', () => {
  it('初始状态应为 calm', () => {
    const controller = createLive2DEmotionController()
    const state = controller.getState()
    expect(state.currentEmotion).toBe('calm')
    expect(state.currentConfig.motionGroup).toBe('Idle')
  })

  it('setEmotion 应更新状态并返回新状态', () => {
    const controller = createLive2DEmotionController()
    const newState = controller.setEmotion('happy')

    expect(newState.currentEmotion).toBe('happy')
    expect(newState.currentConfig.motionGroup).toBe('Happy')
    expect(newState.currentModelParams.leftEyeSmile).toBe(1.0)
  })

  it('getState 应反映最近一次 setEmotion', () => {
    const controller = createLive2DEmotionController()
    controller.setEmotion('shy')
    const state = controller.getState()

    expect(state.currentEmotion).toBe('shy')
    expect(state.currentConfig.motionGroup).toBe('Awkward')
    expect(state.currentModelParams.cheek).toBe(0.7)
  })

  it('连续切换情感应正确更新', () => {
    const controller = createLive2DEmotionController()

    controller.setEmotion('happy')
    expect(controller.getState().currentEmotion).toBe('happy')

    controller.setEmotion('touched')
    expect(controller.getState().currentEmotion).toBe('touched')
    expect(controller.getState().currentConfig.priority).toBe(3)

    controller.setEmotion('calm')
    expect(controller.getState().currentEmotion).toBe('calm')
    expect(controller.getState().currentConfig.priority).toBe(1)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. DEFAULT_MODEL_PARAMS 完整性
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('DEFAULT_MODEL_PARAMS', () => {
  it('应包含所有 AIRI Live2D 标准参数', () => {
    const requiredKeys = [
      'angleX', 'angleY', 'angleZ',
      'leftEyeOpen', 'rightEyeOpen',
      'leftEyeSmile', 'rightEyeSmile',
      'mouthOpen', 'mouthForm', 'cheek',
      'bodyAngleX', 'bodyAngleY', 'bodyAngleZ',
      'breath',
    ]
    for (const key of requiredKeys) {
      expect(DEFAULT_MODEL_PARAMS).toHaveProperty(key)
    }
  })

  it('眼睛默认应为睁开状态 (1)', () => {
    expect(DEFAULT_MODEL_PARAMS.leftEyeOpen).toBe(1)
    expect(DEFAULT_MODEL_PARAMS.rightEyeOpen).toBe(1)
  })
})
