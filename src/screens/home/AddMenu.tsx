import { useState } from 'react'
import { Sheet } from '../../components/Sheet.tsx'
import { PlusIcon } from '../../components/ui.tsx'

export type AddAction = 'first' | 'assignment' | 'redo' | 'event' | 'memorize'

const ITEMS: { key: AddAction; label: string; hint: string; icon: string }[] = [
  // 開いた本
  { key: 'first', label: '授業の一周目', hint: '今日解いた範囲', icon: 'M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5M12 6.5C14 5 17 4.5 20 5v13c-3-.5-6 0-8 1.5M12 6.5v13' },
  // 書類
  { key: 'assignment', label: '学校課題', hint: '締切のある提出物', icon: 'M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V3.5Zm7 0V8h4M9.5 12.5h6M9.5 16h6' },
  // 回る矢印
  { key: 'redo', label: '解き直し', hint: 'もう一度解く単元', icon: 'M19 12a7 7 0 1 1-2.1-5M19 4v4h-4' },
  // 旗
  { key: 'event', label: '予定', hint: '試験・大会・旅行', icon: 'M6 21V4m0 0h11l-2 4 2 4H6' },
  // カード
  { key: 'memorize', label: '暗記の割り当て', hint: '日付を選んで範囲を入れる', icon: 'M4 7.5h12.5v11H4zM7.5 7.5V5h12.5v11h-3.5' },
]

/**
 * ホームの「＋」（v0.6〜）：追加の入り口を1つにまとめる。押すと選ぶシートが開く。
 * 画面の右下に浮かせる（スマホ版はタブの上）。
 */
export function AddMenu({ onPick }: { onPick: (action: AddAction) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="追加"
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-[0_8px_24px_rgba(28,27,25,0.28)] transition active:scale-90 motion-safe:animate-pop pc:right-10 pc:bottom-10 pc:hover:bg-stone-800"
      >
        <PlusIcon className="h-6 w-6" />
      </button>
      {open && (
        <Sheet title="追加" onClose={() => setOpen(false)}>
          <ul className="grid grid-cols-2 gap-2.5">
            {ITEMS.map((item, i) => (
              <li key={item.key} className={i === ITEMS.length - 1 ? 'col-span-2' : ''}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onPick(item.key)
                  }}
                  className="flex h-full w-full items-start gap-3 rounded-2xl bg-white p-3.5 text-left ring-1 ring-stone-200/80 transition active:scale-[0.98] pc:hover:ring-stone-300"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-ink">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                      <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-stone-500">{item.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </>
  )
}
