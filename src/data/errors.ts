const EVENT = 'studyplan:data-error'

/** 保存・読み込みの失敗を画面に知らせる（Toast が受け取って表示する） */
export function reportDataError(error: unknown): void {
  console.error(error)
  window.dispatchEvent(new CustomEvent(EVENT, { detail: error }))
}

export function onDataError(handler: (error: unknown) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail)
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
