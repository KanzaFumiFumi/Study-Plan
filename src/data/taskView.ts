import type { Exam, Material, Range, Task, Unit } from '../domain/types.ts'
import type { DataValue } from './store.tsx'

export interface TaskView {
  task: Task
  material: Material | undefined
  unit: Unit | undefined
  range: Range | undefined
  exams: Exam[]
  /** 大きく出す名前（教材名・単元名は今の名前を使う。名前を変えても追従する） */
  heading: string
  /** 補足（学校課題に紐づく単元など） */
  sub: string
}

/** タスクの表示用に、教材・単元・範囲・試験を引いてくる */
export function viewTask(task: Task, data: Pick<DataValue, 'materials' | 'units' | 'ranges' | 'exams'>): TaskView {
  const material = data.materials.find((m) => m.id === task.materialId)
  const unit = task.unitId ? data.units.find((u) => u.materialId === task.materialId && u.id === task.unitId) : undefined
  const range = task.rangeId ? data.ranges.find((r) => r.materialId === task.materialId && r.id === task.rangeId) : undefined
  const exams = task.examIds.map((id) => data.exams.find((e) => e.id === id)).filter((e): e is Exam => !!e)

  const target = material && (unit || range) ? `${material.name} ${unit?.name ?? range?.label}` : ''
  if (task.type === 'assignment') return { task, material, unit, range, exams, heading: task.title, sub: target }
  return { task, material, unit, range, exams, heading: target || task.title, sub: '' }
}
