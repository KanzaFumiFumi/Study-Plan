import { TASK_TYPE_LABEL, type TaskType } from '../domain/types.ts'
import { Badge, type BadgeTone } from './ui.tsx'

const TONES: Record<TaskType, BadgeTone> = {
  assignment: 'rose',
  first: 'sky',
  exam: 'amber',
  memorize: 'emerald',
  cycle: 'indigo',
  redo: 'violet',
}

export function TaskBadge({ type }: { type: TaskType }) {
  return <Badge tone={TONES[type]}>{TASK_TYPE_LABEL[type]}</Badge>
}
