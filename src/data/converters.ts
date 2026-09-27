import { Timestamp, type DocumentData } from 'firebase/firestore'
import { isISODate } from '../domain/date.ts'
import {
  DEFAULT_SETTINGS,
  type Exam,
  type Material,
  type MemorizeResult,
  type NewTask,
  type Range,
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
  return {
    id,
    name: str(d.name),
    subject: str(d.subject),
    kind: d.kind === 'memorize' ? 'memorize' : 'cycle',
    archived: d.archived === true,
    createdAt: millis(d.createdAt) ?? 0,
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
  return {
    id,
    materialId,
    label: str(d.label),
    order: num(d.order, 0),
    started: d.started === true,
    step: num(d.step, 0),
    nextReviewAt: dateOrNull(d.nextReviewAt),
    lastResult: memorizeResult(d.lastResult),
  }
}

export function toExam(id: string, d: DocumentData): Exam {
  const refs: unknown[] = Array.isArray(d.unitRefs) ? d.unitRefs : []
  return {
    id,
    name: str(d.name),
    category: str(d.category),
    date: dateOrNull(d.date) ?? '1970-01-01',
    unitRefs: refs
      .filter((r): r is UnitRef => !!r && typeof r === 'object' && 'materialId' in r && 'unitId' in r)
      .map((r) => ({ materialId: String(r.materialId), unitId: String(r.unitId) })),
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
  }
}

export function toSettings(d: DocumentData | undefined): Settings {
  if (!d) return DEFAULT_SETTINGS
  const intervals: unknown[] = Array.isArray(d.memorizeIntervals) ? d.memorizeIntervals : []
  const memorizeIntervals = intervals.filter((x): x is number => typeof x === 'number' && x > 0)
  return {
    cycleIntervalDays: num(d.cycleIntervalDays, DEFAULT_SETTINGS.cycleIntervalDays),
    examLeadDays: num(d.examLeadDays, DEFAULT_SETTINGS.examLeadDays),
    memorizeIntervals: memorizeIntervals.length > 0 ? memorizeIntervals : DEFAULT_SETTINGS.memorizeIntervals,
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
  }
}

/** タスクの部分更新を保存する形にする（ミリ秒 → Timestamp） */
export function taskPatchData(patch: Partial<Omit<Task, 'id'>>): DocumentData {
  const data: DocumentData = { ...patch }
  if (typeof patch.completedAt === 'number') data.completedAt = Timestamp.fromMillis(patch.completedAt)
  if (typeof patch.createdAt === 'number') data.createdAt = Timestamp.fromMillis(patch.createdAt)
  return data
}
