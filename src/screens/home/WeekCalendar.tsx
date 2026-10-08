import { useState } from 'react'
import { useData } from '../../data/store.tsx'
import { calendarMarks } from '../../domain/calendar.ts'
import { addDays, shiftMonth, weekDates } from '../../domain/date.ts'
import type { ISODate } from '../../domain/types.ts'
import { useToday } from '../../hooks/useToday.ts'
import { Chevron, IconButton } from '../../components/ui.tsx'
import { CalendarLegend, DayCell, MonthGrid, WeekdayRow } from './MonthCalendar.tsx'

/**
 * ホームのカレンダー（v0.6〜）。ふだんは今週7日の帯、「月」で月のカレンダーに広げる（PC版は最初から月）。
 * 日付をタップすると onSelect（その日の予定・タスク・暗記の割り当て）。
 */
export function WeekCalendar({ onSelect, monthFirst = false }: { onSelect: (date: ISODate) => void; monthFirst?: boolean }) {
  const { openTasks, exams, materials } = useData()
  const today = useToday()
  const [month, setMonth] = useState(monthFirst)
  // 週は表示する週の日曜、月は { year, month }
  const [weekStart, setWeekStart] = useState(() => weekDates(today)[0])
  const [ym, setYm] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }))

  const hidden = new Set(materials.filter((m) => m.archived).map((m) => m.id))
  const marks = calendarMarks(openTasks, exams, hidden)
  const week = weekDates(weekStart)
  const shown = month ? ym : { year: Number(week[3].slice(0, 4)), month: Number(week[3].slice(5, 7)) }
  const isCurrent = month
    ? ym.year === Number(today.slice(0, 4)) && ym.month === Number(today.slice(5, 7))
    : week.includes(today)

  function move(delta: -1 | 1) {
    if (month) setYm(shiftMonth(ym, delta))
    else setWeekStart(addDays(weekStart, delta * 7))
  }

  function backToToday() {
    setWeekStart(weekDates(today)[0])
    setYm({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) })
  }

  function toggle() {
    // 週 → 月：表示していた週の月へ。月 → 週：今日を含む月なら今週、それ以外はその月の最初の週
    if (!month) setYm(shown)
    else {
      const first = `${ym.year}-${String(ym.month).padStart(2, '0')}-01`
      setWeekStart(isCurrent ? weekDates(today)[0] : weekDates(first)[0])
    }
    setMonth(!month)
  }

  return (
    <section aria-label="カレンダー" className="rounded-3xl bg-white p-3 pb-2.5 shadow-[0_1px_2px_rgba(28,27,25,0.04)] ring-1 ring-stone-200/80">
      <div className="flex items-center gap-1 pb-2 pl-2">
        <p className="num mr-auto text-[15px] font-bold tracking-wider">
          {shown.year}年{shown.month}月
        </p>
        {!isCurrent && (
          <button
            type="button"
            onClick={backToToday}
            className="rounded-full px-2.5 py-1 text-xs font-semibold text-stone-600 ring-1 ring-stone-300 transition active:scale-95 pc:hover:bg-stone-50"
          >
            今日
          </button>
        )}
        <IconButton label={month ? '前の月' : '前の週'} onClick={() => move(-1)}>
          <Chevron direction="left" />
        </IconButton>
        <IconButton label={month ? '次の月' : '次の週'} onClick={() => move(1)}>
          <Chevron direction="right" />
        </IconButton>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={month}
          className="ml-1 flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 transition active:scale-95 pc:hover:bg-stone-200"
        >
          {month ? '週' : '月'}
          <Chevron direction={month ? 'up' : 'down'} className="h-3.5 w-3.5" />
        </button>
      </div>

      <WeekdayRow />
      {month ? (
        <MonthGrid year={ym.year} month={ym.month} today={today} marks={marks} onSelect={onSelect} />
      ) : (
        <div className="grid grid-cols-7">
          {week.map((date) => (
            <DayCell key={date} date={date} today={today} mark={marks.get(date)} onSelect={onSelect} />
          ))}
        </div>
      )}
      <CalendarLegend />
    </section>
  )
}
