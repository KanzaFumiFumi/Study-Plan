import { useState } from 'react'
import { useData } from '../data/store.tsx'
import type { Material, MaterialKind } from '../domain/types.ts'
import { Badge, Button, EmptyState, ScreenTitle, Segmented } from '../components/ui.tsx'
import { MaterialDetail } from './shelf/MaterialDetail.tsx'
import { MaterialFormSheet } from './shelf/MaterialFormSheet.tsx'

function MaterialCard({ material, onOpen }: { material: Material; onOpen: () => void }) {
  const { units, ranges } = useData()
  let summary: string
  let progress = 0
  if (material.kind === 'cycle') {
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

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 active:bg-slate-50"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">{material.name}</p>
          {material.subject && <Badge>{material.subject}</Badge>}
        </div>
        <p className="mt-1 text-xs text-slate-500">{summary}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${material.kind === 'cycle' ? 'bg-green-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </button>
    </li>
  )
}

export function ShelfScreen() {
  const { materials } = useData()
  const [kind, setKind] = useState<MaterialKind>('cycle')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const selected = materials.find((m) => m.id === selectedId)
  if (selected) return <MaterialDetail material={selected} onBack={() => setSelectedId(null)} />

  const list = materials.filter((m) => m.kind === kind)
  const active = list.filter((m) => !m.archived)
  const archived = list.filter((m) => m.archived)

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
        onChange={setKind}
        options={[
          { value: 'cycle', label: '周回系' },
          { value: 'memorize', label: '暗記系' },
        ]}
      />

      <div className="mt-4">
        {active.length === 0 ? (
          <EmptyState>
            {kind === 'cycle' ? '問題集などの周回系の教材' : '単語帳などの暗記系の教材'}がまだありません。
            <br />
            右上の「＋ 教材」から追加してください。
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {active.map((m) => (
              <MaterialCard key={m.id} material={m} onOpen={() => setSelectedId(m.id)} />
            ))}
          </ul>
        )}
      </div>

      {archived.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-slate-500">アーカイブ済み（{archived.length}）</summary>
          <ul className="mt-3 space-y-3 opacity-70">
            {archived.map((m) => (
              <MaterialCard key={m.id} material={m} onOpen={() => setSelectedId(m.id)} />
            ))}
          </ul>
        </details>
      )}

      {adding && <MaterialFormSheet defaultKind={kind} onClose={() => setAdding(false)} />}
    </>
  )
}
