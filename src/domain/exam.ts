import { emptyChangeSet, type ChangeSet } from './changeset.ts'
import { addDays, daysBetween, maxDate, minDate } from './date.ts'
import { openTaskForUnit, openTasksForRange, rangeKey, unitKey, unitTaskTitle } from './lookup.ts'
import { isRangeFinished, rangeTaskTitle } from './memorize.ts'
import type { Exam, ISODate, Material, Range, Settings, Task, Unit } from './types.ts'

// 予定（試験・大会・旅行・趣味など）。データ上は v0.1 の「試験」（exams / examIds）のまま扱う。

/** 予定ごとの「何日前までに仕上げるか」。予定に指定がなければ設定の値 */
export function leadDaysOf(exam: Pick<Exam, 'leadDays'>, settings: Settings): number {
  return exam.leadDays ?? settings.examLeadDays
}

/**
 * 予定に向けたタスクの期限：予定の日 - 何日前。
 * それが今日より前なら今日にする。予定の日がすでに過ぎていれば null（タスクを作らない）。
 */
export function examDueDate(examDate: ISODate, leadDays: number, today: ISODate): ISODate | null {
  if (examDate < today) return null
  return maxDate(addDays(examDate, -leadDays), today)
}

export interface ExamSaveInput {
  /** 保存する予定（新規なら採番済みのIDを入れておく） */
  exam: Exam
  units: Unit[]
  ranges: Range[]
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
  /** 範囲から外れて examIds から予定を外した数 */
  detached: number
}

/**
 * 4.2 予定を登録・編集したとき
 * 周回系の単元：
 * - 卒業済みは何もしない／未着手は first／周回中は exam（仕上げ）を作る。期限は「予定の日 - 何日前」
 * - その単元に未完了タスクがあれば新しく作らず、examIds に予定を足して期限を早い方にする（重複をまとめる）
 * 暗記系の範囲（v0.2〜、v0.6 で変更）：
 * - カレンダーに入れた暗記タスクがあれば、その examIds に予定を足すだけ（日付は変えない）
 * - なければ、単元と同じ期限（予定の日 − 何日前）の暗記タスクを1つ作る。目標の周回数を終えた範囲は何もしない
 * 範囲から外れた単元・範囲：未完了タスクの examIds から予定を外すだけ（タスクは消さない・期限も変えない）
 */
export function applyExamSave(input: ExamSaveInput): ExamSaveResult {
  const { exam, units, ranges, materials, openTasks, settings, today } = input
  const changes = emptyChangeSet()
  const unitsInRange = new Set(exam.unitRefs.map(unitKey))
  const rangesInRange = new Set(exam.rangeRefs.map(rangeKey))
  let created = 0
  let merged = 0
  let detached = 0

  for (const task of openTasks) {
    if (task.status !== 'open' || !task.examIds.includes(exam.id) || !task.materialId) continue
    const stillInRange =
      (task.unitId && unitsInRange.has(unitKey({ materialId: task.materialId, unitId: task.unitId }))) ||
      (task.rangeId && rangesInRange.has(rangeKey({ materialId: task.materialId, rangeId: task.rangeId })))
    if (stillInRange) continue
    changes.updateTasks.push({ id: task.id, patch: { examIds: task.examIds.filter((id) => id !== exam.id) } })
    detached += 1
  }

  const dueDate = examDueDate(exam.date, leadDaysOf(exam, settings), today)
  if (dueDate === null) return { changes, created, merged, detached }

  const withExam = (task: Task) => (task.examIds.includes(exam.id) ? task.examIds : [...task.examIds, exam.id])

  const seenUnits = new Set<string>()
  for (const ref of exam.unitRefs) {
    const key = unitKey(ref)
    if (seenUnits.has(key)) continue
    seenUnits.add(key)

    const unit = units.find((u) => u.materialId === ref.materialId && u.id === ref.unitId)
    const material = materials.find((m) => m.id === ref.materialId)
    if (!unit || !material || unit.graduated) continue

    const existing = openTaskForUnit(openTasks, ref)
    if (existing) {
      const examIds = withExam(existing)
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

  const seenRanges = new Set<string>()
  for (const ref of exam.rangeRefs) {
    const key = rangeKey(ref)
    if (seenRanges.has(key)) continue
    seenRanges.add(key)

    const range = ranges.find((r) => r.materialId === ref.materialId && r.id === ref.rangeId)
    const material = materials.find((m) => m.id === ref.materialId)
    if (!range || !material) continue

    // カレンダーに入れた予定があれば、その予定に向けたものにする（日付は変えない）
    const planned = openTasksForRange(openTasks, ref)
    if (planned.length > 0) {
      for (const task of planned) {
        const examIds = withExam(task)
        if (examIds !== task.examIds) changes.updateTasks.push({ id: task.id, patch: { examIds } })
      }
      merged += 1
    } else if (!isRangeFinished(range, material)) {
      // 予定が入っていなければ、単元と同じく「予定の日 − 何日前」に1回分を入れる（目標の周回数を終えた範囲は何もしない）
      changes.createTasks.push({
        type: 'memorize',
        title: rangeTaskTitle(material, range),
        materialId: range.materialId,
        unitId: null,
        rangeId: range.id,
        examIds: [exam.id],
        dueDate,
      })
      created += 1
    }
  }

  return { changes, created, merged, detached }
}

/** 予定を削除したとき：未完了タスクの examIds からその予定を外すだけ（タスクは消さない・期限も変えない） */
export function applyExamDelete(examId: string, openTasks: Task[]): ChangeSet {
  const changes = emptyChangeSet()
  for (const task of openTasks) {
    if (task.status === 'open' && task.examIds.includes(examId)) {
      changes.updateTasks.push({ id: task.id, patch: { examIds: task.examIds.filter((id) => id !== examId) } })
    }
  }
  return changes
}

/** 今日以降の予定を日付の近い順に（カウントダウン用） */
export function upcomingExams(exams: Exam[], today: ISODate): { exam: Exam; daysLeft: number }[] {
  return exams
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((exam) => ({ exam, daysLeft: daysBetween(today, exam.date) }))
}
