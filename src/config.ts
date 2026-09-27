import type { FirebaseOptions } from 'firebase/app'

/** `npm run dev:emu`（vite --mode emulator）のときはローカルの Firebase Emulator につなぐ */
export const USE_EMULATOR = import.meta.env.MODE === 'emulator'

export const firebaseOptions: FirebaseOptions = USE_EMULATOR
  ? // エミュレータ用のダミー値（demo- で始まるIDは本物のプロジェクトに接続しない）
    { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-study-plan', appId: 'demo-app' }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }

export const firebaseConfigured = Boolean(firebaseOptions.apiKey && firebaseOptions.projectId)
