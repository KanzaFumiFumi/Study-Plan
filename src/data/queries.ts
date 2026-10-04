import { useEffect, useState } from 'react'
import { onSnapshot, query, where } from 'firebase/firestore'
import type { ISODate, Task } from '../domain/types.ts'
import { toTask } from './converters.ts'
import { reportDataError } from './errors.ts'
import { tasksCol } from './paths.ts'

// 画面を開いているあいだだけ読むタスク（v0.5〜）。どちらも1つのフィールドだけで絞るので、複合インデックスは要らない。

/** 完了済みのタスクすべて（アーカイブの画面）。読み込み中は null */
export function useDoneTasks(uid: string): Task[] | null {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  useEffect(
    () =>
      onSnapshot(
        query(tasksCol(uid), where('status', '==', 'done')),
        (snap) => setTasks(snap.docs.map((d) => toTask(d.id, d.data()))),
        reportDataError,
      ),
    [uid],
  )
  return tasks
}

/** 期限（締切）がその日のタスクすべて。未完了・完了済み・アーカイブ済みを含む（今日の画面の「今日提出の課題」） */
export function useTasksDueOn(uid: string, date: ISODate): Task[] {
  const [tasks, setTasks] = useState<Task[]>([])
  useEffect(
    () =>
      onSnapshot(
        query(tasksCol(uid), where('dueDate', '==', date)),
        (snap) => setTasks(snap.docs.map((d) => toTask(d.id, d.data()))),
        reportDataError,
      ),
    [uid, date],
  )
  return tasks
}
