import { useEffect, useState } from 'react'
import { useData } from '../data/store.tsx'

function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

/** オフラインのときや、まだサーバーに届いていない変更があるときに小さく知らせる */
export function SyncStatus() {
  const { hasPendingWrites } = useData()
  const online = useOnline()
  if (online && !hasPendingWrites) return null
  return (
    <div className="mb-3 flex justify-center">
      <span
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          online ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
        }`}
      >
        {online ? '同期中…' : hasPendingWrites ? 'オフライン：つながったら同期します' : 'オフライン'}
      </span>
    </div>
  )
}
