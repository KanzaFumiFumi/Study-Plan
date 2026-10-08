import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * 画面の下から出てくる入力シート（PC版では画面の中央に出す）。表示するときだけ描画する（{open && <Sheet …/>}）。
 * subtitle はタイトルの上に小さく出す補足。
 */
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center pc:items-center pc:p-6">
      <div className="absolute inset-0 bg-stone-900/45 backdrop-blur-[2px] motion-safe:animate-fade-in" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl bg-paper shadow-2xl motion-safe:animate-sheet-up pc:max-h-[85dvh] pc:rounded-3xl"
      >
        {/* 下から出るシートのつまみ（見た目だけ） */}
        <div className="flex justify-center pt-2.5 pc:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-stone-300" />
        </div>
        <header className="flex items-start justify-between gap-2 px-5 pt-3 pb-3 pc:pt-5">
          <div className="min-w-0">
            {subtitle && <p className="mb-0.5 text-xs font-medium tracking-[0.14em] text-stone-500">{subtitle}</p>}
            <h2 className="truncate text-lg font-bold tracking-wide">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-200/70 text-stone-600 transition active:scale-95 pc:hover:bg-stone-300/70"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="thin-scroll flex-1 overflow-y-auto px-5 pt-1 pb-5">{children}</div>
        {footer && (
          <div className="border-t border-stone-200/80 bg-paper px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pc:rounded-b-3xl pc:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
