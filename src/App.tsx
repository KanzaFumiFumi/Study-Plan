import { useAuthUser } from './data/useAuthUser.ts'
import { LoginScreen } from './screens/LoginScreen.tsx'
import { Shell } from './Shell.tsx'

export default function App() {
  const user = useAuthUser()

  if (user === undefined) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-stone-400">読み込み中…</div>
  }
  if (user === null) return <LoginScreen />
  return <Shell key={user.uid} user={user} />
}
