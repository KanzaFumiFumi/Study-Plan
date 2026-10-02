import type { Material, Task, Unit } from './types.ts'

// リストの画面（v0.3〜、v0.4 で「何周目か」のリストに変更）。
// 未完了のタスクを、系統（提出物・周回系・復習系・暗記系）と周目ごとのリストに分ける。

export type ListGroup = 'assignment' | 'cycle' | 'review' | 'memorize'

type LapBucket = 'lap1' | 'lap2' | 'lap3' | 'lap4plus' | 'redo'

export type ListKey = 'assignment' | 'memorize' | `cycle-${LapBucket}` | `review-${LapBucket}`

export const LIST_GROUP_LABEL: Record<ListGroup, string> = {
  assignment: '提出物',
  cycle: '周回系',
  review: '復習系',
  memorize: '暗記系',
}

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
 * タスクが入るリスト。単元のタスクは教材の種類（周回系／復習系）と、その単元の何周目か（lapCount + 1）で決める。
 * 予定に向けたタスク（exam）も周目のリストに入れる。
 */
export function listKeyOf(task: Task, units: Unit[], materials: Material[]): ListKey {
  if (task.type === 'assignment') return 'assignment'
  if (task.type === 'memorize') return 'memorize'
  const material = materials.find((m) => m.id === task.materialId)
  const group = material?.kind === 'review' ? 'review' : 'cycle'
  if (task.type === 'redo') return `${group}-redo`
  const unit = units.find((u) => u.materialId === task.materialId && u.id === task.unitId)
  const lap = unit ? unit.lapCount + 1 : 1
  return lap >= 4 ? `${group}-lap4plus` : (`${group}-lap${lap}` as ListKey)
}

/** 未完了タスクをリストごとに分け、それぞれ期限の早い順（同じ期限なら作った順）に並べる。アーカイブした教材のタスクは出さない */
export function tasksByList(
  openTasks: Task[],
  units: Unit[],
  materials: Material[],
  hiddenMaterialIds: ReadonlySet<string> = new Set(),
): Record<ListKey, Task[]> {
  const lists = Object.fromEntries(LIST_DEFS.map((d) => [d.key, [] as Task[]])) as Record<ListKey, Task[]>
  for (const t of openTasks) {
    if (t.status !== 'open' || (t.materialId && hiddenMaterialIds.has(t.materialId))) continue
    lists[listKeyOf(t, units, materials)].push(t)
  }
  for (const list of Object.values(lists)) {
    list.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  }
  return lists
}
