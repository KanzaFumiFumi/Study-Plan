import type { User } from 'firebase/auth'
import { signOutUser } from '../firebase.ts'
import { Button, Card, ScreenTitle } from '../components/ui.tsx'

export function SettingsScreen({ user }: { user: User }) {
  return (
    <>
      <ScreenTitle>設定</ScreenTitle>
      <Card className="space-y-3">
        <p className="text-sm text-slate-600">
          ログイン中：<span className="font-medium text-slate-900">{user.email ?? user.displayName ?? '（不明）'}</span>
        </p>
        <Button variant="secondary" className="w-full" onClick={() => signOutUser()}>
          ログアウト
        </Button>
      </Card>
    </>
  )
}
