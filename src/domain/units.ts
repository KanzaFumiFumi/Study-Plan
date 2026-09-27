import { emptyChangeSet, type ChangeSet } from './changeset.ts'
import type { Exam, Range, Task, Unit } from './types.ts'

/** 単元を削除するとき：その単元の未完了タスクを消し、試験の範囲からも外す */
export function deleteUnitChanges(unit: Unit, openTasks: Task[], exams: Exam[]): ChangeSet {
  const cs = emptyChangeSet()
  cs.deleteTasks = openTasks
    .filter((t) => t.status === 'open' && t.materialId === unit.materialId && t.unitId === unit.id)
    .map((t) => t.id)
  for (const exam of exams) {
    const unitRefs = exam.unitRefs.filter((r) => !(r.materialId === unit.materialId && r.unitId === unit.id))
    if (unitRefs.length !== exam.unitRefs.length) cs.updateExams.push({ id: exam.id, patch: { unitRefs } })
  }
  return cs
}

/** 暗記の範囲を削除するとき：その範囲の未完了タスクを消す */
export function deleteRangeChanges(range: Range, openTasks: Task[]): ChangeSet {
  const cs = emptyChangeSet()
  cs.deleteTasks = openTasks
    .filter((t) => t.status === 'open' && t.materialId === range.materialId && t.rangeId === range.id)
    .map((t) => t.id)
  return cs
}
