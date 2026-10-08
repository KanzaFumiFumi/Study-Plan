import { describe, expect, test } from 'vitest'
import { applyExamDelete, applyExamSave, examDueDate, upcomingExams } from './exam.ts'
import { makeExam, makeMaterial, makeRange, makeTask, makeUnit, settings } from './test-helpers.ts'

const today = '2026-09-27'
const materials = [makeMaterial()]
const notStarted = makeUnit({ id: 'u1' })
const inProgress = makeUnit({ id: 'u2', lapCount: 1, remainingMarks: 4 })
const graduated = makeUnit({ id: 'u3', lapCount: 2, remainingMarks: 0, graduated: true })
const units = [notStarted, inProgress, graduated]
const ref = (unitId: string) => ({ materialId: 'm1', unitId })

describe('examDueDate', () => {
  test('予定の日 - 何日前', () => {
    expect(examDueDate('2026-11-20', 3, today)).toBe('2026-11-17')
  })
  test('それが今日より前なら今日にする', () => {
    expect(examDueDate('2026-09-29', 3, today)).toBe(today)
    expect(examDueDate(today, 3, today)).toBe(today)
  })
  test('試験日が過ぎていれば null（タスクを作らない）', () => {
    expect(examDueDate('2026-09-26', 3, today)).toBeNull()
  })
})

describe('4.2 試験を登録したとき', () => {
  test('未着手は first、周回中は exam、卒業済みは何もしない。期限は試験日-3日', () => {
    const exam = makeExam({ unitRefs: [ref('u1'), ref('u2'), ref('u3')] })
    const { changes, created, merged } = applyExamSave({ exam, units, ranges: [], materials, openTasks: [], settings, today })

    expect(created).toBe(2)
    expect(merged).toBe(0)
    expect(changes.createTasks).toEqual([
      expect.objectContaining({ type: 'first', unitId: 'u1', examIds: ['e1'], dueDate: '2026-11-17' }),
      expect.objectContaining({ type: 'exam', unitId: 'u2', examIds: ['e1'], dueDate: '2026-11-17' }),
    ])
  })

  test('予定に「何日前」の指定がなければ、設定の examLeadDays に従う', () => {
    const exam = makeExam({ unitRefs: [ref('u1')] })
    const { changes } = applyExamSave({
      exam,
      units,
      ranges: [],
      materials,
      openTasks: [],
      settings: { ...settings, examLeadDays: 7 },
      today,
    })
    expect(changes.createTasks[0].dueDate).toBe('2026-11-13')
  })

  test('その単元に未完了タスクがあれば作らず、examIds に試験を足して期限を早い方にする', () => {
    const existing = makeTask({ id: 'c1', unitId: 'u2', type: 'cycle', dueDate: '2026-12-01' })
    const exam = makeExam({ unitRefs: [ref('u2')] })
    const { changes, created, merged } = applyExamSave({ exam, units, ranges: [], materials, openTasks: [existing], settings, today })
    expect(created).toBe(0)
    expect(merged).toBe(1)
    expect(changes.createTasks).toEqual([])
    expect(changes.updateTasks).toEqual([{ id: 'c1', patch: { examIds: ['e1'], dueDate: '2026-11-17' } }])
  })

  test('既存タスクの期限の方が早ければ、期限はそのまま', () => {
    const existing = makeTask({ id: 'c1', unitId: 'u2', dueDate: '2026-10-01' })
    const exam = makeExam({ unitRefs: [ref('u2')] })
    const { changes } = applyExamSave({ exam, units, ranges: [], materials, openTasks: [existing], settings, today })
    expect(changes.updateTasks).toEqual([{ id: 'c1', patch: { examIds: ['e1'], dueDate: '2026-10-01' } }])
  })

  test('範囲が重なる2つの試験でも、同じ単元のタスクは1つで、期限は早い方', () => {
    // 1つめ：期末考査（11/20）でタスクを作る
    const exam1 = makeExam({ id: 'e1', date: '2026-11-20', unitRefs: [ref('u1'), ref('u2')] })
    const first = applyExamSave({ exam: exam1, units, ranges: [], materials, openTasks: [], settings, today })
    const openTasks = first.changes.createTasks.map((t, i) => makeTask({ ...t, id: `x${i}` }))

    // 2つめ：模試（11/8）。範囲が u2 だけ重なる
    const exam2 = makeExam({ id: 'e2', date: '2026-11-08', unitRefs: [ref('u2')] })
    const second = applyExamSave({ exam: exam2, units, ranges: [], materials, openTasks, settings, today })
    expect(second.changes.createTasks).toEqual([])
    expect(second.changes.updateTasks).toEqual([{ id: 'x1', patch: { examIds: ['e1', 'e2'], dueDate: '2026-11-05' } }])
  })

  test('同じ内容で保存し直しても、examIds が重複したり変更が出たりしない', () => {
    const existing = makeTask({ id: 'c1', unitId: 'u2', type: 'exam', examIds: ['e1'], dueDate: '2026-11-17' })
    const exam = makeExam({ unitRefs: [ref('u2')] })
    const { changes, merged } = applyExamSave({ exam, units, ranges: [], materials, openTasks: [existing], settings, today })
    expect(merged).toBe(1)
    expect(changes.updateTasks).toEqual([])
    expect(changes.createTasks).toEqual([])
  })

  test('試験日を後ろにずらしても、期限は延びない（早い方のまま）', () => {
    const existing = makeTask({ id: 'c1', unitId: 'u2', type: 'exam', examIds: ['e1'], dueDate: '2026-11-17' })
    const exam = makeExam({ date: '2026-12-10', unitRefs: [ref('u2')] })
    const { changes } = applyExamSave({ exam, units, ranges: [], materials, openTasks: [existing], settings, today })
    expect(changes.updateTasks).toEqual([])
  })

  test('試験日を前にずらすと、期限も早まる', () => {
    const existing = makeTask({ id: 'c1', unitId: 'u2', type: 'exam', examIds: ['e1'], dueDate: '2026-11-17' })
    const exam = makeExam({ date: '2026-11-10', unitRefs: [ref('u2')] })
    const { changes } = applyExamSave({ exam, units, ranges: [], materials, openTasks: [existing], settings, today })
    expect(changes.updateTasks).toEqual([{ id: 'c1', patch: { examIds: ['e1'], dueDate: '2026-11-07' } }])
  })

  test('直前に登録した試験は、期限が今日になる', () => {
    const exam = makeExam({ date: '2026-09-28', unitRefs: [ref('u1')] })
    const { changes } = applyExamSave({ exam, units, ranges: [], materials, openTasks: [], settings, today })
    expect(changes.createTasks[0].dueDate).toBe(today)
  })

  test('試験日が過ぎた試験は、タスクを作らない', () => {
    const exam = makeExam({ date: '2026-09-20', unitRefs: [ref('u1'), ref('u2')] })
    const { changes, created } = applyExamSave({ exam, units, ranges: [], materials, openTasks: [], settings, today })
    expect(created).toBe(0)
    expect(changes.createTasks).toEqual([])
  })

  test('範囲に同じ単元が重複していても1つだけ作る。存在しない単元は無視する', () => {
    const exam = makeExam({ unitRefs: [ref('u1'), ref('u1'), ref('u404')] })
    const { changes } = applyExamSave({ exam, units, ranges: [], materials, openTasks: [], settings, today })
    expect(changes.createTasks).toHaveLength(1)
  })
})

describe('予定ごとの「何日前までに仕上げるか」（v0.2）', () => {
  test('予定に指定があれば、設定より優先する', () => {
    const trip = makeExam({ id: 'trip', category: '旅行', date: '2026-11-20', leadDays: 7, unitRefs: [ref('u1')] })
    const { changes } = applyExamSave({ exam: trip, units, ranges: [], materials, openTasks: [], settings, today })
    expect(changes.createTasks[0].dueDate).toBe('2026-11-13')
  })

  test('0 日前なら予定の当日が期限', () => {
    const match = makeExam({ id: 'match', category: '大会', date: '2026-10-10', leadDays: 0, unitRefs: [ref('u2')] })
    const { changes } = applyExamSave({ exam: match, units, ranges: [], materials, openTasks: [], settings, today })
    expect(changes.createTasks[0]).toMatchObject({ type: 'exam', dueDate: '2026-10-10' })
  })
})

describe('予定の範囲に暗記の範囲を入れたとき（v0.2、v0.6 で変更）', () => {
  const leap = makeMaterial({ id: 'm2', name: 'LEAP', kind: 'memorize', targetLaps: 3 })
  const freeRange = makeRange({ id: 'r1', materialId: 'm2', label: 'No.1-100' })
  const plannedRange = makeRange({ id: 'r2', materialId: 'm2', label: 'No.101-200', lapCount: 1 })
  const finishedRange = makeRange({ id: 'r3', materialId: 'm2', label: 'No.201-300', lapCount: 3 })
  const ranges = [freeRange, plannedRange, finishedRange]
  const rref = (rangeId: string) => ({ materialId: 'm2', rangeId })
  const allMaterials = [...materials, leap]

  test('予定が入っていない範囲には、単元と同じ期限（予定の日 − 何日前）の暗記タスクを1つ作る', () => {
    const trip = makeExam({ id: 'trip', category: '旅行', rangeRefs: [rref('r1')] })
    const { changes, created } = applyExamSave({
      exam: trip,
      units,
      ranges,
      materials: allMaterials,
      openTasks: [],
      settings,
      today,
    })
    expect(created).toBe(1)
    expect(changes.createTasks).toEqual([
      {
        type: 'memorize',
        title: 'LEAP No.1-100',
        materialId: 'm2',
        unitId: null,
        rangeId: 'r1',
        examIds: ['trip'],
        dueDate: '2026-11-17',
      },
    ])
    expect(changes.updateRanges).toEqual([])
  })

  test('カレンダーに入れた予定がある範囲は、そのタスクすべてに予定を足すだけ（日付は変えない）', () => {
    const a1 = makeTask({ id: 'k2', type: 'memorize', materialId: 'm2', unitId: null, rangeId: 'r2', dueDate: '2026-10-05' })
    const a2 = makeTask({ id: 'k3', type: 'memorize', materialId: 'm2', unitId: null, rangeId: 'r2', dueDate: '2026-10-12' })
    const trip = makeExam({ id: 'trip', rangeRefs: [rref('r2')] })
    const { changes, created, merged } = applyExamSave({
      exam: trip,
      units,
      ranges,
      materials: allMaterials,
      openTasks: [a1, a2],
      settings,
      today,
    })
    expect(created).toBe(0)
    expect(merged).toBe(1)
    expect(changes.updateTasks).toEqual([
      { id: 'k2', patch: { examIds: ['trip'] } },
      { id: 'k3', patch: { examIds: ['trip'] } },
    ])
  })

  test('目標の周回数を終えた範囲には作らない', () => {
    const trip = makeExam({ id: 'trip', rangeRefs: [rref('r3')] })
    const { changes } = applyExamSave({ exam: trip, units, ranges, materials: allMaterials, openTasks: [], settings, today })
    expect(changes.createTasks).toEqual([])
  })

  test('範囲から外した暗記の範囲は、examIds から外すだけ', () => {
    const review = makeTask({ id: 'k2', type: 'memorize', materialId: 'm2', unitId: null, rangeId: 'r2', examIds: ['trip'] })
    const trip = makeExam({ id: 'trip', rangeRefs: [] })
    const { changes, detached } = applyExamSave({
      exam: trip,
      units,
      ranges,
      materials: allMaterials,
      openTasks: [review],
      settings,
      today,
    })
    expect(detached).toBe(1)
    expect(changes.updateTasks).toEqual([{ id: 'k2', patch: { examIds: [] } }])
  })

  test('予定の日が過ぎていれば、暗記のタスクも作らない', () => {
    const past = makeExam({ id: 'past', date: '2026-09-01', rangeRefs: [rref('r1')] })
    const { changes } = applyExamSave({ exam: past, units, ranges, materials: allMaterials, openTasks: [], settings, today })
    expect(changes.createTasks).toEqual([])
  })
})

describe('範囲から外したとき・試験を削除したとき', () => {
  test('範囲から外した単元のタスクは、examIds から外すだけ（消さない・期限も変えない）', () => {
    const t1 = makeTask({ id: 'a', unitId: 'u1', type: 'first', examIds: ['e1', 'e2'], dueDate: '2026-11-05' })
    const t2 = makeTask({ id: 'b', unitId: 'u2', type: 'exam', examIds: ['e1'], dueDate: '2026-11-17' })
    const exam = makeExam({ unitRefs: [ref('u2')] }) // u1 を外した
    const { changes, detached } = applyExamSave({ exam, units, ranges: [], materials, openTasks: [t1, t2], settings, today })
    expect(detached).toBe(1)
    expect(changes.updateTasks).toEqual([{ id: 'a', patch: { examIds: ['e2'] } }])
    expect(changes.deleteTasks).toEqual([])
  })

  test('試験を削除すると、未完了タスクの examIds から外すだけ', () => {
    const t1 = makeTask({ id: 'a', examIds: ['e1'] })
    const t2 = makeTask({ id: 'b', unitId: 'u2', examIds: ['e1', 'e2'] })
    const t3 = makeTask({ id: 'c', unitId: 'u3', examIds: ['e2'] })
    const changes = applyExamDelete('e1', [t1, t2, t3])
    expect(changes.updateTasks).toEqual([
      { id: 'a', patch: { examIds: [] } },
      { id: 'b', patch: { examIds: ['e2'] } },
    ])
    expect(changes.deleteTasks).toEqual([])
  })
})

describe('upcomingExams（カウントダウン）', () => {
  test('今日以降の試験を近い順に、残り日数つきで', () => {
    const exams = [
      makeExam({ id: 'a', date: '2026-11-20' }),
      makeExam({ id: 'b', date: '2026-09-20' }),
      makeExam({ id: 'c', date: '2026-10-04' }),
      makeExam({ id: 'd', date: today }),
    ]
    expect(upcomingExams(exams, today).map((x) => [x.exam.id, x.daysLeft])).toEqual([
      ['d', 0],
      ['c', 7],
      ['a', 54],
    ])
  })
})
