import type { Settings } from './types.ts'

/** 「1, 3, 7, 14, 30」のような入力を日数の配列に（全角数字・読点・空白も区切りとして受け付ける）。不正なら null */
export function parseIntervals(text: string): number[] | null {
  const normalized = text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  const parts = normalized.split(/[\s,、，]+/).filter(Boolean)
  if (parts.length === 0) return null
  const days = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN))
  if (days.some((d) => !Number.isInteger(d) || d < 1 || d > 3650)) return null
  return days
}

export function formatIntervals(days: number[]): string {
  return days.join(', ')
}

/** 設定値の範囲チェック。問題があればメッセージを返す */
export function validateSettings(s: Settings): string | null {
  if (!Number.isInteger(s.cycleIntervalDays) || s.cycleIntervalDays < 1 || s.cycleIntervalDays > 365)
    return '定例周回の間隔は1〜365日で入力してください'
  if (!Number.isInteger(s.examLeadDays) || s.examLeadDays < 0 || s.examLeadDays > 60)
    return '試験の何日前かは0〜60日で入力してください'
  if (s.memorizeIntervals.length === 0) return '暗記の復習間隔を1つ以上入力してください'
  return null
}
