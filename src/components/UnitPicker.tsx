import type { ReactNode } from 'react'
import { useData } from '../data/store.tsx'
import { rangeKey, unitKey } from '../domain/lookup.ts'
import type { Material, Range, Unit } from '../domain/types.ts'
import { UnitStatus } from './UnitStatus.tsx'
import { Badge, EmptyState } from './ui.tsx'

interface PickerItem {
  key: string
  label: string
  status: ReactNode
}

/** 教材ごとにチェックボックスで選ぶ一覧（単元・範囲で共通） */
function GroupedPicker({
  groups,
  selected,
  onChange,
}: {
  groups: { material: Material; items: PickerItem[] }[]
  selected: ReadonlySet<string>
  onChange: (next: Set<string>) => void
}) {
  const toggle = (keys: string[], on: boolean) => {
    const next = new Set(selected)
    for (const key of keys) {
      if (on) next.add(key)
      else next.delete(key)
    }
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {groups.map(({ material, items }) => {
        const keys = items.map((i) => i.key)
        const count = keys.filter((k) => selected.has(k)).length
        const all = count === keys.length
        return (
          <details key={material.id} open className="overflow-hidden rounded-xl bg-white ring-1 ring-stone-200">
            <summary className="flex cursor-pointer items-center gap-2 bg-stone-50 px-3 py-2 text-sm font-semibold">
              <span className="min-w-0 flex-1 truncate">{material.name}</span>
              {count > 0 && <span className="text-xs font-medium text-ink">{count}件選択</span>}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  toggle(keys, !all)
                }}
                className="rounded-md px-2 py-0.5 text-xs font-medium text-stone-700 ring-1 ring-stone-300 active:bg-stone-100"
              >
                {all ? 'すべて外す' : 'すべて選ぶ'}
              </button>
            </summary>
            <ul className="divide-y divide-stone-100">
              {items.map((item) => (
                <li key={item.key}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 active:bg-stone-50">
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 accent-ink"
                      checked={selected.has(item.key)}
                      onChange={(e) => toggle([item.key], e.target.checked)}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                    {item.status}
                  </label>
                </li>
              ))}
            </ul>
          </details>
        )
      })}
    </div>
  )
}

/**
 * 教材ごとに単元をチェックボックスで選ぶ（1周目・解き直し・予定の範囲で共通）。
 * selected は unitKey（materialId/unitId）の集合。
 */
export function UnitPicker({
  selected,
  onChange,
  filter = () => true,
  emptyMessage = '選べる単元がありません。本棚で周回系の教材と単元を登録してください。',
  alwaysShowMaterialIds = [],
}: {
  selected: ReadonlySet<string>
  onChange: (next: Set<string>) => void
  filter?: (unit: Unit) => boolean
  emptyMessage?: string
  /** アーカイブ済みでも表示する教材（編集中の予定の範囲に含まれているものなど） */
  alwaysShowMaterialIds?: string[]
}) {
  const { materials, units } = useData()
  const groups = materials
    .filter((m) => m.kind === 'cycle' && (!m.archived || alwaysShowMaterialIds.includes(m.id)))
    .map((material) => ({
      material,
      items: units
        .filter((u) => u.materialId === material.id && filter(u))
        .map((u) => ({ key: unitKey({ materialId: u.materialId, unitId: u.id }), label: u.name, status: <UnitStatus unit={u} /> })),
    }))
    .filter((g) => g.items.length > 0)

  if (groups.length === 0) return <EmptyState>{emptyMessage}</EmptyState>
  return <GroupedPicker groups={groups} selected={selected} onChange={onChange} />
}

function rangeStatus(range: Range): ReactNode {
  return range.started ? <Badge tone="outline">復習中</Badge> : <Badge>未開始</Badge>
}

/** 教材ごとに暗記の範囲をチェックボックスで選ぶ（予定の範囲）。selected は rangeKey の集合 */
export function RangePicker({
  selected,
  onChange,
  alwaysShowMaterialIds = [],
}: {
  selected: ReadonlySet<string>
  onChange: (next: Set<string>) => void
  alwaysShowMaterialIds?: string[]
}) {
  const { materials, ranges } = useData()
  const groups = materials
    .filter((m) => m.kind === 'memorize' && (!m.archived || alwaysShowMaterialIds.includes(m.id)))
    .map((material) => ({
      material,
      items: ranges
        .filter((r) => r.materialId === material.id)
        .map((r) => ({ key: rangeKey({ materialId: r.materialId, rangeId: r.id }), label: r.label, status: rangeStatus(r) })),
    }))
    .filter((g) => g.items.length > 0)

  if (groups.length === 0) return <EmptyState>暗記系の教材がありません。本棚で単語帳などを登録すると選べます。</EmptyState>
  return <GroupedPicker groups={groups} selected={selected} onChange={onChange} />
}
