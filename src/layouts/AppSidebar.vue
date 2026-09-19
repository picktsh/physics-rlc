<script setup>
// 左侧导航目录:数据源为 config/nav(与路由、首页卡片同源)。
// 桌面端内联渲染,移动端由父布局放进 NDrawer;点击导航后由父层关闭抽屉。
// 样式全量 UnoCSS 原子类,8px 网格:图标 24 / 内边距 8 / 图文间距 8 / 项高 40 / 项间距 8。
// 折叠态(页眉汉堡按钮切换,见 DefaultLayout)靠祖先 .sidebar-collapsed 的任意变体隐藏文字标签;
// 侧栏与项内边距恒定 → 图标左偏移不变 → 展开⇄收起零横向位移,与页眉按钮共轴。
import { NIcon } from 'naive-ui'
import { navRoutes } from '@/config/nav.js'

defineEmits(['navigate'])
</script>

<template>
  <nav class="flex flex-col gap-8px" aria-label="实验章节">
    <RouterLink
      v-for="item in navRoutes"
      :key="item.name"
      :to="item.path"
      :title="item.label"
      class="group flex h-40px items-center gap-8px rounded-lg p-8px no-underline text-[var(--muted)] transition-colors hover:bg-[var(--tab-hover-bg)] hover:text-[var(--navy)] [&.router-link-active]:bg-[var(--tab-active-bg)] [&.router-link-active]:text-[var(--navy-deep)] [&.router-link-active]:font-bold"
      @click="$emit('navigate')"
    >
      <span
        class="flex shrink-0 items-center text-[var(--faint)] transition-colors group-hover:text-[var(--navy)] [.router-link-active_&]:text-[var(--navy-deep)]"
      >
        <NIcon :component="item.icon" :size="24" />
      </span>
      <span class="truncate text-15px font-semibold [.sidebar-collapsed_&]:hidden">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
