import { createContext, useContext, useEffect, useState } from 'react'

/**
 * 画面の配置（v0.5〜）。スマホ版（下のタブ・1列）と PC版（左のメニュー・2列）。
 * 中身とデータは同じで、並べ方だけが違う。端末ごとの好みなので localStorage に覚える。
 */
export type Layout = 'mobile' | 'pc'

const LAYOUT_KEY = 'studyplan.layout'

/** 選んだことがなければ、画面の幅で決める（広ければ PC版） */
function initialLayout(): Layout {
  try {
    const saved = localStorage.getItem(LAYOUT_KEY)
    if (saved === 'mobile' || saved === 'pc') return saved
  } catch {
    // 読めなければ画面の幅で決める
  }
  return window.matchMedia('(min-width: 1024px)').matches ? 'pc' : 'mobile'
}

/** Shell で1回だけ使う。<html data-layout="pc"> をつけるので、CSS の pc: でも切り替えられる（index.css） */
export function useLayoutState(): [Layout, (layout: Layout) => void] {
  const [layout, setLayout] = useState<Layout>(initialLayout)
  useEffect(() => {
    document.documentElement.dataset.layout = layout
    return () => {
      delete document.documentElement.dataset.layout
    }
  }, [layout])

  function change(next: Layout) {
    setLayout(next)
    try {
      localStorage.setItem(LAYOUT_KEY, next)
    } catch {
      // 覚えられなくても、今の表示は切り替わる
    }
  }
  return [layout, change]
}

export const LayoutContext = createContext<{ layout: Layout; setLayout: (layout: Layout) => void }>({
  layout: 'mobile',
  setLayout: () => {},
})

export function useLayout() {
  return useContext(LayoutContext)
}

/** PC版の配置か */
export function useIsPc(): boolean {
  return useLayout().layout === 'pc'
}
