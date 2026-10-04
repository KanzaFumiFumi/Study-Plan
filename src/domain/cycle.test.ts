import { describe, expect, test } from 'vitest'
import { completePlainTask, completeUnitTask } from './cycle.ts'
import { makeMaterial, makeTask, makeUnit, settings } from './test-helpers.ts'

const today = '2026-09-27'
const material = makeMaterial()

describe('4.1 周回系の単元を完了したとき', () => {
  test('印が残っていれば、単元を更新して「今日+7日」の cycle タスクを作る', () => {
    const task = makeTask({ id: 'first1', type: 'first' })
    const unit = makeUnit()
    const { changes, graduated, nextTask } = completeUnitTask({
      task,
      unit,
      material,
      openTasks: [task],
      settings,
      today,
      now: 123,
      remainingMarks: 5,
    })

    expect(graduated).toBe(false)
    expect(changes.updateTasks).toEqual([
      {
        id: 'first1',
        patch: {
          status: 'done',
          completedAt: 123,
          result: { remainingMarks: 5 },
          // v0.5：何周目を終えたかと、チェックを外したときに戻す単元の記録
          lap: 1,
          before: { unit: { lapCount: 0, remainingMarks: null, graduated: false, lastDoneAt: null } },
        },
      },
    ])
    expect(changes.updateUnits).toEqual([
      { materialId: 'm1', unitId: 'u1', patch: { lapCount: 1, remainingMarks: 5, lastDoneAt: today, graduated: false } },
    ])
    expect(nextTask).toMatchObject({
      type: 'cycle',
      materialId: 'm1',
      unitId: 'u1',
      examIds: [],
      dueDate: '2026-10-04',
      createdBy: 'first1',
    })
    expect(changes.createTasks).toHaveLength(1)
  })

  test('残りの印が0なら卒業して、次のタスクは作らない', () => {
    const task = makeTask()
    const unit = makeUnit({ lapCount: 2, remainingMarks: 3 })
    const { changes, graduated, nextTask } = completeUnitTask({
      task,
      unit,
      material,
      openTasks: [task],
      settings,
      today,
      now: 0,
      remainingMarks: 0,
    })
    expect(graduated).toBe(true)
    expect(nextTask).toBeNull()
    expect(changes.createTasks).toEqual([])
    expect(changes.updateUnits[0].patch).toMatchObject({ lapCount: 3, remainingMarks: 0, graduated: true })
  })

  test('周回の間隔は設定の cycleIntervalDays に従う', () => {
    const task = makeTask()
    const { nextTask } = completeUnitTask({
      task,
      unit: makeUnit({ lapCount: 1, remainingMarks: 4 }),
      material,
      openTasks: [task],
      settings: { ...settings, cycleIntervalDays: 10 },
      today,
      now: 0,
      remainingMarks: 2,
    })
    expect(nextTask?.dueDate).toBe('2026-10-07')
  })

  test('その単元に他の未完了タスクがあれば、新しく作らない', () => {
    const task = makeTask({ id: 'a' })
    const other = makeTask({ id: 'b', type: 'exam', examIds: ['e1'] })
    const { changes, nextTask } = completeUnitTask({
      task,
      unit: makeUnit({ lapCount: 1 }),
      material,
      openTasks: [task, other],
      settings,
      today,
      now: 0,
      remainingMarks: 3,
    })
    expect(nextTask).toBeNull()
    expect(changes.createTasks).toEqual([])
  })

  test('別の単元の未完了タスクは関係ない', () => {
    const task = makeTask({ id: 'a' })
    const otherUnitTask = makeTask({ id: 'b', unitId: 'u2' })
    const { nextTask } = completeUnitTask({
      task,
      unit: makeUnit(),
      material,
      openTasks: [task, otherUnitTask],
      settings,
      today,
      now: 0,
      remainingMarks: 1,
    })
    expect(nextTask).not.toBeNull()
  })

  test('卒業済みの単元の解き直しで印が残ったら、卒業が取り消されて周回に戻る', () => {
    const task = makeTask({ type: 'redo' })
    const unit = makeUnit({ lapCount: 3, remainingMarks: 0, graduated: true })
    const { changes, graduated, nextTask } = completeUnitTask({
      task,
      unit,
      material,
      openTasks: [task],
      settings,
      today,
      now: 0,
      remainingMarks: 2,
    })
    expect(graduated).toBe(false)
    expect(changes.updateUnits[0].patch).toMatchObject({ lapCount: 4, remainingMarks: 2, graduated: false })
    expect(nextTask?.type).toBe('cycle')
  })

  test('単元つきの学校課題も同じ処理になる（1周目として記録される）', () => {
    const task = makeTask({ type: 'assignment', title: '課題プリント' })
    const { changes } = completeUnitTask({
      task,
      unit: makeUnit(),
      material,
      openTasks: [task],
      settings,
      today,
      now: 0,
      remainingMarks: 4,
    })
    expect(changes.updateUnits[0].patch).toMatchObject({ lapCount: 1, remainingMarks: 4 })
  })

  test('印の数が負・小数・完了済みのタスク・単元の食い違いはエラー', () => {
    const base = { unit: makeUnit(), material, openTasks: [], settings, today, now: 0 }
    expect(() => completeUnitTask({ ...base, task: makeTask(), remainingMarks: -1 })).toThrow(RangeError)
    expect(() => completeUnitTask({ ...base, task: makeTask(), remainingMarks: 1.5 })).toThrow(RangeError)
    expect(() => completeUnitTask({ ...base, task: makeTask({ status: 'done' }), remainingMarks: 1 })).toThrow()
    expect(() => completeUnitTask({ ...base, task: makeTask({ unitId: 'u9' }), remainingMarks: 1 })).toThrow()
  })
})

describe('単元に紐づかないタスクの完了', () => {
  test('完了にするだけ', () => {
    const changes = completePlainTask(makeTask({ type: 'assignment', materialId: null, unitId: null }), 55)
    expect(changes.updateTasks).toEqual([{ id: 't1', patch: { status: 'done', completedAt: 55 } }])
    expect(changes.createTasks).toEqual([])
    expect(changes.updateUnits).toEqual([])
  })
})
