import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white active:bg-stone-700 disabled:bg-stone-300',
  secondary: 'bg-white text-stone-800 ring-1 ring-stone-300 active:bg-stone-100 disabled:text-stone-400',
  danger: 'bg-white text-red-700 ring-1 ring-red-200 active:bg-red-50 disabled:text-red-300',
  ghost: 'text-ink underline-offset-4 active:underline disabled:text-stone-400',
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
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${VARIANTS[variant]} ${className}`}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 ring-1 ring-stone-200 ${className}`}>{children}</div>
}

export function ScreenTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-2">
      <h1 className="text-2xl font-bold tracking-wider">{children}</h1>
      {action}
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  )
}

/** 入力欄の見た目（幅なし）。幅を指定したいときに使う */
export const inputBaseClass =
  'block rounded-xl border-0 bg-white px-3 py-2 ring-1 ring-stone-300 focus:ring-2 focus:ring-ink focus:outline-none'

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
          className={`rounded-lg py-1.5 text-sm font-medium ${
            o.value === value ? 'bg-white text-ink shadow-sm' : 'text-stone-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 選択肢をボタンで並べる（予定の種類・何日前など） */
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
          className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
            o.value === value ? 'bg-ink font-semibold text-white ring-ink' : 'bg-white text-stone-700 ring-stone-300'
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
    <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}>
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
    <button type="button" onClick={onClick} className="-ml-1 mb-3 flex items-center gap-1 text-sm text-stone-600">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
        <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </button>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">{children}</p>
}
