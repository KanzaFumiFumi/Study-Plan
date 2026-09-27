import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  getRedirectResult,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  disableNetwork,
  enableNetwork,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { USE_EMULATOR, firebaseOptions } from './config.ts'

export const app = initializeApp(firebaseOptions)
export const auth = getAuth(app)

// オフラインでも読み書きできるよう、IndexedDB に永続キャッシュする（複数タブで共有）
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (USE_EMULATOR) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  // 開発中の動作確認用（エミュレータ接続時だけ）：オフラインの切り替えと「今日」の差し替え
  Object.assign(window, {
    __studyPlanDebug: {
      goOffline: () => disableNetwork(db),
      goOnline: () => enableNetwork(db),
      setToday: (date?: string) => {
        if (date) sessionStorage.setItem('debugToday', date)
        else sessionStorage.removeItem('debugToday')
        window.dispatchEvent(new Event('studyplan:today-changed'))
      },
    },
  })
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  // アプリと認証ページが同じドメイン（Firebase Hosting で配信）ならリダイレクト方式にする。
  // iOS のホーム画面アプリではポップアップが戻ってこないため。開発中などはポップアップ方式。
  if (!USE_EMULATOR && window.location.hostname === firebaseOptions.authDomain) {
    await signInWithRedirect(auth, provider)
  } else {
    await signInWithPopup(auth, provider)
  }
}

/** エミュレータ接続時だけ使う、テスト用アカウントでのログイン（Auth エミュレータは署名なしのトークンを受け付ける） */
export async function signInAsTestUser(name: string): Promise<void> {
  if (!USE_EMULATOR) throw new Error('テスト用ログインはエミュレータ接続時だけ使えます')
  const token = JSON.stringify({ sub: `test-${name}`, email: `${name}@example.com`, email_verified: true })
  await signInWithCredential(auth, GoogleAuthProvider.credential(token))
}

/** リダイレクト方式でログインから戻ってきたときのエラーを拾う（成功時は onAuthStateChanged が知らせる） */
export async function takeRedirectError(): Promise<unknown> {
  try {
    await getRedirectResult(auth)
    return null
  } catch (error) {
    return error
  }
}

export function signOutUser(): Promise<void> {
  return signOut(auth)
}
