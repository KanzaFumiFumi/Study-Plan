import { useState } from 'react'
import { deleteExam, newExamId, saveExam } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { isISODate } from '../../domain/date.ts'
import { applyExamDelete, applyExamSave } from '../../domain/exam.ts'
import { unitKey } from '../../domain/lookup.ts'
import type { Exam, UnitRef } from '../../domain/types.ts'
import { useToday } from '../../hooks/useToday.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { useToast } from '../../components/Toast.tsx'
import { UnitPicker } from '../../components/UnitPicker.tsx'
import { Button, Field, inputClass } from '../../components/ui.tsx'

const DEFAULT_CATEGORIES = ['定期考査', '模試', '資格', '共通テスト']

/** 試験の追加（exam なし）と編集（exam あり）。保存すると 4.2 の処理でタスクを作る */
export function ExamFormSheet({ exam, onClose }: { exam?: Exam; onClose: () => void }) {
  const { uid, exams, units, materials, openTasks, settings } = useData()
  const today = useToday()
  const toast = useToast()
  const [name, setName] = useState(exam?.name ?? '')
  const [category, setCategory] = useState(exam?.category ?? '')
  const [date, setDate] = useState(exam?.date ?? '')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(exam?.unitRefs.map(unitKey) ?? []))

  const categories = [...new Set([...DEFAULT_CATEGORIES, ...exams.map((e) => e.category).filter(Boolean)])]
  // 範囲に入っている単元の教材は、アーカイブ済みでも選択欄に出す
  const inRangeMaterialIds = [...new Set(exam?.unitRefs.map((r) => r.materialId) ?? [])]
  const canSave = name.trim() !== '' && isISODate(date)

  function handleSave() {
    // 選択順ではなく本棚の並び順で保存する（存在する単元だけ）
    const unitRefs: UnitRef[] = units
      .filter((u) => selected.has(unitKey({ materialId: u.materialId, unitId: u.id })))
      .map((u) => ({ materialId: u.materialId, unitId: u.id }))
    const saved: Exam = {
      id: exam?.id ?? newExamId(uid),
      name: name.trim(),
      category: category.trim(),
      date,
      unitRefs,
    }
    const { changes, created, merged, detached } = applyExamSave({ exam: saved, units, materials, openTasks, settings, today })
    saveExam(uid, saved, changes)

    if (date < today) {
      toast('保存しました（試験日が過ぎているため、タスクは作りません）')
    } else {
      const parts = [created && `新しいタスク${created}件`, merged && `既存のタスクにまとめた${merged}件`, detached && `範囲から外した${detached}件`]
      toast(`保存しました${parts.some(Boolean) ? `（${parts.filter(Boolean).join('・')}）` : ''}`)
    }
    onClose()
  }

  function handleDelete() {
    if (!exam) return
    if (!window.confirm(`「${exam.name}」を削除しますか？\n作られたタスクは残り、この試験との紐づけだけが外れます。`)) return
    deleteExam(uid, exam.id, applyExamDelete(exam.id, openTasks))
    toast('試験を削除しました')
    onClose()
  }

  return (
    <Sheet
      title={exam ? '試験を編集' : '試験を追加'}
      onClose={onClose}
      footer={
        <Button className="w-full" disabled={!canSave} onClick={handleSave}>
          {selected.size ? `保存（範囲 ${selected.size}単元）` : '保存'}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="試験名">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="例：2学期期末考査" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="種類">
            <input
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="exam-categories"
              placeholder="例：定期考査"
            />
            <datalist id="exam-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="試験日">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">範囲</p>
          <p className="mb-2 text-xs text-slate-500">
            保存すると、範囲の単元に「試験日の{settings.examLeadDays}日前」が期限のタスクを作ります（未着手は1周目、周回中は試験）。
            卒業済みの単元には作りません。ほかの試験と範囲が重なる単元は、タスクを1つにまとめて期限を早い方にします。
          </p>
          <UnitPicker selected={selected} onChange={setSelected} alwaysShowMaterialIds={inRangeMaterialIds} />
        </div>

        {exam && (
          <Button variant="danger" className="w-full" onClick={handleDelete}>
            この試験を削除
          </Button>
        )}
      </div>
    </Sheet>
  )
}
