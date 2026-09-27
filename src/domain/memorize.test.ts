import { describe, expect, test } from 'vitest'
import { completeMemorizeTask, intervalDays, nextStep, startRange } from './memorize.ts'
import { makeMaterial, makeRange, makeTask, settings } from './test-helpers.ts'

const today = '2026-09-27'
const material = makeMaterial({ id: 'm2', name: 'LEAP', kind: 'memorize' })
const memorizeTask = (overrides = {}) =>
  makeTask({ id: 'k1', type: 'memorize', materialId: 'm2', unitId: null, rangeId: 'r1', dueDate: today, ...overrides })

describe('判定ルール', () => {
  test('半知 + 未知 が 0 なら段階を上げる、それ以外は据え置き', () => {
    expect(nextStep(0, { known: 100, half: 0, unknown: 0 })).toBe(1)
    expect(nextStep(2, { known: 90, half: 10, unknown: 0 })).toBe(2)
    expect(nextStep(2, { known: 90, half: 0, unknown: 1 })).toBe(2)
  })
  test('段階が設定の数を超えたら最後の間隔を使う', () => {
    expect(intervalDays(0, [1, 3, 7, 14, 30])).toBe(1)
    expect(intervalDays(4, [1, 3, 7, 14, 30])).toBe(30)
    expect(intervalDays(9, [1, 3, 7, 14, 30])).toBe(30)
  })
})

describe('4.6 範囲を開始したとき', () => {
  test('今日が期限の memorize タスクを作り、範囲を開始済みにする', () => {
    const { changes, created } = startRange({ range: makeRange(), material, openTasks: [], today })
    expect(created).toBe(true)
    expect(changes.createTasks).toEqual([
      { type: 'memorize', title: 'LEAP No.1-100', materialId: 'm2', unitId: null, rangeId: 'r1', examIds: [], dueDate: today },
    ])
    expect(changes.updateRanges).toEqual([{ materialId: 'm2', rangeId: 'r1', patch: { started: true, nextReviewAt: today } }])
  })

  test('すでに未完了タスクがあれば何もしない', () => {
    const { changes, created } = startRange({ range: makeRange({ started: true }), material, openTasks: [memorizeTask()], today })
    expect(created).toBe(false)
    expect(changes.createTasks).toEqual([])
    expect(changes.updateRanges).toEqual([])
  })
})

describe('4.6 暗記タスクを完了したとき', () => {
  test('半知・未知が0なら段階が上がり、次の復習日の間隔が広がる', () => {
    const range = makeRange({ started: true, step: 0 })
    const result = { known: 100, half: 0, unknown: 0 }
    const { changes, stepUp, nextTask } = completeMemorizeTask({
      task: memorizeTask(),
      range,
      material,
      openTasks: [memorizeTask()],
      settings,
      today,
      now: 9,
      result,
    })
    expect(stepUp).toBe(true)
    // step 1 → 間隔 3日
    expect(changes.updateRanges).toEqual([
      { materialId: 'm2', rangeId: 'r1', patch: { started: true, step: 1, nextReviewAt: '2026-09-30', lastResult: result } },
    ])
    expect(nextTask).toMatchObject({ type: 'memorize', rangeId: 'r1', dueDate: '2026-09-30' })
    expect(changes.updateTasks).toEqual([{ id: 'k1', patch: { status: 'done', completedAt: 9, result } }])
  })

  test('半知・未知が残れば段階は据え置き（step 0 なら翌日）', () => {
    const { changes, stepUp, nextTask } = completeMemorizeTask({
      task: memorizeTask(),
      range: makeRange({ started: true, step: 0 }),
      material,
      openTasks: [],
      settings,
      today,
      now: 0,
      result: { known: 80, half: 15, unknown: 5 },
    })
    expect(stepUp).toBe(false)
    expect(changes.updateRanges[0].patch).toMatchObject({ step: 0, nextReviewAt: '2026-09-28' })
    expect(nextTask?.dueDate).toBe('2026-09-28')
  })

  test('段階が上がり続けると、最後は30日ごとになる', () => {
    const { changes } = completeMemorizeTask({
      task: memorizeTask(),
      range: makeRange({ started: true, step: 4 }),
      material,
      openTasks: [],
      settings,
      today,
      now: 0,
      result: { known: 100, half: 0, unknown: 0 },
    })
    expect(changes.updateRanges[0].patch).toMatchObject({ step: 5, nextReviewAt: '2026-10-27' })
  })

  test('間隔は設定の memorizeIntervals に従う', () => {
    const { nextTask } = completeMemorizeTask({
      task: memorizeTask(),
      range: makeRange({ started: true, step: 0 }),
      material,
      openTasks: [],
      settings: { ...settings, memorizeIntervals: [2, 5] },
      today,
      now: 0,
      result: { known: 50, half: 0, unknown: 0 },
    })
    expect(nextTask?.dueDate).toBe('2026-10-02')
  })

  test('数が負や小数ならエラー', () => {
    const base = { task: memorizeTask(), range: makeRange(), material, openTasks: [], settings, today, now: 0 }
    expect(() => completeMemorizeTask({ ...base, result: { known: -1, half: 0, unknown: 0 } })).toThrow(RangeError)
    expect(() => completeMemorizeTask({ ...base, result: { known: 1, half: 0.5, unknown: 0 } })).toThrow(RangeError)
  })
})
