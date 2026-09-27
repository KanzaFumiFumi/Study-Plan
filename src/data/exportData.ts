import { Timestamp, getDoc, getDocs, type DocumentData } from 'firebase/firestore'
import { examsCol, materialsCol, rangesCol, settingsDoc, tasksCol, unitsCol } from './paths.ts'

/** Timestamp を ISO 文字列に変換しながら、ドキュメントを JSON にできる形にする */
function plain(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(plain)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as DocumentData).map(([k, v]) => [k, plain(v)]))
  }
  return value
}

/**
 * 全データ（教材・単元・範囲・試験・完了済みを含む全タスク・設定）を1つのオブジェクトにまとめる（バックアップ用）。
 * オフラインのときはキャッシュにある分を書き出す。
 */
export async function collectAllData(uid: string): Promise<Record<string, unknown>> {
  const [materialsSnap, examsSnap, tasksSnap, settingsSnap] = await Promise.all([
    getDocs(materialsCol(uid)),
    getDocs(examsCol(uid)),
    getDocs(tasksCol(uid)),
    getDoc(settingsDoc(uid)),
  ])

  const materials = await Promise.all(
    materialsSnap.docs.map(async (m) => {
      const [units, ranges] = await Promise.all([getDocs(unitsCol(uid, m.id)), getDocs(rangesCol(uid, m.id))])
      return {
        id: m.id,
        ...(plain(m.data()) as object),
        units: units.docs.map((d) => ({ id: d.id, ...(plain(d.data()) as object) })),
        ranges: ranges.docs.map((d) => ({ id: d.id, ...(plain(d.data()) as object) })),
      }
    }),
  )

  return {
    app: '学習ワークフロー',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: settingsSnap.exists() ? plain(settingsSnap.data()) : null,
    materials,
    exams: examsSnap.docs.map((d) => ({ id: d.id, ...(plain(d.data()) as object) })),
    tasks: tasksSnap.docs.map((d) => ({ id: d.id, ...(plain(d.data()) as object) })),
  }
}

/** オブジェクトを JSON ファイルとしてダウンロードさせる */
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
