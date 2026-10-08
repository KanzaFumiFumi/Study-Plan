import { useLayout, type Layout } from '../hooks/useLayout.ts'

const OPTIONS: { value: Layout; label: string; icon: string }[] = [
  // スマホ
  { value: 'mobile', label: 'スマホ版', icon: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 15h2' },
  // モニター
  { value: 'pc', label: 'PC版', icon: 'M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm5 16h6m-3-4v4' },
]

/** スマホ版・PC版の切り替え（v0.5〜、ホームの画面の上）。並べ方だけが変わり、中身とデータは同じ */
export function LayoutSwitch() {
  const { layout, setLayout } = useLayout()
  return (
    <div className="inline-flex rounded-full bg-stone-200/70 p-1" role="group" aria-label="画面の配置">
      {OPTIONS.map((o) => {
        const active = o.value === layout
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setLayout(o.value)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
              active ? 'bg-white text-ink shadow-sm' : 'text-stone-500 pc:hover:text-stone-800'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
              <path d={o.icon} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
