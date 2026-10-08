import type { Settings } from './types.ts'

/** 設定値の範囲チェック。問題があればメッセージを返す */
export function validateSettings(s: Settings): string | null {
  if (!Number.isInteger(s.cycleIntervalDays) || s.cycleIntervalDays < 1 || s.cycleIntervalDays > 365)
    return '定例周回の間隔は1〜365日で入力してください'
  if (!Number.isInteger(s.examLeadDays) || s.examLeadDays < 0 || s.examLeadDays > 60)
    return '予定の何日前かは0〜60日で入力してください'
  return null
}

/** 暗記系の目標の周回数として受け付ける値（1〜20周） */
export function isValidTargetLaps(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 20
}
