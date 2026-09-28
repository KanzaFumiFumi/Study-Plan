/** 画面。guide（使い方）はタブバーには出さず、今日・設定の画面から開く */
export type TabKey = 'today' | 'lists' | 'shelf' | 'exams' | 'settings' | 'guide'

export const TAB_KEYS: TabKey[] = ['today', 'lists', 'shelf', 'exams', 'settings', 'guide']

const TABS: { key: Exclude<TabKey, 'guide'>; label: string; icon: string }[] = [
  // チェックつきカレンダー
  { key: 'today', label: '今日', icon: 'M7 3v3m10-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm4 8 2 2 4-4' },
  // 並んだリスト（ボード）
  { key: 'lists', label: 'リスト', icon: 'M4.5 4h4a.5.5 0 0 1 .5.5v15a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-15a.5.5 0 0 1 .5-.5Zm5.5 0h4a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-9A.5.5 0 0 1 10 4Zm5.5 0h4a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5Z' },
  // 本
  { key: 'shelf', label: '本棚', icon: 'M5 4h4v16H5zM10 4h4v16h-4zM15.5 4.8l3.8-1 3.1 15.4-3.8 1z' },
  // 旗
  { key: 'exams', label: '予定', icon: 'M5 21V4m0 0h11l-2 4 2 4H5' },
  // 歯車
  {
    key: 'settings',
    label: '設定',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7.5 7.5 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z',
  },
]

export function TabBar({ current, onChange }: { current: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.key === current
          return (
            <li key={tab.key}>
              <button
                type="button"
                onClick={() => onChange(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-0.5 py-2 text-xs ${
                  active ? 'font-semibold text-ink' : 'text-stone-400'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.2 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
