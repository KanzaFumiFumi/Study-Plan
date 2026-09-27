import { useState } from 'react'
import { deleteExam, newExamId, saveExam } from '../../data/commands.ts'
import { useData } from '../../data/store.tsx'
import { formatShortDate, isISODate } from '../../domain/date.ts'
import { applyExamDelete, applyExamSave, examDueDate } from '../../domain/exam.ts'
import { rangeKey, unitKey } from '../../domain/lookup.ts'
import type { Exam, RangeRef, UnitRef } from '../../domain/types.ts'
import { useToday } from '../../hooks/useToday.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { useToast } from '../../components/Toast.tsx'
import { RangePicker, UnitPicker } from '../../components/UnitPicker.tsx'
import { Button, ChoiceChips, Field, inputClass } from '../../components/ui.tsx'
import { EVENT_CATEGORIES, namePlaceholder } from './categories.ts'

const LEAD_DAY_OPTIONS = [0, 1, 3, 7, 14]

function leadLabel(days: number): string {
  if (days === 0) return '当日'
  if (days % 7 === 0) return `${days / 7}週間前`
  return `${days}日前`
}

/** 予定（試験・大会・旅行・趣味など）の追加（exam なし）と編集（exam あり）。保存すると 4.2 の処理でタスクを作る */
export function ExamFormSheet({ exam, onClose }: { exam?: Exam; onClose: () => void }) {
  const { uid, exams, units, ranges, materials, openTasks, settings } = useData()
  const today = useToday()
  const toast = useToast()
  const [category, setCategory] = useState(exam?.category ?? EVENT_CATEGORIES[0])
  const [name, setName] = useState(exam?.name ?? '')
  const [date, setDate] = useState(exam?.date ?? '')
  const [leadDays, setLeadDays] = useState(exam?.leadDays ?? settings.examLeadDays)
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(() => new Set(exam?.unitRefs.map(unitKey) ?? []))
  const [selectedRanges, setSelectedRanges] = useState<Set<string>>(() => new Set(exam?.rangeRefs.map(rangeKey) ?? []))

  // v0.1 で自由入力した種類も選べるように残す
  const categories = [...new Set([...EVENT_CATEGORIES, ...exams.map((e) => e.category).filter(Boolean)])]
  const leadOptions = [...new Set([...LEAD_DAY_OPTIONS, settings.examLeadDays, leadDays])].sort((a, b) => a - b)
  // 範囲に入っている教材は、アーカイブ済みでも選択欄に出す
  const inRangeMaterialIds = [
    ...new Set([...(exam?.unitRefs ?? []), ...(exam?.rangeRefs ?? [])].map((r) => r.materialId)),
  ]
  const hasMemorize = materials.some((m) => m.kind === 'memorize')
  const rangeCount = selectedUnits.size + selectedRanges.size
  const finalName = name.trim() || category
  const canSave = finalName !== '' && isISODate(date)
  const due = isISODate(date) ? examDueDate(date, leadDays, today) : null

  function handleSave() {
    // 選択順ではなく本棚の並び順で保存する（存在する単元・範囲だけ）
    const unitRefs: UnitRef[] = units
      .filter((u) => selectedUnits.has(unitKey({ materialId: u.materialId, unitId: u.id })))
      .map((u) => ({ materialId: u.materialId, unitId: u.id }))
    const rangeRefs: RangeRef[] = ranges
      .filter((r) => selectedRanges.has(rangeKey({ materialId: r.materialId, rangeId: r.id })))
      .map((r) => ({ materialId: r.materialId, rangeId: r.id }))
    const saved: Exam = {
      id: exam?.id ?? newExamId(uid),
      name: finalName,
      category,
      date,
      unitRefs,
      rangeRefs,
      leadDays,
    }
    const { changes, created, merged, detached } = applyExamSave({
      exam: saved,
      units,
      ranges,
      materials,
      openTasks,
      settings,
      today,
    })
    saveExam(uid, saved, changes)

    if (date < today) {
      toast('保存しました（日付が過ぎているため、タスクは作りません）')
    } else {
      const parts = [
        created && `新しいタスク${created}件`,
        merged && `既存のタスクにまとめた${merged}件`,
        detached && `範囲から外した${detached}件`,
      ].filter(Boolean)
      toast(`保存しました${parts.length ? `（${parts.join('・')}）` : ''}`)
    }
    onClose()
  }

  function handleDelete() {
    if (!exam) return
    if (!window.confirm(`「${exam.name}」を削除しますか？\n作られたタスクは残り、この予定との紐づけだけが外れます。`)) return
    deleteExam(uid, exam.id, applyExamDelete(exam.id, openTasks))
    toast('予定を削除しました')
    onClose()
  }

  return (
    <Sheet
      title={exam ? '予定を編集' : '予定を追加'}
      onClose={onClose}
      footer={
        <Button className="w-full" disabled={!canSave} onClick={handleSave}>
          {rangeCount ? `保存（範囲 ${rangeCount}件）` : '保存'}
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">種類</p>
          <ChoiceChips value={category} onChange={setCategory} options={categories.map((c) => ({ value: c, label: c }))} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="名前（空欄なら種類名）">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={namePlaceholder(category)}
            />
          </Field>
          <Field label="日付">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">何日前までに仕上げる？</p>
          <ChoiceChips
            value={leadDays}
            onChange={setLeadDays}
            options={leadOptions.map((d) => ({ value: d, label: leadLabel(d) }))}
          />
          {due && rangeCount > 0 && (
            <p className="mt-2 text-xs text-stone-500">範囲の単元のタスクは {formatShortDate(due)} が期限になります。</p>
          )}
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-stone-700">範囲：問題集の単元</p>
          <p className="mb-2 text-xs text-stone-500">
            まだ卒業していない単元に「仕上げ」タスクを作ります（未着手なら1周目）。ほかの予定と重なる単元は1つにまとめます。
          </p>
          <UnitPicker selected={selectedUnits} onChange={setSelectedUnits} alwaysShowMaterialIds={inRangeMaterialIds} />
        </div>

        {hasMemorize && (
          <div>
            <p className="mb-1 text-sm font-medium text-stone-700">範囲：暗記</p>
            <p className="mb-2 text-xs text-stone-500">未開始の範囲は、今日から復習が始まります。</p>
            <RangePicker selected={selectedRanges} onChange={setSelectedRanges} alwaysShowMaterialIds={inRangeMaterialIds} />
          </div>
        )}

        {exam && (
          <Button variant="danger" className="w-full" onClick={handleDelete}>
            この予定を削除
          </Button>
        )}
      </div>
    </Sheet>
  )
}
