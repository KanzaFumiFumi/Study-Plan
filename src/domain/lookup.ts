import type { Material, RangeRef, Task, Unit, UnitRef } from './types.ts'

export function unitKey(ref: UnitRef): string {
  return `${ref.materialId}/${ref.unitId}`
}

export function rangeKey(ref: RangeRef): string {
  return `${ref.materialId}/${ref.rangeId}`
}

/** 単元に紐づく未完了タスク（excludeId のタスクは除く）。1単元につき未完了タスクは最大1つの前提 */
export function openTaskForUnit(openTasks: Task[], ref: UnitRef, excludeId?: string): Task | undefined {
  return openTasks.find(
    (t) => t.status === 'open' && t.id !== excludeId && t.materialId === ref.materialId && t.unitId === ref.unitId,
  )
}

/**
 * 暗記の範囲に紐づく未完了タスク（カレンダーに入れた予定）を、日付の早い順に。
 * v0.6〜：暗記は1つの範囲に、残りの周回数まで先の予定を入れられる（単元と違って1つとは限らない）
 */
export function openTasksForRange(openTasks: Task[], ref: RangeRef): Task[] {
  return openTasks
    .filter((t) => t.status === 'open' && t.materialId === ref.materialId && t.rangeId === ref.rangeId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.createdAt - b.createdAt)
}

export function unitTaskTitle(material: Pick<Material, 'name'>, unit: Pick<Unit, 'name'>): string {
  return `${material.name} ${unit.name}`
}
