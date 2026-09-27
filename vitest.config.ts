import { defineConfig } from 'vitest/config'

// タスク生成ロジック（src/domain）の単体テスト。Firestore には依存しない。
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
