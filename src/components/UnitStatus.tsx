import type { Unit } from '../domain/types.ts'
import { Badge } from './ui.tsx'

/** 単元の 周回数／残りの印の数／卒業 をバッジで表示する */
export function UnitStatus({ unit }: { unit: Unit }) {
  if (unit.lapCount === 0) return <Badge>未着手</Badge>
  return (
    <span className="flex items-center gap-1">
      <Badge tone="indigo">{unit.lapCount}周</Badge>
      {unit.graduated ? <Badge tone="green">卒業</Badge> : <Badge tone="amber">残り{unit.remainingMarks ?? '?'}</Badge>}
    </span>
  )
}
