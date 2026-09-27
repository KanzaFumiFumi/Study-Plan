import { useEffect, useState } from 'react'
import { FirebaseError } from 'firebase/app'
import { USE_EMULATOR } from '../config.ts'
import { signInAsTestUser, signInWithGoogle, takeRedirectError } from '../firebase.ts'
import { Button } from '../components/ui.tsx'

function errorMessage(error: unknown): string | null {
  if (!(error instanceof FirebaseError)) return error ? 'ログインできませんでした。' : null
  switch (error.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return null
    case 'auth/popup-blocked':
      return 'ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。'
    case 'auth/network-request-failed':
      return 'ネットワークにつながっていません。つながってからもう一度お試しください。'
    case 'auth/unauthorized-domain':
      return 'このドメインからのログインが許可されていません（Firebase コンソールの「承認済みドメイン」を確認してください）。'
    default:
      return `ログインできませんでした（${error.code}）。`
  }
}

export function LoginScreen() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    takeRedirectError().then((e) => setError(errorMessage(e)))
  }, [])

  async function handleLogin() {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 pb-[env(safe-area-inset-bottom)]">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src="/icon.svg" alt="" className="h-20 w-20" />
        <h1 className="text-2xl font-bold">学習ワークフロー</h1>
        <p className="text-sm text-slate-500">問題集の周回と暗記のタスクを自動で作るToDo</p>
      </div>
      <Button onClick={handleLogin} disabled={busy} className="flex w-full max-w-xs items-center justify-center gap-2 py-3">
        <svg viewBox="0 0 24 24" className="h-5 w-5 rounded-full bg-white p-0.5" aria-hidden>
          <path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8Z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.8 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.1H2.1a11 11 0 0 0 0 9.8L5.8 14Z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1L5.8 10c.9-2.7 3.3-4.6 6.2-4.6Z" />
        </svg>
        {busy ? 'ログイン中…' : 'Googleでログイン'}
      </Button>
      {error && <p className="max-w-xs text-center text-sm text-red-600">{error}</p>}
      {USE_EMULATOR && (
        <div className="flex w-full max-w-xs flex-col gap-2 rounded-xl border border-dashed border-amber-400 p-3">
          <p className="text-center text-xs text-amber-700">エミュレータ接続中（開発用）</p>
          {['alice', 'bob'].map((name) => (
            <Button key={name} variant="secondary" onClick={() => signInAsTestUser(name).catch((e) => setError(errorMessage(e)))}>
              テスト用アカウント {name} でログイン
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
