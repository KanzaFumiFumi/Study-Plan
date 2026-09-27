import { createContext, useContext } from 'react'
import type { TabKey } from '../components/TabBar.tsx'

/** 画面（タブ）を切り替える。Shell が値を渡す */
export const NavContext = createContext<(tab: TabKey) => void>(() => {})

export function useNav(): (tab: TabKey) => void {
  return useContext(NavContext)
}
