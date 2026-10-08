import { useState } from 'react'
import { saveChangeSet } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { viewTask } from '../../data/taskView.ts'
import { emptyChangeSet } from '../../domain/changeset.ts'
import { completePlainTask, completeUnitTask } from '../../domain/cycle.ts'
import { lapLabel } from '../../domain/labels.ts'
import { addDays, daysBetween, formatShortDate } from '../../domain/date.ts'
import { openTaskForUnit } from '../../domain/lookup.ts'
import { completeMemorizeTask } from '../../domain/memorize.ts'
import type { Task } from '../../domain/types.ts'
import { useToday } from '../../hooks/useToday.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { TaskBadge } from '../../components/TaskBadge.tsx'
import { useToast } from '../../components/Toast.tsx'
import { Badge, Button, inputClass } from '../../components/ui.tsx'

// 0〜9 はボタンで選べるので、ほとんどの場合キーボードは要らない
const QUICK_MARKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

/**
 * タスクをタップしたときのシート：完了する。
 * 周回系・復習系の単元は残りの印の数を選ぶ。暗記（v0.6〜）と単元のない課題は、押すだけで完了。
 */
export function CompleteSheet({ task, onClose }: { task: Task; onClose: () => void }) {
  const data = useData()
  const { uid, openTasks, settings } = data
  const today = useToday()
  const toast = useToast()
  const view = viewTask(task, data)
  const { unit, range, material } = view
  const mode = unit && material ? 'unit' : range && material ? 'memorize' : 'plain'

  const [marks, setMarks] = useState('')
  const marksValue = /^\d+$/.test(marks.trim()) ? Number(marks.trim()) : null
  const canComplete = mode === 'unit' ? marksValue !== null : true

  function handleComplete() {
    const now = Date.now()
    try {
      if (mode === 'unit' && unit && material && marksValue !== null) {
        const { changes, graduated, nextTask } = completeUnitTask({
          task,
          unit,
          material,
          openTasks,
          settings,
          today,
          now,
          remainingMarks: marksValue,
        })
        saveChangeSet(uid, changes)
        toast(
          graduated
            ? `「${unit.name}」が卒業しました`
            : nextTask
              ? `完了。次の${lapLabel(unit.lapCount + 2)}は ${formatShortDate(nextTask.dueDate)}`
              : '完了しました',
        )
      } else if (mode === 'memorize' && range && material) {
        const { changes, lap, finished } = completeMemorizeTask({ task, range, material, today, now })
        saveChangeSet(uid, changes)
        toast(finished ? `「${range.label}」が目標の${material.targetLaps}周を終えました` : `${lapLabel(lap)}が終わりました`)
      } else {
        saveChangeSet(uid, completePlainTask(task, now))
        toast('完了しました')
      }
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : '完了できませんでした', 'error')
    }
  }

  function handleDelete() {
    const what = mode === 'memorize' ? 'この日の暗記の予定を外しますか？' : 'このタスクを削除しますか？'
    if (!window.confirm(`${what}\n（単元・範囲の記録は変わりません）`)) return
    saveChangeSet(uid, { ...emptyChangeSet(), deleteTasks: [task.id] })
    toast(mode === 'memorize' ? '予定を外しました' : 'タスクを削除しました')
    onClose()
  }

  // 完了したらどうなるかの見通し
  let preview = ''
  if (mode === 'unit' && unit && marksValue !== null) {
    if (marksValue === 0) preview = '印が0なので、この単元は卒業になります。'
    else if (openTaskForUnit(openTasks, { materialId: unit.materialId, unitId: unit.id }, task.id))
      preview = 'この単元には別の未完了タスクがあるので、次のタスクは作りません。'
    else preview = `次の${lapLabel(unit.lapCount + 2)}を ${formatShortDate(addDays(today, settings.cycleIntervalDays))} に作ります。`
  }
  if (mode === 'memorize' && range && material) {
    const lap = range.lapCount + 1
    preview =
      lap >= material.targetLaps
        ? `${lapLabel(lap)}。これで目標の${material.targetLaps}周を終えます。`
        : `${lapLabel(lap)}（目標 ${material.targetLaps}周）。次にやる日は、ホームのカレンダーで決めます。`
  }

  const overdueDays = daysBetween(task.dueDate, today)

  return (
    <Sheet
      title={view.heading}
      subtitle={mode === 'memorize' ? '暗記を完了する' : '完了する'}
      onClose={onClose}
      footer={
        <Button className="w-full py-3 text-base" disabled={!canComplete} onClick={handleComplete}>
          完了
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <TaskBadge task={task} unit={unit} />
          {overdueDays > 0 ? <Badge tone="danger">{overdueDays}日遅れ</Badge> : <Badge>期限 {formatShortDate(task.dueDate)}</Badge>}
          {view.exams.map((e) => (
            <Badge key={e.id} tone="outline">
              {e.name}
            </Badge>
          ))}
        </div>
        {view.sub && <p className="-mt-2 text-sm text-stone-500">{view.sub}</p>}

        {mode === 'unit' && unit && (
          <div>
            <p className="mb-2.5 flex items-baseline justify-between text-sm font-semibold text-stone-700">
              残っている印の数
              {unit.lapCount > 0 && (
                <span className="text-xs font-normal text-stone-500">
                  前回 {lapLabel(unit.lapCount)}・残り{unit.remainingMarks ?? '?'}
                </span>
              )}
            </p>
            <div className="mb-3 grid grid-cols-5 gap-2">
              {QUICK_MARKS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMarks(String(n))}
                  aria-pressed={marksValue === n}
                  className={`num rounded-xl py-3 text-lg font-semibold ring-1 transition active:scale-95 ${
                    marksValue === n ? 'bg-ink text-white ring-ink' : 'bg-white text-stone-800 ring-stone-200 pc:hover:bg-stone-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              className={`${inputClass} num text-center text-lg`}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="残っている印の数"
              placeholder="10以上はここに入力"
              value={marks}
              onChange={(e) => setMarks(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>
        )}

        {mode === 'plain' && <p className="text-sm text-stone-600">この課題は単元に紐づいていないので、完了にするだけです。</p>}

        {preview && <p className="rounded-xl bg-stone-200/60 px-3.5 py-2.5 text-sm leading-relaxed text-stone-700">{preview}</p>}

        <div className="pt-1 text-center">
          <button type="button" onClick={handleDelete} className="text-sm text-red-700 underline-offset-2 active:underline pc:hover:underline">
            {mode === 'memorize' ? 'この日の予定を外す' : 'このタスクを削除'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
