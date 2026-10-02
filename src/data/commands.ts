import { Timestamp, doc, writeBatch, type DocumentData, type DocumentReference, type WriteBatch } from 'firebase/firestore'
import { db } from '../firebase.ts'
import type { ChangeSet } from '../domain/changeset.ts'
import { hasUnits, type Exam, type MaterialKind, type Settings } from '../domain/types.ts'
import { newTaskData, taskPatchData } from './converters.ts'
import { reportDataError } from './errors.ts'
import {
  examDoc,
  examsCol,
  materialDoc,
  materialsCol,
  rangeDoc,
  rangesCol,
  settingsDoc,
  taskDoc,
  tasksCol,
  unitDoc,
  unitsCol,
} from './paths.ts'

// Firestore への書き込み。すべて writeBatch で行う（トランザクションはオフラインで使えないため）。
// commit() はサーバーに届くまで resolve しないので await しない。ローカルのキャッシュと画面には即座に反映される。

/** 1つの writeBatch の上限（500件）に近づいたら新しい batch に分ける */
class Writer {
  private batches: WriteBatch[] = [writeBatch(db)]
  private count = 0

  private next(): WriteBatch {
    if (this.count >= 450) {
      this.batches.push(writeBatch(db))
      this.count = 0
    }
    this.count += 1
    return this.batches[this.batches.length - 1]
  }

  set(ref: DocumentReference, data: DocumentData) {
    this.next().set(ref, data)
  }
  update(ref: DocumentReference, data: DocumentData) {
    this.next().update(ref, data)
  }
  delete(ref: DocumentReference) {
    this.next().delete(ref)
  }
  commit() {
    for (const batch of this.batches) batch.commit().catch(reportDataError)
  }
}

function addChangeSet(w: Writer, uid: string, cs: ChangeSet, now: number) {
  // 同時に作ったタスクも作った順に並ぶよう、createdAt を1ミリ秒ずつずらす
  cs.createTasks.forEach((task, i) => w.set(doc(tasksCol(uid)), newTaskData(task, now + i)))
  for (const { id, patch } of cs.updateTasks) w.update(taskDoc(uid, id), taskPatchData(patch))
  for (const id of cs.deleteTasks) w.delete(taskDoc(uid, id))
  for (const { materialId, unitId, patch } of cs.updateUnits) w.update(unitDoc(uid, materialId, unitId), patch)
  for (const { materialId, rangeId, patch } of cs.updateRanges) w.update(rangeDoc(uid, materialId, rangeId), patch)
  for (const { id, patch } of cs.updateExams) w.update(examDoc(uid, id), patch)
}

/** タスク生成ロジックの結果を保存する */
export function saveChangeSet(uid: string, cs: ChangeSet): void {
  const w = new Writer()
  addChangeSet(w, uid, cs, Date.now())
  w.commit()
}

// ---- 設定 ----

export function saveSettings(uid: string, settings: Settings): void {
  const w = new Writer()
  w.set(settingsDoc(uid), { ...settings })
  w.commit()
}

// ---- 予定（試験・大会・旅行など。保存先は exams のまま） ----

/** 新しい予定のIDを先に採番する（タスクの examIds に入れるため） */
export function newExamId(uid: string): string {
  return doc(examsCol(uid)).id
}

/** 予定を保存する。cs は applyExamSave の結果（タスクの作成・まとめ・範囲外し） */
export function saveExam(uid: string, exam: Exam, cs: ChangeSet): void {
  const w = new Writer()
  const { id, ...data } = exam
  w.set(examDoc(uid, id), data)
  addChangeSet(w, uid, cs, Date.now())
  w.commit()
}

/** 予定を削除する。cs は applyExamDelete の結果（未完了タスクの examIds から外す） */
export function deleteExam(uid: string, examId: string, cs: ChangeSet): void {
  const w = new Writer()
  w.delete(examDoc(uid, examId))
  addChangeSet(w, uid, cs, Date.now())
  w.commit()
}

// ---- 教材・単元・範囲 ----

const newUnitData = (name: string, order: number) => ({
  name,
  order,
  lapCount: 0,
  remainingMarks: null,
  graduated: false,
  lastDoneAt: null,
})

const newRangeData = (label: string, order: number) => ({
  label,
  order,
  started: false,
  step: 0,
  nextReviewAt: null,
  lastResult: null,
})

/** 教材を追加する。lines は単元名（周回系・復習系）または範囲名（暗記系）。追加した教材のIDを返す */
export function addMaterial(
  uid: string,
  input: { name: string; subject: string; kind: MaterialKind },
  lines: string[],
): string {
  const w = new Writer()
  const ref = doc(materialsCol(uid))
  const now = Timestamp.now()
  // 並び順は作った時刻（並べ替えた教材は 0, 1, 2… になるので、新しい教材はその下に入る）
  w.set(ref, { ...input, archived: false, order: now.toMillis(), createdAt: now })
  addChildren(w, uid, ref.id, input.kind, lines, 0)
  w.commit()
  return ref.id
}

/** 本棚の並び順を保存する（v0.4〜）。orderedIds の順に order = 0, 1, 2… をつける */
export function reorderMaterials(uid: string, orderedIds: string[]): void {
  const w = new Writer()
  orderedIds.forEach((id, i) => w.update(materialDoc(uid, id), { order: i }))
  w.commit()
}

export function updateMaterial(
  uid: string,
  materialId: string,
  patch: Partial<{ name: string; subject: string; archived: boolean }>,
): void {
  const w = new Writer()
  w.update(materialDoc(uid, materialId), patch)
  w.commit()
}

function addChildren(w: Writer, uid: string, materialId: string, kind: MaterialKind, lines: string[], startOrder: number) {
  lines.forEach((line, i) => {
    if (hasUnits(kind)) w.set(doc(unitsCol(uid, materialId)), newUnitData(line, startOrder + i))
    else w.set(doc(rangesCol(uid, materialId)), newRangeData(line, startOrder + i))
  })
}

/** 単元・範囲をまとめて追加する（startOrder から順番をつける） */
export function addChildrenToMaterial(
  uid: string,
  materialId: string,
  kind: MaterialKind,
  lines: string[],
  startOrder: number,
): void {
  const w = new Writer()
  addChildren(w, uid, materialId, kind, lines, startOrder)
  w.commit()
}

export function renameUnit(uid: string, materialId: string, unitId: string, name: string): void {
  const w = new Writer()
  w.update(unitDoc(uid, materialId, unitId), { name })
  w.commit()
}

/** 単元を削除する。cs は deleteUnitChanges の結果（未完了タスクの削除・予定の範囲から外す） */
export function deleteUnit(uid: string, materialId: string, unitId: string, cs: ChangeSet): void {
  const w = new Writer()
  w.delete(unitDoc(uid, materialId, unitId))
  addChangeSet(w, uid, cs, Date.now())
  w.commit()
}

export function renameRange(uid: string, materialId: string, rangeId: string, label: string): void {
  const w = new Writer()
  w.update(rangeDoc(uid, materialId, rangeId), { label })
  w.commit()
}

/** 範囲を削除する。cs は deleteRangeChanges の結果（未完了タスクの削除・予定の範囲から外す） */
export function deleteRange(uid: string, materialId: string, rangeId: string, cs: ChangeSet): void {
  const w = new Writer()
  w.delete(rangeDoc(uid, materialId, rangeId))
  addChangeSet(w, uid, cs, Date.now())
  w.commit()
}
