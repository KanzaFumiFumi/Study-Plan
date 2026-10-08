import type { DayMark } from '../../domain/calendar.ts'
import { calendarWeeks, formatMonthDay, weekdayOf } from '../../domain/date.ts'
import type { ISODate } from '../../domain/types.ts'

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * カレンダーの1日（v0.4〜、v0.6 でホームに移した）。
 * 目印：◆ 予定（試験・大会など）／暗N 暗記の数／・ そのほかのタスク。今日は黒い丸。
 */
export function DayCell({
  date,
  today,
  mark,
  onSelect,
  tall = false,
}: {
  date: ISODate
  today: ISODate
  mark: DayMark | undefined
  onSelect: (date: ISODate) => void
  /** PC版の月表示など、背の高いマス */
  tall?: boolean
}) {
  const isToday = date === today
  const isPast = date < today
  const label = [
    `${formatMonthDay(date)}(${weekdayOf(date)})`,
    mark?.events ? `予定${mark.events}件` : '',
    mark?.memorize ? `暗記${mark.memorize}件` : '',
    mark?.tasks ? `タスク${mark.tasks}件` : '',
  ]
    .filter(Boolean)
    .join('・')

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      data-date={date}
      aria-label={label}
      className={`group flex flex-col items-center gap-1 rounded-xl pt-1 pb-1.5 transition active:scale-95 active:bg-stone-200/60 pc:hover:bg-stone-100 ${
        tall ? 'pc:h-20 pc:pt-2' : ''
      }`}
    >
      <span
        className={`num flex h-8 w-8 items-center justify-center rounded-full text-[15px] transition ${
          isToday ? 'bg-ink font-bold text-white shadow-sm' : isPast ? 'text-stone-400' : 'text-ink'
        }`}
      >
        {Number(date.slice(8))}
      </span>
      <span className="flex h-3 items-center gap-1" aria-hidden>
        {mark?.events ? <span className="h-1.5 w-1.5 rotate-45 bg-ink" /> : null}
        {mark?.memorize ? <span className="num text-[9px] leading-none font-semibold text-stone-600">暗{mark.memorize}</span> : null}
        {mark?.tasks ? <span className="h-1 w-1 rounded-full bg-stone-400" /> : null}
      </span>
    </button>
  )
}

/** 曜日の見出し */
export function WeekdayRow() {
  return (
    <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-medium text-stone-400" aria-hidden>
      {WEEKDAYS.map((w) => (
        <span key={w}>{w}</span>
      ))}
    </div>
  )
}

/** 月のカレンダー（日曜はじまり） */
export function MonthGrid({
  year,
  month,
  today,
  marks,
  onSelect,
}: {
  year: number
  month: number
  today: ISODate
  marks: Map<ISODate, DayMark>
  onSelect: (date: ISODate) => void
}) {
  return (
    <div className="grid grid-cols-7 gap-y-0.5">
      {calendarWeeks(year, month)
        .flat()
        .map((date, i) =>
          date ? (
            <DayCell key={date} date={date} today={today} mark={marks.get(date)} onSelect={onSelect} tall />
          ) : (
            <span key={`empty-${i}`} />
          ),
        )}
    </div>
  )
}

/** 目印の説明 */
export function CalendarLegend() {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-stone-500">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rotate-45 bg-ink" />
        予定
      </span>
      <span>暗＝暗記</span>
      <span className="flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-stone-400" />
        タスク
      </span>
      <span className="ml-auto">日付をタップして、その日の内容・暗記の割り当て</span>
    </p>
  )
}
