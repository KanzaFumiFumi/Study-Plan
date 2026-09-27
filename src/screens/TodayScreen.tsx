import { useState } from 'react'
import { useData } from '../data/store.tsx'
import { viewTask } from '../data/taskView.ts'
import { formatShortDate } from '../domain/date.ts'
import { upcomingExams } from '../domain/exam.ts'
import { todayTasks, type TodayItem } from '../domain/sort.ts'
import type { Task } from '../domain/types.ts'
import { useToday } from '../hooks/useToday.ts'
import { TaskBadge } from '../components/TaskBadge.tsx'
import { EmptyState, ScreenTitle } from '../components/ui.tsx'
import { AddAssignmentSheet, AddFirstLapSheet, AddRedoSheet } from './today/AddTaskSheets.tsx'
import { CompleteSheet } from './today/CompleteSheet.tsx'

function Countdown() {
  const { exams } = useData()
  const today = useToday()
  const [next, ...rest] = upcomingExams(exams, today)

  if (!next) {
    return (
      <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
        試験が登録されていません。「試験」タブから登録すると、ここに残り日数が出ます。
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-indigo-600 p-4 text-white shadow-sm">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-indigo-200">
            {next.exam.category && `${next.exam.category}・`}
            {formatShortDate(next.exam.date)}
          </p>
          <p className="truncate text-lg font-bold">{next.exam.name}</p>
        </div>
        <p className="shrink-0 text-right">
          {next.daysLeft === 0 ? (
            <span className="text-2xl font-bold">今日</span>
          ) : (
            <>
              <span className="text-sm">あと</span>
              <span className="mx-1 text-4xl font-bold tabular-nums">{next.daysLeft}</span>
              <span className="text-sm">日</span>
            </>
          )}
        </p>
      </div>
      {rest.length > 0 && (
        <ul className="mt-3 space-y-0.5 border-t border-indigo-400/50 pt-2 text-xs text-indigo-100">
          {rest.slice(0, 2).map(({ exam, daysLeft }) => (
            <li key={exam.id} className="flex justify-between gap-2">
              <span className="truncate">{exam.name}</span>
              <span className="shrink-0 tabular-nums">
                {formatShortDate(exam.date)}・あと{daysLeft}日
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TaskRow({ item, onOpen }: { item: TodayItem; onOpen: () => void }) {
  const data = useData()
  const view = viewTask(item.task, data)
  const notes = [
    view.sub,
    view.exams.length ? `試験：${view.exams.map((e) => e.name).join('・')}` : '',
    item.task.type === 'assignment' && !item.overdue ? `締切 ${formatShortDate(item.task.dueDate)}` : '',
  ].filter(Boolean)

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-sm ring-1 ring-slate-200 active:bg-slate-50"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-2 ring-slate-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <TaskBadge type={item.task.type} />
            {item.overdue && (
              <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">{item.overdueDays}日遅れ</span>
            )}
          </div>
          <p className="mt-1 font-medium leading-snug">{view.heading}</p>
          {notes.length > 0 && <p className="mt-0.5 truncate text-xs text-slate-500">{notes.join('　')}</p>}
        </div>
      </button>
    </li>
  )
}

const ADD_BUTTONS = [
  { key: 'first', label: '授業の1周目' },
  { key: 'assignment', label: '学校課題' },
  { key: 'redo', label: '解き直し' },
] as const

export function TodayScreen() {
  const { openTasks, exams, materials } = useData()
  const today = useToday()
  const [completing, setCompleting] = useState<Task | null>(null)
  const [adding, setAdding] = useState<(typeof ADD_BUTTONS)[number]['key'] | null>(null)

  const hidden = new Set(materials.filter((m) => m.archived).map((m) => m.id))
  const items = todayTasks(openTasks, exams, today, hidden)
  const laterCount = openTasks.filter((t) => t.dueDate > today && !(t.materialId && hidden.has(t.materialId))).length

  return (
    <>
      <ScreenTitle action={<span className="text-sm text-slate-500">{formatShortDate(today)}</span>}>今日</ScreenTitle>
      <Countdown />

      <div className="mt-4 grid grid-cols-3 gap-2">
        {ADD_BUTTONS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setAdding(b.key)}
            className="rounded-xl bg-white px-2 py-2.5 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200 active:bg-indigo-50"
          >
            ＋ {b.label}
          </button>
        ))}
      </div>

      <section className="mt-5">
        <h2 className="mb-2 flex items-baseline justify-between text-sm font-semibold text-slate-600">
          <span>今日のタスク {items.length > 0 && <span className="tabular-nums">{items.length}件</span>}</span>
          {laterCount > 0 && <span className="text-xs font-normal text-slate-400">明日以降 {laterCount}件</span>}
        </h2>
        {items.length === 0 ? (
          <EmptyState>今日のタスクはありません。</EmptyState>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <TaskRow key={item.task.id} item={item} onOpen={() => setCompleting(item.task)} />
            ))}
          </ul>
        )}
      </section>

      {completing && <CompleteSheet task={completing} onClose={() => setCompleting(null)} />}
      {adding === 'first' && <AddFirstLapSheet onClose={() => setAdding(null)} />}
      {adding === 'assignment' && <AddAssignmentSheet onClose={() => setAdding(null)} />}
      {adding === 'redo' && <AddRedoSheet onClose={() => setAdding(null)} />}
    </>
  )
}
