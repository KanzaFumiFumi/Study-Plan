import { Timestamp, type DocumentData } from 'firebase/firestore'
import { isISODate } from '../domain/date.ts'
import {
  DEFAULT_SETTINGS,
  DEFAULT_TARGET_LAPS,
  type CompletionBefore,
  type Exam,
  type Material,
  type MemorizeResult,
  type NewTask,
  type Range,
  type RangeRef,
  type Settings,
  type Task,
  type TaskResult,
  type TaskType,
  type Unit,
  type UnitRef,
} from '../domain/types.ts'

// Firestore のドキュメント ⇔ domain の型。欠けたフィールドがあっても落ちないよう既定値で補う。
// Timestamp は domain ではミリ秒で扱う。

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const dateOrNull = (v: unknown): string | null => (isISODate(v) ? v : null)
const millis = (v: unknown): number | null =>
  v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : null

function memorizeResult(v: unknown): MemorizeResult | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  return { known: num(o.known, 0), half: num(o.half, 0), unknown: num(o.unknown, 0) }
}

function taskResult(v: unknown): TaskResult | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (typeof o.remainingMarks === 'number') return { remainingMarks: o.remainingMarks }
  return memorizeResult(o)
}

const TASK_TYPES: TaskType[] = ['first', 'cycle', 'exam', 'redo', 'memorize', 'assignment']

export function toMaterial(id: string, d: DocumentData): Material {
  const createdAt = millis(d.createdAt) ?? 0
  return {
    id,
    name: str(d.name),
    subject: str(d.subject),
    kind: d.kind === 'memorize' || d.kind === 'review' ? d.kind : 'cycle',
    archived: d.archived === true,
    // order は v0.4 で追加。v0.3 までの教材にはないので、作った時刻を並び順として使う
    order: num(d.order, createdAt),
    // targetLaps は v0.6 で追加（暗記系の目標の周回数）
    targetLaps: typeof d.targetLaps === 'number' && Number.isInteger(d.targetLaps) && d.targetLaps >= 1 ? d.targetLaps : DEFAULT_TARGET_LAPS,
    createdAt,
  }
}

export function toUnit(id: string, materialId: string, d: DocumentData): Unit {
  return {
    id,
    materialId,
    name: str(d.name),
    order: num(d.order, 0),
    lapCount: num(d.lapCount, 0),
    remainingMarks: numOrNull(d.remainingMarks),
    graduated: d.graduated === true,
    lastDoneAt: dateOrNull(d.lastDoneAt),
  }
}

export function toRange(id: string, materialId: string, d: DocumentData): Range {
  // v0.6 で暗記の仕組みを変えた。v0.5 までの started・step・nextReviewAt・lastResult は読まない（データには残る）
  return {
    id,
    materialId,
    label: str(d.label),
    order: num(d.order, 0),
    lapCount: num(d.lapCount, 0),
    lastDoneAt: dateOrNull(d.lastDoneAt),
  }
}

export function toExam(id: string, d: DocumentData): Exam {
  const unitRefs: unknown[] = Array.isArray(d.unitRefs) ? d.unitRefs : []
  // rangeRefs と leadDays は v0.2 で追加。v0.1 の予定にはないので既定値で補う
  const rangeRefs: unknown[] = Array.isArray(d.rangeRefs) ? d.rangeRefs : []
  return {
    id,
    name: str(d.name),
    category: str(d.category),
    date: dateOrNull(d.date) ?? '1970-01-01',
    unitRefs: unitRefs
      .filter((r): r is UnitRef => !!r && typeof r === 'object' && 'materialId' in r && 'unitId' in r)
      .map((r) => ({ materialId: String(r.materialId), unitId: String(r.unitId) })),
    rangeRefs: rangeRefs
      .filter((r): r is RangeRef => !!r && typeof r === 'object' && 'materialId' in r && 'rangeId' in r)
      .map((r) => ({ materialId: String(r.materialId), rangeId: String(r.rangeId) })),
    leadDays: typeof d.leadDays === 'number' && Number.isInteger(d.leadDays) && d.leadDays >= 0 ? d.leadDays : null,
  }
}

export function toTask(id: string, d: DocumentData): Task {
  return {
    id,
    type: TASK_TYPES.includes(d.type) ? d.type : 'redo',
    title: str(d.title),
    materialId: typeof d.materialId === 'string' ? d.materialId : null,
    unitId: typeof d.unitId === 'string' ? d.unitId : null,
    rangeId: typeof d.rangeId === 'string' ? d.rangeId : null,
    examIds: Array.isArray(d.examIds) ? d.examIds.filter((x: unknown) => typeof x === 'string') : [],
    dueDate: dateOrNull(d.dueDate) ?? '1970-01-01',
    status: d.status === 'done' ? 'done' : 'open',
    completedAt: millis(d.completedAt),
    createdAt: millis(d.createdAt) ?? 0,
    result: taskResult(d.result),
    plannedFor: dateOrNull(d.plannedFor),
    // ここから下は v0.5 で追加。それより前のタスクにはないので null / false で補う
    lap: numOrNull(d.lap),
    before: completionBefore(d.before),
    createdBy: typeof d.createdBy === 'string' ? d.createdBy : null,
    archived: d.archived === true,
  }
}

function completionBefore(v: unknown): CompletionBefore | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const before: CompletionBefore = {}
  if (o.unit && typeof o.unit === 'object') {
    const u = o.unit as Record<string, unknown>
    before.unit = {
      lapCount: num(u.lapCount, 0),
      remainingMarks: numOrNull(u.remainingMarks),
      graduated: u.graduated === true,
      lastDoneAt: dateOrNull(u.lastDoneAt),
    }
  }
  // 範囲は v0.6 の形（lapCount）だけ読む。v0.5 の形（step など）は周回数を数えていないので戻すものがない
  if (o.range && typeof o.range === 'object' && typeof (o.range as Record<string, unknown>).lapCount === 'number') {
    const r = o.range as Record<string, unknown>
    before.range = { lapCount: num(r.lapCount, 0), lastDoneAt: dateOrNull(r.lastDoneAt) }
  }
  return before.unit || before.range ? before : null
}

export function toSettings(d: DocumentData | undefined): Settings {
  if (!d) return DEFAULT_SETTINGS
  // v0.5 までの memorizeIntervals（暗記の復習間隔）は v0.6 でなくしたので読まない
  return {
    cycleIntervalDays: num(d.cycleIntervalDays, DEFAULT_SETTINGS.cycleIntervalDays),
    examLeadDays: num(d.examLeadDays, DEFAULT_SETTINGS.examLeadDays),
  }
}

/** 新しいタスクを保存する形にする */
export function newTaskData(task: NewTask, now: number): DocumentData {
  return {
    ...task,
    status: 'open',
    completedAt: null,
    createdAt: Timestamp.fromMillis(now),
    result: null,
    plannedFor: null,
    lap: null,
    before: null,
    createdBy: task.createdBy ?? null,
    archived: false,
  }
}

/** タスクの部分更新を保存する形にする（ミリ秒 → Timestamp） */
export function taskPatchData(patch: Partial<Omit<Task, 'id'>>): DocumentData {
  const data: DocumentData = { ...patch }
  if (typeof patch.completedAt === 'number') data.completedAt = Timestamp.fromMillis(patch.completedAt)
  if (typeof patch.createdAt === 'number') data.createdAt = Timestamp.fromMillis(patch.createdAt)
  return data
}
