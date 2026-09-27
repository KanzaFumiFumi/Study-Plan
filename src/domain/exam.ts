import { emptyChangeSet, type ChangeSet } from './changeset.ts'
import { addDays, daysBetween, maxDate, minDate } from './date.ts'
import { openTaskForUnit, unitKey, unitTaskTitle } from './lookup.ts'
import type { Exam, ISODate, Material, Settings, Task, Unit } from './types.ts'

/**
 * 試験に向けたタスクの期限：試験日 - examLeadDays。
 * それが今日より前なら今日にする。試験日がすでに過ぎていれば null（タスクを作らない）。
 */
export function examDueDate(examDate: ISODate, settings: Settings, today: ISODate): ISODate | null {
  if (examDate < today) return null
  return maxDate(addDays(examDate, -settings.examLeadDays), today)
}

export interface ExamSaveInput {
  /** 保存する試験（新規なら採番済みのIDを入れておく） */
  exam: Exam
  units: Unit[]
  materials: Material[]
  openTasks: Task[]
  settings: Settings
  today: ISODate
}

export interface ExamSaveResult {
  changes: ChangeSet
  /** 新しく作ったタスクの数 */
  created: number
  /** 既存の未完了タスクにまとめた数 */
  merged: number
  /** 範囲から外れて examIds から試験を外した数 */
  detached: number
}

/**
 * 4.2 試験を登録・編集したとき
 * - 範囲内の単元：卒業済みは何もしない／未着手は first／周回中は exam を作る
 * - その単元に未完了タスクがあれば新しく作らず、examIds に試験を足して期限を早い方にする（重複をまとめる）
 * - 範囲から外れた単元：未完了タスクの examIds から試験を外すだけ（タスクは消さない・期限も変えない）
 */
export function applyExamSave(input: ExamSaveInput): ExamSaveResult {
  const { exam, units, materials, openTasks, settings, today } = input
  const changes = emptyChangeSet()
  const inRange = new Set(exam.unitRefs.map(unitKey))
  let created = 0
  let merged = 0
  let detached = 0

  for (const task of openTasks) {
    if (task.status !== 'open' || !task.examIds.includes(exam.id)) continue
    const stillInRange = task.materialId && task.unitId && inRange.has(unitKey({ materialId: task.materialId, unitId: task.unitId }))
    if (stillInRange) continue
    changes.updateTasks.push({ id: task.id, patch: { examIds: task.examIds.filter((id) => id !== exam.id) } })
    detached += 1
  }

  const dueDate = examDueDate(exam.date, settings, today)
  if (dueDate === null) return { changes, created, merged, detached }

  const seen = new Set<string>()
  for (const ref of exam.unitRefs) {
    const key = unitKey(ref)
    if (seen.has(key)) continue
    seen.add(key)

    const unit = units.find((u) => u.materialId === ref.materialId && u.id === ref.unitId)
    const material = materials.find((m) => m.id === ref.materialId)
    if (!unit || !material || unit.graduated) continue

    const existing = openTaskForUnit(openTasks, ref)
    if (existing) {
      const examIds = existing.examIds.includes(exam.id) ? existing.examIds : [...existing.examIds, exam.id]
      const newDue = minDate(existing.dueDate, dueDate)
      if (examIds !== existing.examIds || newDue !== existing.dueDate) {
        changes.updateTasks.push({ id: existing.id, patch: { examIds, dueDate: newDue } })
      }
      merged += 1
    } else {
      changes.createTasks.push({
        type: unit.lapCount === 0 ? 'first' : 'exam',
        title: unitTaskTitle(material, unit),
        materialId: unit.materialId,
        unitId: unit.id,
        rangeId: null,
        examIds: [exam.id],
        dueDate,
      })
      created += 1
    }
  }
  return { changes, created, merged, detached }
}

/** 試験を削除したとき：未完了タスクの examIds からその試験を外すだけ（タスクは消さない・期限も変えない） */
export function applyExamDelete(examId: string, openTasks: Task[]): ChangeSet {
  const changes = emptyChangeSet()
  for (const task of openTasks) {
    if (task.status === 'open' && task.examIds.includes(examId)) {
      changes.updateTasks.push({ id: task.id, patch: { examIds: task.examIds.filter((id) => id !== examId) } })
    }
  }
  return changes
}

/** 今日以降の試験を日付の近い順に（カウントダウン用） */
export function upcomingExams(exams: Exam[], today: ISODate): { exam: Exam; daysLeft: number }[] {
  return exams
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((exam) => ({ exam, daysLeft: daysBetween(today, exam.date) }))
}
