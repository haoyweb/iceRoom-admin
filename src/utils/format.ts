import dayjs from 'dayjs'

/**
 * 格式化日期时间为常见展示格式。null/空串返回 '-'。
 */
export function formatDateTime(value: string | Date | null | undefined, pattern = 'YYYY-MM-DD HH:mm') {
  if (!value)
    return '-'
  const d = dayjs(value)
  return d.isValid() ? d.format(pattern) : '-'
}

export function formatDate(value: string | Date | null | undefined, pattern = 'YYYY-MM-DD') {
  return formatDateTime(value, pattern)
}

/**
 * 把后端返回的 Decimal 字符串格式化为带千分位的 USD 显示。
 * 0 / null / 空都显示 '-'，避免 "$0.000000" 这种空洞展示。
 */
export function formatUsd(value: string | number | null | undefined, digits = 4) {
  if (value === null || value === undefined || value === '')
    return '-'
  const num = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(num) || num <= 0)
    return '-'
  return `$${num.toFixed(digits)}`
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '-'
  return new Intl.NumberFormat('en-US').format(value)
}
