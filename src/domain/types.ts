/** 日本時間の日付。`YYYY-MM-DD` 形式の文字列（文字列の大小比較で日付の前後が判定できる） */
export type ISODate = string

/**
 * 教材の種類。周回系（問題集など）・復習系（v0.4〜。教科書・ノートなど）・暗記系（単語帳など）。
 * 復習系は周回系と同じ仕組み（単元ごとに残りの印の数を記録する）で、本棚の分類だけが違う。
 */
export type MaterialKind = 'cycle' | 'review' | 'memorize'

export const MATERIAL_KIND_LABEL: Record<MaterialKind, string> = {
  cycle: '周回系',
  review: '復習系',
  memorize: '暗記系',
}

/** 単元（units）を持つ種類か。周回系と復習系は単元、暗記系は範囲（ranges） */
export function hasUnits(kind: MaterialKind): boolean {
  return kind !== 'memorize'
}

/** 教材（users/{uid}/materials/{id}） */
export interface Material {
  id: string
  name: string
  subject: string
  kind: MaterialKind
  archived: boolean
  /** 本棚での並び順（v0.4〜。小さいほど上）。v0.3 までの教材にはないので createdAt で補う */
  order: number
  /** ミリ秒（Firestore では Timestamp） */
  createdAt: number
}

/** 周回系・復習系の単元（materials/{materialId}/units/{id}）。materialId はパスから補う */
export interface Unit {
  id: string
  materialId: string
  name: string
  order: number
  /** 完了した周回数（未着手=0、1周目完了=1） */
  lapCount: number
  /** 残っている印の数（未着手なら null） */
  remainingMarks: number | null
  graduated: boolean
  lastDoneAt: ISODate | null
}

export interface MemorizeResult {
  known: number
  half: number
  unknown: number
}

/** 暗記系の範囲（materials/{materialId}/ranges/{id}）。materialId はパスから補う */
export interface Range {
  id: string
  materialId: string
  label: string
  order: number
  started: boolean
  /** 復習間隔の段階（0始まり） */
  step: number
  nextReviewAt: ISODate | null
  lastResult: MemorizeResult | null
}

export interface UnitRef {
  materialId: string
  unitId: string
}

export interface RangeRef {
  materialId: string
  rangeId: string
}

/**
 * 予定（users/{uid}/exams/{id}）。試験だけでなく、大会・旅行・趣味など日付のある目標を登録する。
 * 保存先とフィールド名は v0.1 の「試験」のまま（既存のデータをそのまま使うため）。
 */
export interface Exam {
  id: string
  name: string
  /** 種類（定期考査・模試・資格・大会・旅行・趣味 など。自由入力） */
  category: string
  date: ISODate
  /** 範囲に入れた周回系の単元 */
  unitRefs: UnitRef[]
  /** 範囲に入れた暗記系の範囲（v0.2〜）。未開始なら開始する */
  rangeRefs: RangeRef[]
  /** 何日前までに仕上げるか（v0.2〜）。null なら設定の examLeadDays を使う */
  leadDays: number | null
}

export type TaskType = 'first' | 'cycle' | 'exam' | 'redo' | 'memorize' | 'assignment'

export type TaskStatus = 'open' | 'done'

/** 完了時に入力した値（仕様への追加：周回ごとの記録を残すため） */
export type TaskResult = { remainingMarks: number } | MemorizeResult

/** タスク（users/{uid}/tasks/{id}） */
export interface Task {
  id: string
  type: TaskType
  title: string
  materialId: string | null
  unitId: string | null
  rangeId: string | null
  /** このタスクに紐づく試験（重複をまとめた結果、複数になりうる） */
  examIds: string[]
  dueDate: ISODate
  status: TaskStatus
  /** ミリ秒（Firestore では Timestamp） */
  completedAt: number | null
  /** ミリ秒（Firestore では Timestamp）。仕様への追加：同順位の並びを安定させるため */
  createdAt: number
  result: TaskResult | null
  /** 「今日やる」と選んだ日（v0.4〜）。この日が今日なら、期限が先でも今日のチェックリストに出す。期限は変えない */
  plannedFor: ISODate | null
}

/** 新しく作るタスク。id・createdAt・status などは保存時に data 層が補う */
export type NewTask = Pick<Task, 'type' | 'title' | 'materialId' | 'unitId' | 'rangeId' | 'examIds' | 'dueDate'>

/** 設定（users/{uid}/settings/main） */
export interface Settings {
  cycleIntervalDays: number
  examLeadDays: number
  memorizeIntervals: number[]
}

export const DEFAULT_SETTINGS: Settings = {
  cycleIntervalDays: 7,
  examLeadDays: 3,
  memorizeIntervals: [1, 3, 7, 14, 30],
}

/**
 * タスクの種類の名前。周回系・復習系の単元のタスク（first / cycle / exam）は、
 * 画面では「何周目か」で表示する（labels.ts の taskLabel）。ここの名前は単元が見つからないときの予備。
 */
export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  assignment: '課題',
  first: '一周目',
  // 予定（試験・大会など）に向けて、周回中の単元を仕上げるタスク
  exam: '仕上げ',
  memorize: '暗記',
  cycle: '周回',
  redo: '解き直し',
}
