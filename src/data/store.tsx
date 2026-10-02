import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Timestamp, onSnapshot, query, where, type SnapshotMetadata } from 'firebase/firestore'
import { jstStartOfDayMs } from '../domain/date.ts'
import { sortMaterials } from '../domain/shelf.ts'
import {
  DEFAULT_SETTINGS,
  hasUnits,
  type Exam,
  type Material,
  type Range,
  type Settings,
  type Task,
  type Unit,
} from '../domain/types.ts'
import { useToday } from '../hooks/useToday.ts'
import { toExam, toMaterial, toRange, toSettings, toTask, toUnit } from './converters.ts'
import { reportDataError } from './errors.ts'
import { examsCol, materialsCol, rangesCol, settingsDoc, tasksCol, unitsCol } from './paths.ts'

export interface DataValue {
  uid: string
  /** 最初の読み込み（キャッシュからでも可）が終わるまで true */
  loading: boolean
  materials: Material[]
  units: Unit[]
  ranges: Range[]
  exams: Exam[]
  /** 未完了のタスク */
  openTasks: Task[]
  /** 今日（日本時間）完了したタスク（v0.4〜、今日のチェックリストに済みとして出す）。それ以前の完了済みは JSON 書き出しのときだけ読む */
  doneToday: Task[]
  settings: Settings
  /** サーバーに届いていない書き込みがある（オフラインなど） */
  hasPendingWrites: boolean
}

const DataContext = createContext<DataValue | null>(null)

export function useData(): DataValue {
  const value = useContext(DataContext)
  if (!value) throw new Error('DataProvider の外で useData が呼ばれました')
  return value
}

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order

/**
 * ログイン中のユーザーのデータを onSnapshot で購読してメモリに保持する。
 * 永続キャッシュがあるので、オフラインでも前回までのデータがすぐに表示される。
 */
export function DataProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [materials, setMaterials] = useState<Material[] | null>(null)
  const [unitsByMaterial, setUnitsByMaterial] = useState<Record<string, Unit[]>>({})
  const [rangesByMaterial, setRangesByMaterial] = useState<Record<string, Range[]>>({})
  const [exams, setExams] = useState<Exam[] | null>(null)
  const [openTasks, setOpenTasks] = useState<Task[] | null>(null)
  const [doneToday, setDoneToday] = useState<Task[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const today = useToday()
  const [pending, setPending] = useState<Record<string, boolean>>({})

  const trackPending = (key: string, metadata: SnapshotMetadata) =>
    setPending((prev) => (prev[key] === metadata.hasPendingWrites ? prev : { ...prev, [key]: metadata.hasPendingWrites }))

  useEffect(() => {
    const opts = { includeMetadataChanges: true }
    const unsubs = [
      onSnapshot(
        materialsCol(uid),
        opts,
        (snap) => {
          setMaterials(sortMaterials(snap.docs.map((d) => toMaterial(d.id, d.data()))))
          trackPending('materials', snap.metadata)
        },
        reportDataError,
      ),
      onSnapshot(
        examsCol(uid),
        opts,
        (snap) => {
          setExams(snap.docs.map((d) => toExam(d.id, d.data())).sort((a, b) => a.date.localeCompare(b.date)))
          trackPending('exams', snap.metadata)
        },
        reportDataError,
      ),
      onSnapshot(
        query(tasksCol(uid), where('status', '==', 'open')),
        opts,
        (snap) => {
          setOpenTasks(snap.docs.map((d) => toTask(d.id, d.data())))
          trackPending('tasks', snap.metadata)
        },
        reportDataError,
      ),
      onSnapshot(
        settingsDoc(uid),
        opts,
        (snap) => {
          setSettings(toSettings(snap.data()))
          trackPending('settings', snap.metadata)
        },
        reportDataError,
      ),
    ]
    return () => unsubs.forEach((unsub) => unsub())
  }, [uid])

  // 今日完了したタスク（日付が変わったら張り直す）。completedAt の範囲だけで絞るので複合インデックスは要らない
  useEffect(
    () =>
      onSnapshot(
        query(tasksCol(uid), where('completedAt', '>=', Timestamp.fromMillis(jstStartOfDayMs(today)))),
        (snap) => setDoneToday(snap.docs.map((d) => toTask(d.id, d.data())).sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))),
        reportDataError,
      ),
    [uid, today],
  )

  // 単元・範囲は教材ごとのサブコレクションなので、教材の一覧に合わせて購読を張り直す
  const materialKeys = materials?.map((m) => `${m.id}:${m.kind}`).join(',') ?? ''
  useEffect(() => {
    if (!materialKeys) return
    const unsubs = materialKeys.split(',').map((key) => {
      const [materialId, kind] = key.split(':')
      if (kind === 'memorize') {
        return onSnapshot(
          rangesCol(uid, materialId),
          { includeMetadataChanges: true },
          (snap) => {
            const list = snap.docs.map((d) => toRange(d.id, materialId, d.data())).sort(byOrder)
            setRangesByMaterial((prev) => ({ ...prev, [materialId]: list }))
            trackPending(`ranges:${materialId}`, snap.metadata)
          },
          reportDataError,
        )
      }
      return onSnapshot(
        unitsCol(uid, materialId),
        { includeMetadataChanges: true },
        (snap) => {
          const list = snap.docs.map((d) => toUnit(d.id, materialId, d.data())).sort(byOrder)
          setUnitsByMaterial((prev) => ({ ...prev, [materialId]: list }))
          trackPending(`units:${materialId}`, snap.metadata)
        },
        reportDataError,
      )
    })
    return () => unsubs.forEach((unsub) => unsub())
  }, [uid, materialKeys])

  // 「読み込み中」は最初の1回だけ。教材を追加したときなどに画面が作り直されないようにする
  const [initialLoaded, setInitialLoaded] = useState(false)
  const allLoaded =
    !!materials &&
    !!exams &&
    !!openTasks &&
    !!settings &&
    materials.every((m) =>
      m.kind === 'memorize' ? rangesByMaterial[m.id] !== undefined : unitsByMaterial[m.id] !== undefined,
    )
  useEffect(() => {
    if (allLoaded) setInitialLoaded(true)
  }, [allLoaded])

  const value = useMemo<DataValue>(() => {
    const mats = materials ?? []
    return {
      uid,
      loading: !initialLoaded,
      materials: mats,
      units: mats.flatMap((m) => (hasUnits(m.kind) ? (unitsByMaterial[m.id] ?? []) : [])),
      ranges: mats.flatMap((m) => (m.kind === 'memorize' ? (rangesByMaterial[m.id] ?? []) : [])),
      exams: exams ?? [],
      openTasks: openTasks ?? [],
      doneToday,
      settings: settings ?? DEFAULT_SETTINGS,
      hasPendingWrites: Object.values(pending).some(Boolean),
    }
  }, [uid, initialLoaded, materials, unitsByMaterial, rangesByMaterial, exams, openTasks, doneToday, settings, pending])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
