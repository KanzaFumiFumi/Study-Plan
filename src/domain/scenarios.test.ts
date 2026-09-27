import { describe, expect, test } from 'vitest'
import { completeUnitTask } from './cycle.ts'
import { addDays } from './date.ts'
import { applyExamSave } from './exam.ts'
import { addAssignment, addFirstLaps } from './manual.ts'
import { completeMemorizeTask, startRange } from './memorize.ts'
import { todayTasks } from './sort.ts'
import { applyChanges, makeExam, makeMaterial, makeRange, makeUnit, openTasksOf, settings, type State } from './test-helpers.ts'

// 完成の条件（仕様 8章）のうち、タスク生成ロジックに関わるものを操作の流れで確かめる

const day0 = '2026-09-27'
const book = makeMaterial({ id: 'm1', name: '青チャート' })
const leap = makeMaterial({ id: 'm2', name: 'LEAP', kind: 'memorize' })

function initialState(): State {
  return {
    materials: [book, leap],
    units: [makeUnit({ id: 'u1', name: '第1章' }), makeUnit({ id: 'u2', name: '第2章', order: 1 }), makeUnit({ id: 'u3', name: '第3章', order: 2 })],
    ranges: [makeRange({ id: 'r1', materialId: 'm2' })],
    exams: [],
    tasks: [],
  }
}

function complete(state: State, taskId: string, remainingMarks: number, today: string): State {
  const task = state.tasks.find((t) => t.id === taskId)!
  const unit = state.units.find((u) => u.id === task.unitId)!
  const { changes } = completeUnitTask({
    task,
    unit,
    material: book,
    openTasks: openTasksOf(state),
    settings,
    today,
    now: 0,
    remainingMarks,
  })
  return applyChanges(state, changes)
}

describe('完成の条件', () => {
  test('授業の1周目を追加して完了すると、7日後に定例周回タスクができる。0で完了すると卒業し、次は作られない', () => {
    let state = initialState()
    const u1 = state.units[0]
    state = applyChanges(state, addFirstLaps({ targets: [{ unit: u1, material: book }], openTasks: [], today: day0 }).changes)

    const [first] = todayTasks(openTasksOf(state), state.exams, day0)
    expect(first.task).toMatchObject({ type: 'first', unitId: 'u1', dueDate: day0 })

    state = complete(state, first.task.id, 4, day0)
    expect(state.units[0]).toMatchObject({ lapCount: 1, remainingMarks: 4, graduated: false, lastDoneAt: day0 })
    const cycle = openTasksOf(state)
    expect(cycle).toHaveLength(1)
    expect(cycle[0]).toMatchObject({ type: 'cycle', unitId: 'u1', dueDate: '2026-10-04' })

    // 7日後まで「今日」には出ない
    expect(todayTasks(openTasksOf(state), [], addDays(day0, 6))).toEqual([])
    expect(todayTasks(openTasksOf(state), [], addDays(day0, 7))).toHaveLength(1)

    state = complete(state, cycle[0].id, 0, '2026-10-04')
    expect(state.units[0]).toMatchObject({ lapCount: 2, remainingMarks: 0, graduated: true })
    expect(openTasksOf(state)).toEqual([])
  })

  test('範囲が重なる試験を2つ登録しても、同じ単元のタスクは1つだけで、期限は早い方', () => {
    let state = initialState()
    // u2 は周回中にしておく
    state = { ...state, units: state.units.map((u) => (u.id === 'u2' ? { ...u, lapCount: 1, remainingMarks: 3 } : u)) }

    const kimatsu = makeExam({ id: 'kimatsu', date: '2026-11-20', unitRefs: [{ materialId: 'm1', unitId: 'u1' }, { materialId: 'm1', unitId: 'u2' }] })
    const moshi = makeExam({ id: 'moshi', date: '2026-11-08', unitRefs: [{ materialId: 'm1', unitId: 'u2' }, { materialId: 'm1', unitId: 'u3' }] })

    for (const exam of [kimatsu, moshi]) {
      state = { ...state, exams: [...state.exams, exam] }
      const { changes } = applyExamSave({ exam, units: state.units, ranges: state.ranges, materials: state.materials, openTasks: openTasksOf(state), settings, today: day0 })
      state = applyChanges(state, changes)
    }

    const open = openTasksOf(state)
    expect(open).toHaveLength(3)
    const byUnit = Object.fromEntries(open.map((t) => [t.unitId, t]))
    expect(byUnit.u1).toMatchObject({ type: 'first', examIds: ['kimatsu'], dueDate: '2026-11-17' })
    expect(byUnit.u2).toMatchObject({ type: 'exam', examIds: ['kimatsu', 'moshi'], dueDate: '2026-11-05' })
    expect(byUnit.u3).toMatchObject({ type: 'first', examIds: ['moshi'], dueDate: '2026-11-05' })
  })

  test('単元に紐づけた学校課題を完了すると、その単元の1周目として記録される', () => {
    let state = initialState()
    const u3 = state.units[2]
    state = applyChanges(
      state,
      addAssignment({ title: '課題 p.40-45', dueDate: '2026-09-29', target: { unit: u3, material: book }, openTasks: [] }).changes,
    )
    const [assignment] = openTasksOf(state)
    expect(assignment).toMatchObject({ type: 'assignment', unitId: 'u3' })

    state = complete(state, assignment.id, 6, '2026-09-29')
    expect(state.units[2]).toMatchObject({ lapCount: 1, remainingMarks: 6, graduated: false })
    expect(openTasksOf(state)[0]).toMatchObject({ type: 'cycle', unitId: 'u3', dueDate: '2026-10-06' })
  })

  test('暗記系の範囲で半知・未知が0のとき、次の復習日の間隔が広がる', () => {
    let state = initialState()
    state = applyChanges(state, startRange({ range: state.ranges[0], material: leap, openTasks: [], today: day0 }).changes)

    const review = (today: string, half: number, unknown: number) => {
      const task = openTasksOf(state)[0]
      expect(task.dueDate).toBe(today)
      const { changes } = completeMemorizeTask({
        task,
        range: state.ranges[0],
        material: leap,
        openTasks: openTasksOf(state),
        settings,
        today,
        now: 0,
        result: { known: 100 - half - unknown, half, unknown },
      })
      state = applyChanges(state, changes)
      return openTasksOf(state)[0].dueDate
    }

    // 間隔 [1, 3, 7, 14, 30]
    expect(review('2026-09-27', 5, 2)).toBe('2026-09-28') // 据え置き：1日
    expect(review('2026-09-28', 0, 0)).toBe('2026-10-01') // 段階1：3日
    expect(review('2026-10-01', 0, 0)).toBe('2026-10-08') // 段階2：7日
    expect(review('2026-10-08', 1, 0)).toBe('2026-10-15') // 据え置き：7日
    expect(review('2026-10-15', 0, 0)).toBe('2026-10-29') // 段階3：14日
    expect(state.ranges[0]).toMatchObject({ step: 3, nextReviewAt: '2026-10-29' })
    expect(openTasksOf(state)).toHaveLength(1)
  })
})
