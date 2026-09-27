import { describe, expect, test } from 'vitest'
import { formatIntervals, parseIntervals, validateSettings } from './settings.ts'
import { DEFAULT_SETTINGS } from './types.ts'

describe('暗記の復習間隔の入力', () => {
  test('カンマ・読点・空白・全角数字を受け付ける', () => {
    expect(parseIntervals('1, 3, 7, 14, 30')).toEqual([1, 3, 7, 14, 30])
    expect(parseIntervals('１、３　７')).toEqual([1, 3, 7])
    expect(parseIntervals(' 2 ')).toEqual([2])
  })
  test('空・0以下・小数・文字は不正', () => {
    expect(parseIntervals('')).toBeNull()
    expect(parseIntervals('1, 0, 3')).toBeNull()
    expect(parseIntervals('1.5')).toBeNull()
    expect(parseIntervals('1, a')).toBeNull()
  })
  test('表示用に戻す', () => {
    expect(formatIntervals([1, 3, 7])).toBe('1, 3, 7')
  })
})

describe('設定値のチェック', () => {
  test('初期値は正しい', () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toBeNull()
  })
  test('範囲外はメッセージを返す', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, cycleIntervalDays: 0 })).not.toBeNull()
    expect(validateSettings({ ...DEFAULT_SETTINGS, examLeadDays: -1 })).not.toBeNull()
    expect(validateSettings({ ...DEFAULT_SETTINGS, examLeadDays: 0 })).toBeNull()
    expect(validateSettings({ ...DEFAULT_SETTINGS, memorizeIntervals: [] })).not.toBeNull()
  })
})
