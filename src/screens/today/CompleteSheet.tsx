import { useState } from 'react'
import { saveChangeSet } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { viewTask } from '../../data/taskView.ts'
import { emptyChangeSet } from '../../domain/changeset.ts'
import { completePlainTask, completeUnitTask } from '../../domain/cycle.ts'
import { addDays, daysBetween, formatShortDate } from '../../domain/date.ts'
import { openTaskForRange, openTaskForUnit } from '../../domain/lookup.ts'
import { completeMemorizeTask, intervalDays, nextStep } from '../../domain/memorize.ts'
import type { Task } from '../../domain/types.ts'
import { useToday } from '../../hooks/useToday.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { TaskBadge } from '../../components/TaskBadge.tsx'
import { useToast } from '../../components/Toast.tsx'
import { Button, inputClass } from '../../components/ui.tsx'

const QUICK_MARKS = [0, 1, 2, 3, 4, 5]

/** 数字だけを受け付ける入力欄の値を整数に（空なら null） */
function parseCount(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null
  return Number(text.trim())
}

function CountInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-center text-sm font-medium text-slate-700">{label}</span>
      <input
        className={`${inputClass} text-center text-lg tabular-nums`}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder="0"
      />
    </label>
  )
}

/** タスクをタップしたときのシート：数字を入れて完了する */
export function CompleteSheet({ task, onClose }: { task: Task; onClose: () => void }) {
  const data = useData()
  const { uid, openTasks, settings } = data
  const today = useToday()
  const toast = useToast()
  const view = viewTask(task, data)
  const { unit, range, material } = view
  const mode = unit && material ? 'unit' : range && material ? 'memorize' : 'plain'

  const [marks, setMarks] = useState('')
  const [known, setKnown] = useState('')
  const [half, setHalf] = useState('')
  const [unknown, setUnknown] = useState('')

  const marksValue = parseCount(marks)
  const memo = { known: parseCount(known) ?? 0, half: parseCount(half) ?? 0, unknown: parseCount(unknown) ?? 0 }
  const memoTotal = memo.known + memo.half + memo.unknown
  const canComplete = mode === 'unit' ? marksValue !== null : mode === 'memorize' ? memoTotal > 0 : true

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
              ? `完了。次の周回は ${formatShortDate(nextTask.dueDate)}`
              : '完了しました',
        )
      } else if (mode === 'memorize' && range && material) {
        const { changes, stepUp, nextTask } = completeMemorizeTask({
          task,
          range,
          material,
          openTasks,
          settings,
          today,
          now,
          result: memo,
        })
        saveChangeSet(uid, changes)
        const next = nextTask ? `次の復習は ${formatShortDate(nextTask.dueDate)}` : ''
        toast(stepUp ? `間隔が広がりました。${next}` : `完了。${next}`)
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
    if (!window.confirm('このタスクを削除しますか？\n（単元・範囲の記録は変わりません）')) return
    saveChangeSet(uid, { ...emptyChangeSet(), deleteTasks: [task.id] })
    toast('タスクを削除しました')
    onClose()
  }

  // 完了したらどうなるかの見通し
  let preview = ''
  if (mode === 'unit' && unit && marksValue !== null) {
    if (marksValue === 0) preview = '印が0なので、この単元は卒業になります。'
    else if (openTaskForUnit(openTasks, { materialId: unit.materialId, unitId: unit.id }, task.id))
      preview = 'この単元には別の未完了タスクがあるので、新しい周回タスクは作りません。'
    else preview = `次の周回タスクを ${formatShortDate(addDays(today, settings.cycleIntervalDays))} に作ります。`
  }
  if (mode === 'memorize' && range && memoTotal > 0) {
    const step = nextStep(range.step, memo)
    const next = formatShortDate(addDays(today, intervalDays(step, settings.memorizeIntervals)))
    const other = openTaskForRange(openTasks, { materialId: range.materialId, rangeId: range.id }, task.id)
    preview = `${step > range.step ? '半知・未知が0なので、間隔が広がります。' : '間隔は据え置きです。'}${other ? '' : `次の復習は ${next}。`}`
  }

  const overdueDays = daysBetween(task.dueDate, today)

  return (
    <Sheet
      title="完了する"
      onClose={onClose}
      footer={
        <Button className="w-full py-3 text-base" disabled={!canComplete} onClick={handleComplete}>
          完了
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <TaskBadge type={task.type} />
            <span className={`text-xs ${overdueDays > 0 ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
              {overdueDays > 0 ? `${overdueDays}日遅れ` : `期限 ${formatShortDate(task.dueDate)}`}
            </span>
          </div>
          <p className="mt-2 font-semibold">{view.heading}</p>
          {view.sub && <p className="text-sm text-slate-500">{view.sub}</p>}
          {view.exams.length > 0 && <p className="mt-1 text-xs text-slate-500">試験：{view.exams.map((e) => e.name).join('・')}</p>}
        </div>

        {mode === 'unit' && unit && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              残っている印の数
              {unit.lapCount > 0 && (
                <span className="ml-2 font-normal text-slate-500">
                  前回：{unit.lapCount}周・残り{unit.remainingMarks ?? '?'}
                </span>
              )}
            </p>
            <div className="mb-3 grid grid-cols-6 gap-2">
              {QUICK_MARKS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMarks(String(n))}
                  className={`rounded-xl py-2.5 text-base font-semibold tabular-nums ring-1 ${
                    marksValue === n ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-700 ring-slate-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              className={`${inputClass} text-center text-lg tabular-nums`}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="残っている印の数"
              placeholder="6以上は入力"
              value={marks}
              onChange={(e) => setMarks(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>
        )}

        {mode === 'memorize' && (
          <div>
            <p className="mb-2 text-sm text-slate-600">覚えた数を入力してください。</p>
            <div className="grid grid-cols-3 gap-2">
              <CountInput label="知" value={known} onChange={setKnown} />
              <CountInput label="半知" value={half} onChange={setHalf} />
              <CountInput label="未知" value={unknown} onChange={setUnknown} />
            </div>
          </div>
        )}

        {mode === 'plain' && <p className="text-sm text-slate-600">この課題は単元に紐づいていないので、完了にするだけです。</p>}

        {preview && <p className="rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-800">{preview}</p>}

        <div className="pt-2 text-center">
          <button type="button" onClick={handleDelete} className="text-sm text-red-600 underline-offset-2 active:underline">
            このタスクを削除
          </button>
        </div>
      </div>
    </Sheet>
  )
}
