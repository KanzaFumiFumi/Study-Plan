import { addDays, daysBetween } from './date.ts'
import type { Exam, ISODate, Task, TaskType } from './types.ts'

/** 4.7 今日の一覧の並び順（小さいほど上） */
export const TYPE_PRIORITY: Record<TaskType, number> = {
  assignment: 0,
  first: 1,
  exam: 2,
  memorize: 3,
  cycle: 4,
  redo: 5,
}

export interface TodayItem {
  task: Task
  /** 期限を過ぎている */
  overdue: boolean
  /** 何日遅れているか（遅れていなければ 0） */
  overdueDays: number
  /** 期限はまだ先だが「今日やる」と選んだもの（v0.4〜） */
  planned: boolean
}

/** 今日のチェックリストに入るか：期限が今日まで、または「今日やる」と選んだもの（v0.4〜） */
export function isForToday(task: Task, today: ISODate): boolean {
  return task.dueDate <= today || task.plannedFor === today
}

/**
 * これからのタスク（v0.2）：期限が明日から days 日後までの未完了タスクを、期限の早い順（同じ日は 4.7 の種類順）に。
 * later は、それより先に期限があるタスクの数。「今日やる」と選んだものは今日のチェックリストに出すので除く。
 */
export function upcomingTasks(
  openTasks: Task[],
  today: ISODate,
  days: number,
  hiddenMaterialIds: ReadonlySet<string> = new Set(),
): { tasks: Task[]; later: number } {
  const until = addDays(today, days)
  const visible = openTasks.filter(
    (t) => t.status === 'open' && !isForToday(t, today) && !(t.materialId && hiddenMaterialIds.has(t.materialId)),
  )
  const tasks = visible
    .filter((t) => t.dueDate <= until)
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type] ||
        a.createdAt - b.createdAt ||
        a.id.localeCompare(b.id),
    )
  return { tasks, later: visible.length - tasks.length }
}

/** タスクに紐づく試験のうち、いちばん近い試験日（今日以降を優先。なければ過去の試験で最も早い日） */
export function nearestExamDate(task: Task, examsById: Map<string, Exam>, today: ISODate): ISODate | null {
  const dates = task.examIds.map((id) => examsById.get(id)?.date).filter((d): d is ISODate => !!d)
  if (dates.length === 0) return null
  const upcoming = dates.filter((d) => d >= today)
  return (upcoming.length ? upcoming : dates).sort()[0]
}

/**
 * 今日の一覧（チェックリスト）：期限が今日以前の未完了タスクと、「今日やる」と選んだタスク（v0.4〜）。
 * assignment（締切が近い順）→ first → exam（試験日が近い順）→ memorize → cycle → redo。
 * 同じ順位の中は期限の早い順、同じ期限なら作った順。
 * hiddenMaterialIds（アーカイブした教材など）のタスクは出さない。
 */
export function todayTasks(
  openTasks: Task[],
  exams: Exam[],
  today: ISODate,
  hiddenMaterialIds: ReadonlySet<string> = new Set(),
): TodayItem[] {
  const examsById = new Map(exams.map((e) => [e.id, e]))
  const groupKey = (task: Task): string => {
    if (task.type === 'assignment') return task.dueDate
    if (task.type === 'exam') return nearestExamDate(task, examsById, today) ?? '9999-12-31'
    return ''
  }

  return openTasks
    .filter((t) => t.status === 'open' && isForToday(t, today) && !(t.materialId && hiddenMaterialIds.has(t.materialId)))
    .sort(
      (a, b) =>
        TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type] ||
        groupKey(a).localeCompare(groupKey(b)) ||
        a.dueDate.localeCompare(b.dueDate) ||
        a.createdAt - b.createdAt ||
        a.id.localeCompare(b.id),
    )
    .map((task) => {
      const overdueDays = Math.max(0, daysBetween(task.dueDate, today))
      return { task, overdue: overdueDays > 0, overdueDays, planned: task.dueDate > today }
    })
}
