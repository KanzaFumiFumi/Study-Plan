import { describe, expect, test } from 'vitest'
import { parseLines } from './text.ts'
import { makeExam, makeRange, makeTask, makeUnit } from './test-helpers.ts'
import { deleteRangeChanges, deleteUnitChanges } from './units.ts'

describe('単元・範囲の削除', () => {
  test('単元の未完了タスクを消し、試験の範囲からも外す', () => {
    const unit = makeUnit({ id: 'u1' })
    const tasks = [makeTask({ id: 'a', unitId: 'u1' }), makeTask({ id: 'b', unitId: 'u2' })]
    const exams = [
      makeExam({ id: 'e1', unitRefs: [{ materialId: 'm1', unitId: 'u1' }, { materialId: 'm1', unitId: 'u2' }] }),
      makeExam({ id: 'e2', unitRefs: [{ materialId: 'm1', unitId: 'u2' }] }),
    ]
    const changes = deleteUnitChanges(unit, tasks, exams)
    expect(changes.deleteTasks).toEqual(['a'])
    expect(changes.updateExams).toEqual([{ id: 'e1', patch: { unitRefs: [{ materialId: 'm1', unitId: 'u2' }] } }])
  })

  test('範囲の未完了タスクを消し、予定の範囲からも外す', () => {
    const range = makeRange({ id: 'r1', materialId: 'm2' })
    const tasks = [
      makeTask({ id: 'k1', type: 'memorize', materialId: 'm2', unitId: null, rangeId: 'r1' }),
      makeTask({ id: 'k2', type: 'memorize', materialId: 'm2', unitId: null, rangeId: 'r2' }),
    ]
    const exams = [
      makeExam({ id: 'trip', rangeRefs: [{ materialId: 'm2', rangeId: 'r1' }, { materialId: 'm2', rangeId: 'r2' }] }),
      makeExam({ id: 'other', rangeRefs: [{ materialId: 'm2', rangeId: 'r2' }] }),
    ]
    const changes = deleteRangeChanges(range, tasks, exams)
    expect(changes.deleteTasks).toEqual(['k1'])
    expect(changes.updateExams).toEqual([{ id: 'trip', patch: { rangeRefs: [{ materialId: 'm2', rangeId: 'r2' }] } }])
  })
})

describe('parseLines（まとめて貼り付け）', () => {
  test('改行で分け、前後の空白と空行を除く', () => {
    expect(parseLines('第1章\r\n  第2章  \n\n\t\n第3章\n')).toEqual(['第1章', '第2章', '第3章'])
    expect(parseLines('')).toEqual([])
  })
})
