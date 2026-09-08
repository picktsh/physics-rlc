import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue(), UnoCSS()],
  server: {
    host: true,
    // 忽略根目录 .tmp-* 临时目录（无头浏览器 profile 等），避免 EBUSY 崩溃
    watch: { ignored: ['**/.tmp-*/**', '**/.tmp-*'] },
    proxy: {
      '/api/doubao': {
        target: 'https://ark.cn-beijing.volces.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/doubao/, '/api/v3'),
      },
    },
  },
})
