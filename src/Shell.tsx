import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { DataProvider, useData } from './data/store.tsx'
import { LayoutContext, useLayoutState } from './hooks/useLayout.ts'
import { NavContext } from './hooks/useNav.ts'
import { SideNav, TAB_KEYS, TabBar, type TabKey } from './components/TabBar.tsx'
import { ToastProvider } from './components/Toast.tsx'
import { ArchiveScreen } from './screens/ArchiveScreen.tsx'
import { GuideScreen } from './screens/GuideScreen.tsx'
import { ListsScreen } from './screens/ListsScreen.tsx'
import { SettingsScreen } from './screens/SettingsScreen.tsx'
import { ShelfScreen } from './screens/ShelfScreen.tsx'
import { HomeScreen } from './screens/HomeScreen.tsx'
import { SyncStatus } from './components/SyncStatus.tsx'

function tabFromHash(): TabKey {
  const key = window.location.hash.slice(1)
  // v0.5 までの「今日」「予定」はホームにまとめた
  if (key === 'today' || key === 'exams') return 'home'
  return TAB_KEYS.includes(key as TabKey) ? (key as TabKey) : 'home'
}

function Screen({ tab, user, onBack }: { tab: TabKey; user: User; onBack: () => void }) {
  const { loading } = useData()
  if (tab === 'guide') return <GuideScreen onBack={onBack} />
  if (loading) return <p className="py-20 text-center text-sm text-stone-400">読み込み中…</p>
  switch (tab) {
    case 'home':
      return <HomeScreen />
    case 'lists':
      return <ListsScreen />
    case 'shelf':
      return <ShelfScreen />
    case 'archive':
      return <ArchiveScreen />
    case 'settings':
      return <SettingsScreen user={user} />
  }
}

export function Shell({ user }: { user: User }) {
  const [tab, setTab] = useState<TabKey>(tabFromHash)
  // 使い方の画面から「戻る」ときの行き先
  const [previousTab, setPreviousTab] = useState<TabKey>('home')
  // スマホ版・PC版（v0.5〜）。中身は同じで、並べ方だけを変える
  const [layout, setLayout] = useLayoutState()

  function navigate(next: TabKey) {
    if (next === 'guide' && tab !== 'guide') setPreviousTab(tab)
    setTab(next)
  }

  // 再読み込みしても同じタブを開くよう、URLの # に今のタブを入れておく
  useEffect(() => {
    history.replaceState(null, '', `#${tab}`)
    window.scrollTo(0, 0)
  }, [tab])

  // 画面を切り替えたら、ふわっと出す
  const screen = (
    <div key={tab} className="motion-safe:animate-fade-in">
      <Screen tab={tab} user={user} onBack={() => setTab(previousTab)} />
    </div>
  )

  return (
    <DataProvider uid={user.uid}>
      <ToastProvider>
        <NavContext.Provider value={navigate}>
          <LayoutContext.Provider value={{ layout, setLayout }}>
            {layout === 'pc' ? (
              <div className="min-h-full">
                <SideNav current={tab} onChange={navigate} />
                <main className="ml-60 px-10 pt-8 pb-16">
                  <div className="mx-auto max-w-6xl">
                    <SyncStatus />
                    {screen}
                  </div>
                </main>
              </div>
            ) : (
              <div className="mx-auto min-h-full max-w-lg">
                <main className="px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
                  <SyncStatus />
                  {screen}
                </main>
                <TabBar current={tab} onChange={navigate} />
              </div>
            )}
          </LayoutContext.Provider>
        </NavContext.Provider>
      </ToastProvider>
    </DataProvider>
  )
}
