import { collection, doc } from 'firebase/firestore'
import { db } from '../firebase.ts'

// すべて users/{uid}/ の下に置く
export const materialsCol = (uid: string) => collection(db, 'users', uid, 'materials')
export const materialDoc = (uid: string, materialId: string) => doc(db, 'users', uid, 'materials', materialId)

export const unitsCol = (uid: string, materialId: string) => collection(db, 'users', uid, 'materials', materialId, 'units')
export const unitDoc = (uid: string, materialId: string, unitId: string) =>
  doc(db, 'users', uid, 'materials', materialId, 'units', unitId)

export const rangesCol = (uid: string, materialId: string) => collection(db, 'users', uid, 'materials', materialId, 'ranges')
export const rangeDoc = (uid: string, materialId: string, rangeId: string) =>
  doc(db, 'users', uid, 'materials', materialId, 'ranges', rangeId)

export const examsCol = (uid: string) => collection(db, 'users', uid, 'exams')
export const examDoc = (uid: string, examId: string) => doc(db, 'users', uid, 'exams', examId)

export const tasksCol = (uid: string) => collection(db, 'users', uid, 'tasks')
export const taskDoc = (uid: string, taskId: string) => doc(db, 'users', uid, 'tasks', taskId)

export const settingsDoc = (uid: string) => doc(db, 'users', uid, 'settings', 'main')
