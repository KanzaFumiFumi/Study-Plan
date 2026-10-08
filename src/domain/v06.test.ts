import { describe, expect, test } from 'vitest'
import { uncompleteTask } from './archive.ts'
import { calendarMarks } from './calendar.ts'
import { formatMonthDay, weekDates, weekdayOf } from './date.ts'
import { makeExam, makeTask, makeUnit } from './test-helpers.ts'

describe('ホームの週の帯（v0.6）', () => {
  test('その日を含む週（日曜はじまり）の7日', () => {
    // 2026-10-09 は金曜
    expect(weekDates('2026-10-09')).toEqual([
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
    ])
    // 月またぎ・日曜
    expect(weekDates('2026-11-01')[0]).toBe('2026-11-01')
    expect(weekDates('2026-10-31')[6]).toBe('2026-10-31')
    expect(weekdayOf('2026-10-09')).toBe('金')
    expect(formatMonthDay('2026-10-09')).toBe('10月9日')
  })

  test('日付ごとの目印：予定・暗記・それ以外のタスク。完了済みとアーカイブした教材は数えない', () => {
    const marks = calendarMarks(
      [
        makeTask({ id: 'a', dueDate: '2026-10-10' }),
        makeTask({ id: 'b', type: 'memorize', dueDate: '2026-10-10' }),
        makeTask({ id: 'c', type: 'memorize', dueDate: '2026-10-10' }),
        makeTask({ id: 'd', dueDate: '2026-10-10', status: 'done' }),
        makeTask({ id: 'e', dueDate: '2026-10-10', materialId: 'hidden' }),
      ],
      [makeExam({ date: '2026-10-10' }), makeExam({ id: 'e2', date: '2026-10-20' })],
      new Set(['hidden']),
    )
    expect(marks.get('2026-10-10')).toEqual({ events: 1, memorize: 2, tasks: 1 })
    expect(marks.get('2026-10-20')).toEqual({ events: 1, memorize: 0, tasks: 0 })
    expect(marks.get('2026-10-11')).toBeUndefined()
  })
})

describe('アーカイブから未完了に戻す（v0.6）', () => {
  test('アーカイブへ送った課題・前の日に完了した課題は、未完了に戻ってリストに出る', () => {
    const sent = makeTask({ type: 'assignment', unitId: null, materialId: null, status: 'done', completedAt: 5, archived: true })
    const changes = uncompleteTask({ task: sent, openTasks: [], doneTasks: [sent] })
    expect(changes.updateTasks[0].patch).toMatchObject({ status: 'open', completedAt: null, archived: false })
  })

  test('同じ単元をそのあと（別の日）にも完了していたら、古い方は戻せない', () => {
    const before = { unit: { lapCount: 0, remainingMarks: null, graduated: false, lastDoneAt: null } }
    const older = makeTask({ id: 'a', status: 'done', completedAt: 100, lap: 1, before })
    const newer = makeTask({
      id: 'b',
      status: 'done',
      completedAt: 200,
      lap: 2,
      before: { unit: { lapCount: 1, remainingMarks: 3, graduated: false, lastDoneAt: '2026-10-01' } },
    })
    const unit = makeUnit({ lapCount: 2 })
    expect(() => uncompleteTask({ task: older, unit, openTasks: [], doneTasks: [older, newer] })).toThrow('新しい方から')
    expect(uncompleteTask({ task: newer, unit, openTasks: [], doneTasks: [older, newer] }).updateUnits).toEqual([
      { materialId: 'm1', unitId: 'u1', patch: newer.before!.unit },
    ])
  })
})
