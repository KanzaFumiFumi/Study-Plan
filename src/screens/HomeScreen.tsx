import { useState } from 'react'
import { useData } from '../data/store.tsx'
import { useTasksDueOn } from '../data/queries.ts'
import { viewTask } from '../data/taskView.ts'
import { assignmentsDueOn, isDoneInList, isInArchive } from '../domain/archive.ts'
import { formatMonthDay, formatShortDate, weekdayOf } from '../domain/date.ts'
import { upcomingExams } from '../domain/exam.ts'
import { todayTasks, type TodayItem } from '../domain/sort.ts'
import type { Exam, ISODate, Task } from '../domain/types.ts'
import { useIsPc } from '../hooks/useLayout.ts'
import { useNav } from '../hooks/useNav.ts'
import { useToday } from '../hooks/useToday.ts'
import { LayoutSwitch } from '../components/LayoutSwitch.tsx'
import { ArchiveButton, CheckBox, DoneMark, useTaskActions } from '../components/TaskCheck.tsx'
import { TaskBadge } from '../components/TaskBadge.tsx'
import { Badge, EmptyState, IconButton, PlusIcon, SectionHeader } from '../components/ui.tsx'
import { ExamFormSheet } from './exams/ExamFormSheet.tsx'
import { AddMenu, type AddAction } from './home/AddMenu.tsx'
import { DaySheet } from './home/DaySheet.tsx'
import { EventsSheet } from './home/EventsSheet.tsx'
import { WeekCalendar } from './home/WeekCalendar.tsx'
import { AddAssignmentSheet, AddFirstLapSheet, AddRedoSheet } from './today/AddTaskSheets.tsx'
import { CompleteSheet } from './today/CompleteSheet.tsx'

// ホーム（v0.6〜）。v0.5 までの「今日」と「予定」をまとめた画面。
// 上から：日付と進み具合／次の予定まで／カレンダー（週の帯、広げると月）／今日提出の課題／今日のチェックリスト。
// 追加は右下の「＋」にまとめる。PC版は、左にチェックリスト、右に予定とカレンダー。

/** 今日の進み具合の輪 */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 22
  const length = 2 * Math.PI * r
  const ratio = total ? done / total : 0
  return (
    <div className="relative h-14 w-14 shrink-0" role="img" aria-label={`今日のチェックリスト ${done} / ${total} 完了`}>
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e7e5e4" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - ratio)}
          className="text-ink transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="num absolute inset-0 flex items-center justify-center text-[13px] font-bold">
        {total ? `${done}/${total}` : '—'}
      </span>
    </div>
  )
}

/** 次の予定までの日数（タップで予定の一覧）。予定がなければ登録の入り口 */
function NextEvent({ onOpenList, onAdd }: { onOpenList: () => void; onAdd: () => void }) {
  const { exams } = useData()
  const today = useToday()
  const [next, ...rest] = upcomingExams(exams, today)

  if (!next) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-stone-300 p-4 text-left text-sm text-stone-500 transition active:bg-stone-100 pc:hover:bg-white"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-200/70 text-stone-600">
          <PlusIcon />
        </span>
        試験・大会・旅行など、目標の日を登録すると、ここに残り日数が出ます。
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onOpenList}
      aria-label={`予定の一覧（次は${next.exam.name}）`}
      className="relative w-full overflow-hidden rounded-3xl bg-ink p-5 text-left text-white shadow-[0_10px_30px_-12px_rgba(28,27,25,0.6)] transition active:scale-[0.99]"
    >
      {/* うっすらとした同心円（飾り） */}
      <svg viewBox="0 0 200 200" className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 text-white/[0.06]" aria-hidden>
        {[30, 55, 80, 100].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeWidth="1.2" />
        ))}
      </svg>
      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.18em] text-stone-400">
            {next.exam.category ? `${next.exam.category}・` : ''}
            {formatShortDate(next.exam.date)}
          </p>
          <p className="mt-1 truncate text-lg font-bold tracking-wide">{next.exam.name}</p>
        </div>
        <p className="shrink-0 text-right">
          {next.daysLeft === 0 ? (
            <span className="text-3xl font-bold">今日</span>
          ) : (
            <>
              <span className="text-xs text-stone-400">あと</span>
              <span className="num mx-1 text-5xl leading-none font-bold">{next.daysLeft}</span>
              <span className="text-xs text-stone-400">日</span>
            </>
          )}
        </p>
      </div>
      {rest.length > 0 && (
        <ul className="relative mt-4 space-y-1 border-t border-white/15 pt-3 text-xs text-stone-300">
          {rest.slice(0, 2).map(({ exam, daysLeft }) => (
            <li key={exam.id} className="flex justify-between gap-2">
              <span className="truncate">{exam.name}</span>
              <span className="num shrink-0 text-stone-400">
                {formatShortDate(exam.date)}・あと{daysLeft}日
              </span>
            </li>
          ))}
        </ul>
      )}
    </button>
  )
}

/** 教材がまだないときの「はじめかた」 */
function StartGuide() {
  const nav = useNav()
  const steps: { text: string; action?: { label: string; onClick: () => void } }[] = [
    { text: '本棚に、問題集や単語帳を登録する（単元は目次を貼り付けてまとめて登録）', action: { label: '本棚へ', onClick: () => nav('shelf') } },
    { text: '授業で解いたら、右下の「＋」→「授業の一周目」でチェックリストに入れて、完了する' },
    { text: '試験・大会などの日は「＋」→「予定」、単語帳はカレンダーの日付をタップして割り当てる' },
  ]
  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-stone-200/80">
      <h2 className="font-bold tracking-wide">はじめかた</h2>
      <ol className="mt-4 space-y-3.5">
        {steps.map((s, i) => (
          <li key={s.text} className="flex items-start gap-3">
            <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
              {i + 1}
            </span>
            <span className="flex-1 text-sm leading-relaxed">{s.text}</span>
            {s.action && (
              <button
                type="button"
                onClick={s.action.onClick}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-stone-300 active:bg-stone-100"
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

/**
 * 今日提出の課題（v0.5〜）：締切が今日の課題を、未完了・完了済み・アーカイブ済みすべて出す（確認用。操作はチェックリストで）。
 */
function DueTodayAssignments() {
  const data = useData()
  const today = useToday()
  const tasks = assignmentsDueOn(useTasksDueOn(data.uid, today), today)
  const done = tasks.filter((t) => t.status === 'done').length

  return (
    <section>
      <SectionHeader aside={tasks.length > 0 && `${done} / ${tasks.length} 完了`}>今日提出の課題</SectionHeader>
      {tasks.length === 0 ? (
        <p className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-stone-400 ring-1 ring-stone-200/80">今日が締切の課題はありません</p>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80">
          {tasks.map((task) => {
            const view = viewTask(task, data)
            const isDone = task.status === 'done'
            return (
              <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                <DoneMark done={isDone} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-snug ${isDone ? 'text-stone-400 line-through' : 'font-semibold'}`}>{task.title}</p>
                  {view.sub && <p className="mt-0.5 truncate text-xs text-stone-500">{view.sub}</p>}
                </div>
                {isDone ? <Badge>{isInArchive(task, today) ? '完了・アーカイブ' : '完了'}</Badge> : <Badge tone="ink">未完了</Badge>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
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
    planned ? `期限 ${formatShortDate(task.dueDate)}` : '',
  ].filter(Boolean)

  return (
    <li className="flex items-center">
      <button type="button" onClick={onCheck} aria-label={`「${view.heading}」を完了する`} className="py-4 pr-2 pl-4 active:opacity-60">
        <CheckBox checked={false} />
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-3 pr-4 pl-1 text-left transition active:bg-stone-50 pc:hover:bg-stone-50/70">
        <span className="flex flex-wrap items-center gap-1.5">
          <TaskBadge task={task} unit={view.unit} />
          {overdueDays > 0 && <Badge tone="danger">{overdueDays}日遅れ</Badge>}
          {planned && <Badge tone="outline">今日やる</Badge>}
        </span>
        <span className="mt-1 block leading-snug font-semibold">{view.heading}</span>
        {notes.length > 0 && <span className="mt-0.5 block truncate text-xs text-stone-500">{notes.join('　')}</span>}
      </button>
    </li>
  )
}

/** 今日完了したもの（チェック済み）。四角を押すとチェックを外せる。「アーカイブへ」でリストから消す（v0.5〜） */
function DoneRow({ task, onUncheck, onArchive }: { task: Task; onUncheck: () => void; onArchive: () => void }) {
  const data = useData()
  const view = viewTask(task, data)
  return (
    <li className="flex items-center gap-2 pr-3">
      <button type="button" onClick={onUncheck} aria-label={`「${view.heading}」のチェックを外す`} className="py-3 pr-1 pl-4 active:opacity-60">
        <CheckBox checked />
      </button>
      <span className="min-w-0 flex-1 truncate text-sm text-stone-400 line-through">{view.heading}</span>
      <ArchiveButton onClick={onArchive} />
    </li>
  )
}

export function HomeScreen() {
  const { openTasks, doneToday, exams, materials } = useData()
  const today = useToday()
  const nav = useNav()
  const pc = useIsPc()
  const [completing, setCompleting] = useState<Task | null>(null)
  const [adding, setAdding] = useState<'first' | 'assignment' | 'redo' | null>(null)
  const [day, setDay] = useState<ISODate | null>(null)
  const [eventsOpen, setEventsOpen] = useState(false)
  // 予定の編集：既存の予定、新規（日付の初期値つき）
  const [editingExam, setEditingExam] = useState<{ exam?: Exam; date?: ISODate } | null>(null)
  const actions = useTaskActions(setCompleting)

  const hidden = new Set(materials.filter((m) => m.archived).map((m) => m.id))
  const items = todayTasks(openTasks, exams, today, hidden)
  // 今日完了したもののうち、まだアーカイブへ送っていないもの（v0.5〜）
  const done = doneToday.filter((t) => isDoneInList(t, today))
  const total = items.length + done.length

  function handleAdd(action: AddAction) {
    if (action === 'event') setEditingExam({})
    else if (action === 'memorize') setDay(today)
    else setAdding(action)
  }

  const header = (
    <header className="mb-6 motion-safe:animate-rise">
      <div className="mb-5 flex items-center justify-between gap-2">
        <LayoutSwitch />
        <IconButton label="使い方" onClick={() => nav('guide')} className="text-sm font-bold ring-1 ring-stone-300">
          ?
        </IconButton>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="num text-xs font-medium tracking-[0.18em] text-stone-500">
            {today.slice(0, 4)}年・{weekdayOf(today)}曜日
          </p>
          <h1 className="num mt-1 text-[40px] leading-none font-bold tracking-wide">{formatMonthDay(today)}</h1>
        </div>
        <ProgressRing done={done.length} total={total} />
      </div>
    </header>
  )

  const calendar = <WeekCalendar onSelect={setDay} monthFirst={pc} />
  const nextEvent = <NextEvent onOpenList={() => setEventsOpen(true)} onAdd={() => setEditingExam({})} />

  const checklist = (
    <section>
      <SectionHeader aside={total > 0 && `${done.length} / ${total} 完了`}>今日のチェックリスト</SectionHeader>
      {total === 0 ? (
        <EmptyState>
          今日のタスクはありません。
          <br />
          「リスト」の「今日やる」や、右下の「＋」から追加できます。
        </EmptyState>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(28,27,25,0.04)] ring-1 ring-stone-200/80">
          {items.map((item) => (
            <ChecklistRow key={item.task.id} item={item} onOpen={() => setCompleting(item.task)} onCheck={() => actions.check(item.task)} />
          ))}
          {done.map((task) => (
            <DoneRow key={task.id} task={task} onUncheck={() => actions.uncheck(task)} onArchive={() => actions.archive(task)} />
          ))}
        </ul>
      )}
      {total > 0 && items.length === 0 && <p className="mt-3 text-center text-sm text-stone-500">今日のタスクはすべて完了しました。</p>}
    </section>
  )

  const sheets = (
    <>
      <AddMenu onPick={handleAdd} />
      {day && (
        <DaySheet
          date={day}
          onClose={() => setDay(null)}
          onOpenTask={setCompleting}
          onEditExam={(exam) => {
            setDay(null)
            setEditingExam({ exam })
          }}
          onAddExam={(date) => {
            setDay(null)
            setEditingExam({ date })
          }}
        />
      )}
      {eventsOpen && (
        <EventsSheet
          onClose={() => setEventsOpen(false)}
          onEdit={(exam) => {
            setEventsOpen(false)
            setEditingExam({ exam })
          }}
          onAdd={() => {
            setEventsOpen(false)
            setEditingExam({})
          }}
        />
      )}
      {editingExam && (
        <ExamFormSheet exam={editingExam.exam} defaultDate={editingExam.date} onClose={() => setEditingExam(null)} />
      )}
      {completing && <CompleteSheet task={completing} onClose={() => setCompleting(null)} />}
      {adding === 'first' && <AddFirstLapSheet onClose={() => setAdding(null)} />}
      {adding === 'assignment' && <AddAssignmentSheet onClose={() => setAdding(null)} />}
      {adding === 'redo' && <AddRedoSheet onClose={() => setAdding(null)} />}
    </>
  )

  // PC版：左に今日やること、右に予定とカレンダー
  if (pc) {
    return (
      <>
        {header}
        <div className="grid grid-cols-[minmax(0,1fr)_26rem] items-start gap-8">
          <div className="space-y-8">
            {materials.length === 0 && <StartGuide />}
            <DueTodayAssignments />
            {checklist}
          </div>
          <div className="space-y-5">
            {nextEvent}
            {calendar}
          </div>
        </div>
        {sheets}
      </>
    )
  }

  return (
    <>
      {header}
      <div className="space-y-6">
        {nextEvent}
        {calendar}
        {materials.length === 0 && <StartGuide />}
        <DueTodayAssignments />
        {checklist}
      </div>
      {sheets}
    </>
  )
}
