import { emptyChangeSet, type ChangeSet } from './changeset.ts'
import { minDate } from './date.ts'
import { openTaskForUnit, unitKey, unitTaskTitle } from './lookup.ts'
import type { ISODate, Material, Task, TaskType, Unit } from './types.ts'

// 手動でタスクを足す操作（4.3 授業の1周目 / 4.4 解き直し / 4.5 学校課題）。
// どの作り方でも「1単元につき未完了タスクは1つ」にそろえる。
// すでに未完了タスクがある単元は、新しく作らず既存タスクの期限を早い方にする。

export interface UnitTarget {
  unit: Unit
  material: Material
}

export interface ManualResult {
  changes: ChangeSet
  /** 新しく作ったタスクの数 */
  created: number
  /** 既存の未完了タスクにまとめた数 */
  merged: number
}

function addUnitTasks(type: TaskType, targets: UnitTarget[], openTasks: Task[], dueDate: ISODate): ManualResult {
  const changes = emptyChangeSet()
  const seen = new Set<string>()
  let created = 0
  let merged = 0

  for (const { unit, material } of targets) {
    const ref = { materialId: unit.materialId, unitId: unit.id }
    if (seen.has(unitKey(ref))) continue
    seen.add(unitKey(ref))

    const existing = openTaskForUnit(openTasks, ref)
    if (existing) {
      const newDue = minDate(existing.dueDate, dueDate)
      if (newDue !== existing.dueDate) changes.updateTasks.push({ id: existing.id, patch: { dueDate: newDue } })
      merged += 1
    } else {
      changes.createTasks.push({
        type,
        title: unitTaskTitle(material, unit),
        materialId: unit.materialId,
        unitId: unit.id,
        rangeId: null,
        examIds: [],
        dueDate,
      })
      created += 1
    }
  }
  return { changes, created, merged }
}

/** 4.3 授業の1周目：選んだ単元ごとに、今日が期限の first タスクを作る */
export function addFirstLaps(input: { targets: UnitTarget[]; openTasks: Task[]; today: ISODate }): ManualResult {
  return addUnitTasks('first', input.targets, input.openTasks, input.today)
}

/** 4.4 解き直し：選んだ単元ごとに、指定した期限の redo タスクを作る（卒業済みの単元も選べる） */
export function addRedos(input: { targets: UnitTarget[]; openTasks: Task[]; dueDate: ISODate }): ManualResult {
  return addUnitTasks('redo', input.targets, input.openTasks, input.dueDate)
}

/**
 * 4.5 学校課題：タイトル・締切・（任意で）単元1つ。
 * 単元にすでに未完了タスクがあれば、そのタスクを課題に切り替える（タイトルを反映、期限は早い方、examIds は保持）。
 */
export function addAssignment(input: {
  title: string
  dueDate: ISODate
  target: UnitTarget | null
  openTasks: Task[]
}): ManualResult {
  const { title, dueDate, target, openTasks } = input
  const changes = emptyChangeSet()
  const existing = target ? openTaskForUnit(openTasks, { materialId: target.unit.materialId, unitId: target.unit.id }) : undefined

  if (existing) {
    changes.updateTasks.push({
      id: existing.id,
      patch: { type: 'assignment', title, dueDate: minDate(existing.dueDate, dueDate) },
    })
    return { changes, created: 0, merged: 1 }
  }

  changes.createTasks.push({
    type: 'assignment',
    title,
    materialId: target?.unit.materialId ?? null,
    unitId: target?.unit.id ?? null,
    rangeId: null,
    examIds: [],
    dueDate,
  })
  return { changes, created: 1, merged: 0 }
}
