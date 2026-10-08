import { saveChangeSet } from '../data/commands.ts'
import { useData } from '../data/store.tsx'
import { viewTask } from '../data/taskView.ts'
import { sendToArchive, uncompleteTask } from '../domain/archive.ts'
import { completePlainTask } from '../domain/cycle.ts'
import { lapLabel } from '../domain/labels.ts'
import { completeMemorizeTask } from '../domain/memorize.ts'
import type { Task } from '../domain/types.ts'
import { useToday } from '../hooks/useToday.ts'
import { useToast } from './Toast.tsx'

/** チェックリストの四角 */
export function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
        checked ? 'bg-ink text-white motion-safe:animate-pop' : 'bg-white ring-2 ring-stone-300'
      }`}
      aria-hidden
    >
      {checked && (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

/** 見るだけの欄（今日提出の課題・アーカイブ）の済み／未完了の印。押せる四角と区別するため丸にする */
export function DoneMark({ done }: { done: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? 'bg-ink text-white' : 'ring-2 ring-stone-300'}`}
      aria-hidden
    >
      {done && (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

/** 完了済みのタスクの「アーカイブへ」ボタン（v0.5〜） */
export function ArchiveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-stone-600 ring-1 ring-stone-300 active:bg-stone-100"
    >
      アーカイブへ
    </button>
  )
}

/**
 * ホームのチェックリスト・リスト・アーカイブで共通の操作（v0.5〜）。
 * - check：単元にも範囲にも紐づかない課題と、暗記（v0.6〜、入力なし）はそのまま完了。残りの印の数が要るものは openSheet（完了のシート）を開く
 * - uncheck：チェックを外して未完了に戻す（単元・範囲の記録も完了する前に戻す）
 * - restore：アーカイブから未完了に戻す（v0.6〜。uncheck と同じで、すべての完了済みと照らし合わせる）
 * - archive：完了済みをアーカイブへ送る（リストから消える）
 */
export function useTaskActions(openSheet: (task: Task) => void) {
  const data = useData()
  const today = useToday()
  const toast = useToast()

  function check(task: Task) {
    const view = viewTask(task, data)
    if (view.unit) {
      openSheet(task)
      return
    }
    if (view.range && view.material) {
      const { changes, lap, finished } = completeMemorizeTask({ task, range: view.range, material: view.material, today, now: Date.now() })
      saveChangeSet(data.uid, changes)
      toast(finished ? `「${view.range.label}」が目標の${view.material.targetLaps}周を終えました` : `${lapLabel(lap)}が終わりました`)
      return
    }
    saveChangeSet(data.uid, completePlainTask(task, Date.now()))
    toast('完了しました')
  }

  function reopen(task: Task, doneTasks: Task[], done: string) {
    const view = viewTask(task, data)
    let changes
    try {
      changes = uncompleteTask({ task, unit: view.unit, range: view.range, openTasks: data.openTasks, doneTasks })
    } catch (e) {
      toast(e instanceof Error ? e.message : '戻せませんでした', 'error')
      return
    }
    // 記録が元に戻るときだけ確かめる
    const changesRecord = changes.updateUnits.length > 0 || changes.updateRanges.length > 0
    if (
      changesRecord &&
      !window.confirm('未完了に戻しますか？\n（単元・範囲の周回の記録も完了する前に戻り、自動でできた次の周回は消えます）')
    ) {
      return
    }
    saveChangeSet(data.uid, changes)
    toast(done)
  }

  return {
    check,
    uncheck: (task: Task) => reopen(task, data.doneToday, 'チェックを外しました'),
    restore: (task: Task, doneTasks: Task[]) => reopen(task, doneTasks, '未完了に戻しました'),
    archive(task: Task) {
      saveChangeSet(data.uid, sendToArchive(task))
      toast('アーカイブへ送りました')
    },
  }
}
