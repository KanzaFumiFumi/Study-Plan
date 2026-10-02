import { useState } from 'react'
import { reorderMaterials } from '../data/commands.ts'
import { useData } from '../data/store.tsx'
import { groupBySubject, moveSubjectGroup, moveWithin, subjectOf } from '../domain/shelf.ts'
import { MATERIAL_KIND_LABEL, hasUnits, type Material, type MaterialKind } from '../domain/types.ts'
import { Badge, Button, EmptyState, ScreenTitle, Segmented } from '../components/ui.tsx'
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

function MaterialCard({
  material,
  onOpen,
  move,
}: {
  material: Material
  onOpen: () => void
  /** 並べ替え中なら ↑↓ を出す */
  move?: { onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean }
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
    const mine = ranges.filter((r) => r.materialId === material.id)
    const started = mine.filter((r) => r.started).length
    summary = `範囲${mine.length}・開始済み${started}`
    progress = mine.length ? started / mine.length : 0
  }

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{material.name}</p>
        {material.subject && !move && <Badge>{material.subject}</Badge>}
      </div>
      <p className="mt-1 text-xs text-stone-500">{summary}</p>
      {!move && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-ink" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </>
  )

  if (move) {
    return (
      <li className="flex items-center gap-3 rounded-2xl bg-white p-3 pl-4 ring-1 ring-stone-200">
        <div className="min-w-0 flex-1">{body}</div>
        <MoveButtons {...move} label={material.name} />
      </li>
    )
  }
  return (
    <li>
      <button type="button" onClick={onOpen} className="w-full rounded-2xl bg-white p-4 text-left ring-1 ring-stone-200 active:bg-stone-50">
        {body}
      </button>
    </li>
  )
}

export function ShelfScreen() {
  const { uid, materials } = useData()
  const [kind, setKind] = useState<MaterialKind>('cycle')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [bySubject, setBySubject] = useState(loadBySubject)
  const [reordering, setReordering] = useState(false)

  const selected = materials.find((m) => m.id === selectedId)
  if (selected) return <MaterialDetail material={selected} onBack={() => setSelectedId(null)} />

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

  return (
    <>
      <ScreenTitle
        action={
          <Button className="px-3 py-1.5" onClick={() => setAdding(true)}>
            ＋ 教材
          </Button>
        }
      >
        本棚
      </ScreenTitle>
      <Segmented
        value={kind}
        onChange={(k) => {
          setKind(k)
          setReordering(false)
        }}
        options={(['cycle', 'review', 'memorize'] as const).map((k) => ({ value: k, label: MATERIAL_KIND_LABEL[k] }))}
      />

      {active.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" className="h-4 w-4 accent-ink" checked={bySubject} onChange={toggleBySubject} />
            教科別にまとめる
          </label>
          <button
            type="button"
            onClick={() => setReordering(!reordering)}
            aria-pressed={reordering}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ${
              reordering ? 'bg-ink text-white ring-ink' : 'bg-white text-stone-700 ring-stone-300'
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
                  <h2 className="text-sm font-bold tracking-wider text-stone-600">
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
              <ul className="space-y-3">
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
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-stone-500">アーカイブ済み（{archived.length}）</summary>
          <ul className="mt-3 space-y-3 opacity-70">
            {archived.map((m) => (
              <MaterialCard key={m.id} material={m} onOpen={() => setSelectedId(m.id)} />
            ))}
          </ul>
        </details>
      )}

      {adding && <MaterialFormSheet defaultKind={kind} onClose={() => setAdding(false)} onAdded={setSelectedId} />}
    </>
  )
}
