import { describe, expect, test } from 'vitest'
import { assignmentsDueOn, isDoneInList, isInArchive, sendToArchive, uncompleteTask, withLaps } from './archive.ts'
import { completeUnitTask } from './cycle.ts'
import { jstStartOfDayMs } from './date.ts'
import { applyExamSave } from './exam.ts'
import { lapOfTask, taskLabel } from './labels.ts'
import { archivedTasksByList, doneTasksByList, tasksByList } from './lists.ts'
import { completeMemorizeTask } from './memorize.ts'
import {
  applyChanges,
  makeExam,
  makeMaterial,
  makeRange,
  makeTask,
  makeUnit,
  openTasksOf,
  settings,
  type State,
} from './test-helpers.ts'

const today = '2026-10-04'
const startOfToday = jstStartOfDayMs(today)
const cycleBook = makeMaterial()
const wordBook = makeMaterial({ id: 'm2', name: 'ターゲット', kind: 'memorize' })

function stateWith(overrides: Partial<State> = {}): State {
  return { materials: [cycleBook, wordBook], units: [], ranges: [], exams: [], tasks: [], ...overrides }
}

describe('チェックを外す（周回系・復習系）', () => {
  test('完了して外すと、単元の記録とタスクが元に戻り、自動で作った次の周回は消える', () => {
    const unit = makeUnit({ lapCount: 1, remainingMarks: 6, lastDoneAt: '2026-09-27' })
    const task = makeTask({ id: 'c1', type: 'cycle', dueDate: today })
    const before = stateWith({ units: [unit], tasks: [task] })

    const done = completeUnitTask({
      task,
      unit,
      material: cycleBook,
      openTasks: [task],
      settings,
      today,
      now: startOfToday + 1000,
      remainingMarks: 2,
    })
    const after = applyChanges(before, done.changes)
    const doneTask = after.tasks.find((t) => t.id === 'c1')!
    expect(doneTask).toMatchObject({ status: 'done', lap: 2 })
    expect(openTasksOf(after)).toHaveLength(1)

    const undo = uncompleteTask({
      task: doneTask,
      unit: after.units[0],
      openTasks: openTasksOf(after),
      doneTasks: [doneTask],
    })
    const restored = applyChanges(after, undo)
    expect(restored.units).toEqual([unit])
    expect(restored.tasks).toEqual([task])
  })

  test('卒業（印0）を外すと、卒業も元に戻る', () => {
    const unit = makeUnit({ lapCount: 2, remainingMarks: 1 })
    const task = makeTask({ dueDate: today })
    const s0 = stateWith({ units: [unit], tasks: [task] })
    const done = completeUnitTask({ task, unit, material: cycleBook, openTasks: [task], settings, today, now: startOfToday, remainingMarks: 0 })
    const s1 = applyChanges(s0, done.changes)
    expect(s1.units[0].graduated).toBe(true)

    const undo = uncompleteTask({ task: s1.tasks[0], unit: s1.units[0], openTasks: openTasksOf(s1), doneTasks: [s1.tasks[0]] })
    const s2 = applyChanges(s1, undo)
    expect(s2.units).toEqual([unit])
    expect(s2.tasks[0].status).toBe('open')
  })

  test('完了のあと次の周回が予定に入っていたら、外したタスクがその予定を引き継ぐ（期限は早い方）', () => {
    const unit = makeUnit({ lapCount: 1, remainingMarks: 6 })
    const task = makeTask({ id: 'c1', dueDate: today })
    const s0 = stateWith({ units: [unit], tasks: [task] })
    const s1 = applyChanges(
      s0,
      completeUnitTask({ task, unit, material: cycleBook, openTasks: [task], settings, today, now: startOfToday, remainingMarks: 3 }).changes,
    )
    // 予定を登録 → 自動でできた次の周回（10/11）に予定がつき、期限が 10/7 になる
    const exam = makeExam({ id: 'e1', date: '2026-10-10', unitRefs: [{ materialId: 'm1', unitId: 'u1' }] })
    const s2 = applyChanges(
      s1,
      applyExamSave({ exam, units: s1.units, ranges: [], materials: s1.materials, openTasks: openTasksOf(s1), settings, today }).changes,
    )
    const doneTask = s2.tasks.find((t) => t.id === 'c1')!
    const undo = uncompleteTask({ task: doneTask, unit: s2.units[0], openTasks: openTasksOf(s2), doneTasks: [doneTask] })
    const s3 = applyChanges(s2, undo)
    expect(openTasksOf(s3)).toEqual([{ ...task, examIds: ['e1'] }])
  })

  test('同じ単元をこのあとにも完了していたら、外せない（新しい方から外す）', () => {
    const unit = makeUnit({ lapCount: 2, remainingMarks: 1 })
    const older = makeTask({
      id: 'a',
      status: 'done',
      completedAt: startOfToday + 1,
      lap: 1,
      before: { unit: { lapCount: 0, remainingMarks: null, graduated: false, lastDoneAt: null } },
    })
    const newer = makeTask({
      id: 'b',
      status: 'done',
      completedAt: startOfToday + 2,
      lap: 2,
      before: { unit: { lapCount: 1, remainingMarks: 4, graduated: false, lastDoneAt: today } },
    })
    expect(() => uncompleteTask({ task: older, unit, openTasks: [], doneTasks: [older, newer] })).toThrow('新しい方から')
    expect(() => uncompleteTask({ task: newer, unit, openTasks: [], doneTasks: [older, newer] })).not.toThrow()
  })

  test('v0.5 より前の完了（記録がない）は外せない', () => {
    const task = makeTask({ status: 'done', completedAt: startOfToday })
    expect(() => uncompleteTask({ task, unit: makeUnit({ lapCount: 1 }), openTasks: [], doneTasks: [task] })).toThrow('v0.5')
  })

  test('あとから課題に切り替えた未完了タスクがあれば、外せない', () => {
    const task = makeTask({
      id: 'c1',
      status: 'done',
      completedAt: startOfToday,
      lap: 2,
      before: { unit: { lapCount: 1, remainingMarks: 5, graduated: false, lastDoneAt: null } },
    })
    const converted = makeTask({ id: 'n', type: 'assignment', title: 'ワーク提出', createdBy: 'c1' })
    expect(() =>
      uncompleteTask({ task, unit: makeUnit({ lapCount: 2 }), openTasks: [converted], doneTasks: [task] }),
    ).toThrow('あとから追加')
  })
})

describe('チェックを外す（暗記・課題）', () => {
  test('暗記（v0.6）：範囲の周回数が元に戻る。カレンダーに入れたほかの予定はそのまま', () => {
    const range = makeRange({ lapCount: 1, lastDoneAt: '2026-10-01' })
    const task = makeTask({ id: 'k1', type: 'memorize', materialId: 'm2', unitId: null, rangeId: 'r1', dueDate: today })
    const planned = makeTask({ id: 'k2', type: 'memorize', materialId: 'm2', unitId: null, rangeId: 'r1', dueDate: '2026-10-11' })
    const s0 = stateWith({ ranges: [range], tasks: [task, planned] })
    const s1 = applyChanges(s0, completeMemorizeTask({ task, range, material: wordBook, today, now: startOfToday }).changes)
    expect(s1.ranges[0].lapCount).toBe(2)

    const doneTask = s1.tasks.find((t) => t.id === 'k1')!
    const s2 = applyChanges(s1, uncompleteTask({ task: doneTask, range: s1.ranges[0], openTasks: openTasksOf(s1), doneTasks: [doneTask] }))
    expect(s2.ranges).toEqual([range])
    expect(s2.tasks).toEqual([task, planned])
  })

  test('v0.5 までの暗記の完了（周回数を数えていない）は、範囲は変えずにタスクだけ戻す', () => {
    const range = makeRange({ lapCount: 2 })
    const old = makeTask({ id: 'k0', type: 'memorize', materialId: 'm2', unitId: null, rangeId: 'r1', status: 'done', completedAt: 1 })
    const changes = uncompleteTask({ task: old, range, openTasks: [], doneTasks: [old] })
    expect(changes.updateRanges).toEqual([])
    expect(changes.updateTasks[0].patch).toMatchObject({ status: 'open' })
  })

  test('単元のない課題は、未完了に戻すだけ', () => {
    const task = makeTask({ type: 'assignment', unitId: null, materialId: null, status: 'done', completedAt: startOfToday })
    const changes = uncompleteTask({ task, openTasks: [], doneTasks: [task] })
    expect(changes.updateTasks).toEqual([
      { id: 't1', patch: { status: 'open', completedAt: null, result: null, lap: null, before: null, archived: false } },
    ])
    expect(changes.updateUnits).toEqual([])
  })

  test('未完了のタスクは外せない', () => {
    expect(() => uncompleteTask({ task: makeTask(), openTasks: [], doneTasks: [] })).toThrow()
  })
})

describe('完了済みのリストとアーカイブ', () => {
  const doneToday = makeTask({ id: 'd1', status: 'done', completedAt: startOfToday + 10 })
  const doneYesterday = makeTask({ id: 'd2', status: 'done', completedAt: startOfToday - 10 })
  const sent = makeTask({ id: 'd3', status: 'done', completedAt: startOfToday + 20, archived: true })

  test('今日完了したものはリストに残り、次の日か「アーカイブへ」でアーカイブに入る', () => {
    expect(isDoneInList(doneToday, today)).toBe(true)
    expect(isInArchive(doneToday, today)).toBe(false)
    expect(isDoneInList(doneYesterday, today)).toBe(false)
    expect(isInArchive(doneYesterday, today)).toBe(true)
    expect(isInArchive(sent, today)).toBe(true)
    expect(isInArchive(makeTask(), today)).toBe(false)
  })

  test('アーカイブへ送る', () => {
    expect(sendToArchive(doneToday).updateTasks).toEqual([{ id: 'd1', patch: { archived: true } }])
    expect(sendToArchive(sent).updateTasks).toEqual([])
  })

  test('完了した一周目は、単元の周回数が増えても一周目のリストに残る', () => {
    const unit = makeUnit({ lapCount: 1 })
    const first = makeTask({ id: 'f', type: 'first', status: 'done', completedAt: startOfToday + 5, lap: 1 })
    const next = makeTask({ id: 'n', type: 'cycle', dueDate: '2026-10-11' })
    const done = doneTasksByList([first], [unit], [cycleBook], today)
    const open = tasksByList([next], [unit], [cycleBook])
    expect(done['cycle-lap1'].map((t) => t.id)).toEqual(['f'])
    expect(open['cycle-lap2'].map((t) => t.id)).toEqual(['n'])
    expect(taskLabel(first, unit)).toBe('一周目')
    expect(taskLabel(next, unit)).toBe('二周目')
  })

  test('アーカイブは、送ったものと前の日までの完了を、新しい順にリストごとに分ける', () => {
    const lists = archivedTasksByList([doneToday, doneYesterday, sent], [], [cycleBook], today)
    // lap がないので、同じ単元の完了した順（d2 → d1 → d3）で一周目・二周目・三周目。d1 はまだリストにある
    expect(lists['cycle-lap1'].map((t) => t.id)).toEqual(['d2'])
    expect(lists['cycle-lap2']).toEqual([])
    expect(lists['cycle-lap3'].map((t) => t.id)).toEqual(['d3'])
  })

  test('lap のない v0.4 までの完了は、同じ単元の完了した順に数えて周を補う', () => {
    const tasks = withLaps([
      makeTask({ id: 'x2', status: 'done', completedAt: 20 }),
      makeTask({ id: 'x1', status: 'done', completedAt: 10 }),
      makeTask({ id: 'x3', status: 'done', completedAt: 30, lap: 3 }),
      makeTask({ id: 'y', unitId: 'u2', status: 'done', completedAt: 5 }),
    ])
    expect(Object.fromEntries(tasks.map((t) => [t.id, t.lap]))).toEqual({ x2: 2, x1: 1, x3: 3, y: 1 })
  })

  test('完了済みの周：lap があればそれ、なければ単元の今の周回数', () => {
    expect(lapOfTask(makeTask({ status: 'done', lap: 2 }), makeUnit({ lapCount: 5 }))).toBe(2)
    expect(lapOfTask(makeTask({ status: 'done' }), makeUnit({ lapCount: 3 }))).toBe(3)
    expect(lapOfTask(makeTask(), makeUnit({ lapCount: 3 }))).toBe(4)
    expect(lapOfTask(makeTask(), undefined)).toBeNull()
  })
})

describe('今日提出の課題', () => {
  test('締切がその日の課題を、未完了・完了済み・アーカイブ済みすべて出す（未完了が上）', () => {
    const a = (id: string, o: Parameters<typeof makeTask>[0] = {}) =>
      makeTask({ id, type: 'assignment', unitId: null, dueDate: today, ...o })
    const tasks = [
      a('done', { status: 'done', completedAt: 1, createdAt: 1 }),
      a('archived', { status: 'done', completedAt: 2, archived: true, createdAt: 2 }),
      a('open', { createdAt: 3 }),
      a('tomorrow', { dueDate: '2026-10-05' }),
      makeTask({ id: 'cycle', dueDate: today }),
    ]
    expect(assignmentsDueOn(tasks, today).map((t) => t.id)).toEqual(['open', 'done', 'archived'])
  })
})
