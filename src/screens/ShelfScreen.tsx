import { useState, type ReactNode } from 'react'
import { reorderMaterials } from '../data/commands.ts'
import { useData } from '../data/store.tsx'
import { useNav } from '../hooks/useNav.ts'
import { isRangeFinished } from '../domain/memorize.ts'
import { groupBySubject, moveSubjectGroup, moveWithin, subjectOf } from '../domain/shelf.ts'
import { MATERIAL_KIND_LABEL, hasUnits, type Material, type MaterialKind } from '../domain/types.ts'
import { Button, Chevron, EmptyState, PlusIcon, ScreenTitle, Segmented } from '../components/ui.tsx'
import { MaterialDetail } from './shelf/MaterialDetail.tsx'
import { MaterialFormSheet } from './shelf/MaterialFormSheet.tsx'

// 「教科別にまとめる」はこの端末だけの好みなので、ブラウザに覚えておく
const BY_SUBJECT_KEY = 'studyplan.shelf.bySubject'

function loadBySubject(): boolean {
  try {
    return localStorage.getItem(BY_SUBJECT_KEY) === '1'
  } catch {
    return false
  }
}

function saveBySubject(on: boolean) {
  try {
    localStorage.setItem(BY_SUBJECT_KEY, on ? '1' : '0')
  } catch {
    // 保存できなくても表示には困らない
  }
}

const EMPTY_TEXT: Record<MaterialKind, string> = {
  cycle: '問題集などの周回系の教材',
  review: '教科書・ノートなどの復習系の教材',
  memorize: '単語帳などの暗記系の教材',
}

/** 矢印（文字の ↑↓ は端末によって色つきで表示されるので、線で描く） */
function ArrowIcon({ up }: { up: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <path d={up ? 'M12 19V5m-6 6 6-6 6 6' : 'M12 5v14m6-6-6 6-6-6'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 並べ替えの ↑↓ ボタン */
function MoveButtons({ onUp, onDown, canUp, canDown, label }: { onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean; label: string }) {
  const cls =
    'flex h-9 w-9 items-center justify-center rounded-lg bg-white text-ink ring-1 ring-stone-300 active:bg-stone-100 disabled:opacity-30'
  return (
    <span className="flex shrink-0 gap-1.5">
      <button type="button" className={cls} disabled={!canUp} onClick={onUp} aria-label={`${label}を上へ`}>
        <ArrowIcon up />
      </button>
      <button type="button" className={cls} disabled={!canDown} onClick={onDown} aria-label={`${label}を下へ`}>
        <ArrowIcon up={false} />
      </button>
    </span>
  )
}

/** 教材のカード（本棚と、アーカイブの「解き終えた教材」で使う）。action はカードの右下に出すボタン（アーカイブの「本棚に戻す」など） */
export function MaterialCard({
  material,
  onOpen,
  move,
  action,
}: {
  material: Material
  onOpen: () => void
  /** 並べ替え中なら ↑↓ を出す */
  move?: { onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean }
  action?: ReactNode
}) {
  const { units, ranges } = useData()
  let summary: string
  let progress = 0
  if (hasUnits(material.kind)) {
    const mine = units.filter((u) => u.materialId === material.id)
    const graduated = mine.filter((u) => u.graduated).length
    summary = `単元${mine.length}・卒業${graduated}`
    progress = mine.length ? graduated / mine.length : 0
  } else {
    // 暗記系（v0.6〜）：範囲ごとの周回数を目標と比べる
    const mine = ranges.filter((r) => r.materialId === material.id)
    const finished = mine.filter((r) => isRangeFinished(r, material)).length
    summary = `範囲${mine.length}・完了${finished}・目標${material.targetLaps}周`
    progress = mine.length
      ? mine.reduce((n, r) => n + Math.min(r.lapCount, material.targetLaps), 0) / (mine.length * material.targetLaps)
      : 0
  }
  const percent = Math.round(progress * 100)

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {material.subject && !move && <p className="mb-0.5 text-[11px] font-medium tracking-wider text-stone-500">{material.subject}</p>}
          <p className="leading-snug font-bold">{material.name}</p>
        </div>
        {!move && <span className="num shrink-0 text-lg leading-none font-bold text-stone-300">{percent}<span className="text-xs">%</span></span>}
      </div>
      <p className="mt-1.5 text-xs text-stone-500">{summary}</p>
      {!move && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-ink transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      )}
    </>
  )

  if (move) {
    return (
      <li className="flex items-center gap-3 rounded-2xl bg-white p-3 pl-4 ring-1 ring-stone-200/80">
        <div className="min-w-0 flex-1">{body}</div>
        <MoveButtons {...move} label={material.name} />
      </li>
    )
  }
  return (
    <li className="flex flex-col rounded-3xl bg-white shadow-[0_1px_2px_rgba(28,27,25,0.04)] ring-1 ring-stone-200/80 transition pc:hover:-translate-y-0.5 pc:hover:shadow-md">
      <button type="button" onClick={onOpen} className="w-full flex-1 rounded-3xl p-5 text-left transition active:scale-[0.99]">
        {body}
      </button>
      {action && <div className="flex justify-end px-4 pb-4">{action}</div>}
    </li>
  )
}

export function ShelfScreen() {
  const { uid, materials } = useData()
  const nav = useNav()
  const [kind, setKind] = useState<MaterialKind>('cycle')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [bySubject, setBySubject] = useState(loadBySubject)
  const [reordering, setReordering] = useState(false)

  const selected = materials.find((m) => m.id === selectedId)
  if (selected) {
    return (
      <div className="pc:max-w-3xl">
        <MaterialDetail material={selected} onBack={() => setSelectedId(null)} />
      </div>
    )
  }

  // materials は並び順（order）で並んでいる
  const list = materials.filter((m) => m.kind === kind)
  const active = list.filter((m) => !m.archived)
  const archived = list.filter((m) => m.archived)
  const groups = bySubject ? groupBySubject(active) : [{ subject: '', materials: active }]

  function moveMaterial(id: string, direction: -1 | 1) {
    const ids = active.map((m) => m.id)
    const byId = new Map(active.map((m) => [m.id, m]))
    const sameSubject = (a: string, b: string) => subjectOf(byId.get(a)!) === subjectOf(byId.get(b)!)
    const next = moveWithin(ids, id, direction, bySubject ? sameSubject : undefined)
    if (next !== ids) reorderMaterials(uid, next)
  }

  function moveGroup(subject: string, direction: -1 | 1) {
    reorderMaterials(uid, moveSubjectGroup(active, subject, direction))
  }

  function toggleBySubject() {
    saveBySubject(!bySubject)
    setBySubject(!bySubject)
  }

  const counts = Object.fromEntries(
    (['cycle', 'review', 'memorize'] as const).map((k) => [k, materials.filter((m) => m.kind === k && !m.archived).length]),
  ) as Record<MaterialKind, number>

  function openArchive() {
    // アーカイブの画面で「解き終えた教材」を開く
    try {
      localStorage.setItem('studyplan.archive.selected', 'materials')
    } catch {
      // 覚えられなくても、アーカイブは開ける
    }
    nav('archive')
  }

  return (
    <>
      <ScreenTitle
        eyebrow={`教材 ${materials.filter((m) => !m.archived).length}冊`}
        action={
          <Button className="flex items-center gap-1.5 px-4 py-2" onClick={() => setAdding(true)}>
            <PlusIcon />
            教材
          </Button>
        }
      >
        本棚
      </ScreenTitle>
      <div className="pc:max-w-md">
        <Segmented
          value={kind}
          onChange={(k) => {
            setKind(k)
            setReordering(false)
          }}
          options={(['cycle', 'review', 'memorize'] as const).map((k) => ({
            value: k,
            label: counts[k] ? `${MATERIAL_KIND_LABEL[k]} ${counts[k]}` : MATERIAL_KIND_LABEL[k],
          }))}
        />
      </div>

      {active.length > 0 && (
        <div className="mt-3 flex items-center justify-between pc:justify-start pc:gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" className="h-4 w-4 accent-ink" checked={bySubject} onChange={toggleBySubject} />
            教科別にまとめる
          </label>
          <button
            type="button"
            onClick={() => setReordering(!reordering)}
            aria-pressed={reordering}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition active:scale-95 ${
              reordering ? 'bg-ink text-white ring-ink' : 'bg-white text-stone-700 ring-stone-300 pc:hover:bg-stone-50'
            }`}
          >
            {reordering ? '並べ替え完了' : '並べ替え'}
          </button>
        </div>
      )}

      <div className="mt-4 space-y-5">
        {active.length === 0 ? (
          <EmptyState>
            {EMPTY_TEXT[kind]}がまだありません。
            <br />
            右上の「＋ 教材」から追加してください。
          </EmptyState>
        ) : (
          groups.map((group, gi) => (
            <section key={group.subject || 'all'}>
              {bySubject && (
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <h2 className="text-[13px] font-bold tracking-[0.12em] text-stone-500">
                    {group.subject} <span className="font-normal text-stone-400">{group.materials.length}</span>
                  </h2>
                  {reordering && groups.length > 1 && (
                    <MoveButtons
                      label={group.subject}
                      canUp={gi > 0}
                      canDown={gi < groups.length - 1}
                      onUp={() => moveGroup(group.subject, -1)}
                      onDown={() => moveGroup(group.subject, 1)}
                    />
                  )}
                </div>
              )}
              <ul className="space-y-3 pc:grid pc:grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] pc:gap-3 pc:space-y-0">
                {group.materials.map((m, i) => (
                  <MaterialCard
                    key={m.id}
                    material={m}
                    onOpen={() => setSelectedId(m.id)}
                    move={
                      reordering
                        ? {
                            canUp: i > 0,
                            canDown: i < group.materials.length - 1,
                            onUp: () => moveMaterial(m.id, -1),
                            onDown: () => moveMaterial(m.id, 1),
                          }
                        : undefined
                    }
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {archived.length > 0 && (
        <button
          type="button"
          onClick={openArchive}
          className="mt-8 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm text-stone-500 ring-1 ring-stone-200/80 transition active:bg-stone-100 pc:hover:bg-white"
        >
          <span>アーカイブした{MATERIAL_KIND_LABEL[kind]}の教材 {archived.length}冊</span>
          <span className="flex items-center gap-1 font-semibold text-stone-700">
            アーカイブで見る
            <Chevron direction="right" />
          </span>
        </button>
      )}

      {adding && <MaterialFormSheet defaultKind={kind} onClose={() => setAdding(false)} onAdded={setSelectedId} />}
    </>
  )
}
