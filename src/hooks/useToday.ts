import { useEffect, useState } from 'react'
import { USE_EMULATOR } from '../config.ts'
import { isISODate, todayJST } from '../domain/date.ts'
import type { ISODate } from '../domain/types.ts'

function currentToday(): ISODate {
  // エミュレータ接続中だけ、動作確認のために「今日」を差し替えられる（sessionStorage の debugToday）
  if (USE_EMULATOR) {
    const override = sessionStorage.getItem('debugToday')
    if (isISODate(override)) return override
  }
  return todayJST()
}

/** 日本時間の今日。日付が変わったり、アプリを開き直したりしたときに更新する */
export function useToday(): ISODate {
  const [today, setToday] = useState(currentToday)
  useEffect(() => {
    const update = () => setToday(currentToday())
    const timer = window.setInterval(update, 60_000)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('studyplan:today-changed', update)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('studyplan:today-changed', update)
    }
  }, [])
  return today
}
