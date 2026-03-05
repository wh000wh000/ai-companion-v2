import { array, maxValue, minLength, minValue, number, object, optional, pipe, string, union, literal } from 'valibot'

/**
 * 记忆类型
 */
const MemoryTypeSchema = union([
  literal('preference'),
  literal('habit'),
  literal('event'),
  literal('emotion'),
  literal('date'),
])

/**
 * 记忆层级
 */
const MemoryLevelSchema = union([
  literal(2),
  literal(3),
])

/**
 * 保存记忆请求校验
 */
export const MemorySaveSchema = object({
  userId: pipe(string(), minLength(1)),
  characterId: pipe(string(), minLength(1)),
  content: pipe(string(), minLength(1)),
  type: MemoryTypeSchema,
  importance: optional(pipe(number(), minValue(1), maxValue(5)), 3),
  tags: optional(array(string())),
  level: optional(MemoryLevelSchema, 3),
})

/**
 * 搜索记忆请求校验
 */
export const MemorySearchSchema = object({
  userId: pipe(string(), minLength(1)),
  characterId: pipe(string(), minLength(1)),
  query: pipe(string(), minLength(1)),
  limit: optional(pipe(number(), minValue(1), maxValue(20)), 5),
  level: optional(MemoryLevelSchema),
})
