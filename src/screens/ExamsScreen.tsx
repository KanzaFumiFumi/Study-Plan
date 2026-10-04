import { useState } from 'react'
import { useData } from '../data/store.tsx'
import { daysBetween, formatShortDate } from '../domain/date.ts'
import type { Exam, ISODate } from '../domain/types.ts'
import { useToday } from '../hooks/useToday.ts'
import { Badge, Button, EmptyState, ScreenTitle } from '../components/ui.tsx'
import { Calendar } from './exams/Calendar.tsx'
import { DaySheet } from './exams/DaySheet.tsx'
import { ExamFormSheet } from './exams/ExamFormSheet.tsx'

function ExamCard({ exam, onOpen }: { exam: Exam; onOpen: () => void }) {
  const { openTasks } = useData()
  const today = useToday()
  const daysLeft = daysBetween(today, exam.date)
  const taskCount = openTasks.filter((t) => t.examIds.includes(exam.id)).length
  const rangeCount = exam.unitRefs.length + exam.rangeRefs.length

  return (
    <li>
      <button type="button" onClick={onOpen} className="w-full rounded-2xl bg-white p-4 text-left ring-1 ring-stone-200 active:bg-stone-50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {exam.category && <Badge tone="outline">{exam.category}</Badge>}
              <span className="text-xs text-stone-500">{formatShortDate(exam.date)}</span>
            </div>
            <p className="mt-1.5 font-semibold">{exam.name}</p>
            <p className="mt-0.5 text-xs text-stone-500">
              {rangeCount ? `範囲 ${rangeCount}件・未完了タスク ${taskCount}件` : '範囲なし（カウントダウンだけ）'}
            </p>
          </div>
          {daysLeft >= 0 && (
            <p className="shrink-0 text-right">
              {daysLeft === 0 ? (
                <span className="text-lg font-bold">今日</span>
              ) : (
                <>
                  <span className="text-xs text-stone-500">あと</span>
                  <span className="mx-0.5 text-2xl font-bold tabular-nums">{daysLeft}</span>
                  <span className="text-xs text-stone-500">日</span>
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
  const [day, setDay] = useState<ISODate | null>(null)

  const upcoming = exams.filter((e) => e.date >= today)
  const past = exams.filter((e) => e.date < today).reverse()

  return (
    <>
      <ScreenTitle
        action={
          <Button className="px-3 py-1.5" onClick={() => setEditing('new')}>
            ＋ 予定
          </Button>
        }
      >
        予定
      </ScreenTitle>

      {/* PC版（v0.5〜）：左にカレンダー、右に予定の一覧 */}
      <div className="pc:grid pc:grid-cols-[minmax(0,1fr)_22rem] pc:items-start pc:gap-6">
        <Calendar onSelect={setDay} />

        <div>
          <h2 className="mt-6 mb-2 px-1 text-sm font-semibold text-stone-600 pc:mt-0">これからの予定</h2>
          {upcoming.length === 0 ? (
            <EmptyState>
              予定がありません。
              <br />
              試験・大会・旅行・趣味など、目標の日を登録すると、範囲の単元のタスクが自動で作られます。
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
              <summary className="cursor-pointer text-sm text-stone-500">終わった予定（{past.length}）</summary>
              <ul className="mt-3 space-y-3 opacity-70">
                {past.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} onOpen={() => setEditing(exam)} />
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>

      {day && (
        <DaySheet
          date={day}
          onClose={() => setDay(null)}
          onEditExam={(exam) => {
            setDay(null)
            setEditing(exam)
          }}
        />
      )}
      {editing && <ExamFormSheet exam={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  )
}
