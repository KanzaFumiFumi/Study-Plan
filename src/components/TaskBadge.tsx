import { TASK_TYPE_LABEL, type TaskType } from '../domain/types.ts'
import { Badge, type BadgeTone } from './ui.tsx'

// 締切のある課題をいちばん強く、予定に向けた仕上げと1周目を次に目立たせる
const TONES: Record<TaskType, BadgeTone> = {
  assignment: 'ink',
  first: 'outline',
  exam: 'soft',
  memorize: 'plain',
  cycle: 'plain',
  redo: 'plain',
}

export function TaskBadge({ type }: { type: TaskType }) {
  return <Badge tone={TONES[type]}>{TASK_TYPE_LABEL[type]}</Badge>
}
