import type { Material, Task, Unit, UnitRef } from './types.ts'

export function unitKey(ref: UnitRef): string {
  return `${ref.materialId}/${ref.unitId}`
}

/** 単元に紐づく未完了タスク（excludeId のタスクは除く）。1単元につき未完了タスクは最大1つの前提 */
export function openTaskForUnit(openTasks: Task[], ref: UnitRef, excludeId?: string): Task | undefined {
  return openTasks.find(
    (t) => t.status === 'open' && t.id !== excludeId && t.materialId === ref.materialId && t.unitId === ref.unitId,
  )
}

/** 暗記の範囲に紐づく未完了タスク（excludeId のタスクは除く） */
export function openTaskForRange(
  openTasks: Task[],
  ref: { materialId: string; rangeId: string },
  excludeId?: string,
): Task | undefined {
  return openTasks.find(
    (t) => t.status === 'open' && t.id !== excludeId && t.materialId === ref.materialId && t.rangeId === ref.rangeId,
  )
}

export function unitTaskTitle(material: Pick<Material, 'name'>, unit: Pick<Unit, 'name'>): string {
  return `${material.name} ${unit.name}`
}
