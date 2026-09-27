import { useData } from '../data/store.tsx'
import { unitKey } from '../domain/lookup.ts'
import type { Unit } from '../domain/types.ts'
import { UnitStatus } from './UnitStatus.tsx'
import { EmptyState } from './ui.tsx'

/**
 * 教材ごとに単元をチェックボックスで選ぶ（1周目・解き直し・試験の範囲で共通）。
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
  /** アーカイブ済みでも表示する教材（編集中の試験の範囲に含まれているものなど） */
  alwaysShowMaterialIds?: string[]
}) {
  const { materials, units } = useData()
  const groups = materials
    .filter((m) => m.kind === 'cycle' && (!m.archived || alwaysShowMaterialIds.includes(m.id)))
    .map((material) => ({ material, units: units.filter((u) => u.materialId === material.id && filter(u)) }))
    .filter((g) => g.units.length > 0)

  if (groups.length === 0) return <EmptyState>{emptyMessage}</EmptyState>

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
      {groups.map(({ material, units: list }) => {
        const keys = list.map((u) => unitKey({ materialId: u.materialId, unitId: u.id }))
        const count = keys.filter((k) => selected.has(k)).length
        const all = count === keys.length
        return (
          <details key={material.id} open className="overflow-hidden rounded-xl ring-1 ring-slate-200">
            <summary className="flex cursor-pointer items-center gap-2 bg-slate-50 px-3 py-2 text-sm font-semibold">
              <span className="min-w-0 flex-1 truncate">{material.name}</span>
              {count > 0 && <span className="text-xs font-medium text-indigo-600">{count}件選択</span>}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  toggle(keys, !all)
                }}
                className="rounded-md px-2 py-0.5 text-xs font-medium text-indigo-600 ring-1 ring-indigo-200 active:bg-indigo-50"
              >
                {all ? 'すべて外す' : 'すべて選ぶ'}
              </button>
            </summary>
            <ul className="divide-y divide-slate-100">
              {list.map((unit) => {
                const key = unitKey({ materialId: unit.materialId, unitId: unit.id })
                return (
                  <li key={unit.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 active:bg-slate-50">
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0 accent-indigo-600"
                        checked={selected.has(key)}
                        onChange={(e) => toggle([key], e.target.checked)}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{unit.name}</span>
                      <UnitStatus unit={unit} />
                    </label>
                  </li>
                )
              })}
            </ul>
          </details>
        )
      })}
    </div>
  )
}
