import type { ISODate } from './types.ts'

// 日付はすべて日本時間の `YYYY-MM-DD` 文字列で扱う。
// 計算は UTC の 0時として行うので、端末のタイムゾーンや夏時間の影響を受けない。

const DAY_MS = 24 * 60 * 60 * 1000

const jstFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** 日本時間での今日の日付 */
export function todayJST(now: Date = new Date()): ISODate {
  const parts: Record<string, string> = {}
  for (const part of jstFormatter.formatToParts(now)) parts[part.type] = part.value
  return `${parts.year}-${parts.month}-${parts.day}`
}

function toUTCms(date: ISODate): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUTCms(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTCms(toUTCms(date) + days * DAY_MS)
}

/** from から to までの日数（to が後なら正） */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTCms(to) - toUTCms(from)) / DAY_MS)
}

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return fromUTCms(toUTCms(value)) === value
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** 表示用：`10/4(土)` */
export function formatShortDate(date: ISODate): string {
  const [, m, d] = date.split('-').map(Number)
  return `${m}/${d}(${WEEKDAYS[new Date(toUTCms(date)).getUTCDay()]})`
}
