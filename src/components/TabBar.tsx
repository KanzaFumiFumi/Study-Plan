/**
 * 画面。guide（使い方）はタブバーには出さず、ホーム・設定の画面から開く。
 * v0.6 で「今日」と「予定」をまとめて「ホーム」にした（古い #today・#exams は Shell でホームに読み替える）。
 */
export type TabKey = 'home' | 'lists' | 'shelf' | 'archive' | 'settings' | 'guide'

export const TAB_KEYS: TabKey[] = ['home', 'lists', 'shelf', 'archive', 'settings', 'guide']

const TABS: { key: Exclude<TabKey, 'guide'>; label: string; icon: string }[] = [
  // 家
  { key: 'home', label: 'ホーム', icon: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z' },
  // 並んだリスト（ボード）
  { key: 'lists', label: 'リスト', icon: 'M4.5 4h4a.5.5 0 0 1 .5.5v15a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-15a.5.5 0 0 1 .5-.5Zm5.5 0h4a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-9A.5.5 0 0 1 10 4Zm5.5 0h4a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5Z' },
  // 本
  { key: 'shelf', label: '本棚', icon: 'M5 4h4v16H5zM10 4h4v16h-4zM15.5 4.8l3.8-1 3.1 15.4-3.8 1z' },
  // 箱（完了済みのタスクと、解き終えた教材）
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
      strokeWidth={active ? 2.1 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  )
}

/** スマホ版：画面の下のタブ。今いる画面には下に小さな点 */
export function TabBar({ current, onChange }: { current: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200/80 bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.key === current
          return (
            <li key={tab.key}>
              <button
                type="button"
                onClick={() => onChange(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex w-full flex-col items-center gap-0.5 pt-2 pb-2.5 text-[11px] tracking-tight whitespace-nowrap transition active:scale-95 ${
                  active ? 'font-bold text-ink' : 'text-stone-400'
                }`}
              >
                <TabIcon path={tab.icon} active={active} className="h-6 w-6" />
                {tab.label}
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full bg-ink transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}
                  aria-hidden
                />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** PC版：画面の左のメニュー。中身はタブと同じ */
export function SideNav({ current, onChange }: { current: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-stone-200/80 bg-paper px-4 py-7">
      <div className="flex items-center gap-3 px-2 pb-8">
        <img src="/icon.svg" alt="" className="h-9 w-9 rounded-xl" />
        <div>
          <p className="text-sm leading-tight font-bold tracking-wider">学習ワークフロー</p>
          <p className="text-[11px] text-stone-500">周回と暗記のToDo</p>
        </div>
      </div>
      <ul className="space-y-1">
        {TABS.map((tab) => {
          const active = tab.key === current
          return (
            <li key={tab.key}>
              <button
                type="button"
                onClick={() => onChange(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  active ? 'bg-ink font-semibold text-white shadow-sm' : 'text-stone-600 hover:bg-stone-200/60 hover:text-ink'
                }`}
              >
                <TabIcon path={tab.icon} active={active} className="h-5 w-5" />
                {tab.label}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="num mt-auto px-3 text-xs text-stone-400">v{__APP_VERSION__}</p>
    </nav>
  )
}
