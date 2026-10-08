import { TASK_TYPE_LABEL, type Task, type Unit } from './types.ts'

const DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/** 1〜99 を漢数字に（1 → 一、10 → 十、12 → 十二、21 → 二十一）。それ以外は算用数字のまま */
export function kanjiNumber(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) return String(n)
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return `${tens === 0 ? '' : tens === 1 ? '十' : `${DIGITS[tens]}十`}${DIGITS[ones]}`
}

/** 「一周目」「二周目」… */
export function lapLabel(lap: number): string {
  return `${kanjiNumber(lap)}周目`
}

/** その単元の次の周回が何周目か（未着手なら1、1周終えていれば2…） */
export function nextLapOf(unit: Pick<Unit, 'lapCount'>): number {
  return unit.lapCount + 1
}

/**
 * タスクが何周目か。未完了なら単元の次の周。
 * 完了済み（v0.5〜）なら完了したときの周（lap）。lap のない v0.4 までの完了は、単元の今の周回数で補う。
 * 単元が分からなければ null。
 */
export function lapOfTask(task: Pick<Task, 'status' | 'lap'>, unit?: Pick<Unit, 'lapCount'>): number | null {
  if (task.status === 'done') return task.lap ?? (unit && unit.lapCount > 0 ? unit.lapCount : null)
  return unit ? nextLapOf(unit) : null
}

/**
 * 画面に出すタスクの名前（v0.4〜）。
 * 周回系・復習系の単元のタスク（1周目・定例周回・予定に向けた仕上げ）は「何周目か」で表す。
 * 解き直し・課題・暗記はこれまでどおりの名前。
 */
export function taskLabel(task: Pick<Task, 'type' | 'status' | 'lap'>, unit?: Pick<Unit, 'lapCount'>): string {
  if (task.type === 'first' || task.type === 'cycle' || task.type === 'exam') {
    const lap = lapOfTask(task, unit)
    if (lap) return lapLabel(lap)
    if (task.type === 'first') return lapLabel(1)
  }
  // 完了した暗記（v0.6〜）は、その範囲の何周目だったか
  if (task.type === 'memorize' && task.status === 'done' && task.lap) return `暗記 ${lapLabel(task.lap)}`
  return TASK_TYPE_LABEL[task.type]
}
