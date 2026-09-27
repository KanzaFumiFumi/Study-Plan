import { useState } from 'react'
import { deleteRange, deleteUnit, renameRange, renameUnit } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { deleteRangeChanges, deleteUnitChanges } from '../../domain/units.ts'
import type { Range, Unit } from '../../domain/types.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { useToast } from '../../components/Toast.tsx'
import { Button, Field, inputClass } from '../../components/ui.tsx'

/** 単元・範囲の名前の変更と削除 */
export function ItemEditSheet({
  item,
  onClose,
}: {
  item: { kind: 'unit'; unit: Unit } | { kind: 'range'; range: Range }
  onClose: () => void
}) {
  const { uid, openTasks, exams } = useData()
  const toast = useToast()
  const original = item.kind === 'unit' ? item.unit.name : item.range.label
  const [name, setName] = useState(original)
  const label = item.kind === 'unit' ? '単元' : '範囲'

  function handleSave() {
    const trimmed = name.trim()
    if (item.kind === 'unit') renameUnit(uid, item.unit.materialId, item.unit.id, trimmed)
    else renameRange(uid, item.range.materialId, item.range.id, trimmed)
    toast('保存しました')
    onClose()
  }

  function handleDelete() {
    if (!window.confirm(`「${original}」を削除しますか？\n未完了のタスクも削除され、予定の範囲からも外れます。`)) return
    if (item.kind === 'unit') {
      deleteUnit(uid, item.unit.materialId, item.unit.id, deleteUnitChanges(item.unit, openTasks, exams))
    } else {
      deleteRange(uid, item.range.materialId, item.range.id, deleteRangeChanges(item.range, openTasks, exams))
    }
    toast(`${label}を削除しました`)
    onClose()
  }

  return (
    <Sheet
      title={`${label}を編集`}
      onClose={onClose}
      footer={
        <Button className="w-full" disabled={!name.trim() || name.trim() === original} onClick={handleSave}>
          保存
        </Button>
      }
    >
      <div className="space-y-6">
        <Field label={`${label}名`}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Button variant="danger" className="w-full" onClick={handleDelete}>
          この{label}を削除
        </Button>
      </div>
    </Sheet>
  )
}
