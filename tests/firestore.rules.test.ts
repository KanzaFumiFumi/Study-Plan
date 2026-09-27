import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, test } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'

// `npm run test:rules` で Firestore エミュレータを起動して実行する
let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-study-plan',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  // alice のデータを用意する（ルールを通さずに書き込む）
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users/alice/tasks/t1'), { title: 'aliceのタスク', status: 'open' })
    await setDoc(doc(db, 'users/alice/materials/m1/units/u1'), { name: '第1章' })
    await setDoc(doc(db, 'users/alice/settings/main'), { cycleIntervalDays: 7 })
  })
})

describe('users/{uid} 以下は本人だけが読み書きできる', () => {
  test('本人は自分のデータを読み書きできる', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(db, 'users/alice/tasks/t1')))
    await assertSucceeds(getDocs(collection(db, 'users/alice/tasks')))
    await assertSucceeds(getDoc(doc(db, 'users/alice/materials/m1/units/u1')))
    await assertSucceeds(setDoc(doc(db, 'users/alice/materials/m2'), { name: '青チャート' }))
    await assertSucceeds(updateDoc(doc(db, 'users/alice/tasks/t1'), { status: 'done' }))
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/tasks/t1')))
  })

  test('別のアカウントでログインしても、他人のデータは読めない・書けない', async () => {
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(getDoc(doc(db, 'users/alice/tasks/t1')))
    await assertFails(getDocs(collection(db, 'users/alice/tasks')))
    await assertFails(getDoc(doc(db, 'users/alice/materials/m1/units/u1')))
    await assertFails(getDoc(doc(db, 'users/alice/settings/main')))
    await assertFails(setDoc(doc(db, 'users/alice/tasks/t2'), { title: '書き込み' }))
    await assertFails(updateDoc(doc(db, 'users/alice/tasks/t1'), { status: 'done' }))
    await assertFails(deleteDoc(doc(db, 'users/alice/tasks/t1')))
  })

  test('ログインしていなければ読めない・書けない', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'users/alice/tasks/t1')))
    await assertFails(setDoc(doc(db, 'users/alice/tasks/t2'), { title: '書き込み' }))
  })

  test('users の一覧や users 以外のパスは、本人でも拒否される', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(getDocs(collection(db, 'users')))
    await assertFails(getDoc(doc(db, 'other/x')))
    await assertFails(setDoc(doc(db, 'other/x'), { a: 1 }))
  })
})
