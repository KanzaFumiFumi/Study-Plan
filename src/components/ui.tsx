import type { ButtonHTMLAttributes, ReactNode } from 'react'

// 共通の部品。v0.6 で見た目をそろえた：白いカードに細い線、黒い主ボタン、押すと少し縮む。

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'soft'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white shadow-sm active:bg-stone-700 disabled:bg-stone-300 disabled:shadow-none pc:hover:bg-stone-800',
  secondary: 'bg-white text-stone-800 ring-1 ring-stone-300 active:bg-stone-100 disabled:text-stone-400 pc:hover:bg-stone-50',
  soft: 'bg-stone-200/70 text-stone-800 active:bg-stone-300/70 disabled:text-stone-400 pc:hover:bg-stone-200',
  danger: 'bg-white text-red-700 ring-1 ring-red-200 active:bg-red-50 disabled:text-red-300 pc:hover:bg-red-50',
  ghost: 'text-ink underline-offset-4 active:underline disabled:text-stone-400 pc:hover:underline',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-150 enabled:active:scale-[0.98] ${VARIANTS[variant]} ${className}`}
    />
  )
}

/** 丸い小さなボタン（「?」・閉じる・月を送るなど）。label は読み上げ用 */
export function IconButton({
  label,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-600 transition active:scale-95 active:bg-stone-200/70 disabled:opacity-30 pc:hover:bg-stone-200/60 ${className}`}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(28,27,25,0.04)] ring-1 ring-stone-200/80 ${className}`}>{children}</div>
}

/** 画面の見出し。eyebrow は上に小さく出す補足（日付など） */
export function ScreenTitle({ children, action, eyebrow }: { children: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3 motion-safe:animate-rise">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-medium tracking-[0.12em] text-stone-500">{eyebrow}</p>}
        <h1 className="truncate text-[28px] leading-tight font-bold tracking-wider">{children}</h1>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

/** 区切りの見出し（左に名前、右に件数やボタン） */
export function SectionHeader({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-2 px-1">
      <h2 className="text-[13px] font-bold tracking-[0.12em] text-stone-500">{children}</h2>
      {aside && <div className="num text-xs text-stone-500">{aside}</div>}
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-stone-500">{hint}</span>}
    </label>
  )
}

/** 入力欄の見た目（幅なし）。幅を指定したいときに使う */
export const inputBaseClass =
  'block rounded-xl border-0 bg-white px-3 py-2.5 ring-1 ring-stone-300 transition focus:ring-2 focus:ring-ink focus:outline-none'

export const inputClass = `${inputBaseClass} w-full`

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="grid rounded-xl bg-stone-200/70 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={`rounded-lg py-1.5 text-sm font-medium transition ${
            o.value === value ? 'bg-white text-ink shadow-sm' : 'text-stone-500 pc:hover:text-stone-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 選択肢をボタンで並べる（予定の種類・何日前・目標の周回数など） */
export function ChoiceChips<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T | null
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={`rounded-full px-3.5 py-1.5 text-sm ring-1 transition active:scale-95 ${
            o.value === value ? 'bg-ink font-semibold text-white ring-ink' : 'bg-white text-stone-700 ring-stone-300 pc:hover:bg-stone-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Badge({ children, tone = 'plain' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-semibold ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  )
}

/** バッジの色。落ち着いた配色にするため、色は「遅れ」と「残り」だけに使う */
export type BadgeTone = 'plain' | 'ink' | 'outline' | 'soft' | 'warn' | 'danger'

const BADGE_TONES: Record<BadgeTone, string> = {
  plain: 'bg-stone-100 text-stone-600',
  ink: 'bg-ink text-white',
  outline: 'text-stone-700 ring-1 ring-inset ring-stone-300',
  soft: 'bg-stone-200 text-stone-800',
  warn: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
}

export function BackButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 mb-3 flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-stone-600 transition active:bg-stone-200/60 pc:hover:bg-stone-200/50"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
        <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </button>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-stone-300 px-5 py-7 text-center text-sm leading-relaxed text-stone-500">
      {children}
    </p>
  )
}

/** 細い線の矢印（文字の ↑↓‹› は端末によって色つきで出るので、線で描く） */
export function Chevron({ direction, className = 'h-4 w-4' }: { direction: 'up' | 'down' | 'left' | 'right'; className?: string }) {
  const d = { up: 'm6 15 6-6 6 6', down: 'm6 9 6 6 6-6', left: 'm15 6-6 6 6 6', right: 'm9 6 6 6-6 6' }[direction]
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** ＋ の線の記号 */
export function PlusIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}
