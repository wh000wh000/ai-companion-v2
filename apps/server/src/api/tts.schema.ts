import { nonEmpty, object, pipe, string } from 'valibot'

/**
 * TTS 合成请求校验
 */
export const SynthesizeSchema = object({
  text: pipe(string(), nonEmpty('text is required')),
  characterId: pipe(string(), nonEmpty('characterId is required')),
  characterTemplate: pipe(string(), nonEmpty('characterTemplate is required')),
})
