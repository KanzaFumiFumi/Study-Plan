import { describe, expect, test } from 'vitest'
import { addDays, daysBetween, formatShortDate, isISODate, maxDate, minDate, todayJST } from './date.ts'

describe('todayJST：日本時間の日付', () => {
  test('UTC 14:59 は日本時間 23:59 なので同じ日', () => {
    expect(todayJST(new Date('2026-09-27T14:59:59Z'))).toBe('2026-09-27')
  })
  test('UTC 15:00 は日本時間の翌日 0:00', () => {
    expect(todayJST(new Date('2026-09-27T15:00:00Z'))).toBe('2026-09-28')
  })
  test('年またぎ', () => {
    expect(todayJST(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01')
  })
})

describe('addDays', () => {
  test('月末・年末をまたぐ', () => {
    expect(addDays('2026-09-27', 7)).toBe('2026-10-04')
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04')
  })
  test('うるう年', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
  })
  test('マイナスの日数', () => {
    expect(addDays('2026-11-02', -3)).toBe('2026-10-30')
  })
})

describe('その他の日付関数', () => {
  test('daysBetween', () => {
    expect(daysBetween('2026-09-27', '2026-10-04')).toBe(7)
    expect(daysBetween('2026-10-04', '2026-09-27')).toBe(-7)
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30)
  })
  test('isISODate', () => {
    expect(isISODate('2026-09-27')).toBe(true)
    expect(isISODate('2026-02-30')).toBe(false)
    expect(isISODate('2026-9-27')).toBe(false)
    expect(isISODate(null)).toBe(false)
  })
  test('minDate / maxDate', () => {
    expect(minDate('2026-10-01', '2026-09-30')).toBe('2026-09-30')
    expect(maxDate('2026-10-01', '2026-09-30')).toBe('2026-10-01')
  })
  test('formatShortDate は曜日つき', () => {
    expect(formatShortDate('2026-09-27')).toBe('9/27(日)')
    expect(formatShortDate('2026-10-03')).toBe('10/3(土)')
  })
})
