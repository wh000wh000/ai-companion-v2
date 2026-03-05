/**
 * Live2D 情感控制 Composable
 *
 * 提供 setEmotion() 方法，将 soul-engine 的 EmotionState
 * 转换为 AIRI Live2D 组件可直接消费的参数配置。
 *
 * 前端集成方式：
 * ```ts
 * const { setEmotion, currentConfig, currentEmotion } = useLive2DEmotion()
 * setEmotion('happy')
 * // currentConfig.value => { motionGroup, expression, transitionDuration, priority }
 * // 前端将 currentConfig 传递给 Live2D store 的 currentMotion 和 modelParameters
 * ```
 *
 * 表情参数简写 -> Live2D Cubism4 参数映射：
 * - happy       -> ParamEyeSmile (微笑眼)
 * - sad         -> ParamBrowLY/ParamBrowRY (眉毛下垂)
 * - surprised   -> ParamEyeLOpen/ParamEyeROpen (睁大眼)
 * - mouth_open  -> ParamMouthOpenY (张嘴)
 * - eye_open    -> ParamEyeLOpen/ParamEyeROpen (睁眼程度)
 * - eye_close   -> ParamEyeLOpen/ParamEyeROpen (闭眼程度，反转)
 * - blush       -> ParamCheek (腮红)
 * - neutral     -> 无特殊参数，回归默认
 */

import type { EmotionState } from '../types/character'
import type { Live2DEmotionConfig } from './mapping'
import { getLive2DConfigForEmotion } from './mapping'

// ────────────────────────────── Live2D 参数映射 ──────────────────────────────

/**
 * 默认 Live2D 模型参数（对齐 AIRI defaultModelParameters）
 * 用于在情感切换时重置到基准值
 */
export const DEFAULT_MODEL_PARAMS: Record<string, number> = {
  angleX: 0,
  angleY: 0,
  angleZ: 0,
  leftEyeOpen: 1,
  rightEyeOpen: 1,
  leftEyeSmile: 0,
  rightEyeSmile: 0,
  leftEyebrowLR: 0,
  rightEyebrowLR: 0,
  leftEyebrowY: 0,
  rightEyebrowY: 0,
  leftEyebrowAngle: 0,
  rightEyebrowAngle: 0,
  leftEyebrowForm: 0,
  rightEyebrowForm: 0,
  mouthOpen: 0,
  mouthForm: 0,
  cheek: 0,
  bodyAngleX: 0,
  bodyAngleY: 0,
  bodyAngleZ: 0,
  breath: 0,
}

/**
 * 将表情参数简写映射为 AIRI modelParameters 键值对
 *
 * @param expression - 来自 EMOTION_LIVE2D_MAP 的 expression 字段
 * @returns 可直接赋值给 Live2D store modelParameters 的键值对
 */
export function mapExpressionToModelParams(
  expression: Record<string, number>,
): Record<string, number> {
  const params: Record<string, number> = { ...DEFAULT_MODEL_PARAMS }

  for (const [key, value] of Object.entries(expression)) {
    switch (key) {
      case 'happy':
        params.leftEyeSmile = value
        params.rightEyeSmile = value
        params.mouthForm = value * 0.6 // 微笑嘴型
        break
      case 'sad':
        params.leftEyebrowY = -value * 0.5
        params.rightEyebrowY = -value * 0.5
        params.leftEyebrowAngle = -value * 0.3
        params.rightEyebrowAngle = -value * 0.3
        break
      case 'surprised':
        params.leftEyeOpen = Math.min(1, 0.8 + value * 0.2)
        params.rightEyeOpen = Math.min(1, 0.8 + value * 0.2)
        params.leftEyebrowY = value * 0.5
        params.rightEyebrowY = value * 0.5
        break
      case 'mouth_open':
        params.mouthOpen = value
        break
      case 'eye_open':
        params.leftEyeOpen = value
        params.rightEyeOpen = value
        break
      case 'eye_close':
        params.leftEyeOpen = Math.max(0, 1 - value)
        params.rightEyeOpen = Math.max(0, 1 - value)
        break
      case 'blush':
        params.cheek = value
        break
      case 'neutral':
        // neutral 不做额外修改，保持默认
        break
    }
  }

  return params
}

// ────────────────────────────── Composable ──────────────────────────────

export interface Live2DEmotionState {
  /** 当前情感 */
  currentEmotion: EmotionState
  /** 当前 Live2D 配置 */
  currentConfig: Live2DEmotionConfig
  /** 当前映射后的模型参数 */
  currentModelParams: Record<string, number>
}

/**
 * 创建 Live2D 情感控制器（框架无关版本）
 *
 * 返回纯函数式 API，不依赖 Vue/Pinia。
 * 前端 Vue 组件可以包装为 reactive 使用。
 */
export function createLive2DEmotionController() {
  let state: Live2DEmotionState = {
    currentEmotion: 'calm',
    currentConfig: getLive2DConfigForEmotion('calm'),
    currentModelParams: mapExpressionToModelParams(
      getLive2DConfigForEmotion('calm').expression,
    ),
  }

  /** 设置情感状态，返回更新后的完整配置 */
  function setEmotion(emotion: EmotionState): Live2DEmotionState {
    const config = getLive2DConfigForEmotion(emotion)
    const modelParams = mapExpressionToModelParams(config.expression)

    state = {
      currentEmotion: emotion,
      currentConfig: config,
      currentModelParams: modelParams,
    }

    return state
  }

  /** 获取当前状态（只读快照） */
  function getState(): Readonly<Live2DEmotionState> {
    return state
  }

  return {
    setEmotion,
    getState,
  }
}
