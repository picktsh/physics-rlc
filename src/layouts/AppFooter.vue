<script setup>
// 全宽页脚:位于主内容流之后,随页面滚动到底;宽度横跨整个视口(不受侧栏/内容列约束)。
import { siteName, siteDesc } from '@/config/site'
const year = new Date().getFullYear()
</script>

<template>
  <footer class="w-full bg-[var(--app-rail-bg)] py-4">
    <div class="mx-auto w-max max-w-full px-4 text-center">
      <div>{{ siteName }}</div>
      <div class="text-[var(--app-text-muted)]">{{ siteDesc }}</div>
      <div class="mt-2 text-xs text-[var(--app-text-faint)]">
        本站基于 Vue 3 · Vite · Naive UI · ECharts · Three.js 构建，仅供物理教学演示使用
      </div>
      <div class="mt-1 text-xs text-[var(--app-text-faint)]">© {{ year }} picktsh · physics-rlc</div>
    </div>
  </footer>
</template>
