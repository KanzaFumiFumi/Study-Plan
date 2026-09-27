import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** 画面の下から出てくる入力シート。表示するときだけ描画する（{open && <Sheet …/>}） */
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
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
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl"
      >
        <header className="flex items-center justify-between gap-2 border-b border-stone-200 px-4 py-3">
          <h2 className="font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="閉じる" className="-mr-2 rounded-lg p-2 text-stone-500 active:bg-stone-100">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="border-t border-stone-200 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}
