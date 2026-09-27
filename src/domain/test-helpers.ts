// テスト専用の部品（アプリからは読み込まない）
import type { ChangeSet } from './changeset.ts'
import { DEFAULT_SETTINGS, type Exam, type Material, type Range, type Settings, type Task, type Unit } from './types.ts'

export const settings: Settings = DEFAULT_SETTINGS

export function makeMaterial(overrides: Partial<Material> = {}): Material {
  return { id: 'm1', name: '青チャート', subject: '数学', kind: 'cycle', archived: false, createdAt: 0, ...overrides }
}

export function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 'u1',
    materialId: 'm1',
    name: '第1章',
    order: 0,
    lapCount: 0,
    remainingMarks: null,
    graduated: false,
    lastDoneAt: null,
    ...overrides,
  }
}

export function makeRange(overrides: Partial<Range> = {}): Range {
  return {
    id: 'r1',
    materialId: 'm2',
    label: 'No.1-100',
    order: 0,
    started: false,
    step: 0,
    nextReviewAt: null,
    lastResult: null,
    ...overrides,
  }
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    type: 'cycle',
    title: '青チャート 第1章',
    materialId: 'm1',
    unitId: 'u1',
    rangeId: null,
    examIds: [],
    dueDate: '2026-10-01',
    status: 'open',
    completedAt: null,
    createdAt: 0,
    result: null,
    ...overrides,
  }
}

export function makeExam(overrides: Partial<Exam> = {}): Exam {
  return { id: 'e1', name: '期末考査', category: '定期考査', date: '2026-11-20', unitRefs: [], ...overrides }
}

/** Firestore の代わりに、ChangeSet をメモリ上の状態に適用する（操作を続けて行うシナリオのテスト用） */
export interface State {
  materials: Material[]
  units: Unit[]
  ranges: Range[]
  exams: Exam[]
  tasks: Task[]
}

let idSeq = 0

export function applyChanges(state: State, cs: ChangeSet, now = 0): State {
  const patchById = <T extends { id: string }>(list: T[], updates: { id: string; patch: Partial<Omit<T, 'id'>> }[]): T[] =>
    list.map((item) => updates.filter((u) => u.id === item.id).reduce<T>((acc, u) => ({ ...acc, ...u.patch }), item))

  const tasks = patchById<Task>(
    state.tasks.filter((t) => !cs.deleteTasks.includes(t.id)),
    cs.updateTasks,
  )
  for (const t of cs.createTasks) {
    tasks.push({ ...t, id: `new${++idSeq}`, status: 'open', completedAt: null, createdAt: now, result: null })
  }

  const units = state.units.map((u) =>
    cs.updateUnits
      .filter((x) => x.materialId === u.materialId && x.unitId === u.id)
      .reduce((acc, x) => ({ ...acc, ...x.patch }), u),
  )
  const ranges = state.ranges.map((r) =>
    cs.updateRanges
      .filter((x) => x.materialId === r.materialId && x.rangeId === r.id)
      .reduce((acc, x) => ({ ...acc, ...x.patch }), r),
  )
  const exams = patchById<Exam>(state.exams, cs.updateExams)

  return { ...state, tasks, units, ranges, exams }
}

export const openTasksOf = (state: State): Task[] => state.tasks.filter((t) => t.status === 'open')
