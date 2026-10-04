/** 画面。guide（使い方）はタブバーには出さず、今日・設定の画面から開く */
export type TabKey = 'today' | 'lists' | 'shelf' | 'exams' | 'archive' | 'settings' | 'guide'

export const TAB_KEYS: TabKey[] = ['today', 'lists', 'shelf', 'exams', 'archive', 'settings', 'guide']

const TABS: { key: Exclude<TabKey, 'guide'>; label: string; icon: string }[] = [
  // チェックつきカレンダー
  { key: 'today', label: '今日', icon: 'M7 3v3m10-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm4 8 2 2 4-4' },
  // 並んだリスト（ボード）
  { key: 'lists', label: 'リスト', icon: 'M4.5 4h4a.5.5 0 0 1 .5.5v15a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-15a.5.5 0 0 1 .5-.5Zm5.5 0h4a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-9A.5.5 0 0 1 10 4Zm5.5 0h4a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5Z' },
  // 本
  { key: 'shelf', label: '本棚', icon: 'M5 4h4v16H5zM10 4h4v16h-4zM15.5 4.8l3.8-1 3.1 15.4-3.8 1z' },
  // 旗
  { key: 'exams', label: '予定', icon: 'M5 21V4m0 0h11l-2 4 2 4H5' },
  // 箱（v0.5〜：完了済みのタスクと、解き終えた教材）
  { key: 'archive', label: 'アーカイブ', icon: 'M3.5 4.5h17v4h-17zM5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M10 12.5h4' },
  // 歯車
  {
    key: 'settings',
    label: '設定',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7.5 7.5 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z',
  },
]

function TabIcon({ path, active, className }: { path: string; active: boolean; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  )
}

/** スマホ版：画面の下のタブ */
export function TabBar({ current, onChange }: { current: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-6">
        {TABS.map((tab) => {
          const active = tab.key === current
          return (
            <li key={tab.key}>
              <button
                type="button"
                onClick={() => onChange(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] tracking-tight whitespace-nowrap ${
                  active ? 'font-semibold text-ink' : 'text-stone-400'
                }`}
              >
                <TabIcon path={tab.icon} active={active} className="h-6 w-6" />
                {tab.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** PC版（v0.5〜）：画面の左のメニュー。中身はタブと同じ */
export function SideNav({ current, onChange }: { current: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-stone-200 bg-white px-3 py-6">
      <p className="px-3 pb-6 text-sm font-bold tracking-wider">学習ワークフロー</p>
      <ul className="space-y-1">
        {TABS.map((tab) => {
          const active = tab.key === current
          return (
            <li key={tab.key}>
              <button
                type="button"
                onClick={() => onChange(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                  active ? 'bg-ink font-semibold text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <TabIcon path={tab.icon} active={active} className="h-5 w-5" />
                {tab.label}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-auto px-3 text-xs text-stone-400">v{__APP_VERSION__}</p>
    </nav>
  )
}
