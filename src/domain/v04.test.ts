import { describe, expect, test } from 'vitest'
import { calendarWeeks, jstStartOfDayMs, shiftMonth, todayJST } from './date.ts'
import { kanjiNumber, lapLabel, taskLabel } from './labels.ts'
import { LIST_DEFS, listKeyOf, tasksByList } from './lists.ts'
import { setPlannedForToday } from './manual.ts'
import { scheduleRanges } from './memorize.ts'
import { groupBySubject, moveSubjectGroup, moveWithin, sortMaterials } from './shelf.ts'
import { makeMaterial, makeRange, makeTask, makeUnit } from './test-helpers.ts'
import type { TaskType } from './types.ts'

const today = '2026-10-02'

describe('周目の表示', () => {
  test('漢数字', () => {
    expect([1, 2, 3, 4, 9, 10, 11, 20, 21, 99].map(kanjiNumber)).toEqual([
      '一',
      '二',
      '三',
      '四',
      '九',
      '十',
      '十一',
      '二十',
      '二十一',
      '九十九',
    ])
    expect(lapLabel(3)).toBe('三周目')
  })

  test('単元のタスクは「何周目か」（未着手なら一周目、2周終えていれば三周目）。解き直し・課題・暗記はそのまま', () => {
    expect(taskLabel({ type: 'first' }, { lapCount: 0 })).toBe('一周目')
    expect(taskLabel({ type: 'cycle' }, { lapCount: 1 })).toBe('二周目')
    expect(taskLabel({ type: 'exam' }, { lapCount: 2 })).toBe('三周目')
    expect(taskLabel({ type: 'redo' }, { lapCount: 2 })).toBe('解き直し')
    expect(taskLabel({ type: 'assignment' })).toBe('課題')
    expect(taskLabel({ type: 'memorize' })).toBe('暗記')
  })
})

describe('リスト（周回系・復習系の周目ごと）', () => {
  const book = makeMaterial({ id: 'book', kind: 'cycle' })
  const notes = makeMaterial({ id: 'notes', kind: 'review' })
  const leap = makeMaterial({ id: 'leap', kind: 'memorize' })
  const materials = [book, notes, leap]
  const units = [
    makeUnit({ id: 'b0', materialId: 'book', lapCount: 0 }),
    makeUnit({ id: 'b1', materialId: 'book', lapCount: 1 }),
    makeUnit({ id: 'b2', materialId: 'book', lapCount: 2 }),
    makeUnit({ id: 'b5', materialId: 'book', lapCount: 5 }),
    makeUnit({ id: 'n1', materialId: 'notes', lapCount: 1 }),
  ]
  const task = (id: string, type: TaskType, materialId: string | null, unitId: string | null, extra = {}) =>
    makeTask({ id, type, materialId, unitId, ...extra })

  test('周回系と復習系に分け、何周目かでリストを決める。予定に向けたタスクも周目のリストに入る', () => {
    expect(listKeyOf(task('a', 'first', 'book', 'b0'), units, materials)).toBe('cycle-lap1')
    expect(listKeyOf(task('b', 'cycle', 'book', 'b1'), units, materials)).toBe('cycle-lap2')
    expect(listKeyOf(task('c', 'exam', 'book', 'b2'), units, materials)).toBe('cycle-lap3')
    expect(listKeyOf(task('d', 'cycle', 'book', 'b5'), units, materials)).toBe('cycle-lap4plus')
    expect(listKeyOf(task('e', 'redo', 'book', 'b1'), units, materials)).toBe('cycle-redo')
    expect(listKeyOf(task('f', 'cycle', 'notes', 'n1'), units, materials)).toBe('review-lap2')
    expect(listKeyOf(task('g', 'assignment', 'book', 'b0'), units, materials)).toBe('assignment')
    expect(listKeyOf(task('h', 'memorize', 'leap', null, { rangeId: 'r1' }), units, materials)).toBe('memorize')
  })

  test('全部のリストを返し、期限の早い順に並べる。アーカイブした教材は除く', () => {
    const lists = tasksByList(
      [
        task('late', 'cycle', 'book', 'b1', { dueDate: '2026-10-09' }),
        task('soon', 'cycle', 'book', 'b1', { dueDate: '2026-10-03' }),
        task('hidden', 'first', 'old', 'x'),
      ],
      units,
      materials,
      new Set(['old']),
    )
    expect(Object.keys(lists)).toEqual(LIST_DEFS.map((d) => d.key))
    expect(lists['cycle-lap2'].map((t) => t.id)).toEqual(['soon', 'late'])
    expect(Object.values(lists).flat()).toHaveLength(2)
  })
})

describe('今日やる', () => {
  test('印をつける・外す。同じなら変更なし', () => {
    const t = makeTask({ id: 't', plannedFor: null })
    expect(setPlannedForToday(t, today, true).updateTasks).toEqual([{ id: 't', patch: { plannedFor: today } }])
    expect(setPlannedForToday({ ...t, plannedFor: today }, today, false).updateTasks).toEqual([
      { id: 't', patch: { plannedFor: null } },
    ])
    expect(setPlannedForToday({ ...t, plannedFor: today }, today, true).updateTasks).toEqual([])
  })
})

describe('カレンダーで暗記の範囲を日付に割り当てる', () => {
  const leap = makeMaterial({ id: 'leap', name: 'LEAP', kind: 'memorize' })
  const fresh = makeRange({ id: 'r1', materialId: 'leap', label: 'No.1-100' })
  const reviewing = makeRange({ id: 'r2', materialId: 'leap', label: 'No.101-200', started: true, step: 2 })
  const review = makeTask({ id: 'k2', type: 'memorize', materialId: 'leap', unitId: null, rangeId: 'r2', dueDate: '2026-10-08' })

  test('未開始の範囲は、その日に開始する暗記タスクを作る。復習中の範囲は復習日をその日に移す', () => {
    const { changes, created, moved } = scheduleRanges({
      targets: [
        { range: fresh, material: leap },
        { range: reviewing, material: leap },
      ],
      openTasks: [review],
      date: '2026-10-05',
    })
    expect([created, moved]).toEqual([1, 1])
    expect(changes.createTasks).toEqual([
      { type: 'memorize', title: 'LEAP No.1-100', materialId: 'leap', unitId: null, rangeId: 'r1', examIds: [], dueDate: '2026-10-05' },
    ])
    expect(changes.updateTasks).toEqual([{ id: 'k2', patch: { dueDate: '2026-10-05' } }])
    expect(changes.updateRanges).toEqual([
      { materialId: 'leap', rangeId: 'r1', patch: { started: true, nextReviewAt: '2026-10-05' } },
      { materialId: 'leap', rangeId: 'r2', patch: { nextReviewAt: '2026-10-05' } },
    ])
  })

  test('すでにその日になっている範囲は変更なし', () => {
    const { changes, moved } = scheduleRanges({ targets: [{ range: reviewing, material: leap }], openTasks: [review], date: '2026-10-08' })
    expect(moved).toBe(0)
    expect(changes.updateTasks).toEqual([])
  })
})

describe('本棚の並べ替えと教科別', () => {
  test('order の小さい順（v0.3 までの教材は createdAt を order として使う）', () => {
    const list = sortMaterials([
      makeMaterial({ id: 'new', order: 1790000000000, createdAt: 1790000000000 }),
      makeMaterial({ id: 'b', order: 1 }),
      makeMaterial({ id: 'a', order: 0 }),
    ])
    expect(list.map((m) => m.id)).toEqual(['a', 'b', 'new'])
  })

  test('上下に動かす。端では動かない。教科別のときは同じ教科の中だけで動く', () => {
    expect(moveWithin(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c'])
    expect(moveWithin(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c'])
    const subject: Record<string, string> = { m1: '数学', e1: '英語', m2: '数学' }
    const same = (x: string, y: string) => subject[x] === subject[y]
    expect(moveWithin(['m1', 'e1', 'm2'], 'm2', -1, same)).toEqual(['m2', 'e1', 'm1'])
    expect(moveWithin(['m1', 'e1', 'm2'], 'e1', -1, same)).toEqual(['m1', 'e1', 'm2'])
  })

  test('教科ごと上下に動かす', () => {
    const list = [
      makeMaterial({ id: 'e', subject: '英語' }),
      makeMaterial({ id: 'm', subject: '数学' }),
      makeMaterial({ id: 'e2', subject: '英語' }),
    ]
    expect(moveSubjectGroup(list, '数学', -1)).toEqual(['m', 'e', 'e2'])
    expect(moveSubjectGroup(list, '英語', -1)).toEqual(['e', 'e2', 'm'])
  })

  test('教科ごとにまとめる（教科の順は最初に出てくる順。空は「教科なし」）', () => {
    const groups = groupBySubject([
      makeMaterial({ id: 'e', subject: '英語' }),
      makeMaterial({ id: 'm', subject: '数学' }),
      makeMaterial({ id: 'e2', subject: '英語' }),
      makeMaterial({ id: 'x', subject: ' ' }),
    ])
    expect(groups.map((g) => [g.subject, g.materials.map((m) => m.id)])).toEqual([
      ['英語', ['e', 'e2']],
      ['数学', ['m']],
      ['教科なし', ['x']],
    ])
  })
})

describe('日付（v0.4）', () => {
  test('日本時間のその日の0時', () => {
    expect(todayJST(new Date(jstStartOfDayMs('2026-10-02')))).toBe('2026-10-02')
    expect(todayJST(new Date(jstStartOfDayMs('2026-10-02') - 1))).toBe('2026-10-01')
  })

  test('カレンダーの週（日曜はじまり。2026年10月は木曜はじまりの31日）', () => {
    const weeks = calendarWeeks(2026, 10)
    expect(weeks).toHaveLength(5)
    expect(weeks[0]).toEqual([null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03'])
    expect(weeks[4]).toEqual(['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'])
  })

  test('月を前後に動かす（年またぎ）', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
  })
})
