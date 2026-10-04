import { isDoneInList, isInArchive, withLaps } from './archive.ts'
import { lapOfTask } from './labels.ts'
import type { ISODate, Material, Task, Unit } from './types.ts'

// リストの画面（v0.3〜、v0.4 で「何周目か」のリストに変更）。
// タスクを、系統（提出物・周回系・復習系・暗記系）と周目ごとのリストに分ける。
// v0.5：完了済みも同じリストに分ける（リストではチェック済みとして、アーカイブではリストごとに見る）。

export type ListGroup = 'assignment' | 'cycle' | 'review' | 'memorize'

type LapBucket = 'lap1' | 'lap2' | 'lap3' | 'lap4plus' | 'redo'

export type ListKey = 'assignment' | 'memorize' | `cycle-${LapBucket}` | `review-${LapBucket}`

export const LIST_GROUP_LABEL: Record<ListGroup, string> = {
  assignment: '提出物',
  cycle: '周回系',
  review: '復習系',
  memorize: '暗記系',
}

export const LIST_GROUPS: ListGroup[] = ['assignment', 'cycle', 'review', 'memorize']

const LAP_LISTS: { bucket: LapBucket; label: string }[] = [
  { bucket: 'lap1', label: '一周目' },
  { bucket: 'lap2', label: '二周目' },
  { bucket: 'lap3', label: '三周目' },
  { bucket: 'lap4plus', label: '四周目以降' },
  { bucket: 'redo', label: '解き直し' },
]

/** リストの並び（上から順に表示する） */
export const LIST_DEFS: { key: ListKey; group: ListGroup; label: string }[] = [
  { key: 'assignment', group: 'assignment', label: '課題' },
  ...(['cycle', 'review'] as const).flatMap((group) =>
    LAP_LISTS.map(({ bucket, label }) => ({ key: `${group}-${bucket}` as ListKey, group, label })),
  ),
  { key: 'memorize', group: 'memorize', label: '暗記' },
]

/**
 * タスクが入るリスト。単元のタスクは教材の種類（周回系／復習系）と、何周目か（labels.ts の lapOfTask）で決める。
 * 未完了は単元の次の周、完了済みは完了したときの周。予定に向けたタスク（exam）も周目のリストに入れる。
 */
export function listKeyOf(task: Task, units: Unit[], materials: Material[]): ListKey {
  if (task.type === 'assignment') return 'assignment'
  if (task.type === 'memorize') return 'memorize'
  const material = materials.find((m) => m.id === task.materialId)
  const group = material?.kind === 'review' ? 'review' : 'cycle'
  if (task.type === 'redo') return `${group}-redo`
  const unit = units.find((u) => u.materialId === task.materialId && u.id === task.unitId)
  const lap = lapOfTask(task, unit) ?? 1
  return lap >= 4 ? `${group}-lap4plus` : (`${group}-lap${lap}` as ListKey)
}

function emptyLists(): Record<ListKey, Task[]> {
  return Object.fromEntries(LIST_DEFS.map((d) => [d.key, [] as Task[]])) as Record<ListKey, Task[]>
}

function groupIntoLists(
  tasks: Task[],
  units: Unit[],
  materials: Material[],
  keep: (task: Task) => boolean,
  compare: (a: Task, b: Task) => number,
): Record<ListKey, Task[]> {
  const lists = emptyLists()
  for (const t of tasks) if (keep(t)) lists[listKeyOf(t, units, materials)].push(t)
  for (const list of Object.values(lists)) list.sort(compare)
  return lists
}

const byCompletedAt = (a: Task, b: Task) => (a.completedAt ?? 0) - (b.completedAt ?? 0) || a.id.localeCompare(b.id)

/** 未完了タスクをリストごとに分け、それぞれ期限の早い順（同じ期限なら作った順）に並べる。アーカイブした教材のタスクは出さない */
export function tasksByList(
  openTasks: Task[],
  units: Unit[],
  materials: Material[],
  hiddenMaterialIds: ReadonlySet<string> = new Set(),
): Record<ListKey, Task[]> {
  return groupIntoLists(
    openTasks,
    units,
    materials,
    (t) => t.status === 'open' && !(t.materialId && hiddenMaterialIds.has(t.materialId)),
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  )
}

/** リストにチェック済みで残す完了済みタスク（今日完了して、アーカイブへ送っていないもの）を、完了した順に（v0.5〜） */
export function doneTasksByList(
  doneTasks: Task[],
  units: Unit[],
  materials: Material[],
  today: ISODate,
  hiddenMaterialIds: ReadonlySet<string> = new Set(),
): Record<ListKey, Task[]> {
  return groupIntoLists(
    doneTasks,
    units,
    materials,
    (t) => isDoneInList(t, today) && !(t.materialId && hiddenMaterialIds.has(t.materialId)),
    byCompletedAt,
  )
}

/** アーカイブのタスク（アーカイブへ送ったか、今日より前に完了したもの）を、新しく完了した順に（v0.5〜） */
export function archivedTasksByList(
  doneTasks: Task[],
  units: Unit[],
  materials: Material[],
  today: ISODate,
): Record<ListKey, Task[]> {
  return groupIntoLists(withLaps(doneTasks), units, materials, (t) => isInArchive(t, today), (a, b) => byCompletedAt(b, a))
}
