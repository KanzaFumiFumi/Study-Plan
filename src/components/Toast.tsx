import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { FirebaseError } from 'firebase/app'
import { onDataError } from '../data/errors.ts'

type Tone = 'info' | 'error'
type ShowToast = (message: string, tone?: Tone) => void

const ToastContext = createContext<ShowToast>(() => {})

export function useToast(): ShowToast {
  return useContext(ToastContext)
}

/** 画面下（タブバーの上）に短いお知らせを出す。保存の失敗もここに表示する */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: Tone; id: number } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback<ShowToast>((message, tone = 'info') => {
    window.clearTimeout(timer.current)
    setToast({ message, tone, id: Date.now() })
    timer.current = window.setTimeout(() => setToast(null), tone === 'error' ? 6000 : 3000)
  }, [])

  useEffect(
    () =>
      onDataError((error) => {
        const code = error instanceof FirebaseError ? `（${error.code}）` : ''
        show(`保存または読み込みに失敗しました${code}`, 'error')
      }),
    [show],
  )

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-50 pc:bottom-8 pc:left-56 flex justify-center px-4"
        >
          <p
            className={`max-w-md rounded-xl px-4 py-2.5 text-sm text-white shadow-lg ${
              toast.tone === 'error' ? 'bg-red-700' : 'bg-ink'
            }`}
          >
            {toast.message}
          </p>
        </div>
      )}
    </ToastContext.Provider>
  )
}
