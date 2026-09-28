/** 日本時間の日付。`YYYY-MM-DD` 形式の文字列（文字列の大小比較で日付の前後が判定できる） */
export type ISODate = string

export type MaterialKind = 'cycle' | 'memorize'

/** 教材（users/{uid}/materials/{id}） */
export interface Material {
  id: string
  name: string
  subject: string
  kind: MaterialKind
  archived: boolean
  /** ミリ秒（Firestore では Timestamp） */
  createdAt: number
}

/** 周回系の単元（materials/{materialId}/units/{id}）。materialId はパスから補う */
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

/** タスクの系統（リストの画面で、どのリストが周回系・暗記系か示すため）。課題はどちらでもない（単元に紐づけると周回の記録になる） */
export type TaskGroup = 'cycle' | 'memorize' | 'assignment'

export const TASK_GROUP: Record<TaskType, TaskGroup> = {
  assignment: 'assignment',
  first: 'cycle',
  exam: 'cycle',
  cycle: 'cycle',
  redo: 'cycle',
  memorize: 'memorize',
}

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  assignment: '課題',
  first: '1周目',
  // 予定（試験・大会など）に向けて、周回中の単元を仕上げるタスク
  exam: '仕上げ',
  memorize: '暗記',
  cycle: '周回',
  redo: '解き直し',
}
