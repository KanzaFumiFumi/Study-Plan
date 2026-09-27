import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { TAB_KEYS, TabBar, type TabKey } from './components/TabBar.tsx'
import { ScreenTitle } from './components/ui.tsx'
import { SettingsScreen } from './screens/SettingsScreen.tsx'

function tabFromHash(): TabKey {
  const key = window.location.hash.slice(1) as TabKey
  return TAB_KEYS.includes(key) ? key : 'today'
}

export function Shell({ user }: { user: User }) {
  const [tab, setTab] = useState<TabKey>(tabFromHash)

  // 再読み込みしても同じタブを開くよう、URLの # に今のタブを入れておく
  useEffect(() => {
    history.replaceState(null, '', `#${tab}`)
    window.scrollTo(0, 0)
  }, [tab])

  return (
    <div className="mx-auto min-h-full max-w-lg">
      <main className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
        {tab === 'settings' ? (
          <SettingsScreen user={user} />
        ) : (
          <>
            <ScreenTitle>{{ today: '今日', shelf: '本棚', exams: '試験' }[tab]}</ScreenTitle>
            <p className="text-sm text-slate-500">準備中</p>
          </>
        )}
      </main>
      <TabBar current={tab} onChange={setTab} />
    </div>
  )
}
