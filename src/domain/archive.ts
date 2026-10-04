import { emptyChangeSet, type ChangeSet } from './changeset.ts'
import { jstStartOfDayMs, minDate } from './date.ts'
import type { ISODate, Range, Task, Unit } from './types.ts'

// 完了済みタスクの扱い（v0.5〜）。
// - 完了したタスクは、完了した日のうちはリスト・今日のチェックリストにチェック済みで残る（チェックを外せる）
// - 次の日になるか、「アーカイブへ」を押すと、リストから消えてアーカイブに入る

/** リスト・今日のチェックリストに、チェック済みとして残っている完了済みタスクか（今日完了して、まだアーカイブへ送っていない） */
export function isDoneInList(task: Task, today: ISODate): boolean {
  return task.status === 'done' && !task.archived && (task.completedAt ?? 0) >= jstStartOfDayMs(today)
}

/** アーカイブに入っている完了済みタスクか（アーカイブへ送ったか、今日より前に完了した） */
export function isInArchive(task: Task, today: ISODate): boolean {
  return task.status === 'done' && !isDoneInList(task, today)
}

/** 完了済みのタスクをアーカイブへ送る */
export function sendToArchive(task: Task): ChangeSet {
  const changes = emptyChangeSet()
  if (task.status === 'done' && !task.archived) changes.updateTasks.push({ id: task.id, patch: { archived: true } })
  return changes
}

export interface UncompleteInput {
  task: Task
  /** タスクの単元（周回系・復習系）。見つからなければ undefined */
  unit?: Unit
  /** タスクの範囲（暗記系）。見つからなければ undefined */
  range?: Range
  openTasks: Task[]
  /** 完了済みのタスク（今日完了したものなど）。同じ単元・範囲を、このあとにも完了していないかを確かめる */
  doneTasks: Task[]
}

/**
 * チェックを外す（v0.5〜）：完了したタスクを未完了に戻し、完了でしたことを元に戻す。
 * - 単元・範囲の記録を、完了する前（task.before）に戻す
 * - 完了で自動に作った次のタスク（createdBy がこのタスク）を消す。そのあと予定に入っていれば、その予定は引き継ぐ
 * 戻せないとき（同じ単元・範囲をこのあとにも完了した／あとから別のタスクを足した／v0.5 より前の完了）はエラーにする。
 */
export function uncompleteTask(input: UncompleteInput): ChangeSet {
  const { task, unit, range, openTasks, doneTasks } = input
  if (task.status !== 'done') throw new Error('このタスクは完了していません')

  const changes = emptyChangeSet()
  let examIds = task.examIds
  let dueDate = task.dueDate

  if (unit || range) {
    const what = unit ? '単元' : '範囲'
    const same = (t: Task) =>
      t.materialId === task.materialId && (unit ? t.unitId === task.unitId : t.rangeId === task.rangeId)
    const doneLater = doneTasks.some(
      (t) => t.id !== task.id && t.status === 'done' && same(t) && (t.completedAt ?? 0) > (task.completedAt ?? 0),
    )
    const laterError = new Error(`この${what}は、このあとにも完了しています。新しい方からチェックを外してください`)
    if (doneLater) throw laterError

    if (unit) {
      const before = task.before?.unit
      if (!before) throw new Error('v0.5 より前に完了したタスクは、チェックを外せません')
      if (unit.lapCount !== before.lapCount + 1) throw laterError
      changes.updateUnits.push({ materialId: unit.materialId, unitId: unit.id, patch: { ...before } })
    } else if (range) {
      const before = task.before?.range
      if (!before) throw new Error('v0.5 より前に完了したタスクは、チェックを外せません')
      changes.updateRanges.push({ materialId: range.materialId, rangeId: range.id, patch: { ...before } })
    }

    for (const other of openTasks) {
      if (other.status !== 'open' || other.id === task.id || !same(other)) continue
      // 完了で作った次のタスクだけ消せる（課題に切り替えたものや、あとから足したものは消さない）
      if (other.createdBy !== task.id || other.type === 'assignment') {
        throw new Error(`この${what}には、あとから追加した未完了のタスクがあるため、チェックを外せません`)
      }
      changes.deleteTasks.push(other.id)
      const added = other.examIds.filter((id) => !examIds.includes(id))
      if (added.length > 0) {
        examIds = [...examIds, ...added]
        dueDate = minDate(dueDate, other.dueDate)
      }
    }
  }

  changes.updateTasks.push({
    id: task.id,
    patch: {
      status: 'open',
      completedAt: null,
      result: null,
      lap: null,
      before: null,
      archived: false,
      ...(examIds !== task.examIds ? { examIds } : {}),
      ...(dueDate !== task.dueDate ? { dueDate } : {}),
    },
  })
  return changes
}

/**
 * 完了済みのタスクに「何周目か」をつける（アーカイブ用）。v0.5 からは完了したときに lap を保存しているが、
 * それより前の完了には lap がないので、同じ単元の完了済みタスクを完了した順に数えて補う（完了するたびに1周増えるため）。
 */
export function withLaps(doneTasks: Task[]): Task[] {
  const byUnit = new Map<string, Task[]>()
  for (const t of doneTasks) {
    if (t.status !== 'done' || !t.materialId || !t.unitId) continue
    const key = `${t.materialId}/${t.unitId}`
    byUnit.set(key, [...(byUnit.get(key) ?? []), t])
  }
  const lapById = new Map<string, number>()
  for (const list of byUnit.values()) {
    list.sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0) || a.createdAt - b.createdAt)
    list.forEach((t, i) => lapById.set(t.id, t.lap ?? i + 1))
  }
  return doneTasks.map((t) => (t.lap === null && lapById.has(t.id) ? { ...t, lap: lapById.get(t.id)! } : t))
}

/**
 * その日が締切の課題（v0.5〜、今日の画面の「今日提出の課題」）。
 * 未完了・完了済み・アーカイブ済みをすべて含む。未完了を上に、それぞれ作った順。
 */
export function assignmentsDueOn(tasks: Task[], date: ISODate): Task[] {
  return tasks
    .filter((t) => t.type === 'assignment' && t.dueDate === date)
    .sort(
      (a, b) =>
        Number(a.status === 'done') - Number(b.status === 'done') || a.createdAt - b.createdAt || a.id.localeCompare(b.id),
    )
}
