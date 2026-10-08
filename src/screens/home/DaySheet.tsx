import { useState, type ReactNode } from 'react'
import { saveChangeSet } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { viewTask } from '../../data/taskView.ts'
import { daysBetween, formatMonthDay, weekdayOf } from '../../domain/date.ts'
import { rangeKey } from '../../domain/lookup.ts'
import { isRangeFinished, scheduleRanges, unscheduleTask } from '../../domain/memorize.ts'
import { tasksDueOn } from '../../domain/sort.ts'
import type { Exam, ISODate, Task } from '../../domain/types.ts'
import { useToday } from '../../hooks/useToday.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { CheckBox, useTaskActions } from '../../components/TaskCheck.tsx'
import { TaskBadge } from '../../components/TaskBadge.tsx'
import { useToast } from '../../components/Toast.tsx'
import { RangePicker } from '../../components/UnitPicker.tsx'
import { Button, PlusIcon } from '../../components/ui.tsx'

function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-[13px] font-bold tracking-[0.12em] text-stone-500">{title}</h3>
      {children}
    </section>
  )
}

/** その日のタスクの1行。四角で完了、行で完了のシート。暗記は × でその日から外せる */
function TaskLine({
  task,
  onCheck,
  onOpen,
  onRemove,
}: {
  task: Task
  onCheck: () => void
  onOpen: () => void
  onRemove?: () => void
}) {
  const data = useData()
  const view = viewTask(task, data)
  return (
    <li className="flex items-center">
      <button type="button" onClick={onCheck} aria-label={`「${view.heading}」を完了する`} className="py-3 pr-1.5 pl-3.5 active:opacity-60">
        <CheckBox checked={false} />
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-2.5 pr-2 pl-1.5 text-left">
        <TaskBadge task={task} unit={view.unit} />
        <span className="mt-0.5 block truncate text-sm font-medium">{view.heading}</span>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`「${view.heading}」をこの日から外す`}
          className="mr-2 flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition active:bg-stone-100 pc:hover:bg-stone-100 pc:hover:text-stone-700"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </li>
  )
}

/**
 * カレンダーで選んだ日（v0.4〜、v0.6 でホームに移した）。
 * その日の予定・タスク・暗記を見て、暗記の範囲をその日に割り当てる（1つの範囲に、残りの周回数まで先の日を入れられる）。
 */
export function DaySheet({
  date,
  onClose,
  onOpenTask,
  onEditExam,
  onAddExam,
}: {
  date: ISODate
  onClose: () => void
  onOpenTask: (task: Task) => void
  onEditExam: (exam: Exam) => void
  onAddExam: (date: ISODate) => void
}) {
  const data = useData()
  const { uid, exams, materials, ranges, openTasks } = data
  const today = useToday()
  const toast = useToast()
  const actions = useTaskActions(onOpenTask)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const hidden = new Set(materials.filter((m) => m.archived).map((m) => m.id))
  const dayExams = exams.filter((e) => e.date === date)
  const dayTasks = tasksDueOn(openTasks, date, hidden)
  const memorize = dayTasks.filter((t) => t.type === 'memorize')
  const others = dayTasks.filter((t) => t.type !== 'memorize')
  const isPast = date < today
  const hasMemorizeMaterials = materials.some((m) => m.kind === 'memorize' && !m.archived)
  const diff = daysBetween(today, date)
  const relative = diff === 0 ? '今日' : diff === 1 ? '明日' : diff === -1 ? '昨日' : diff > 0 ? `${diff}日後` : `${-diff}日前`

  function handleAssign() {
    const targets = ranges
      .filter((r) => selected.has(rangeKey({ materialId: r.materialId, rangeId: r.id })))
      .map((range) => ({ range, material: materials.find((m) => m.id === range.materialId)! }))
      .filter((t) => t.material)
    const { changes, created, already, full } = scheduleRanges({ targets, openTasks, date })
    saveChangeSet(uid, changes)
    const parts = [
      created && `${created}件を割り当てました`,
      already && `${already}件はすでにこの日にあります`,
      full && `${full}件は目標の周回数まで予定が入っています`,
    ].filter(Boolean)
    toast(parts.join('・') || '変更はありません')
    setSelected(new Set())
  }

  function handleUnassign(task: Task) {
    saveChangeSet(uid, unscheduleTask(task))
    toast('この日の暗記を外しました')
  }

  const listClass = 'divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80'
  const none = <p className="px-1 text-sm text-stone-400">なし</p>

  return (
    <Sheet
      title={`${formatMonthDay(date)}(${weekdayOf(date)})`}
      subtitle={relative}
      onClose={onClose}
      footer={
        hasMemorizeMaterials && !isPast ? (
          <Button className="w-full" disabled={selected.size === 0} onClick={handleAssign}>
            {selected.size ? `この日に割り当てる（${selected.size}件）` : '割り当てる暗記の範囲を選んでください'}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <SheetSection title="予定">
          {dayExams.length > 0 && (
            <ul className="mb-2 space-y-2">
              {dayExams.map((exam) => (
                <li key={exam.id}>
                  <button
                    type="button"
                    onClick={() => onEditExam(exam)}
                    className="flex w-full items-center gap-2.5 rounded-2xl bg-ink px-4 py-3 text-left text-white transition active:scale-[0.99]"
                  >
                    <span className="h-2 w-2 rotate-45 bg-white" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-semibold">{exam.name}</span>
                    {exam.category && <span className="text-xs text-stone-400">{exam.category}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!isPast && (
            <button
              type="button"
              onClick={() => onAddExam(date)}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-stone-300 py-2.5 text-sm font-medium text-stone-600 transition active:bg-stone-100 pc:hover:bg-white"
            >
              <PlusIcon />
              この日に予定を追加
            </button>
          )}
          {isPast && dayExams.length === 0 && none}
        </SheetSection>

        <SheetSection title="この日のタスク">
          {others.length === 0 ? (
            none
          ) : (
            <ul className={listClass}>
              {others.map((task) => (
                <TaskLine key={task.id} task={task} onCheck={() => actions.check(task)} onOpen={() => onOpenTask(task)} />
              ))}
            </ul>
          )}
        </SheetSection>

        <SheetSection title="この日の暗記">
          {memorize.length === 0 ? (
            none
          ) : (
            <ul className={listClass}>
              {memorize.map((task) => (
                <TaskLine
                  key={task.id}
                  task={task}
                  onCheck={() => actions.check(task)}
                  onOpen={() => onOpenTask(task)}
                  onRemove={() => handleUnassign(task)}
                />
              ))}
            </ul>
          )}
        </SheetSection>

        {hasMemorizeMaterials && !isPast && (
          <SheetSection title="暗記を割り当てる">
            <p className="mb-2.5 px-1 text-xs leading-relaxed text-stone-500">
              選んだ範囲を、この日にやる暗記にします。1つの範囲に、目標の周回数まで別の日を入れられます。
            </p>
            <RangePicker
              selected={selected}
              onChange={setSelected}
              filter={(range, material) => !isRangeFinished(range, material)}
            />
          </SheetSection>
        )}
        {isPast && <p className="px-1 text-xs text-stone-400">過ぎた日には暗記を割り当てられません。</p>}
        {!hasMemorizeMaterials && (
          <p className="px-1 text-xs text-stone-400">
            暗記系の教材（単語帳など）を本棚に登録すると、ここで日付に割り当てられます。
          </p>
        )}
      </div>
    </Sheet>
  )
}

