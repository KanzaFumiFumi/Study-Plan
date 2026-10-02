import { useState } from 'react'
import { saveChangeSet } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { formatShortDate } from '../../domain/date.ts'
import { rangeKey } from '../../domain/lookup.ts'
import { scheduleRanges } from '../../domain/memorize.ts'
import type { Exam, ISODate } from '../../domain/types.ts'
import { useToday } from '../../hooks/useToday.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { useToast } from '../../components/Toast.tsx'
import { RangePicker } from '../../components/UnitPicker.tsx'
import { Badge, Button } from '../../components/ui.tsx'

/**
 * カレンダーで選んだ日（v0.4〜）：その日の予定と暗記を見て、暗記の範囲をその日に割り当てる。
 * 割り当てた範囲は、その日の「今日」のチェックリストに暗記タスクとして出る。
 */
export function DaySheet({ date, onClose, onEditExam }: { date: ISODate; onClose: () => void; onEditExam: (exam: Exam) => void }) {
  const { uid, exams, materials, ranges, openTasks } = useData()
  const today = useToday()
  const toast = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const dayExams = exams.filter((e) => e.date === date)
  const dayMemorize = openTasks
    .filter((t) => t.type === 'memorize' && t.dueDate === date)
    .map((t) => ({
      task: t,
      material: materials.find((m) => m.id === t.materialId),
      range: ranges.find((r) => r.materialId === t.materialId && r.id === t.rangeId),
    }))
  const isPast = date < today
  const hasMemorizeMaterials = materials.some((m) => m.kind === 'memorize' && !m.archived)

  function handleAssign() {
    const targets = ranges
      .filter((r) => selected.has(rangeKey({ materialId: r.materialId, rangeId: r.id })))
      .map((range) => ({ range, material: materials.find((m) => m.id === range.materialId)! }))
      .filter((t) => t.material)
    const { changes, created, moved } = scheduleRanges({ targets, openTasks, date })
    saveChangeSet(uid, changes)
    const parts = [created && `開始${created}件`, moved && `日付を移動${moved}件`].filter(Boolean)
    toast(parts.length ? `${formatShortDate(date)} に割り当てました（${parts.join('・')}）` : 'すでにこの日になっています')
    setSelected(new Set())
  }

  return (
    <Sheet
      title={formatShortDate(date)}
      onClose={onClose}
      footer={
        hasMemorizeMaterials && !isPast ? (
          <Button className="w-full" disabled={selected.size === 0} onClick={handleAssign}>
            {selected.size ? `この日に割り当てる（${selected.size}件）` : '割り当てる範囲を選んでください'}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-stone-700">予定</h3>
          {dayExams.length === 0 ? (
            <p className="text-sm text-stone-400">なし</p>
          ) : (
            <ul className="space-y-2">
              {dayExams.map((exam) => (
                <li key={exam.id}>
                  <button
                    type="button"
                    onClick={() => onEditExam(exam)}
                    className="flex w-full items-center gap-2 rounded-xl bg-white p-3 text-left ring-1 ring-stone-200 active:bg-stone-50"
                  >
                    {exam.category && <Badge tone="outline">{exam.category}</Badge>}
                    <span className="font-medium">{exam.name}</span>
                    <span className="ml-auto text-stone-400">›</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-stone-700">この日の暗記</h3>
          {dayMemorize.length === 0 ? (
            <p className="text-sm text-stone-400">なし</p>
          ) : (
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200">
              {dayMemorize.map(({ task, material, range }) => (
                <li key={task.id} className="flex items-center gap-2 px-3 py-2.5 text-sm">
                  <span className="text-stone-500">{material?.name}</span>
                  <span className="font-medium">{range?.label ?? task.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {hasMemorizeMaterials && (
          <section>
            <h3 className="mb-1 text-sm font-semibold text-stone-700">暗記の範囲を割り当てる</h3>
            {isPast ? (
              <p className="text-sm text-stone-400">過ぎた日には割り当てられません。</p>
            ) : (
              <>
                <p className="mb-2 text-xs leading-relaxed text-stone-500">
                  選んだ範囲を、この日の「今日」に出します。未開始の範囲はこの日に開始、復習中の範囲は次の復習をこの日に移します。そのあとは今までどおり間隔を広げて続きます。
                </p>
                <RangePicker selected={selected} onChange={setSelected} />
              </>
            )}
          </section>
        )}
      </div>
    </Sheet>
  )
}
