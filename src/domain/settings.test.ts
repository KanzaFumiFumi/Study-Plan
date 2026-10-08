import { describe, expect, test } from 'vitest'
import { isValidTargetLaps, validateSettings } from './settings.ts'
import { DEFAULT_SETTINGS } from './types.ts'

describe('設定値のチェック', () => {
  test('初期値は正しい', () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toBeNull()
  })
  test('範囲外はメッセージを返す', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, cycleIntervalDays: 0 })).not.toBeNull()
    expect(validateSettings({ ...DEFAULT_SETTINGS, examLeadDays: -1 })).not.toBeNull()
    expect(validateSettings({ ...DEFAULT_SETTINGS, examLeadDays: 0 })).toBeNull()
  })
})

describe('暗記系の目標の周回数（v0.6）', () => {
  test('1〜20周の整数', () => {
    expect(isValidTargetLaps(1)).toBe(true)
    expect(isValidTargetLaps(20)).toBe(true)
    expect(isValidTargetLaps(0)).toBe(false)
    expect(isValidTargetLaps(21)).toBe(false)
    expect(isValidTargetLaps(2.5)).toBe(false)
  })
})
