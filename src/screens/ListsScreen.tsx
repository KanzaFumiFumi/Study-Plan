import { useState } from 'react'
import { saveChangeSet } from '../data/commands.ts'
import { useData } from '../data/store.tsx'
import { viewTask, type TaskView } from '../data/taskView.ts'
import { daysBetween, formatShortDate } from '../domain/date.ts'
import { LIST_DEFS, LIST_GROUPS, LIST_GROUP_LABEL, doneTasksByList, tasksByList, type ListKey } from '../domain/lists.ts'
import { setPlannedForToday } from '../domain/manual.ts'
import type { Task } from '../domain/types.ts'
import { useIsPc } from '../hooks/useLayout.ts'
import { useNav } from '../hooks/useNav.ts'
import { useToday } from '../hooks/useToday.ts'
import { ArchiveButton, CheckBox, useTaskActions } from '../components/TaskCheck.tsx'
import { useToast } from '../components/Toast.tsx'
import { Badge, ScreenTitle } from '../components/ui.tsx'
import { AddAssignmentSheet, AddFirstLapSheet, AddRedoSheet } from './today/AddTaskSheets.tsx'
import { CompleteSheet } from './today/CompleteSheet.tsx'

// リスト（v0.3〜）。Trello のリストのように、種類ごとにタスクのカードを並べる。
// v0.4：上の欄でリストを縦に並べて選び、選んだリストを下に出す。周回系・復習系は「何周目か」のリスト。
// v0.5：四角で完了・チェックを外す。完了したものは今日のうちはチェック済みで残り、「アーカイブへ」か次の日にアーカイブへ。

type AddSheet = 'first' | 'assignment' | 'redo'
type ListAction = { label: string; sheet: AddSheet } | { label: string; screen: 'shelf' | 'exams' }

/** リストの説明と、リストの下に出す入り口（追加のシート／別の画面へ） */
function listInfo(key: ListKey): { description: string; actions: ListAction[] } {
  if (key === 'assignment') return { description: '締切のある提出物', actions: [{ label: '＋ 課題を追加', sheet: 'assignment' }] }
  if (key === 'memorize') {
    return {
      description: '間隔を広げて復習。完了すると次が自動でできる',
      actions: [
        { label: '予定のカレンダーで日付を割り当てる', screen: 'exams' },
        { label: '本棚で範囲を開始', screen: 'shelf' },
      ],
    }
  }
  const bucket = key.split('-')[1]
  if (bucket === 'lap1') return { description: '授業・課題で解く最初の1回', actions: [{ label: '＋ 授業の一周目を追加', sheet: 'first' }] }
  if (bucket === 'redo') return { description: '自分で決めた解き直し', actions: [{ label: '＋ 解き直しを追加', sheet: 'redo' }] }
  if (bucket === 'lap4plus') return { description: '印がなくなるまでくり返す。完了すると次が自動でできる', actions: [] }
  return { description: '印の問題だけ解く。前の周を完了すると自動でできる', actions: [] }
}

const SELECTED_KEY = 'studyplan.lists.selected'

function loadSelected(): ListKey {
  try {
    const saved = localStorage.getItem(SELECTED_KEY)
    if (saved && LIST_DEFS.some((d) => d.key === saved)) return saved as ListKey
  } catch {
    // 読めなければ最初のリスト
  }
  return 'assignment'
}

function saveSelected(key: ListKey) {
  try {
    localStorage.setItem(SELECTED_KEY, key)
  } catch {
    // 覚えられなくても困らない
  }
}

/** カードの文字：課題はタイトルを大きく、それ以外は単元名・範囲名を大きく（教材名は上に小さく） */
function cardText(task: Task, view: TaskView): { label: string; title: string } {
  if (task.type === 'assignment') return { label: view.sub, title: task.title }
  return { label: view.material?.name ?? '', title: view.unit?.name ?? view.range?.label ?? task.title }
}

/**
 * リストの中の1枚のカード。四角で完了（v0.5〜）、タップで完了シート。
 * 期限が先のものは「今日やる」で今日のチェックリストに入れられる
 */
function Card({ task, onOpen, onCheck }: { task: Task; onOpen: () => void; onCheck: () => void }) {
  const data = useData()
  const today = useToday()
  const toast = useToast()
  const view = viewTask(task, data)
  const overdueDays = daysBetween(task.dueDate, today)
  const { label, title } = cardText(task, view)
  const canPlan = task.dueDate > today
  const planned = task.plannedFor === today

  function togglePlanned() {
    saveChangeSet(data.uid, setPlannedForToday(task, today, !planned))
    toast(planned ? '今日やるを外しました' : '今日のチェックリストに入れました')
  }

  return (
    <li className="flex rounded-xl bg-white shadow-xs ring-1 ring-stone-200">
      <button
        type="button"
        onClick={onCheck}
        aria-label={`「${view.heading}」を完了する`}
        className="self-start py-3 pr-1 pl-3 active:opacity-60"
      >
        <CheckBox checked={false} />
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="w-full rounded-tr-xl px-2 pt-3 pb-2 text-left active:bg-stone-50">
          {label && <span className="block truncate text-[11px] text-stone-500">{label}</span>}
          <span className="block text-sm leading-snug font-medium">{title}</span>
        </button>
        <div className="flex flex-wrap items-center gap-1 px-2 pr-3 pb-3">
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
          {canPlan && (
            <button
              type="button"
              onClick={togglePlanned}
              aria-pressed={planned}
              className={`ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                planned ? 'bg-ink text-white ring-ink' : 'bg-white text-stone-700 ring-stone-300 active:bg-stone-100'
              }`}
            >
              {planned ? '✓ 今日やる' : '今日やる'}
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

/** 完了済みのカード（v0.5〜）。四角を押すとチェックを外せる。「アーカイブへ」でリストから消す */
function DoneCard({ task, onUncheck, onArchive }: { task: Task; onUncheck: () => void; onArchive: () => void }) {
  const data = useData()
  const view = viewTask(task, data)
  const { label, title } = cardText(task, view)
  return (
    <li className="flex items-center gap-2 rounded-xl bg-white/70 pr-3 ring-1 ring-stone-200">
      <button
        type="button"
        onClick={onUncheck}
        aria-label={`「${view.heading}」のチェックを外す`}
        className="py-3 pr-1 pl-3 active:opacity-60"
      >
        <CheckBox checked />
      </button>
      <div className="min-w-0 flex-1 py-2.5 pl-1">
        {label && <span className="block truncate text-[11px] text-stone-400">{label}</span>}
        <span className="block text-sm leading-snug text-stone-400 line-through">{title}</span>
      </div>
      <ArchiveButton onClick={onArchive} />
    </li>
  )
}

export function ListsScreen() {
  const { openTasks, doneToday, units, materials } = useData()
  const today = useToday()
  const nav = useNav()
  const pc = useIsPc()
  const [selected, setSelected] = useState<ListKey>(loadSelected)
  const [completing, setCompleting] = useState<Task | null>(null)
  const [adding, setAdding] = useState<AddSheet | null>(null)
  const actions = useTaskActions(setCompleting)

  const hidden = new Set(materials.filter((m) => m.archived).map((m) => m.id))
  const lists = tasksByList(openTasks, units, materials, hidden)
  // 今日完了して、まだアーカイブへ送っていないもの（v0.5〜。チェック済みで残す）
  const doneLists = doneTasksByList(doneToday, units, materials, today, hidden)
  const total = Object.values(lists).reduce((n, list) => n + list.length, 0)
  const def = LIST_DEFS.find((d) => d.key === selected) ?? LIST_DEFS[0]
  const tasks = lists[def.key]
  const done = doneLists[def.key]
  const info = listInfo(def.key)

  function select(key: ListKey) {
    setSelected(key)
    saveSelected(key)
  }

  // リストを選ぶ欄。系統ごとに見出しで区切る（スマホ版は上で縦にスクロール、PC版は左の列）
  const selector = (
    <nav
      aria-label="リストを選ぶ"
      className="max-h-64 overflow-y-auto rounded-2xl bg-white ring-1 ring-stone-200 pc:sticky pc:top-6 pc:max-h-[calc(100dvh-8rem)]"
    >
      {LIST_GROUPS.map((group) => (
        <div key={group}>
          <p className="sticky top-0 z-10 border-b border-stone-100 bg-stone-50 px-4 py-1.5 text-[11px] font-semibold tracking-wider text-stone-500">
            {LIST_GROUP_LABEL[group]}
          </p>
          {LIST_DEFS.filter((d) => d.group === group).map((d) => {
            const active = d.key === def.key
            const doneCount = doneLists[d.key].length
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => select(d.key)}
                aria-current={active ? 'true' : undefined}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                  active ? 'bg-ink font-semibold text-white' : 'text-stone-800 active:bg-stone-100 pc:hover:bg-stone-50'
                }`}
              >
                <span>{d.label}</span>
                <span className={`tabular-nums text-xs ${active ? 'text-stone-300' : 'text-stone-400'}`}>
                  {lists[d.key].length}
                  {doneCount > 0 && <span className="ml-1.5">✓{doneCount}</span>}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )

  const list = (
    <section aria-label={`${LIST_GROUP_LABEL[def.group]}の${def.label}のリスト`} className="rounded-2xl bg-stone-200/70 p-2.5">
      <header className="px-1 pb-2.5">
        <div className="flex items-center gap-2">
          <h2 className="font-bold tracking-wide">{def.label}</h2>
          <span className="text-sm tabular-nums text-stone-500">{tasks.length}</span>
          <span className="ml-auto">
            <Badge tone={def.group === 'assignment' ? 'plain' : 'outline'}>{LIST_GROUP_LABEL[def.group]}</Badge>
          </span>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">{info.description}</p>
      </header>

      {tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-xs text-stone-400">
          {done.length > 0 ? '未完了はありません' : 'なし'}
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id} task={task} onOpen={() => setCompleting(task)} onCheck={() => actions.check(task)} />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <>
          <p className="mt-3 mb-1.5 px-1 text-[11px] leading-relaxed text-stone-500">
            <span className="font-semibold">完了済み {done.length}</span>
            ：今日のうちはチェックを外せます。明日になるか「アーカイブへ」でアーカイブに移ります
          </p>
          <ul className="space-y-2">
            {done.map((task) => (
              <DoneCard key={task.id} task={task} onUncheck={() => actions.uncheck(task)} onArchive={() => actions.archive(task)} />
            ))}
          </ul>
        </>
      )}

      {info.actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => ('sheet' in action ? setAdding(action.sheet) : nav(action.screen))}
          className="mt-2 block w-full rounded-xl px-2 py-2 text-left text-sm text-stone-600 active:bg-stone-300/60"
        >
          {action.label}
          {'screen' in action && ' ›'}
        </button>
      ))}
    </section>
  )

  return (
    <>
      <ScreenTitle action={<span className="text-sm text-stone-500">未完了 {total}件</span>}>リスト</ScreenTitle>

      {pc ? (
        // PC版（v0.5〜）：左にリストを選ぶ欄、右に選んだリスト
        <div className="grid grid-cols-[16rem_minmax(0,1fr)] items-start gap-6">
          {selector}
          {list}
        </div>
      ) : (
        <>
          {selector}
          <div className="mt-4">{list}</div>
        </>
      )}

      {completing && <CompleteSheet task={completing} onClose={() => setCompleting(null)} />}
      {adding === 'first' && <AddFirstLapSheet onClose={() => setAdding(null)} />}
      {adding === 'assignment' && <AddAssignmentSheet onClose={() => setAdding(null)} />}
      {adding === 'redo' && <AddRedoSheet onClose={() => setAdding(null)} />}
    </>
  )
}
