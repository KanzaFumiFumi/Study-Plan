import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// `npm run icons` で public/icon.svg から各サイズのアイコンを public/ に生成する。
// maskable と apple は余白なし・背景色つき（角の透明部分をテーマ色で埋める）。
const background = { fit: 'contain' as const, background: '#1c1b19' }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: background },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: background },
  },
  images: ['public/icon.svg'],
})
