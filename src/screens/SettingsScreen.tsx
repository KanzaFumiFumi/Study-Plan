import { useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { signOutUser } from '../firebase.ts'
import { saveSettings } from '../data/commands.ts'
import { collectAllData, downloadJson } from '../data/exportData.ts'
import { useData } from '../data/store.tsx'
import { validateSettings } from '../domain/settings.ts'
import type { Settings } from '../domain/types.ts'
import { useNav } from '../hooks/useNav.ts'
import { useToday } from '../hooks/useToday.ts'
import { useToast } from '../components/Toast.tsx'
import { Button, Chevron, ScreenTitle, SectionHeader, inputBaseClass } from '../components/ui.tsx'

// 設定（v0.6 で見た目を整理。暗記の復習間隔はなくした：暗記は教材ごとの目標の周回数とカレンダーで決める）

/** 設定の1つのまとまり（白いカードに行を並べる） */
function Group({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section>
      <SectionHeader>{title}</SectionHeader>
      <div className="divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200/80">{children}</div>
      {note && <p className="mt-2 px-2 text-xs leading-relaxed text-stone-500">{note}</p>}
    </section>
  )
}

/** 日数を入れる行 */
function DaysRow({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-4 px-5 py-4">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">{hint}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <input
          className={`${inputBaseClass} num w-20 text-right`}
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        />
        <span className="text-sm text-stone-600">日</span>
      </span>
    </label>
  )
}

function TaskSettings() {
  const { uid, settings } = useData()
  const toast = useToast()
  const [cycle, setCycle] = useState(String(settings.cycleIntervalDays))
  const [lead, setLead] = useState(String(settings.examLeadDays))

  const draft: Settings = {
    cycleIntervalDays: /^\d+$/.test(cycle) ? Number(cycle) : NaN,
    examLeadDays: /^\d+$/.test(lead) ? Number(lead) : NaN,
  }
  const error = validateSettings(draft)
  const changed = draft.cycleIntervalDays !== settings.cycleIntervalDays || draft.examLeadDays !== settings.examLeadDays

  function handleSave() {
    saveSettings(uid, draft)
    toast('設定を保存しました')
  }

  return (
    <Group
      title="タスクの作り方"
      note="変更は、これから作るタスクに使われます（作成済みのタスクの期限は変わりません）。暗記の周回数は、本棚の教材ごとに決めます。"
    >
      <DaysRow label="定例周回の間隔" hint="周回系・復習系の単元を完了してから、次の周までの日数（初期値 7）" value={cycle} onChange={setCycle} />
      <DaysRow
        label="予定の何日前までに仕上げるか"
        hint="新しい予定の最初の値（初期値 3）。予定ごとに変えられます"
        value={lead}
        onChange={setLead}
      />
      {(changed || error) && (
        <div className="flex items-center gap-3 bg-stone-50 px-5 py-3">
          <p className={`min-w-0 flex-1 text-xs ${error ? 'text-red-700' : 'text-stone-500'}`}>{error ?? '変更があります'}</p>
          <Button className="px-5" disabled={!changed || !!error} onClick={handleSave}>
            保存
          </Button>
        </div>
      )}
    </Group>
  )
}

function ExportRow() {
  const { uid } = useData()
  const today = useToday()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    setBusy(true)
    try {
      const data = await collectAllData(uid)
      downloadJson(data, `study-plan-${today}.json`)
      toast('書き出しました')
    } catch (e) {
      console.error(e)
      toast('書き出しに失敗しました', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={busy}
      className="flex w-full items-center gap-4 px-5 py-4 text-left transition active:bg-stone-50 disabled:opacity-50 pc:hover:bg-stone-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{busy ? '書き出し中…' : '全データを JSON で書き出す'}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">
          教材・単元・範囲・予定・タスク（完了済みを含む）・設定をすべて1つのファイルに
        </span>
      </span>
      <Chevron direction="right" className="h-4 w-4 text-stone-400" />
    </button>
  )
}

export function SettingsScreen({ user }: { user: User }) {
  const nav = useNav()
  return (
    <div className="pc:max-w-2xl">
      <ScreenTitle>設定</ScreenTitle>
      <div className="space-y-8">
        <button
          type="button"
          onClick={() => nav('guide')}
          className="flex w-full items-center gap-4 rounded-3xl bg-ink px-5 py-4 text-left text-white shadow-[0_10px_30px_-12px_rgba(28,27,25,0.6)] transition active:scale-[0.99]"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-bold tracking-wide">使い方</span>
            <span className="block text-xs text-stone-400">勉強の流れを図で見る</span>
          </span>
          <Chevron direction="right" className="h-5 w-5 text-stone-400" />
        </button>

        <TaskSettings />

        <Group title="バックアップ">
          <ExportRow />
        </Group>

        <Group title="アカウント">
          <div className="px-5 py-4">
            <p className="text-xs text-stone-500">ログイン中</p>
            <p className="mt-0.5 truncate text-sm font-semibold">{user.email ?? user.displayName ?? '（不明）'}</p>
          </div>
          <button
            type="button"
            onClick={() => signOutUser()}
            className="w-full px-5 py-4 text-left text-sm font-semibold text-red-700 transition active:bg-red-50 pc:hover:bg-red-50/60"
          >
            ログアウト
          </button>
        </Group>

        <p className="num text-center text-xs tracking-wider text-stone-400">学習ワークフロー v{__APP_VERSION__}</p>
      </div>
    </div>
  )
}

