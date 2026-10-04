import { useState } from 'react'
import { useDoneTasks } from '../data/queries.ts'
import { useData } from '../data/store.tsx'
import { viewTask } from '../data/taskView.ts'
import { formatShortDate, todayJST } from '../domain/date.ts'
import { LIST_DEFS, LIST_GROUPS, LIST_GROUP_LABEL, archivedTasksByList, type ListKey } from '../domain/lists.ts'
import { MATERIAL_KIND_LABEL, type MaterialKind, type Task } from '../domain/types.ts'
import { useIsPc } from '../hooks/useLayout.ts'
import { useToday } from '../hooks/useToday.ts'
import { DoneMark } from '../components/TaskCheck.tsx'
import { TaskBadge } from '../components/TaskBadge.tsx'
import { Badge, EmptyState, ScreenTitle } from '../components/ui.tsx'
import { MaterialCard } from './ShelfScreen.tsx'
import { MaterialDetail } from './shelf/MaterialDetail.tsx'

// アーカイブ（v0.5〜）。完了したタスクをリストごとに、解き終えた教材（本棚でアーカイブしたもの）を見る。
// 完了済みは、完了した日が終わるか「アーカイブへ」を押すと、リストからここに移る。見るだけの画面。

type ArchiveKey = ListKey | 'materials'

const SELECTED_KEY = 'studyplan.archive.selected'
/** 一度に出す件数（「もっと見る」で増やす） */
const PAGE_SIZE = 50
const KINDS: MaterialKind[] = ['cycle', 'review', 'memorize']

function loadSelected(): ArchiveKey {
  try {
    const saved = localStorage.getItem(SELECTED_KEY)
    if (saved === 'materials' || LIST_DEFS.some((d) => d.key === saved)) return saved as ArchiveKey
  } catch {
    // 読めなければ最初のリスト
  }
  return 'assignment'
}

/** 完了したときに入れた数字 */
function resultText(task: Task): string {
  const r = task.result
  if (!r) return ''
  if ('remainingMarks' in r) return r.remainingMarks === 0 ? '印0（卒業）' : `残りの印 ${r.remainingMarks}`
  return `知${r.known}・半知${r.half}・未知${r.unknown}`
}

/** 完了した日（日本時間） */
function completedDate(task: Task): string {
  return task.completedAt === null ? task.dueDate : todayJST(new Date(task.completedAt))
}

function ArchivedRow({ task }: { task: Task }) {
  const data = useData()
  const view = viewTask(task, data)
  const isAssignment = task.type === 'assignment'
  const label = isAssignment ? view.sub : (view.material?.name ?? '')
  const title = isAssignment ? task.title : (view.unit?.name ?? view.range?.label ?? task.title)
  const result = resultText(task)
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <DoneMark done />
      <div className="min-w-0 flex-1">
        {label && <span className="block truncate text-[11px] text-stone-500">{label}</span>}
        <span className="block text-sm leading-snug font-medium">{title}</span>
        {result && <span className="mt-0.5 block text-xs text-stone-500">{result}</span>}
      </div>
      <TaskBadge task={task} unit={view.unit} />
    </li>
  )
}

/** 完了したタスクを、完了した日ごとに（新しい順） */
function ArchivedTasks({ tasks }: { tasks: Task[] }) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  if (tasks.length === 0) return <EmptyState>まだありません。</EmptyState>

  const byDate = new Map<string, Task[]>()
  for (const t of tasks.slice(0, limit)) {
    const date = completedDate(t)
    byDate.set(date, [...(byDate.get(date) ?? []), t])
  }
  return (
    <div className="space-y-4">
      {[...byDate].map(([date, list]) => (
        <div key={date}>
          <p className="mb-1.5 px-1 text-xs font-semibold text-stone-500">{formatShortDate(date)} に完了</p>
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
            {list.map((task) => (
              <ArchivedRow key={task.id} task={task} />
            ))}
          </ul>
        </div>
      ))}
      {tasks.length > limit && (
        <button
          type="button"
          onClick={() => setLimit(limit + PAGE_SIZE)}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-stone-600 ring-1 ring-stone-300 active:bg-stone-100"
        >
          もっと見る（残り {tasks.length - limit}件）
        </button>
      )}
    </div>
  )
}

export function ArchiveScreen() {
  const { uid, units, materials } = useData()
  const today = useToday()
  const pc = useIsPc()
  const done = useDoneTasks(uid)
  const [selected, setSelected] = useState<ArchiveKey>(loadSelected)
  const [openMaterialId, setOpenMaterialId] = useState<string | null>(null)

  const openMaterial = materials.find((m) => m.id === openMaterialId)
  if (openMaterial) {
    return (
      <div className="pc:max-w-3xl">
        <MaterialDetail material={openMaterial} onBack={() => setOpenMaterialId(null)} backLabel="アーカイブ" />
      </div>
    )
  }

  const lists = archivedTasksByList(done ?? [], units, materials, today)
  const total = Object.values(lists).reduce((n, list) => n + list.length, 0)
  const finished = materials.filter((m) => m.archived)
  const def = LIST_DEFS.find((d) => d.key === selected)

  function select(key: ArchiveKey) {
    setSelected(key)
    try {
      localStorage.setItem(SELECTED_KEY, key)
    } catch {
      // 覚えられなくても困らない
    }
  }

  const itemClass = (active: boolean) =>
    `flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
      active ? 'bg-ink font-semibold text-white' : 'text-stone-800 active:bg-stone-100 pc:hover:bg-stone-50'
    }`
  const groupClass =
    'sticky top-0 z-10 border-b border-stone-100 bg-stone-50 px-4 py-1.5 text-[11px] font-semibold tracking-wider text-stone-500'

  // 見るものを選ぶ欄（リストの画面と同じ並び＋解き終えた教材）
  const selector = (
    <nav
      aria-label="アーカイブのリストを選ぶ"
      className="max-h-64 overflow-y-auto rounded-2xl bg-white ring-1 ring-stone-200 pc:sticky pc:top-6 pc:max-h-[calc(100dvh-8rem)]"
    >
      <div>
        <p className={groupClass}>教材</p>
        <button
          type="button"
          onClick={() => select('materials')}
          aria-current={selected === 'materials' ? 'true' : undefined}
          className={itemClass(selected === 'materials')}
        >
          <span>解き終えた教材</span>
          <span className={`tabular-nums text-xs ${selected === 'materials' ? 'text-stone-300' : 'text-stone-400'}`}>
            {finished.length}
          </span>
        </button>
      </div>
      {LIST_GROUPS.map((group) => (
        <div key={group}>
          <p className={groupClass}>{LIST_GROUP_LABEL[group]}</p>
          {LIST_DEFS.filter((d) => d.group === group).map((d) => {
            const active = d.key === selected
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => select(d.key)}
                aria-current={active ? 'true' : undefined}
                className={itemClass(active)}
              >
                <span>{d.label}</span>
                <span className={`tabular-nums text-xs ${active ? 'text-stone-300' : 'text-stone-400'}`}>
                  {done ? lists[d.key].length : ''}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )

  const content =
    selected === 'materials' || !def ? (
      <section aria-label="解き終えた教材">
        <header className="mb-3 px-1">
          <h2 className="font-bold tracking-wide">解き終えた教材</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
            本棚でアーカイブした問題集・単語帳など。タップすると単元・範囲の記録を見られます（本棚に戻すときは「編集」から）。
          </p>
        </header>
        {finished.length === 0 ? (
          <EmptyState>
            まだありません。
            <br />
            解き終えた教材は、本棚の教材の「編集」からアーカイブできます。
          </EmptyState>
        ) : (
          <div className="space-y-5">
            {KINDS.map((kind) => {
              const list = finished.filter((m) => m.kind === kind)
              if (list.length === 0) return null
              return (
                <div key={kind}>
                  <p className="mb-2 px-1 text-sm font-bold tracking-wider text-stone-600">
                    {MATERIAL_KIND_LABEL[kind]} <span className="font-normal text-stone-400">{list.length}</span>
                  </p>
                  <ul className="space-y-3 pc:grid pc:grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] pc:gap-3 pc:space-y-0">
                    {list.map((m) => (
                      <MaterialCard key={m.id} material={m} onOpen={() => setOpenMaterialId(m.id)} />
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>
    ) : (
      <section aria-label={`${LIST_GROUP_LABEL[def.group]}の${def.label}の完了済み`}>
        <header className="mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-bold tracking-wide">{def.label}</h2>
            <span className="text-sm tabular-nums text-stone-500">{done ? lists[def.key].length : ''}</span>
            <span className="ml-auto">
              <Badge tone={def.group === 'assignment' ? 'plain' : 'outline'}>{LIST_GROUP_LABEL[def.group]}</Badge>
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
            完了したタスク（前の日までに完了したものと、「アーカイブへ」を押したもの）
          </p>
        </header>
        {done ? (
          <ArchivedTasks key={def.key} tasks={lists[def.key]} />
        ) : (
          <p className="py-10 text-center text-sm text-stone-400">読み込み中…</p>
        )}
      </section>
    )

  return (
    <>
      <ScreenTitle action={<span className="text-sm text-stone-500">{done ? `完了 ${total}件` : ''}</span>}>アーカイブ</ScreenTitle>
      {pc ? (
        // PC版：左に選ぶ欄、右に中身
        <div className="grid grid-cols-[16rem_minmax(0,1fr)] items-start gap-6">
          {selector}
          {content}
        </div>
      ) : (
        <>
          {selector}
          <div className="mt-4">{content}</div>
        </>
      )}
    </>
  )
}
