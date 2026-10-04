import { emptyChangeSet, type ChangeSet } from './changeset.ts'
import { addDays } from './date.ts'
import { openTaskForUnit, unitTaskTitle } from './lookup.ts'
import type { ISODate, Material, NewTask, Settings, Task, Unit } from './types.ts'

export function assertCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${label}は0以上の整数で入力してください`)
}

export interface CompleteUnitTaskInput {
  task: Task
  unit: Unit
  material: Material
  openTasks: Task[]
  settings: Settings
  today: ISODate
  /** 完了時刻（ミリ秒） */
  now: number
  /** 残っている印の数 */
  remainingMarks: number
}

export interface CompleteUnitTaskResult {
  changes: ChangeSet
  graduated: boolean
  /** 新しく作った定例周回タスク（作らなかったら null） */
  nextTask: NewTask | null
}

/**
 * 4.1 周回系の単元を完了したとき（first / cycle / exam / redo / 単元つき assignment で共通）
 * 1. 単元を更新：lapCount+1、remainingMarks=入力値、lastDoneAt=今日
 * 2. 残りが0なら卒業して終わり
 * 3. 1以上なら卒業を外し、今日+cycleIntervalDays を期限とする cycle タスクを作る
 *    （その単元に他の未完了タスクがあれば作らない）
 */
export function completeUnitTask(input: CompleteUnitTaskInput): CompleteUnitTaskResult {
  const { task, unit, material, openTasks, settings, today, now, remainingMarks } = input
  assertCount(remainingMarks, '残りの印の数')
  if (task.status !== 'open') throw new Error('このタスクはすでに完了しています')
  if (task.materialId !== unit.materialId || task.unitId !== unit.id) throw new Error('タスクと単元が一致しません')

  const changes = emptyChangeSet()
  // 何周目を終えたかと、完了する前の単元の記録を残す（v0.5〜。チェックを外したときに元に戻す）
  const { lapCount, lastDoneAt } = unit
  changes.updateTasks.push({
    id: task.id,
    patch: {
      status: 'done',
      completedAt: now,
      result: { remainingMarks },
      lap: lapCount + 1,
      before: { unit: { lapCount, remainingMarks: unit.remainingMarks, graduated: unit.graduated, lastDoneAt } },
    },
  })

  const graduated = remainingMarks === 0
  changes.updateUnits.push({
    materialId: unit.materialId,
    unitId: unit.id,
    patch: { lapCount: unit.lapCount + 1, remainingMarks, lastDoneAt: today, graduated },
  })

  let nextTask: NewTask | null = null
  if (!graduated && !openTaskForUnit(openTasks, { materialId: unit.materialId, unitId: unit.id }, task.id)) {
    nextTask = {
      type: 'cycle',
      title: unitTaskTitle(material, unit),
      materialId: unit.materialId,
      unitId: unit.id,
      rangeId: null,
      examIds: [],
      dueDate: addDays(today, settings.cycleIntervalDays),
      createdBy: task.id,
    }
    changes.createTasks.push(nextTask)
  }
  return { changes, graduated, nextTask }
}

/** 単元に紐づかないタスク（学校課題）を完了する。記録の更新も次のタスクもない */
export function completePlainTask(task: Task, now: number): ChangeSet {
  if (task.status !== 'open') throw new Error('このタスクはすでに完了しています')
  const changes = emptyChangeSet()
  changes.updateTasks.push({ id: task.id, patch: { status: 'done', completedAt: now } })
  return changes
}
