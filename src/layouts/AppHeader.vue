<script setup>
// 顶部全宽粘性页眉:左=汉堡菜单 + LOGO + 站名/介绍,右=功能开关(主题配色)。
// 汉堡按钮在桌面端切换左侧目录折叠、移动端唤出抽屉,由父布局按断点决定行为。
import { NIcon } from 'naive-ui'
import { Menu } from '@vicons/carbon'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue'

// 品牌 logo 直接复用站点图标 favicon.svg(与 SiteQrcode 同源);走 BASE_URL 相对路径,兼容 base:'./' 子路径部署
defineEmits(['toggle-menu'])
const logoSrc = `${import.meta.env.BASE_URL}favicon.svg`
</script>

<template>
  <header
    class="app-header sticky top-0 z-[var(--z-chrome)] flex items-center gap-3 border-b border-[var(--app-border)] bg-[color-mix(in srgb, var(--app-surface), transparent 10%)] backdrop-blur-[8px] transition-colors"
  >
    <button
      class="inline-flex size-40px shrink-0 items-center justify-center rounded-lg text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-brand)] hover:text-[var(--app-brand)]"
      type="button"
      aria-label="切换导航菜单"
      @click="$emit('toggle-menu')"
    >
      <NIcon :component="Menu" :size="24" />
    </button>

    <RouterLink to="/home" class="flex min-w-0 items-center gap-2 text-[var(--app-brand)]">
      <span class="inline-flex shrink-0 text-[var(--app-brand)]" aria-hidden="true">
        <img :src="logoSrc" alt="" width="40" height="40" />
      </span>
      <span class="flex min-w-0 flex-col leading-[1.2]">
        <strong class="truncate text-18px font-bold tracking-[0.5px] text-[var(--app-text)] [font-family:var(--app-font-heading)]"
          >基于Web栈的RLC电路虚仿平台</strong
        >
        <span class="truncate text-xs tracking-[0.3px] text-[var(--app-text-faint)] max-sm:hidden"
          >RLC 串联谐振 · 理论仿真 · 实测比对 · 误差分析</span
        >
      </span>
    </RouterLink>

    <div class="ml-auto flex shrink-0 items-center gap-2">
      <ThemeSwitcher />
    </div>
  </header>
</template>

<style scoped>
/* 页眉高度取外壳自定义属性,左右内边距依赖 calc/clamp:左内边距让 40px 汉堡按钮图标中心落在
 * --rail-icon-center 轴上与侧栏共轴、右内边距随视口伸缩,均非原子类可干净表达,故留组件内 */
.app-header {
  height: var(--app-header-h);
  padding: 0 clamp(12px, 2vw, 24px) 0 calc(var(--rail-icon-center) - 20px);
}
</style>
