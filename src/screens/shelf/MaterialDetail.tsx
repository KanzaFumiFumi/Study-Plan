import { useState } from 'react'
import { saveChangeSet } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { formatShortDate } from '../../domain/date.ts'
import { openTaskForRange, openTaskForUnit } from '../../domain/lookup.ts'
import { startRange } from '../../domain/memorize.ts'
import { useToast } from '../../components/Toast.tsx'
import { TASK_TYPE_LABEL, type Material, type Range, type Task, type Unit } from '../../domain/types.ts'
import { useToday } from '../../hooks/useToday.ts'
import { UnitStatus } from '../../components/UnitStatus.tsx'
import { BackButton, Badge, Button, EmptyState, ScreenTitle } from '../../components/ui.tsx'
import { BulkAddSheet } from './BulkAddSheet.tsx'
import { ItemEditSheet } from './ItemEditSheet.tsx'
import { MaterialFormSheet } from './MaterialFormSheet.tsx'

type EditItem = { kind: 'unit'; unit: Unit } | { kind: 'range'; range: Range }

function NextTask({ task, today }: { task: Task | undefined; today: string }) {
  if (!task) return null
  const overdue = task.dueDate < today
  return (
    <p className={`mt-0.5 text-xs ${overdue ? 'text-red-600' : 'text-stone-500'}`}>
      次：{formatShortDate(task.dueDate)} {TASK_TYPE_LABEL[task.type]}
      {overdue && '（遅れ）'}
    </p>
  )
}

export function MaterialDetail({ material, onBack }: { material: Material; onBack: () => void }) {
  const { uid, units, ranges, openTasks, settings } = useData()
  const today = useToday()
  const toast = useToast()
  const [editingMaterial, setEditingMaterial] = useState(false)
  const [bulkAdding, setBulkAdding] = useState(false)
  const [editItem, setEditItem] = useState<EditItem | null>(null)

  const isCycle = material.kind === 'cycle'
  const myUnits = units.filter((u) => u.materialId === material.id)
  const myRanges = ranges.filter((r) => r.materialId === material.id)
  const items: { order: number }[] = isCycle ? myUnits : myRanges
  const nextOrder = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0
  const childLabel = isCycle ? '単元' : '範囲'

  function handleStart(range: Range) {
    const { changes, created } = startRange({ range, material, openTasks, today })
    saveChangeSet(uid, changes)
    toast(created ? `「${range.label}」を今日のタスクに追加しました` : 'すでにタスクがあります')
  }

  const summary = isCycle
    ? [
        ['単元', myUnits.length],
        ['卒業', myUnits.filter((u) => u.graduated).length],
        ['周回中', myUnits.filter((u) => u.lapCount > 0 && !u.graduated).length],
        ['未着手', myUnits.filter((u) => u.lapCount === 0).length],
      ]
    : [
        ['範囲', myRanges.length],
        ['開始済み', myRanges.filter((r) => r.started).length],
        ['未開始', myRanges.filter((r) => !r.started).length],
      ]

  return (
    <>
      <BackButton onClick={onBack}>本棚</BackButton>
      <ScreenTitle
        action={
          <Button variant="secondary" className="shrink-0 px-3 py-1.5" onClick={() => setEditingMaterial(true)}>
            編集
          </Button>
        }
      >
        {material.name}
      </ScreenTitle>
      <div className="-mt-2 mb-4 flex flex-wrap items-center gap-1.5">
        {material.subject && <Badge>{material.subject}</Badge>}
        <Badge tone="outline">{isCycle ? '周回系' : '暗記系'}</Badge>
        {material.archived && <Badge tone="warn">アーカイブ済み</Badge>}
      </div>

      <div className="mb-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${summary.length}, 1fr)` }}>
        {summary.map(([label, count]) => (
          <div key={label} className="rounded-xl bg-white p-2 text-center ring-1 ring-stone-200">
            <p className="text-lg font-bold tabular-nums">{count}</p>
            <p className="text-xs text-stone-500">{label}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState>{childLabel}がまだありません。下のボタンから、改行区切りでまとめて追加できます。</EmptyState>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
          {isCycle
            ? myUnits.map((unit) => (
                <li key={unit.id}>
                  <button
                    type="button"
                    onClick={() => setEditItem({ kind: 'unit', unit })}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-stone-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{unit.name}</p>
                      <NextTask task={openTaskForUnit(openTasks, { materialId: unit.materialId, unitId: unit.id })} today={today} />
                    </div>
                    <UnitStatus unit={unit} />
                  </button>
                </li>
              ))
            : myRanges.map((range) => {
                const task = openTaskForRange(openTasks, { materialId: range.materialId, rangeId: range.id })
                return (
                  <li key={range.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setEditItem({ kind: 'range', range })}
                      className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-2 pl-4 text-left active:bg-stone-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{range.label}</p>
                        {range.lastResult && (
                          <p className="mt-0.5 text-xs text-stone-500">
                            前回：知{range.lastResult.known}・半知{range.lastResult.half}・未知{range.lastResult.unknown}
                          </p>
                        )}
                        <NextTask task={task} today={today} />
                      </div>
                      {range.started && (
                        <Badge tone="outline">
                          段階{Math.min(range.step, settings.memorizeIntervals.length - 1) + 1}/{settings.memorizeIntervals.length}
                        </Badge>
                      )}
                    </button>
                    {!task && (
                      <div className="pr-3">
                        <Button className="px-3 py-1.5" onClick={() => handleStart(range)}>
                          {range.started ? '再開' : '開始'}
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
        </ul>
      )}

      <Button variant="secondary" className="mt-4 w-full" onClick={() => setBulkAdding(true)}>
        ＋ {childLabel}をまとめて追加
      </Button>

      {editingMaterial && (
        <MaterialFormSheet material={material} defaultKind={material.kind} onClose={() => setEditingMaterial(false)} />
      )}
      {bulkAdding && <BulkAddSheet material={material} startOrder={nextOrder} onClose={() => setBulkAdding(false)} />}
      {editItem && <ItemEditSheet item={editItem} onClose={() => setEditItem(null)} />}
    </>
  )
}
