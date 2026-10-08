import { describe, expect, test } from 'vitest'
import { todayTasks, tasksDueOn } from './sort.ts'
import { makeExam, makeTask } from './test-helpers.ts'
import type { TaskType } from './types.ts'

const today = '2026-09-27'
const t = (id: string, type: TaskType, dueDate = today, extra = {}) => makeTask({ id, type, dueDate, unitId: id, ...extra })

describe('4.7 今日の一覧', () => {
  test('種類の順：assignment → first → exam → memorize → cycle → redo', () => {
    const tasks = [t('r', 'redo'), t('c', 'cycle'), t('m', 'memorize'), t('e', 'exam'), t('f', 'first'), t('a', 'assignment')]
    expect(todayTasks(tasks, [], today).map((x) => x.task.id)).toEqual(['a', 'f', 'e', 'm', 'c', 'r'])
  })

  test('期限が今日以前の未完了だけ。明日以降と完了済みは出さない', () => {
    const tasks = [
      t('past', 'cycle', '2026-09-20'),
      t('today', 'cycle'),
      t('tomorrow', 'cycle', '2026-09-28'),
      t('done', 'cycle', today, { status: 'done' }),
    ]
    expect(todayTasks(tasks, [], today).map((x) => x.task.id)).toEqual(['past', 'today'])
  })

  test('期限を過ぎたものは「遅れ」と日数', () => {
    const [late, onTime] = todayTasks([t('late', 'cycle', '2026-09-24'), t('ok', 'cycle')], [], today)
    expect(late).toMatchObject({ overdue: true, overdueDays: 3 })
    expect(onTime).toMatchObject({ overdue: false, overdueDays: 0 })
  })

  test('assignment は締切が近い順', () => {
    const tasks = [t('a2', 'assignment', '2026-09-27'), t('a1', 'assignment', '2026-09-25')]
    expect(todayTasks(tasks, [], today).map((x) => x.task.id)).toEqual(['a1', 'a2'])
  })

  test('exam は試験日が近い順（複数の試験に紐づくときは近い方）', () => {
    const exams = [
      makeExam({ id: 'kimatsu', date: '2026-11-20' }),
      makeExam({ id: 'moshi', date: '2026-10-10' }),
      makeExam({ id: 'shikaku', date: '2026-10-30' }),
    ]
    const tasks = [
      t('x', 'exam', today, { examIds: ['kimatsu'] }),
      t('y', 'exam', today, { examIds: ['shikaku'] }),
      t('z', 'exam', today, { examIds: ['kimatsu', 'moshi'] }),
    ]
    expect(todayTasks(tasks, exams, today).map((x) => x.task.id)).toEqual(['z', 'y', 'x'])
  })

  test('同じ種類の中は期限の早い順、同じ期限なら作った順', () => {
    const tasks = [
      t('c3', 'cycle', today, { createdAt: 1 }),
      t('c2', 'cycle', today, { createdAt: 0 }),
      t('c1', 'cycle', '2026-09-26', { createdAt: 5 }),
    ]
    expect(todayTasks(tasks, [], today).map((x) => x.task.id)).toEqual(['c1', 'c2', 'c3'])
  })

  test('非表示にした教材（アーカイブ）のタスクは出さない', () => {
    const tasks = [t('a', 'cycle', today, { materialId: 'archived' }), t('b', 'cycle'), t('c', 'assignment', today, { materialId: null })]
    expect(todayTasks(tasks, [], today, new Set(['archived'])).map((x) => x.task.id)).toEqual(['c', 'b'])
  })
})

describe('その日が期限のタスク（v0.6、ホームのカレンダー）', () => {
  test('その日が期限の未完了タスクを種類の順に。完了済み・アーカイブした教材は除く', () => {
    const tasks = [
      t('c', 'cycle', '2026-09-30'),
      t('m', 'memorize', '2026-09-30'),
      t('a', 'assignment', '2026-09-30', { materialId: null }),
      t('other', 'first', '2026-10-01'),
      t('done', 'cycle', '2026-09-30', { status: 'done' }),
      t('hidden', 'cycle', '2026-09-30', { materialId: 'archived' }),
    ]
    expect(tasksDueOn(tasks, '2026-09-30', new Set(['archived'])).map((x) => x.id)).toEqual(['a', 'm', 'c'])
  })
})

describe('今日やる（v0.4）', () => {
  test('「今日やる」と選んだタスクは、期限が先でも今日の一覧に入り', () => {
    const tasks = [
      t('due', 'cycle', today),
      t('planned', 'redo', '2026-10-05', { plannedFor: today }),
      t('old-mark', 'redo', '2026-10-06', { plannedFor: '2026-09-26' }),
      t('later', 'cycle', '2026-10-01'),
    ]
    const items = todayTasks(tasks, [], today)
    expect(items.map((x) => [x.task.id, x.planned])).toEqual([
      ['due', false],
      ['planned', true],
    ])
  })
})
