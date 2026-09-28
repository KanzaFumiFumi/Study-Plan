import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { DataProvider, useData } from './data/store.tsx'
import { NavContext } from './hooks/useNav.ts'
import { TAB_KEYS, TabBar, type TabKey } from './components/TabBar.tsx'
import { ToastProvider } from './components/Toast.tsx'
import { ExamsScreen } from './screens/ExamsScreen.tsx'
import { GuideScreen } from './screens/GuideScreen.tsx'
import { ListsScreen } from './screens/ListsScreen.tsx'
import { SettingsScreen } from './screens/SettingsScreen.tsx'
import { ShelfScreen } from './screens/ShelfScreen.tsx'
import { TodayScreen } from './screens/TodayScreen.tsx'
import { SyncStatus } from './components/SyncStatus.tsx'

function tabFromHash(): TabKey {
  const key = window.location.hash.slice(1) as TabKey
  return TAB_KEYS.includes(key) ? key : 'today'
}

function Screen({ tab, user, onBack }: { tab: TabKey; user: User; onBack: () => void }) {
  const { loading } = useData()
  if (tab === 'guide') return <GuideScreen onBack={onBack} />
  if (loading) return <p className="py-20 text-center text-sm text-stone-400">読み込み中…</p>
  switch (tab) {
    case 'today':
      return <TodayScreen />
    case 'lists':
      return <ListsScreen />
    case 'shelf':
      return <ShelfScreen />
    case 'exams':
      return <ExamsScreen />
    case 'settings':
      return <SettingsScreen user={user} />
  }
}

export function Shell({ user }: { user: User }) {
  const [tab, setTab] = useState<TabKey>(tabFromHash)
  // 使い方の画面から「戻る」ときの行き先
  const [previousTab, setPreviousTab] = useState<TabKey>('today')

  function navigate(next: TabKey) {
    if (next === 'guide' && tab !== 'guide') setPreviousTab(tab)
    setTab(next)
  }

  // 再読み込みしても同じタブを開くよう、URLの # に今のタブを入れておく
  useEffect(() => {
    history.replaceState(null, '', `#${tab}`)
    window.scrollTo(0, 0)
  }, [tab])

  return (
    <DataProvider uid={user.uid}>
      <ToastProvider>
        <NavContext.Provider value={navigate}>
          <div className="mx-auto min-h-full max-w-lg">
            <main className="px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
              <SyncStatus />
              <Screen key={tab} tab={tab} user={user} onBack={() => setTab(previousTab)} />
            </main>
            <TabBar current={tab} onChange={navigate} />
          </div>
        </NavContext.Provider>
      </ToastProvider>
    </DataProvider>
  )
}
