import type { Exam, ISODate, Task } from './types.ts'

/** カレンダーの1日の目印（v0.6〜、ホームの週の帯と月のカレンダー） */
export interface DayMark {
  /** 予定（試験・大会など）の数 */
  events: number
  /** 暗記の数 */
  memorize: number
  /** 暗記以外の未完了タスクの数 */
  tasks: number
}

/** 日付ごとの目印。アーカイブした教材のタスクは数えない */
export function calendarMarks(
  openTasks: Task[],
  exams: Exam[],
  hiddenMaterialIds: ReadonlySet<string> = new Set(),
): Map<ISODate, DayMark> {
  const marks = new Map<ISODate, DayMark>()
  const at = (date: ISODate) => {
    let mark = marks.get(date)
    if (!mark) {
      mark = { events: 0, memorize: 0, tasks: 0 }
      marks.set(date, mark)
    }
    return mark
  }
  for (const exam of exams) at(exam.date).events += 1
  for (const task of openTasks) {
    if (task.status !== 'open' || (task.materialId && hiddenMaterialIds.has(task.materialId))) continue
    if (task.type === 'memorize') at(task.dueDate).memorize += 1
    else at(task.dueDate).tasks += 1
  }
  return marks
}
