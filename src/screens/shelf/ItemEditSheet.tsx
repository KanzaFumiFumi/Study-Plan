import { useState } from 'react'
import { deleteRange, deleteUnit, renameRange, renameUnit, saveChangeSet } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { formatShortDate, isISODate } from '../../domain/date.ts'
import { openTasksForRange } from '../../domain/lookup.ts'
import { schedulableLaps, scheduleRanges, unscheduleTask } from '../../domain/memorize.ts'
import { deleteRangeChanges, deleteUnitChanges } from '../../domain/units.ts'
import type { Material, Range, Unit } from '../../domain/types.ts'
import { useToday } from '../../hooks/useToday.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { useToast } from '../../components/Toast.tsx'
import { Button, Field, inputClass } from '../../components/ui.tsx'

/** 暗記の範囲の予定（v0.6〜）：カレンダーに入れた日を見て、日付を足したり外したりする */
function RangeSchedule({ range, material }: { range: Range; material: Material }) {
  const { uid, openTasks } = useData()
  const today = useToday()
  const toast = useToast()
  const [date, setDate] = useState(today)
  const planned = openTasksForRange(openTasks, { materialId: range.materialId, rangeId: range.id })
  const left = schedulableLaps(range, material, openTasks)
  const canAdd = left > 0 && isISODate(date) && date >= today && !planned.some((t) => t.dueDate === date)

  function handleAdd() {
    const { changes, created } = scheduleRanges({ targets: [{ range, material }], openTasks, date })
    saveChangeSet(uid, changes)
    toast(created ? `${formatShortDate(date)} に入れました` : '入れられませんでした')
  }

  return (
    <div>
      <p className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-stone-700">
        やる日
        <span className="num text-xs font-normal text-stone-500">
          {range.lapCount}/{material.targetLaps}周・あと{left}回入れられます
        </span>
      </p>
      {planned.length > 0 ? (
        <ul className="mb-3 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80">
          {planned.map((task) => (
            <li key={task.id} className="flex items-center gap-2 py-2 pr-2 pl-4">
              <span className={`num flex-1 text-sm ${task.dueDate < today ? 'text-red-700' : ''}`}>
                {formatShortDate(task.dueDate)}
                {task.dueDate < today && '（遅れ）'}
              </span>
              <button
                type="button"
                onClick={() => {
                  saveChangeSet(uid, unscheduleTask(task))
                  toast('外しました')
                }}
                className="rounded-full px-3 py-1 text-xs font-semibold text-stone-600 ring-1 ring-stone-300 active:bg-stone-100 pc:hover:bg-stone-50"
              >
                外す
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-stone-400">まだ入っていません</p>
      )}
      {left > 0 && (
        <div className="flex items-center gap-2">
          <input type="date" className={inputClass} min={today} value={date} onChange={(e) => setDate(e.target.value)} aria-label="追加する日" />
          <Button variant="secondary" className="shrink-0" disabled={!canAdd} onClick={handleAdd}>
            追加
          </Button>
        </div>
      )}
    </div>
  )
}

/** 単元・範囲の名前の変更と削除。暗記の範囲は、やる日の追加・取り消しも（v0.6〜） */
export function ItemEditSheet({
  item,
  material,
  onClose,
}: {
  item: { kind: 'unit'; unit: Unit } | { kind: 'range'; range: Range }
  material: Material
  onClose: () => void
}) {
  const { uid, openTasks, exams, ranges } = useData()
  const toast = useToast()
  const original = item.kind === 'unit' ? item.unit.name : item.range.label
  const [name, setName] = useState(original)
  const label = item.kind === 'unit' ? '単元' : '範囲'
  // 範囲は今のデータを使う（やる日を足すと周回数などが変わるため）
  const currentRange = item.kind === 'range' ? (ranges.find((r) => r.id === item.range.id && r.materialId === item.range.materialId) ?? item.range) : null

  function handleSave() {
    const trimmed = name.trim()
    if (item.kind === 'unit') renameUnit(uid, item.unit.materialId, item.unit.id, trimmed)
    else renameRange(uid, item.range.materialId, item.range.id, trimmed)
    toast('保存しました')
    onClose()
  }

  function handleDelete() {
    if (!window.confirm(`「${original}」を削除しますか？\n未完了のタスクも削除され、予定の範囲からも外れます。`)) return
    if (item.kind === 'unit') {
      deleteUnit(uid, item.unit.materialId, item.unit.id, deleteUnitChanges(item.unit, openTasks, exams))
    } else {
      deleteRange(uid, item.range.materialId, item.range.id, deleteRangeChanges(item.range, openTasks, exams))
    }
    toast(`${label}を削除しました`)
    onClose()
  }

  return (
    <Sheet
      title={original}
      subtitle={`${material.name}・${label}`}
      onClose={onClose}
      footer={
        <Button className="w-full" disabled={!name.trim() || name.trim() === original} onClick={handleSave}>
          名前を保存
        </Button>
      }
    >
      <div className="space-y-6">
        <Field label={`${label}名`}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {currentRange && <RangeSchedule range={currentRange} material={material} />}
        <Button variant="danger" className="w-full" onClick={handleDelete}>
          この{label}を削除
        </Button>
      </div>
    </Sheet>
  )
}
