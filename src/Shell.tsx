import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { DataProvider, useData } from './data/store.tsx'
import { TAB_KEYS, TabBar, type TabKey } from './components/TabBar.tsx'
import { ToastProvider } from './components/Toast.tsx'
import { ScreenTitle } from './components/ui.tsx'
import { SettingsScreen } from './screens/SettingsScreen.tsx'
import { ShelfScreen } from './screens/ShelfScreen.tsx'
import { TodayScreen } from './screens/TodayScreen.tsx'
import { SyncStatus } from './components/SyncStatus.tsx'

function tabFromHash(): TabKey {
  const key = window.location.hash.slice(1) as TabKey
  return TAB_KEYS.includes(key) ? key : 'today'
}

function Screen({ tab, user }: { tab: TabKey; user: User }) {
  const { loading } = useData()
  if (loading) return <p className="py-20 text-center text-sm text-slate-400">読み込み中…</p>
  switch (tab) {
    case 'today':
      return <TodayScreen />
    case 'shelf':
      return <ShelfScreen />
    case 'settings':
      return <SettingsScreen user={user} />
    default:
      return (
        <>
          <ScreenTitle>試験</ScreenTitle>
          <p className="text-sm text-slate-500">準備中</p>
        </>
      )
  }
}

export function Shell({ user }: { user: User }) {
  const [tab, setTab] = useState<TabKey>(tabFromHash)

  // 再読み込みしても同じタブを開くよう、URLの # に今のタブを入れておく
  useEffect(() => {
    history.replaceState(null, '', `#${tab}`)
    window.scrollTo(0, 0)
  }, [tab])

  return (
    <DataProvider uid={user.uid}>
      <ToastProvider>
        <div className="mx-auto min-h-full max-w-lg">
          <main className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
            <SyncStatus />
            <Screen key={tab} tab={tab} user={user} />
          </main>
          <TabBar current={tab} onChange={setTab} />
        </div>
      </ToastProvider>
    </DataProvider>
  )
}
