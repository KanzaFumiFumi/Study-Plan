import { defineConfig } from 'vitest/config'

// Firestore セキュリティルールのテスト。`npm run test:rules` がエミュレータを起動してから実行する。
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000,
  },
})
