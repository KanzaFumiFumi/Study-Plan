import { useState } from 'react'
import type { User } from 'firebase/auth'
import { signOutUser } from '../firebase.ts'
import { saveSettings } from '../data/commands.ts'
import { collectAllData, downloadJson } from '../data/exportData.ts'
import { useData } from '../data/store.tsx'
import { formatIntervals, parseIntervals, validateSettings } from '../domain/settings.ts'
import type { Settings } from '../domain/types.ts'
import { useToday } from '../hooks/useToday.ts'
import { useToast } from '../components/Toast.tsx'
import { Button, Card, Field, ScreenTitle, inputBaseClass, inputClass } from '../components/ui.tsx'

function SettingsForm() {
  const { uid, settings } = useData()
  const toast = useToast()
  const [cycle, setCycle] = useState(String(settings.cycleIntervalDays))
  const [lead, setLead] = useState(String(settings.examLeadDays))
  const [intervals, setIntervals] = useState(formatIntervals(settings.memorizeIntervals))

  const parsedIntervals = parseIntervals(intervals)
  const draft: Settings = {
    cycleIntervalDays: /^\d+$/.test(cycle) ? Number(cycle) : NaN,
    examLeadDays: /^\d+$/.test(lead) ? Number(lead) : NaN,
    memorizeIntervals: parsedIntervals ?? [],
  }
  const error = parsedIntervals === null ? '暗記の復習間隔は「1, 3, 7」のように1以上の日数で入力してください' : validateSettings(draft)
  const changed =
    draft.cycleIntervalDays !== settings.cycleIntervalDays ||
    draft.examLeadDays !== settings.examLeadDays ||
    formatIntervals(draft.memorizeIntervals) !== formatIntervals(settings.memorizeIntervals)

  function handleSave() {
    saveSettings(uid, draft)
    toast('設定を保存しました')
  }

  const numberInput = (value: string, onChange: (v: string) => void, label: string) => (
    <div className="flex items-center gap-2">
      <input
        className={`${inputBaseClass} w-24 text-right tabular-nums`}
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      />
      <span className="text-sm text-slate-600">日</span>
    </div>
  )

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">タスクの作り方</h2>
      <Field label="定例周回の間隔" hint="周回系の単元を完了してから、次の周回タスクまでの日数（初期値 7）">
        {numberInput(cycle, setCycle, '定例周回の間隔')}
      </Field>
      <Field label="試験の何日前を期限にするか" hint="試験を登録したときに作るタスクの期限（初期値 3）">
        {numberInput(lead, setLead, '試験の何日前を期限にするか')}
      </Field>
      <Field label="暗記の復習間隔" hint="段階ごとの日数をカンマ区切りで（初期値 1, 3, 7, 14, 30）。最後の間隔より先は、最後の日数を使い続けます。">
        <input className={inputClass} value={intervals} onChange={(e) => setIntervals(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-500">変更は、これから作るタスクに使われます（作成済みのタスクの期限は変わりません）。</p>
      <Button className="w-full" disabled={!changed || !!error} onClick={handleSave}>
        保存
      </Button>
    </Card>
  )
}

function ExportCard() {
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
    <Card className="space-y-3">
      <h2 className="font-semibold">バックアップ</h2>
      <p className="text-sm text-slate-600">教材・単元・範囲・試験・タスク（完了済みを含む）・設定をすべて JSON ファイルに書き出します。</p>
      <Button variant="secondary" className="w-full" disabled={busy} onClick={handleExport}>
        {busy ? '書き出し中…' : '全データを JSON で書き出す'}
      </Button>
    </Card>
  )
}

export function SettingsScreen({ user }: { user: User }) {
  return (
    <>
      <ScreenTitle>設定</ScreenTitle>
      <div className="space-y-4">
        <SettingsForm />
        <ExportCard />
        <Card className="space-y-3">
          <h2 className="font-semibold">アカウント</h2>
          <p className="text-sm text-slate-600">
            ログイン中：<span className="font-medium text-slate-900">{user.email ?? user.displayName ?? '（不明）'}</span>
          </p>
          <Button variant="secondary" className="w-full" onClick={() => signOutUser()}>
            ログアウト
          </Button>
        </Card>
      </div>
    </>
  )
}
