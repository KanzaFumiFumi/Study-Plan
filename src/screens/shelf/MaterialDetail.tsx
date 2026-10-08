import { useState } from 'react'
import { saveChangeSet, updateMaterial } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { formatShortDate } from '../../domain/date.ts'
import { taskLabel } from '../../domain/labels.ts'
import { openTaskForUnit, openTasksForRange } from '../../domain/lookup.ts'
import { isRangeFinished, schedulableLaps, scheduleRanges } from '../../domain/memorize.ts'
import { MATERIAL_KIND_LABEL, hasUnits, type Material, type Range, type Task, type Unit } from '../../domain/types.ts'
import { useToday } from '../../hooks/useToday.ts'
import { useToast } from '../../components/Toast.tsx'
import { UnitStatus } from '../../components/UnitStatus.tsx'
import { BackButton, Button, EmptyState, PlusIcon, ScreenTitle } from '../../components/ui.tsx'
import { BulkAddSheet } from './BulkAddSheet.tsx'
import { ItemEditSheet } from './ItemEditSheet.tsx'
import { MaterialFormSheet } from './MaterialFormSheet.tsx'

type EditItem = { kind: 'unit'; unit: Unit } | { kind: 'range'; range: Range }

function NextTask({ task, unit, today }: { task: Task | undefined; unit?: Unit; today: string }) {
  if (!task) return null
  const overdue = task.dueDate < today
  return (
    <p className={`mt-0.5 text-xs ${overdue ? 'text-red-600' : 'text-stone-500'}`}>
      次：{formatShortDate(task.dueDate)} {taskLabel(task, unit)}
      {overdue && '（遅れ）'}
    </p>
  )
}

/** 暗記の範囲の周回（v0.6〜）：終えた周は黒、カレンダーに入れた周は輪、残りは灰色の点 */
export function LapDots({ done, planned, target }: { done: number; planned: number; target: number }) {
  if (target > 10) {
    return (
      <span className="num text-xs font-semibold text-stone-600">
        {done}/{target}周
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`${done}/${target}周（予定${planned}回）`}>
      {Array.from({ length: target }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${
            i < done ? 'bg-ink' : i < done + planned ? 'ring-[1.5px] ring-ink ring-inset' : 'bg-stone-200'
          }`}
        />
      ))}
    </span>
  )
}

export function MaterialDetail({
  material,
  onBack,
  backLabel = '本棚',
}: {
  material: Material
  onBack: () => void
  /** 戻る先の名前（アーカイブから開いたときは「アーカイブ」） */
  backLabel?: string
}) {
  const { uid, units, ranges, openTasks } = useData()
  const today = useToday()
  const toast = useToast()
  const [editingMaterial, setEditingMaterial] = useState(false)
  const [bulkAdding, setBulkAdding] = useState(false)
  const [editItem, setEditItem] = useState<EditItem | null>(null)

  // 周回系・復習系は単元、暗記系は範囲
  const isCycle = hasUnits(material.kind)
  const myUnits = units.filter((u) => u.materialId === material.id)
  const myRanges = ranges.filter((r) => r.materialId === material.id)
  const items: { order: number }[] = isCycle ? myUnits : myRanges
  const nextOrder = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0
  const childLabel = isCycle ? '単元' : '範囲'

  function handleToday(range: Range) {
    const { changes, created } = scheduleRanges({ targets: [{ range, material }], openTasks, date: today })
    saveChangeSet(uid, changes)
    toast(created ? `「${range.label}」を今日のチェックリストに入れました` : 'すでに今日に入っています')
  }

  function handleRestore() {
    updateMaterial(uid, material.id, { archived: false })
    toast('本棚に戻しました')
  }

  const plannedOf = (range: Range) => openTasksForRange(openTasks, { materialId: range.materialId, rangeId: range.id })
  const summary: [string, number | string][] = isCycle
    ? [
        ['単元', myUnits.length],
        ['卒業', myUnits.filter((u) => u.graduated).length],
        ['周回中', myUnits.filter((u) => u.lapCount > 0 && !u.graduated).length],
        ['未着手', myUnits.filter((u) => u.lapCount === 0).length],
      ]
    : [
        ['範囲', myRanges.length],
        ['完了', myRanges.filter((r) => isRangeFinished(r, material)).length],
        ['予定あり', myRanges.filter((r) => plannedOf(r).length > 0).length],
        ['目標', `${material.targetLaps}周`],
      ]
  const progress = isCycle
    ? myUnits.length
      ? myUnits.filter((u) => u.graduated).length / myUnits.length
      : 0
    : myRanges.length
      ? myRanges.reduce((n, r) => n + Math.min(r.lapCount, material.targetLaps), 0) / (myRanges.length * material.targetLaps)
      : 0

  return (
    <>
      <BackButton onClick={onBack}>{backLabel}</BackButton>
      <ScreenTitle
        eyebrow={[material.subject, MATERIAL_KIND_LABEL[material.kind]].filter(Boolean).join('・')}
        action={
          <Button variant="secondary" className="px-4 py-1.5" onClick={() => setEditingMaterial(true)}>
            編集
          </Button>
        }
      >
        {material.name}
      </ScreenTitle>

      {material.archived && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-stone-200/60 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-stone-700">この教材はアーカイブにあります（ホームにタスクが出ません）。</p>
          <Button className="px-3.5 py-1.5" onClick={handleRestore}>
            本棚に戻す
          </Button>
        </div>
      )}

      <div className="mb-6 rounded-3xl bg-white p-4 ring-1 ring-stone-200/80">
        <div className="grid grid-cols-4 divide-x divide-stone-100">
          {summary.map(([label, count]) => (
            <div key={label} className="px-1 text-center">
              <p className="num text-xl font-bold">{count}</p>
              <p className="mt-0.5 text-[11px] text-stone-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-ink transition-all duration-500" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="num text-xs font-semibold text-stone-600">{Math.round(progress * 100)}%</span>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState>{childLabel}がまだありません。下のボタンから、改行区切りでまとめて追加できます。</EmptyState>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200/80">
          {isCycle
            ? myUnits.map((unit) => (
                <li key={unit.id}>
                  <button
                    type="button"
                    onClick={() => setEditItem({ kind: 'unit', unit })}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition active:bg-stone-50 pc:hover:bg-stone-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{unit.name}</p>
                      <NextTask task={openTaskForUnit(openTasks, { materialId: unit.materialId, unitId: unit.id })} unit={unit} today={today} />
                    </div>
                    <UnitStatus unit={unit} />
                  </button>
                </li>
              ))
            : myRanges.map((range) => {
                const planned = plannedOf(range)
                const finished = isRangeFinished(range, material)
                const canToday = schedulableLaps(range, material, openTasks) > 0 && !planned.some((t) => t.dueDate === today)
                return (
                  <li key={range.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setEditItem({ kind: 'range', range })}
                      className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pr-2 pl-5 text-left transition active:bg-stone-50 pc:hover:bg-stone-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{range.label}</p>
                        <p className={`mt-0.5 truncate text-xs ${planned[0] && planned[0].dueDate < today ? 'text-red-600' : 'text-stone-500'}`}>
                          {finished
                            ? `完了（${range.lapCount}周）`
                            : planned.length
                              ? `予定：${planned.map((t) => formatShortDate(t.dueDate)).join('・')}`
                              : '日付が決まっていません'}
                        </p>
                      </div>
                      <LapDots done={range.lapCount} planned={planned.length} target={material.targetLaps} />
                    </button>
                    <div className="pr-3">
                      {canToday ? (
                        <Button variant="soft" className="px-3 py-1.5 text-xs" onClick={() => handleToday(range)}>
                          今日やる
                        </Button>
                      ) : (
                        <span className="block w-[4.5rem]" />
                      )}
                    </div>
                  </li>
                )
              })}
        </ul>
      )}

      <Button variant="secondary" className="mt-4 flex w-full items-center justify-center gap-1.5" onClick={() => setBulkAdding(true)}>
        <PlusIcon />
        {childLabel}をまとめて追加
      </Button>
      {!isCycle && (
        <p className="mt-3 px-1 text-xs leading-relaxed text-stone-500">
          範囲をタップすると、名前の変更・日付の追加と取り消しができます。まとめて決めるときは、ホームのカレンダーで日付をタップします。
        </p>
      )}

      {editingMaterial && (
        <MaterialFormSheet material={material} defaultKind={material.kind} onClose={() => setEditingMaterial(false)} />
      )}
      {bulkAdding && <BulkAddSheet material={material} startOrder={nextOrder} onClose={() => setBulkAdding(false)} />}
      {editItem && <ItemEditSheet item={editItem} material={material} onClose={() => setEditItem(null)} />}
    </>
  )
}
