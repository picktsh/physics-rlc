import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue(), UnoCSS()],
  resolve: {
    // 组件按页面下沉后层级变深,用 @ 别名稳定引用 src 下共享模块,避免脆弱的 ../../../
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      // rolldown(Vite8)对 @vueuse/core dist 里的 `/* #__PURE__ */` 位置误报 INVALID_ANNOTATION,
      // 属上游产物注释书写问题、不影响产物,过滤掉以免刷屏;其余告警照常输出
      onwarn(warning, warn) {
        if (warning.code === 'INVALID_ANNOTATION') return
        warn(warning)
      },
    },
  },
  server: {
    host: true,
    port: 5080,
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
