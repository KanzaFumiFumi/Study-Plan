import { describe, expect, test } from 'vitest'
import { addAssignment, addFirstLaps, addRedos } from './manual.ts'
import { makeMaterial, makeTask, makeUnit } from './test-helpers.ts'

const today = '2026-09-27'
const material = makeMaterial()
const u1 = makeUnit({ id: 'u1', name: '第1章' })
const u2 = makeUnit({ id: 'u2', name: '第2章' })
const graduated = makeUnit({ id: 'u3', lapCount: 2, remainingMarks: 0, graduated: true })

describe('4.3 授業の1周目', () => {
  test('選んだ単元ごとに、今日が期限の first タスクを作る', () => {
    const { changes, created } = addFirstLaps({
      targets: [
        { unit: u1, material },
        { unit: u2, material },
      ],
      openTasks: [],
      today,
    })
    expect(created).toBe(2)
    expect(changes.createTasks).toEqual([
      { type: 'first', title: '青チャート 第1章', materialId: 'm1', unitId: 'u1', rangeId: null, examIds: [], dueDate: today },
      { type: 'first', title: '青チャート 第2章', materialId: 'm1', unitId: 'u2', rangeId: null, examIds: [], dueDate: today },
    ])
  })

  test('試験登録で作られた先の日付の1周目タスクがあれば、作らずに今日へ前倒しする', () => {
    const fromExam = makeTask({ id: 'f', type: 'first', unitId: 'u1', examIds: ['e1'], dueDate: '2026-11-17' })
    const { changes, created, merged } = addFirstLaps({ targets: [{ unit: u1, material }], openTasks: [fromExam], today })
    expect(created).toBe(0)
    expect(merged).toBe(1)
    expect(changes.updateTasks).toEqual([{ id: 'f', patch: { dueDate: today } }])
  })

  test('同じ単元を2回選んでも1つだけ', () => {
    const { changes } = addFirstLaps({
      targets: [
        { unit: u1, material },
        { unit: u1, material },
      ],
      openTasks: [],
      today,
    })
    expect(changes.createTasks).toHaveLength(1)
  })
})

describe('4.4 解き直し', () => {
  test('指定した期限の redo タスクを作る。卒業済みの単元も選べる', () => {
    const { changes } = addRedos({
      targets: [
        { unit: u1, material },
        { unit: graduated, material },
      ],
      openTasks: [],
      dueDate: '2026-10-10',
    })
    expect(changes.createTasks.map((t) => [t.type, t.unitId, t.dueDate])).toEqual([
      ['redo', 'u1', '2026-10-10'],
      ['redo', 'u3', '2026-10-10'],
    ])
  })

  test('未完了タスクがある単元は、作らずに期限を早い方にする', () => {
    const cycle = makeTask({ id: 'c', unitId: 'u1', dueDate: '2026-10-20' })
    const early = makeTask({ id: 'd', unitId: 'u2', dueDate: '2026-10-01' })
    const { changes, created, merged } = addRedos({
      targets: [
        { unit: u1, material },
        { unit: u2, material },
      ],
      openTasks: [cycle, early],
      dueDate: '2026-10-10',
    })
    expect(created).toBe(0)
    expect(merged).toBe(2)
    expect(changes.updateTasks).toEqual([{ id: 'c', patch: { dueDate: '2026-10-10' } }])
  })
})

describe('4.5 学校課題', () => {
  test('単元なし：タイトルと締切だけの assignment を作る', () => {
    const { changes } = addAssignment({ title: '英作文プリント', dueDate: '2026-09-30', target: null, openTasks: [] })
    expect(changes.createTasks).toEqual([
      { type: 'assignment', title: '英作文プリント', materialId: null, unitId: null, rangeId: null, examIds: [], dueDate: '2026-09-30' },
    ])
  })

  test('単元つき：単元に紐づいた assignment を作る', () => {
    const { changes } = addAssignment({ title: '課題 p.20-25', dueDate: '2026-09-30', target: { unit: u1, material }, openTasks: [] })
    expect(changes.createTasks[0]).toMatchObject({ type: 'assignment', materialId: 'm1', unitId: 'u1' })
  })

  test('単元に未完了タスクがあれば、そのタスクを課題に切り替える（examIds は残す、期限は早い方）', () => {
    const fromExam = makeTask({ id: 'f', type: 'first', unitId: 'u1', examIds: ['e1'], dueDate: '2026-11-17' })
    const { changes, created, merged } = addAssignment({
      title: '課題 p.20-25',
      dueDate: '2026-09-30',
      target: { unit: u1, material },
      openTasks: [fromExam],
    })
    expect(created).toBe(0)
    expect(merged).toBe(1)
    expect(changes.createTasks).toEqual([])
    expect(changes.updateTasks).toEqual([
      { id: 'f', patch: { type: 'assignment', title: '課題 p.20-25', dueDate: '2026-09-30' } },
    ])
  })
})
