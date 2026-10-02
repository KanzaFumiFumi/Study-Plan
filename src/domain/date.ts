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

/** 日本時間でその日の 0:00 の時刻（ミリ秒）。「今日完了したタスク」を探すのに使う */
export function jstStartOfDayMs(date: ISODate): number {
  return toUTCms(date) - 9 * 60 * 60 * 1000
}

/**
 * カレンダー（v0.4〜）：year 年 month 月（1〜12）の週ごとの日付。日曜はじまり。
 * その月に含まれない枠は null。
 */
export function calendarWeeks(year: number, month: number): (ISODate | null)[][] {
  const first = Date.UTC(year, month - 1, 1)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const lead = new Date(first).getUTCDay()
  const cells: (ISODate | null)[] = Array(lead).fill(null)
  for (let d = 0; d < daysInMonth; d += 1) cells.push(fromUTCms(first + d * DAY_MS))
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (ISODate | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** 月を前後に動かす（{ year, month } は month が 1〜12） */
export function shiftMonth(ym: { year: number; month: number }, delta: number): { year: number; month: number } {
  const index = ym.year * 12 + (ym.month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** 表示用：`10/4(土)` */
export function formatShortDate(date: ISODate): string {
  const [, m, d] = date.split('-').map(Number)
  return `${m}/${d}(${WEEKDAYS[new Date(toUTCms(date)).getUTCDay()]})`
}
