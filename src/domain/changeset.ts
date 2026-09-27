import type { Exam, NewTask, Range, Task, Unit } from './types.ts'

/**
 * タスク生成ロジックが返す「保存すべき変更」の一覧。
 * data 層がこれを1つの writeBatch にまとめて Firestore に書き込む。
 */
export interface ChangeSet {
  createTasks: NewTask[]
  updateTasks: { id: string; patch: Partial<Omit<Task, 'id'>> }[]
  deleteTasks: string[]
  updateUnits: { materialId: string; unitId: string; patch: Partial<Omit<Unit, 'id' | 'materialId'>> }[]
  updateRanges: { materialId: string; rangeId: string; patch: Partial<Omit<Range, 'id' | 'materialId'>> }[]
  updateExams: { id: string; patch: Partial<Omit<Exam, 'id'>> }[]
}

export function emptyChangeSet(): ChangeSet {
  return { createTasks: [], updateTasks: [], deleteTasks: [], updateUnits: [], updateRanges: [], updateExams: [] }
}

export function isEmptyChangeSet(cs: ChangeSet): boolean {
  return Object.values(cs).every((list) => list.length === 0)
}
