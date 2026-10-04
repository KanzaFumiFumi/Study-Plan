import { useState } from 'react'
import { useData } from '../../data/store.tsx'
import { calendarWeeks, shiftMonth } from '../../domain/date.ts'
import type { ISODate } from '../../domain/types.ts'
import { useToday } from '../../hooks/useToday.ts'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * 予定の画面のカレンダー（v0.4〜）。予定のある日（■）と、暗記をする日（暗＋件数）に目印を出す。
 * 日付をタップすると onSelect（その日の内容と、暗記の範囲の割り当て）。
 */
export function Calendar({ onSelect }: { onSelect: (date: ISODate) => void }) {
  const { exams, openTasks, materials } = useData()
  const today = useToday()
  const [ym, setYm] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }))

  const hidden = new Set(materials.filter((m) => m.archived).map((m) => m.id))
  const eventDates = new Set(exams.map((e) => e.date))
  const memorizeCount = new Map<ISODate, number>()
  for (const t of openTasks) {
    if (t.type !== 'memorize' || (t.materialId && hidden.has(t.materialId))) continue
    memorizeCount.set(t.dueDate, (memorizeCount.get(t.dueDate) ?? 0) + 1)
  }

  const navButton = 'flex h-9 w-9 items-center justify-center rounded-full text-lg text-stone-600 active:bg-stone-100'

  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
      <div className="flex items-center justify-between px-1 pb-2">
        <button type="button" className={navButton} onClick={() => setYm(shiftMonth(ym, -1))} aria-label="前の月">
          ‹
        </button>
        <p className="font-bold tracking-wider tabular-nums">
          {ym.year}年{ym.month}月
        </p>
        <button type="button" className={navButton} onClick={() => setYm(shiftMonth(ym, 1))} aria-label="次の月">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 pb-1 text-center text-[11px] text-stone-400">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {calendarWeeks(ym.year, ym.month)
          .flat()
          .map((date, i) => {
            if (!date) return <span key={`empty-${i}`} />
            const isToday = date === today
            const hasEvent = eventDates.has(date)
            const memo = memorizeCount.get(date) ?? 0
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelect(date)}
                aria-label={`${date}${hasEvent ? '・予定あり' : ''}${memo ? `・暗記${memo}件` : ''}`}
                className={`flex h-14 flex-col items-center rounded-lg pt-1 active:bg-stone-100 pc:h-20 pc:pt-2 pc:hover:bg-stone-50 ${date < today ? 'opacity-50' : ''}`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums ${
                    isToday ? 'bg-ink font-bold text-white' : ''
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
                <span className="mt-0.5 flex h-3 items-center gap-1">
                  {hasEvent && <span className="h-1.5 w-1.5 bg-ink" />}
                  {memo > 0 && <span className="text-[9px] leading-none text-stone-500">暗{memo}</span>}
                </span>
              </button>
            )
          })}
      </div>

      <p className="mt-2 flex gap-4 px-1 text-[11px] text-stone-500">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 bg-ink" />
          予定
        </span>
        <span>暗＝暗記の件数</span>
        <span className="ml-auto">日付をタップして暗記を割り当て</span>
      </p>
    </div>
  )
}
