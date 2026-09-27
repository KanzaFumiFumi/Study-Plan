import { useState } from 'react'
import { saveChangeSet } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { isISODate } from '../../domain/date.ts'
import { unitKey } from '../../domain/lookup.ts'
import { addAssignment, addFirstLaps, addRedos, type ManualResult, type UnitTarget } from '../../domain/manual.ts'
import { useToday } from '../../hooks/useToday.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { useToast } from '../../components/Toast.tsx'
import { UnitPicker } from '../../components/UnitPicker.tsx'
import { Button, Field, inputClass } from '../../components/ui.tsx'

/** 選んだ unitKey から単元と教材を引く */
function useTargets(selected: ReadonlySet<string>): UnitTarget[] {
  const { materials, units } = useData()
  return units
    .filter((u) => selected.has(unitKey({ materialId: u.materialId, unitId: u.id })))
    .map((unit) => ({ unit, material: materials.find((m) => m.id === unit.materialId)! }))
    .filter((t) => t.material)
}

function resultMessage(label: string, { created, merged }: ManualResult): string {
  const parts = []
  if (created) parts.push(`${label}を${created}件追加しました`)
  if (merged) parts.push(`${merged}件は既存のタスクにまとめました`)
  return parts.join('。') || '変更はありません'
}

/** 4.3 授業の1周目：今日の範囲の単元を選ぶ */
export function AddFirstLapSheet({ onClose }: { onClose: () => void }) {
  const { uid, openTasks } = useData()
  const today = useToday()
  const toast = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const targets = useTargets(selected)

  function handleAdd() {
    const result = addFirstLaps({ targets, openTasks, today })
    saveChangeSet(uid, result.changes)
    toast(resultMessage('1周目', result))
    onClose()
  }

  return (
    <Sheet
      title="授業の1周目を追加"
      onClose={onClose}
      footer={
        <Button className="w-full" disabled={targets.length === 0} onClick={handleAdd}>
          {targets.length ? `${targets.length}件を今日のタスクに追加` : '単元を選んでください'}
        </Button>
      }
    >
      <p className="mb-3 text-sm text-stone-600">授業・課題で今日解いた範囲の単元を選んでください（未着手の単元だけを表示）。</p>
      <UnitPicker
        selected={selected}
        onChange={setSelected}
        filter={(u) => u.lapCount === 0}
        emptyMessage="未着手の単元がありません。本棚で単元を登録してください。"
      />
    </Sheet>
  )
}

/** 4.4 解き直し：単元と期限を選ぶ（卒業済みも選べる） */
export function AddRedoSheet({ onClose }: { onClose: () => void }) {
  const { uid, openTasks } = useData()
  const today = useToday()
  const toast = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState(today)
  const targets = useTargets(selected)

  function handleAdd() {
    const result = addRedos({ targets, openTasks, dueDate })
    saveChangeSet(uid, result.changes)
    toast(resultMessage('解き直し', result))
    onClose()
  }

  return (
    <Sheet
      title="解き直しを追加"
      onClose={onClose}
      footer={
        <Button className="w-full" disabled={targets.length === 0 || !isISODate(dueDate)} onClick={handleAdd}>
          {targets.length ? `${targets.length}件を追加` : '単元を選んでください'}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="期限">
          <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <UnitPicker selected={selected} onChange={setSelected} />
      </div>
    </Sheet>
  )
}

/** 4.5 学校課題：タイトル・締切・（任意で）単元1つ */
export function AddAssignmentSheet({ onClose }: { onClose: () => void }) {
  const { uid, materials, units, openTasks } = useData()
  const today = useToday()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(today)
  const [materialId, setMaterialId] = useState('')
  const [unitId, setUnitId] = useState('')

  const cycleMaterials = materials.filter((m) => m.kind === 'cycle' && !m.archived)
  const material = cycleMaterials.find((m) => m.id === materialId)
  const materialUnits = units.filter((u) => u.materialId === materialId)
  const unit = materialUnits.find((u) => u.id === unitId)

  function handleAdd() {
    const result = addAssignment({
      title: title.trim(),
      dueDate,
      target: unit && material ? { unit, material } : null,
      openTasks,
    })
    saveChangeSet(uid, result.changes)
    toast(result.merged ? 'この単元のタスクを学校課題に切り替えました' : '学校課題を追加しました')
    onClose()
  }

  return (
    <Sheet
      title="学校課題を追加"
      onClose={onClose}
      footer={
        <Button className="w-full" disabled={!title.trim() || !isISODate(dueDate) || (!!materialId && !unit)} onClick={handleAdd}>
          追加
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="タイトル">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：数学 課題プリント p.20-25" />
        </Field>
        <Field label="締切">
          <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="紐づける単元（任意）" hint="単元に紐づけると、完了したときにその単元の周回として記録されます（最初なら1周目）。">
          <div className="space-y-2">
            <select
              className={inputClass}
              value={materialId}
              onChange={(e) => {
                setMaterialId(e.target.value)
                setUnitId('')
              }}
            >
              <option value="">紐づけない</option>
              {cycleMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {material && (
              <select className={inputClass} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">単元を選んでください</option>
                {materialUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.graduated ? '（卒業）' : u.lapCount > 0 ? `（${u.lapCount}周）` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </Field>
      </div>
    </Sheet>
  )
}
