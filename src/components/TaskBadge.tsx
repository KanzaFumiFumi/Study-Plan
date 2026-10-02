import { taskLabel } from '../domain/labels.ts'
import type { Task, TaskType, Unit } from '../domain/types.ts'
import { Badge, type BadgeTone } from './ui.tsx'

// 締切のある課題をいちばん強く、予定に向けたタスクと一周目を次に目立たせる
const TONES: Record<TaskType, BadgeTone> = {
  assignment: 'ink',
  first: 'outline',
  exam: 'soft',
  memorize: 'plain',
  cycle: 'plain',
  redo: 'plain',
}

/** タスクの種類のバッジ。周回系・復習系の単元のタスクは「何周目か」で表示する */
export function TaskBadge({ task, unit }: { task: Pick<Task, 'type'>; unit?: Unit }) {
  return <Badge tone={TONES[task.type]}>{taskLabel(task, unit)}</Badge>
}
