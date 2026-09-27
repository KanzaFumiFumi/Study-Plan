// Firebase CLI をエミュレータ用の環境変数つきで起動する。
// Windows ではユーザー名に空白などがあると、Java が一時ソケットを作れず Firestore エミュレータが起動しない。
// そのため一時ソケットの置き場所をプロジェクト内の短いパスにする。
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const tmp = resolve('.emulator-tmp')
mkdirSync(tmp, { recursive: true })

const javaOptions = [process.env.JAVA_TOOL_OPTIONS, `-Djdk.net.unixdomain.tmpdir=${tmp}`].filter(Boolean).join(' ')
const firebaseBin = createRequire(import.meta.url).resolve('firebase-tools/lib/bin/firebase.js')

const result = spawnSync(process.execPath, [firebaseBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, JAVA_TOOL_OPTIONS: javaOptions },
})
process.exit(result.status ?? 1)
