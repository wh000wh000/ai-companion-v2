/**
 * 日期/货币/时间格式化工具（中国本地化）
 *
 * 所有货币计算内部以"分"为单位，展示时转为"元"
 * 日期格式遵循中文习惯：YYYY年MM月DD日
 */

/**
 * 格式化货币（中国格式）
 * @param amountInCents 金额（单位：分）
 * @returns 格式化后的字符串
 * @example formatCurrency(6800) → "¥68.00"
 */
export function formatCurrency(amountInCents: number): string {
  return `¥${(amountInCents / 100).toFixed(2)}`
}

/**
 * 格式化货币为整数元（无小数，适合展示整数价格）
 * @param amountInCents 金额（单位：分）
 * @returns 格式化后的字符串
 * @example formatCurrencyInt(6800) → "¥68"
 */
export function formatCurrencyInt(amountInCents: number): string {
  return `¥${Math.floor(amountInCents / 100)}`
}

/**
 * 格式化日期（中文格式）
 * @param date Date对象
 * @returns 格式化后的字符串
 * @example formatDate(new Date()) → "2026年03月05日"
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}年${m}月${d}日`
}

/**
 * 格式化时间（24小时制）
 * @param date Date对象
 * @returns 格式化后的字符串
 * @example formatTime(new Date()) → "14:30"
 */
export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/**
 * 格式化日期时间
 * @param date Date对象
 * @returns 格式化后的字符串
 * @example formatDateTime(new Date()) → "2026年03月05日 14:30"
 */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

/**
 * 相对时间（中文）
 * @param date Date对象
 * @returns 相对时间描述
 * @example relativeTime(5分钟前的Date) → "5分钟前"
 */
export function relativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()

  if (diff < 60000)
    return '刚刚'
  if (diff < 3600000)
    return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000)
    return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000)
    return `${Math.floor(diff / 86400000)}天前`
  return formatDate(date)
}

/**
 * 格式化数字为中文千分位格式
 * @param num 数字
 * @returns 格式化后的字符串
 * @example formatNumber(12345) → "12,345"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

/**
 * 格式化短日期（月/日 时:分，适合交易记录列表）
 * @param dateStr ISO日期字符串
 * @returns 格式化后的字符串
 * @example formatShortDate("2026-03-05T14:30:00Z") → "3/5 14:30"
 */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${formatTime(date)}`
}
