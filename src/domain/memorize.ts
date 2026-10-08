import { emptyChangeSet, type ChangeSet } from './changeset.ts'
import { openTasksForRange, rangeKey } from './lookup.ts'
import type { ISODate, Material, Range, Task } from './types.ts'

// 暗記系（v0.6〜）。間隔を広げる復習をやめ、範囲ごとに「何周したか」を数える。
// - 教材ごとに目標の周回数（targetLaps）を決める。範囲の周回数がそこに届いたら、その範囲は完了
// - いつやるかは、カレンダーで範囲を日付に割り当てて決める（1つの範囲に、残りの周回数まで先の予定を入れられる）
// - 完了は入力なし（チェックだけ）。完了しても次のタスクは自動で作らない

export function rangeTaskTitle(material: Pick<Material, 'name'>, range: Pick<Range, 'label'>): string {
  return `${material.name} ${range.label}`
}

/** 範囲の残りの周回数（目標 − 終えた数。0 未満にはしない） */
export function remainingLaps(range: Pick<Range, 'lapCount'>, material: Pick<Material, 'targetLaps'>): number {
  return Math.max(0, material.targetLaps - range.lapCount)
}

/** 範囲が目標の周回数を終えたか */
export function isRangeFinished(range: Pick<Range, 'lapCount'>, material: Pick<Material, 'targetLaps'>): boolean {
  return remainingLaps(range, material) === 0
}

/** あと何回分、カレンダーに入れられるか（残りの周回数 − すでに入れた予定の数） */
export function schedulableLaps(range: Range, material: Pick<Material, 'targetLaps'>, openTasks: Task[]): number {
  const planned = openTasksForRange(openTasks, { materialId: range.materialId, rangeId: range.id }).length
  return Math.max(0, remainingLaps(range, material) - planned)
}

export interface ScheduleResult {
  changes: ChangeSet
  /** 新しく入れた数 */
  created: number
  /** すでにその日に入っていた数 */
  already: number
  /** 残りの周回数まで入っていて、入れられなかった数 */
  full: number
}

/**
 * カレンダーで、暗記の範囲を日付に割り当てる：その日が期限の暗記タスクを、範囲ごとに1つ作る。
 * その日にすでに入っている範囲と、残りの周回数まで予定が入っている範囲には作らない。
 */
export function scheduleRanges(input: {
  targets: { range: Range; material: Material }[]
  openTasks: Task[]
  date: ISODate
}): ScheduleResult {
  const { targets, openTasks, date } = input
  const changes = emptyChangeSet()
  const seen = new Set<string>()
  let created = 0
  let already = 0
  let full = 0

  for (const { range, material } of targets) {
    const ref = { materialId: range.materialId, rangeId: range.id }
    if (seen.has(rangeKey(ref))) continue
    seen.add(rangeKey(ref))

    if (openTasksForRange(openTasks, ref).some((t) => t.dueDate === date)) {
      already += 1
    } else if (schedulableLaps(range, material, openTasks) === 0) {
      full += 1
    } else {
      changes.createTasks.push({
        type: 'memorize',
        title: rangeTaskTitle(material, range),
        materialId: range.materialId,
        unitId: null,
        rangeId: range.id,
        examIds: [],
        dueDate: date,
      })
      created += 1
    }
  }
  return { changes, created, already, full }
}

/** カレンダーに入れた暗記を外す（その日の暗記タスクを消す。範囲の記録は変わらない） */
export function unscheduleTask(task: Task): ChangeSet {
  if (task.status !== 'open' || task.type !== 'memorize') throw new Error('外せるのは未完了の暗記だけです')
  return { ...emptyChangeSet(), deleteTasks: [task.id] }
}

/**
 * 暗記タスクを完了する（入力なし）：範囲の周回数を1増やし、最後に終えた日を今日にする。次のタスクは作らない。
 * 完了する前の範囲の記録を残しておき、チェックを外したときに戻す。
 */
export function completeMemorizeTask(input: {
  task: Task
  range: Range
  material: Material
  today: ISODate
  now: number
}): { changes: ChangeSet; lap: number; finished: boolean } {
  const { task, range, material, today, now } = input
  if (task.status !== 'open') throw new Error('このタスクはすでに完了しています')
  if (task.materialId !== range.materialId || task.rangeId !== range.id) throw new Error('タスクと範囲が一致しません')

  const lap = range.lapCount + 1
  const changes = emptyChangeSet()
  changes.updateTasks.push({
    id: task.id,
    patch: {
      status: 'done',
      completedAt: now,
      lap,
      before: { range: { lapCount: range.lapCount, lastDoneAt: range.lastDoneAt } },
    },
  })
  changes.updateRanges.push({ materialId: range.materialId, rangeId: range.id, patch: { lapCount: lap, lastDoneAt: today } })
  return { changes, lap, finished: lap >= material.targetLaps }
}
