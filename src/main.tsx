import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { firebaseConfigured } from './config.ts'

// 新しい版をデプロイしたら、次に開いたときに自動で差し替える
registerSW({ immediate: true })

const root = createRoot(document.getElementById('root')!)

if (!firebaseConfigured) {
  root.render(
    <div className="p-6 text-sm leading-relaxed">
      <h1 className="mb-2 text-lg font-bold">Firebase の設定がありません</h1>
      <p>
        <code>.env.example</code> を <code>.env</code> にコピーして Firebase の設定値を入れてから、ビルドし直してください（README
        を参照）。
      </p>
    </div>,
  )
} else {
  // Firebase の初期化は設定があるときだけ行う
  import('./App.tsx').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
}
