import { useState } from 'react'
import { useData } from '../data/store.tsx'
import { daysBetween, formatShortDate } from '../domain/date.ts'
import type { Exam } from '../domain/types.ts'
import { useToday } from '../hooks/useToday.ts'
import { Badge, Button, EmptyState, ScreenTitle } from '../components/ui.tsx'
import { ExamFormSheet } from './exams/ExamFormSheet.tsx'

function ExamCard({ exam, onOpen }: { exam: Exam; onOpen: () => void }) {
  const { openTasks } = useData()
  const today = useToday()
  const daysLeft = daysBetween(today, exam.date)
  const taskCount = openTasks.filter((t) => t.examIds.includes(exam.id)).length

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 active:bg-slate-50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {exam.category && <Badge tone="amber">{exam.category}</Badge>}
              <span className="text-xs text-slate-500">{formatShortDate(exam.date)}</span>
            </div>
            <p className="mt-1 font-semibold">{exam.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              範囲 {exam.unitRefs.length}単元・未完了タスク {taskCount}件
            </p>
          </div>
          {daysLeft >= 0 && (
            <p className="shrink-0 text-right text-indigo-700">
              {daysLeft === 0 ? (
                <span className="text-lg font-bold">今日</span>
              ) : (
                <>
                  <span className="text-xs">あと</span>
                  <span className="mx-0.5 text-2xl font-bold tabular-nums">{daysLeft}</span>
                  <span className="text-xs">日</span>
                </>
              )}
            </p>
          )}
        </div>
      </button>
    </li>
  )
}

export function ExamsScreen() {
  const { exams } = useData()
  const today = useToday()
  const [editing, setEditing] = useState<Exam | 'new' | null>(null)

  const upcoming = exams.filter((e) => e.date >= today)
  const past = exams.filter((e) => e.date < today).reverse()

  return (
    <>
      <ScreenTitle
        action={
          <Button className="px-3 py-1.5" onClick={() => setEditing('new')}>
            ＋ 試験
          </Button>
        }
      >
        試験
      </ScreenTitle>

      {upcoming.length === 0 ? (
        <EmptyState>
          予定の試験がありません。
          <br />
          定期考査・模試・資格などを登録すると、範囲の単元のタスクが自動で作られます。
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((exam) => (
            <ExamCard key={exam.id} exam={exam} onOpen={() => setEditing(exam)} />
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-slate-500">終わった試験（{past.length}）</summary>
          <ul className="mt-3 space-y-3 opacity-70">
            {past.map((exam) => (
              <ExamCard key={exam.id} exam={exam} onOpen={() => setEditing(exam)} />
            ))}
          </ul>
        </details>
      )}

      {editing && <ExamFormSheet exam={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  )
}
