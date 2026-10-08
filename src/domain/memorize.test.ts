import { describe, expect, test } from 'vitest'
import {
  completeMemorizeTask,
  isRangeFinished,
  remainingLaps,
  schedulableLaps,
  scheduleRanges,
  unscheduleTask,
} from './memorize.ts'
import { applyChanges, makeMaterial, makeRange, makeTask, openTasksOf, type State } from './test-helpers.ts'

// v0.6〜：暗記は「目標の周回数」と「カレンダーで割り当てた日」で回す（間隔を広げる復習はなくした）

const today = '2026-10-09'
const leap = makeMaterial({ id: 'm2', name: 'LEAP', kind: 'memorize', targetLaps: 3 })
const memorizeTask = (overrides = {}) =>
  makeTask({ id: 'k1', type: 'memorize', title: 'LEAP No.1-100', materialId: 'm2', unitId: null, rangeId: 'r1', dueDate: today, ...overrides })

describe('目標の周回数', () => {
  test('残りの周回数と完了', () => {
    expect(remainingLaps(makeRange({ lapCount: 0 }), leap)).toBe(3)
    expect(remainingLaps(makeRange({ lapCount: 2 }), leap)).toBe(1)
    expect(remainingLaps(makeRange({ lapCount: 5 }), leap)).toBe(0)
    expect(isRangeFinished(makeRange({ lapCount: 2 }), leap)).toBe(false)
    expect(isRangeFinished(makeRange({ lapCount: 3 }), leap)).toBe(true)
  })

  test('カレンダーに入れられるのは、残りの周回数からすでに入れた予定を引いた数', () => {
    const range = makeRange({ lapCount: 1 })
    expect(schedulableLaps(range, leap, [])).toBe(2)
    expect(schedulableLaps(range, leap, [memorizeTask()])).toBe(1)
    expect(schedulableLaps(range, leap, [memorizeTask(), memorizeTask({ id: 'k2', dueDate: '2026-10-12' })])).toBe(0)
  })
})

describe('カレンダーで範囲を日付に割り当てる', () => {
  const r1 = makeRange({ id: 'r1' })
  const r2 = makeRange({ id: 'r2', label: 'No.101-200' })

  test('選んだ範囲ごとに、その日が期限の暗記タスクを作る', () => {
    const { changes, created } = scheduleRanges({
      targets: [
        { range: r1, material: leap },
        { range: r2, material: leap },
        { range: r1, material: leap },
      ],
      openTasks: [],
      date: '2026-10-12',
    })
    expect(created).toBe(2)
    expect(changes.createTasks).toEqual([
      { type: 'memorize', title: 'LEAP No.1-100', materialId: 'm2', unitId: null, rangeId: 'r1', examIds: [], dueDate: '2026-10-12' },
      { type: 'memorize', title: 'LEAP No.101-200', materialId: 'm2', unitId: null, rangeId: 'r2', examIds: [], dueDate: '2026-10-12' },
    ])
    // 範囲の記録は変えない（周回数は完了したときだけ増える）
    expect(changes.updateRanges).toEqual([])
  })

  test('1つの範囲に、別の日なら何回でも先の予定を入れられる（残りの周回数まで）', () => {
    let state: State = { materials: [leap], units: [], ranges: [r1], exams: [], tasks: [] }
    const assign = (date: string) => {
      const result = scheduleRanges({ targets: [{ range: r1, material: leap }], openTasks: openTasksOf(state), date })
      state = applyChanges(state, result.changes)
      return result
    }
    expect(assign('2026-10-10').created).toBe(1)
    expect(assign('2026-10-10').already).toBe(1) // 同じ日はまとめて1回分
    expect(assign('2026-10-17').created).toBe(1)
    expect(assign('2026-10-24').created).toBe(1)
    expect(assign('2026-10-31').full).toBe(1) // 目標3周ぶん入っている
    expect(openTasksOf(state).map((t) => t.dueDate)).toEqual(['2026-10-10', '2026-10-17', '2026-10-24'])
  })

  test('目標の周回数を終えた範囲には入れない', () => {
    const { created, full } = scheduleRanges({
      targets: [{ range: makeRange({ lapCount: 3 }), material: leap }],
      openTasks: [],
      date: today,
    })
    expect(created).toBe(0)
    expect(full).toBe(1)
  })

  test('予定を外す：その日の暗記タスクを消すだけ', () => {
    expect(unscheduleTask(memorizeTask()).deleteTasks).toEqual(['k1'])
    expect(() => unscheduleTask(memorizeTask({ status: 'done' }))).toThrow()
    expect(() => unscheduleTask(makeTask())).toThrow()
  })
})

describe('暗記タスクを完了したとき（入力なし）', () => {
  test('範囲の周回数を1増やし、最後に終えた日を今日にする。次のタスクは作らない', () => {
    const range = makeRange({ lapCount: 1, lastDoneAt: '2026-10-01' })
    const { changes, lap, finished } = completeMemorizeTask({ task: memorizeTask(), range, material: leap, today, now: 9 })
    expect(lap).toBe(2)
    expect(finished).toBe(false)
    expect(changes.updateTasks).toEqual([
      {
        id: 'k1',
        patch: { status: 'done', completedAt: 9, lap: 2, before: { range: { lapCount: 1, lastDoneAt: '2026-10-01' } } },
      },
    ])
    expect(changes.updateRanges).toEqual([{ materialId: 'm2', rangeId: 'r1', patch: { lapCount: 2, lastDoneAt: today } }])
    expect(changes.createTasks).toEqual([])
  })

  test('目標の周回数に届いたら、その範囲は完了', () => {
    const { finished } = completeMemorizeTask({ task: memorizeTask(), range: makeRange({ lapCount: 2 }), material: leap, today, now: 0 })
    expect(finished).toBe(true)
  })

  test('完了済みのタスクや、範囲が違うタスクはエラー', () => {
    const range = makeRange()
    expect(() => completeMemorizeTask({ task: memorizeTask({ status: 'done' }), range, material: leap, today, now: 0 })).toThrow()
    expect(() => completeMemorizeTask({ task: memorizeTask({ rangeId: 'other' }), range, material: leap, today, now: 0 })).toThrow()
  })
})
