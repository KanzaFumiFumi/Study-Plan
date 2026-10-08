import { useData } from '../../data/store.tsx'
import { daysBetween, weekdayOf } from '../../domain/date.ts'
import type { Exam } from '../../domain/types.ts'
import { useToday } from '../../hooks/useToday.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { Button, EmptyState, PlusIcon } from '../../components/ui.tsx'

/** 予定の1行：左に日付、右に名前と残り日数 */
function EventRow({ exam, onOpen }: { exam: Exam; onOpen: () => void }) {
  const { openTasks } = useData()
  const today = useToday()
  const daysLeft = daysBetween(today, exam.date)
  const taskCount = openTasks.filter((t) => t.examIds.includes(exam.id)).length
  const rangeCount = exam.unitRefs.length + exam.rangeRefs.length
  const [, m, d] = exam.date.split('-').map(Number)
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-4 rounded-2xl bg-white p-3 pr-4 text-left ring-1 ring-stone-200/80 transition active:scale-[0.99] pc:hover:ring-stone-300"
      >
        <span className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-stone-100 py-1.5">
          <span className="num text-[10px] font-semibold text-stone-500">{m}月</span>
          <span className="num text-lg leading-tight font-bold">{d}</span>
          <span className="text-[10px] text-stone-500">{weekdayOf(exam.date)}</span>
        </span>
        <span className="min-w-0 flex-1">
          {exam.category && <span className="block text-[11px] font-medium tracking-wider text-stone-500">{exam.category}</span>}
          <span className="block truncate font-semibold">{exam.name}</span>
          <span className="block text-xs text-stone-500">
            {rangeCount ? `範囲 ${rangeCount}件・未完了 ${taskCount}件` : '範囲なし（カウントダウンだけ）'}
          </span>
        </span>
        {daysLeft >= 0 && (
          <span className="shrink-0 text-right">
            {daysLeft === 0 ? (
              <span className="text-base font-bold">今日</span>
            ) : (
              <>
                <span className="text-[11px] text-stone-500">あと</span>
                <span className="num mx-0.5 text-2xl font-bold">{daysLeft}</span>
                <span className="text-[11px] text-stone-500">日</span>
              </>
            )}
          </span>
        )}
      </button>
    </li>
  )
}

/** 予定の一覧（v0.6〜、ホームの「予定」から開く）。v0.5 までの「予定」タブの一覧をここにまとめた */
export function EventsSheet({ onClose, onEdit, onAdd }: { onClose: () => void; onEdit: (exam: Exam) => void; onAdd: () => void }) {
  const { exams } = useData()
  const today = useToday()
  const upcoming = exams.filter((e) => e.date >= today)
  const past = exams.filter((e) => e.date < today).reverse()

  return (
    <Sheet
      title="予定"
      subtitle="試験・大会・旅行・趣味など"
      onClose={onClose}
      footer={
        <Button className="flex w-full items-center justify-center gap-1.5" onClick={onAdd}>
          <PlusIcon />
          予定を追加
        </Button>
      }
    >
      {upcoming.length === 0 ? (
        <EmptyState>
          これからの予定はありません。
          <br />
          目標の日を登録すると、範囲の単元・暗記のタスクが自動で作られます。
        </EmptyState>
      ) : (
        <ul className="space-y-2.5">
          {upcoming.map((exam) => (
            <EventRow key={exam.id} exam={exam} onOpen={() => onEdit(exam)} />
          ))}
        </ul>
      )}
      {past.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer px-1 text-sm text-stone-500">終わった予定（{past.length}）</summary>
          <ul className="mt-3 space-y-2.5 opacity-70">
            {past.map((exam) => (
              <EventRow key={exam.id} exam={exam} onOpen={() => onEdit(exam)} />
            ))}
          </ul>
        </details>
      )}
    </Sheet>
  )
}
