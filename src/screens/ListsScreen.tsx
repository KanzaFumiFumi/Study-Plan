import { Fragment, useEffect, useRef, useState } from 'react'
import { useData } from '../data/store.tsx'
import { viewTask } from '../data/taskView.ts'
import { daysBetween, formatShortDate } from '../domain/date.ts'
import { tasksByType } from '../domain/sort.ts'
import { TASK_GROUP, TASK_TYPE_LABEL, type Task, type TaskGroup, type TaskType } from '../domain/types.ts'
import { useNav } from '../hooks/useNav.ts'
import { useToday } from '../hooks/useToday.ts'
import { Badge, ScreenTitle } from '../components/ui.tsx'
import { AddAssignmentSheet, AddFirstLapSheet, AddRedoSheet } from './today/AddTaskSheets.tsx'
import { CompleteSheet } from './today/CompleteSheet.tsx'

// 種類別のリスト（v0.3）。Trello のボードのように、種類ごとのリストを横に並べる。
// 周回系・暗記系・提出物のグループごとにまとめて並べ、見出しにも系統を出す。

const GROUP_LABEL: Record<TaskGroup, string> = {
  assignment: '提出物',
  cycle: '周回系',
  memorize: '暗記系',
}

type AddSheet = 'first' | 'assignment' | 'redo'

interface ListConfig {
  type: TaskType
  description: string
  /** リストの下の入り口：追加のシートを開く／別の画面へ／なし（自動でできるリスト） */
  add?: { label: string; sheet: AddSheet } | { label: string; screen: 'shelf' | 'exams' }
}

const LISTS: ListConfig[] = [
  { type: 'assignment', description: '締切のある提出物', add: { label: '＋ 課題を追加', sheet: 'assignment' } },
  { type: 'first', description: '授業で解いた範囲の最初の1回', add: { label: '＋ 授業の1周目を追加', sheet: 'first' } },
  { type: 'cycle', description: '印の問題だけ解く。完了すると次が自動でできる' },
  { type: 'exam', description: '予定に向けて周回中の単元を仕上げる', add: { label: '予定から作る', screen: 'exams' } },
  { type: 'redo', description: '自分で決めた解き直し', add: { label: '＋ 解き直しを追加', sheet: 'redo' } },
  { type: 'memorize', description: '間隔を広げて復習。完了すると次が自動でできる', add: { label: '本棚で範囲を開始', screen: 'shelf' } },
]

/** リストの中の1枚のカード。タップすると完了のシートが開く */
function Card({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const data = useData()
  const today = useToday()
  const view = viewTask(task, data)
  const overdueDays = daysBetween(task.dueDate, today)
  const isAssignment = task.type === 'assignment'
  // 課題はタイトルを大きく、それ以外は単元名・範囲名を大きく（教材名は上に小さく）
  const label = isAssignment ? view.sub : (view.material?.name ?? '')
  const title = isAssignment ? task.title : (view.unit?.name ?? view.range?.label ?? task.title)

  return (
    <li>
      <button type="button" onClick={onOpen} className="w-full rounded-xl bg-white p-3 text-left shadow-xs ring-1 ring-stone-200 active:bg-stone-50">
        {label && <p className="truncate text-[11px] text-stone-500">{label}</p>}
        <p className="text-sm leading-snug font-medium">{title}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {overdueDays > 0 ? (
            <Badge tone="danger">{overdueDays}日遅れ</Badge>
          ) : overdueDays === 0 ? (
            <Badge tone="ink">今日</Badge>
          ) : (
            <Badge>{formatShortDate(task.dueDate)}</Badge>
          )}
          {view.exams.map((e) => (
            <Badge key={e.id} tone="outline">
              {e.name}
            </Badge>
          ))}
        </div>
      </button>
    </li>
  )
}

export function ListsScreen() {
  const { openTasks, materials } = useData()
  const nav = useNav()
  const [completing, setCompleting] = useState<Task | null>(null)
  const [adding, setAdding] = useState<AddSheet | null>(null)
  const [active, setActive] = useState(0)
  const boardRef = useRef<HTMLDivElement>(null)
  const chipsRef = useRef<HTMLDivElement>(null)

  // 今のリストのボタンが上の列で見えるように、ボタンの列も追従させる
  useEffect(() => {
    const chip = chipsRef.current?.querySelectorAll('button')[active]
    chip?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }, [active])

  const hidden = new Set(materials.filter((m) => m.archived).map((m) => m.id))
  const lists = tasksByType(openTasks, hidden)
  const total = Object.values(lists).reduce((n, list) => n + list.length, 0)

  function jumpTo(index: number) {
    const column = boardRef.current?.children[index] as HTMLElement | undefined
    column?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
    setActive(index)
  }

  // 横にスワイプしたとき、上のボタンのどれが今のリストかを合わせる
  function handleScroll() {
    const board = boardRef.current
    const first = board?.children[0] as HTMLElement | undefined
    if (!board || !first) return
    setActive(Math.min(LISTS.length - 1, Math.round(board.scrollLeft / (first.offsetWidth + 12))))
  }

  return (
    <>
      <ScreenTitle action={<span className="text-sm text-stone-500">未完了 {total}件</span>}>リスト</ScreenTitle>

      {/* リストへ飛ぶボタン（系統ごとに区切る） */}
      <div ref={chipsRef} className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-3">
        {LISTS.map((list, i) => {
          const group = TASK_GROUP[list.type]
          const groupStart = i === 0 || TASK_GROUP[LISTS[i - 1].type] !== group
          return (
            <Fragment key={list.type}>
              {groupStart && (
                <span className={`shrink-0 text-[11px] font-semibold tracking-wider text-stone-400 ${i > 0 ? 'ml-2' : ''}`}>
                  {GROUP_LABEL[group]}
                </span>
              )}
              <button
                type="button"
                onClick={() => jumpTo(i)}
                aria-pressed={active === i}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm ring-1 ${
                  active === i ? 'bg-ink font-semibold text-white ring-ink' : 'bg-white text-stone-700 ring-stone-300'
                }`}
              >
                {TASK_TYPE_LABEL[list.type]} <span className="tabular-nums opacity-70">{lists[list.type].length}</span>
              </button>
            </Fragment>
          )
        })}
      </div>

      {/* ボード：リストを横に並べる */}
      <div
        ref={boardRef}
        onScroll={handleScroll}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 items-start gap-3 overflow-x-auto px-4 pb-4"
      >
        {LISTS.map((list) => {
          const tasks = lists[list.type]
          const group = TASK_GROUP[list.type]
          const add = list.add
          return (
            <section
              key={list.type}
              aria-label={`${TASK_TYPE_LABEL[list.type]}のリスト`}
              className="w-[80vw] max-w-[300px] shrink-0 snap-start rounded-2xl bg-stone-200/70 p-2.5"
            >
              <header className="px-1 pb-2.5">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold tracking-wide">{TASK_TYPE_LABEL[list.type]}</h2>
                  <span className="text-sm tabular-nums text-stone-500">{tasks.length}</span>
                  <span className="ml-auto">
                    <Badge tone={group === 'assignment' ? 'plain' : 'outline'}>{GROUP_LABEL[group]}</Badge>
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">{list.description}</p>
              </header>

              {tasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-xs text-stone-400">なし</p>
              ) : (
                <ul className="space-y-2">
                  {tasks.map((task) => (
                    <Card key={task.id} task={task} onOpen={() => setCompleting(task)} />
                  ))}
                </ul>
              )}

              {add && (
                <button
                  type="button"
                  onClick={() => ('sheet' in add ? setAdding(add.sheet) : nav(add.screen))}
                  className="mt-2 w-full rounded-xl px-2 py-2 text-left text-sm text-stone-600 active:bg-stone-300/60"
                >
                  {add.label}
                  {'screen' in add && ' ›'}
                </button>
              )}
            </section>
          )
        })}
      </div>

      {completing && <CompleteSheet task={completing} onClose={() => setCompleting(null)} />}
      {adding === 'first' && <AddFirstLapSheet onClose={() => setAdding(null)} />}
      {adding === 'assignment' && <AddAssignmentSheet onClose={() => setAdding(null)} />}
      {adding === 'redo' && <AddRedoSheet onClose={() => setAdding(null)} />}
    </>
  )
}
