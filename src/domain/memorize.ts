import { emptyChangeSet, type ChangeSet } from './changeset.ts'
import { assertCount } from './cycle.ts'
import { addDays } from './date.ts'
import { openTaskForRange } from './lookup.ts'
import type { ISODate, Material, MemorizeResult, NewTask, Range, Settings, Task } from './types.ts'

// ===== 暗記の判定ルール（変えるときはここだけ直す） =====

/** 半知 + 未知 が 0 なら段階を1つ上げる（復習間隔が広がる）。それ以外は据え置き */
export function nextStep(step: number, result: MemorizeResult): number {
  return result.half + result.unknown === 0 ? step + 1 : step
}

/** 段階に対応する復習間隔（日）。段階が設定の数を超えたら最後の間隔を使い続ける */
export function intervalDays(step: number, intervals: number[]): number {
  if (intervals.length === 0) return 1
  return intervals[Math.min(step, intervals.length - 1)]
}

// ==========================================================

export function rangeTaskTitle(material: Pick<Material, 'name'>, range: Pick<Range, 'label'>): string {
  return `${material.name} ${range.label}`
}

/**
 * 4.6 範囲を「開始」したとき：今日が期限の memorize タスクを作る。
 * 開始済みでタスクがない範囲（タスクを消した場合など）も、これで再開できる。段階はそのまま。
 */
export function startRange(input: { range: Range; material: Material; openTasks: Task[]; today: ISODate }): {
  changes: ChangeSet
  created: boolean
} {
  const { range, material, openTasks, today } = input
  const changes = emptyChangeSet()
  if (openTaskForRange(openTasks, { materialId: range.materialId, rangeId: range.id })) return { changes, created: false }

  changes.updateRanges.push({ materialId: range.materialId, rangeId: range.id, patch: { started: true, nextReviewAt: today } })
  changes.createTasks.push({
    type: 'memorize',
    title: rangeTaskTitle(material, range),
    materialId: range.materialId,
    unitId: null,
    rangeId: range.id,
    examIds: [],
    dueDate: today,
  })
  return { changes, created: true }
}

export interface CompleteMemorizeInput {
  task: Task
  range: Range
  material: Material
  openTasks: Task[]
  settings: Settings
  today: ISODate
  now: number
  result: MemorizeResult
}

/**
 * 4.6 暗記タスクを完了したとき：知／半知／未知 の数から段階を決め、
 * nextReviewAt = 今日 + memorizeIntervals[min(step, 最後)] を期限とする次の memorize タスクを作る。
 */
export function completeMemorizeTask(input: CompleteMemorizeInput): {
  changes: ChangeSet
  stepUp: boolean
  nextTask: NewTask | null
} {
  const { task, range, material, openTasks, settings, today, now, result } = input
  assertCount(result.known, '知')
  assertCount(result.half, '半知')
  assertCount(result.unknown, '未知')
  if (task.status !== 'open') throw new Error('このタスクはすでに完了しています')
  if (task.materialId !== range.materialId || task.rangeId !== range.id) throw new Error('タスクと範囲が一致しません')

  const changes = emptyChangeSet()
  changes.updateTasks.push({ id: task.id, patch: { status: 'done', completedAt: now, result: { ...result } } })

  const step = nextStep(range.step, result)
  const nextReviewAt = addDays(today, intervalDays(step, settings.memorizeIntervals))
  changes.updateRanges.push({
    materialId: range.materialId,
    rangeId: range.id,
    patch: { started: true, step, nextReviewAt, lastResult: { ...result } },
  })

  let nextTask: NewTask | null = null
  if (!openTaskForRange(openTasks, { materialId: range.materialId, rangeId: range.id }, task.id)) {
    nextTask = {
      type: 'memorize',
      title: rangeTaskTitle(material, range),
      materialId: range.materialId,
      unitId: null,
      rangeId: range.id,
      examIds: [],
      dueDate: nextReviewAt,
    }
    changes.createTasks.push(nextTask)
  }
  return { changes, stepUp: step > range.step, nextTask }
}
