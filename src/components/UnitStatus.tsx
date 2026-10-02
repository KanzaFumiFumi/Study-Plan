import { kanjiNumber } from '../domain/labels.ts'
import type { Unit } from '../domain/types.ts'
import { Badge } from './ui.tsx'

/** 単元の 終えた周回数／残りの印の数／卒業 をバッジで表示する */
export function UnitStatus({ unit }: { unit: Unit }) {
  if (unit.lapCount === 0) return <Badge>未着手</Badge>
  return (
    <span className="flex items-center gap-1">
      <Badge tone="outline">{kanjiNumber(unit.lapCount)}周済み</Badge>
      {unit.graduated ? <Badge tone="ink">卒業</Badge> : <Badge tone="warn">残り{unit.remainingMarks ?? '?'}</Badge>}
    </span>
  )
}
