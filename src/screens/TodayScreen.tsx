import { useState } from 'react'
import { saveChangeSet } from '../data/commands.ts'
import { useData } from '../data/store.tsx'
import { viewTask } from '../data/taskView.ts'
import { completePlainTask } from '../domain/cycle.ts'
import { formatShortDate } from '../domain/date.ts'
import { upcomingExams } from '../domain/exam.ts'
import { todayTasks, upcomingTasks, type TodayItem } from '../domain/sort.ts'
import type { Task } from '../domain/types.ts'
import { useNav } from '../hooks/useNav.ts'
import { useToday } from '../hooks/useToday.ts'
import { TaskBadge } from '../components/TaskBadge.tsx'
import { useToast } from '../components/Toast.tsx'
import { Badge, EmptyState, ScreenTitle } from '../components/ui.tsx'
import { AddAssignmentSheet, AddFirstLapSheet, AddRedoSheet } from './today/AddTaskSheets.tsx'
import { CompleteSheet } from './today/CompleteSheet.tsx'

/** 「これからのタスク」に出す日数 */
const UPCOMING_DAYS = 7

function Countdown() {
  const { exams } = useData()
  const today = useToday()
  const nav = useNav()
  const [next, ...rest] = upcomingExams(exams, today)

  if (!next) {
    return (
      <button
        type="button"
        onClick={() => nav('exams')}
        className="w-full rounded-2xl border border-dashed border-stone-300 p-4 text-left text-sm text-stone-500 active:bg-stone-100"
      >
        試験・大会・旅行など、目標の日を「予定」に登録すると、ここに残り日数が出ます。
      </button>
    )
  }
  return (
    <div className="rounded-2xl bg-ink p-5 text-white">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-wider text-stone-400">
            {next.exam.category && `${next.exam.category}・`}
            {formatShortDate(next.exam.date)}
          </p>
          <p className="mt-1 truncate text-lg font-bold tracking-wide">{next.exam.name}</p>
        </div>
        <p className="shrink-0 text-right">
          {next.daysLeft === 0 ? (
            <span className="text-2xl font-bold">今日</span>
          ) : (
            <>
              <span className="text-xs text-stone-400">あと</span>
              <span className="mx-1 text-4xl font-bold tabular-nums">{next.daysLeft}</span>
              <span className="text-xs text-stone-400">日</span>
            </>
          )}
        </p>
      </div>
      {rest.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-white/15 pt-3 text-xs text-stone-300">
          {rest.slice(0, 2).map(({ exam, daysLeft }) => (
            <li key={exam.id} className="flex justify-between gap-2">
              <span className="truncate">{exam.name}</span>
              <span className="shrink-0 tabular-nums text-stone-400">
                {formatShortDate(exam.date)}・あと{daysLeft}日
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** 教材がまだないときの「はじめかた」 */
function StartGuide() {
  const nav = useNav()
  const steps: { text: string; action?: { label: string; onClick: () => void } }[] = [
    { text: '本棚に、問題集や単語帳を登録する（単元は目次を貼り付けてまとめて登録）', action: { label: '本棚へ', onClick: () => nav('shelf') } },
    { text: '授業で解いたら「＋授業の一周目」で今日のタスクにして、完了する' },
    { text: '試験・大会・旅行などの日は「予定」に登録する', action: { label: '予定へ', onClick: () => nav('exams') } },
  ]
  return (
    <section className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <h2 className="font-bold tracking-wide">はじめかた</h2>
      <ol className="mt-3 space-y-3">
        {steps.map((s, i) => (
          <li key={s.text} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
              {i + 1}
            </span>
            <span className="flex-1 text-sm leading-relaxed">{s.text}</span>
            {s.action && (
              <button
                type="button"
                onClick={s.action.onClick}
                className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-stone-300 active:bg-stone-100"
              >
                {s.action.label}
              </button>
            )}
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => nav('guide')} className="mt-4 text-sm font-semibold underline underline-offset-4">
        使い方を図で見る
      </button>
    </section>
  )
}

/** これからのタスクの1行（タップで完了シート） */
function TaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const data = useData()
  const view = viewTask(task, data)
  const notes = [view.sub, view.exams.length ? `予定：${view.exams.map((e) => e.name).join('・')}` : ''].filter(Boolean)

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-left ring-1 ring-stone-200 active:bg-stone-50"
      >
        <span className="h-6 w-6 shrink-0 rounded-full ring-2 ring-stone-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <TaskBadge task={task} unit={view.unit} />
          <p className="mt-1 text-sm leading-snug">{view.heading}</p>
          {notes.length > 0 && <p className="mt-0.5 truncate text-xs text-stone-500">{notes.join('　')}</p>}
        </div>
      </button>
    </li>
  )
}

/** チェックリストの四角 */
function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
        checked ? 'bg-ink text-white' : 'bg-white ring-2 ring-stone-300'
      }`}
      aria-hidden
    >
      {checked && (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

/** 今日のチェックリストの1行。四角を押すと完了（数字が要るものは入力シート）。行を押すとシートを開く */
function ChecklistRow({ item, onOpen, onCheck }: { item: TodayItem; onOpen: () => void; onCheck: () => void }) {
  const data = useData()
  const { task, overdueDays, planned } = item
  const view = viewTask(task, data)
  const notes = [
    view.sub,
    view.exams.length ? `予定：${view.exams.map((e) => e.name).join('・')}` : '',
    task.type === 'assignment' && overdueDays === 0 && !planned ? `締切 ${formatShortDate(task.dueDate)}` : '',
    planned ? `期限 ${formatShortDate(task.dueDate)}` : '',
  ].filter(Boolean)

  return (
    <li className="flex items-center">
      <button type="button" onClick={onCheck} aria-label={`「${view.heading}」を完了する`} className="py-3.5 pr-2 pl-4 active:opacity-60">
        <CheckBox checked={false} />
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-3 pr-4 pl-1 text-left active:bg-stone-50">
        <span className="flex flex-wrap items-center gap-1.5">
          <TaskBadge task={task} unit={view.unit} />
          {overdueDays > 0 && <Badge tone="danger">{overdueDays}日遅れ</Badge>}
          {planned && <Badge tone="outline">今日やる</Badge>}
        </span>
        <span className="mt-1 block font-medium leading-snug">{view.heading}</span>
        {notes.length > 0 && <span className="mt-0.5 block truncate text-xs text-stone-500">{notes.join('　')}</span>}
      </button>
    </li>
  )
}

/** 今日完了したもの（チェック済み。取り消しはできない） */
function DoneRow({ task }: { task: Task }) {
  const data = useData()
  const view = viewTask(task, data)
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <CheckBox checked />
      <span className="min-w-0 flex-1 truncate text-sm text-stone-400 line-through">{view.heading}</span>
    </li>
  )
}

/** これからのタスク（明日から7日間）。自動で作られたタスクがいつ来るか分かるように。先にやりたければタップして完了できる */
function Upcoming({ onOpen }: { onOpen: (task: Task) => void }) {
  const { openTasks, materials } = useData()
  const today = useToday()
  const [open, setOpen] = useState(false)
  const hidden = new Set(materials.filter((m) => m.archived).map((m) => m.id))
  const { tasks, later } = upcomingTasks(openTasks, today, UPCOMING_DAYS, hidden)
  if (tasks.length === 0 && later === 0) return null

  const byDate = new Map<string, Task[]>()
  for (const t of tasks) byDate.set(t.dueDate, [...(byDate.get(t.dueDate) ?? []), t])

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-sm font-semibold text-stone-600"
      >
        <span>
          これからの{UPCOMING_DAYS}日間 <span className="tabular-nums">{tasks.length}件</span>
        </span>
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          {[...byDate].map(([date, list]) => (
            <div key={date}>
              <p className="mb-1.5 px-1 text-xs font-semibold text-stone-500">{formatShortDate(date)}</p>
              <ul className="space-y-2">
                {list.map((task) => (
                  <TaskRow key={task.id} task={task} onOpen={() => onOpen(task)} />
                ))}
              </ul>
            </div>
          ))}
          {later > 0 && <p className="px-1 text-xs text-stone-400">それより先に {later}件</p>}
        </div>
      )}
    </section>
  )
}

const ADD_BUTTONS = [
  { key: 'first', label: '授業の一周目', hint: '今日解いた範囲' },
  { key: 'assignment', label: '学校課題', hint: '締切のある提出物' },
  { key: 'redo', label: '解き直し', hint: 'もう一度解く単元' },
] as const

export function TodayScreen() {
  const data = useData()
  const { uid, openTasks, doneToday, exams, materials } = data
  const today = useToday()
  const nav = useNav()
  const toast = useToast()
  const [completing, setCompleting] = useState<Task | null>(null)
  const [adding, setAdding] = useState<(typeof ADD_BUTTONS)[number]['key'] | null>(null)

  const hidden = new Set(materials.filter((m) => m.archived).map((m) => m.id))
  const items = todayTasks(openTasks, exams, today, hidden)
  const total = items.length + doneToday.length

  // 四角を押したとき：単元にも範囲にも紐づかない課題はそのまま完了。数字が要るものは入力シートを開く
  function handleCheck(task: Task) {
    const view = viewTask(task, data)
    if (view.unit || view.range) {
      setCompleting(task)
      return
    }
    saveChangeSet(uid, completePlainTask(task, Date.now()))
    toast('完了しました')
  }

  return (
    <>
      <ScreenTitle
        action={
          <span className="flex items-center gap-3">
            <span className="text-sm text-stone-500">{formatShortDate(today)}</span>
            <button
              type="button"
              onClick={() => nav('guide')}
              aria-label="使い方"
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ring-1 ring-stone-300 active:bg-stone-100"
            >
              ?
            </button>
          </span>
        }
      >
        今日
      </ScreenTitle>
      <Countdown />

      {materials.length === 0 && <StartGuide />}

      <div className="mt-4 grid grid-cols-3 gap-2">
        {ADD_BUTTONS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setAdding(b.key)}
            className="rounded-xl bg-white px-2 py-2.5 text-left ring-1 ring-stone-200 active:bg-stone-100"
          >
            <span className="block text-[13px] font-semibold tracking-tight whitespace-nowrap">＋{b.label}</span>
            <span className="mt-0.5 block text-[11px] text-stone-500">{b.hint}</span>
          </button>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="mb-2 flex items-baseline justify-between px-1 text-sm font-semibold text-stone-600">
          <span>今日のチェックリスト</span>
          {total > 0 && (
            <span className="tabular-nums text-stone-500">
              {doneToday.length} / {total} 完了
            </span>
          )}
        </h2>
        {total > 0 && (
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${(doneToday.length / total) * 100}%` }} />
          </div>
        )}
        {total === 0 ? (
          <EmptyState>
            今日のタスクはありません。
            <br />
            「リスト」で「今日やる」を押すと、ここに追加できます。
          </EmptyState>
        ) : (
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
            {items.map((item) => (
              <ChecklistRow
                key={item.task.id}
                item={item}
                onOpen={() => setCompleting(item.task)}
                onCheck={() => handleCheck(item.task)}
              />
            ))}
            {doneToday.map((task) => (
              <DoneRow key={task.id} task={task} />
            ))}
          </ul>
        )}
        {total > 0 && items.length === 0 && <p className="mt-3 text-center text-sm text-stone-500">今日のタスクはすべて完了しました。</p>}
      </section>

      <Upcoming onOpen={setCompleting} />

      {completing && <CompleteSheet task={completing} onClose={() => setCompleting(null)} />}
      {adding === 'first' && <AddFirstLapSheet onClose={() => setAdding(null)} />}
      {adding === 'assignment' && <AddAssignmentSheet onClose={() => setAdding(null)} />}
      {adding === 'redo' && <AddRedoSheet onClose={() => setAdding(null)} />}
    </>
  )
}
