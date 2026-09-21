<script setup>
// 实验入口页:展示本实验的四个功能模块入口,点击直达对应子页面。
// 卡片数据源为 config/nav 的 resonance.children(与侧栏分组、路由同源),改标签/描述只动 nav.js。
import { NIcon } from 'naive-ui'
import { ArrowRight } from '@vicons/carbon'
import { navRoutes } from '@/config/nav'

const modules = navRoutes.find((item) => item.name === 'resonance')?.children ?? []
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <RouterLink
      v-for="mod in modules"
      :key="mod.name"
      :to="mod.path"
      class="group flex flex-col gap-2 rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] no-underline transition hover:-translate-y-2px"
    >
      <div class="flex items-center gap-3">
        <span
          class="flex size-48px shrink-0 items-center justify-center rounded-lg bg-[var(--app-surface-brand)] text-[var(--app-brand)]"
        >
          <NIcon :component="mod.icon" :size="26" />
        </span>
        <h2 class="text-20px font-bold text-[var(--app-text)] [font-family:var(--app-font-heading)]">{{ mod.label }}</h2>
      </div>
      <p class="flex-1 leading-[1.7] text-[var(--app-text-muted)]">{{ mod.desc }}</p>
      <span class="inline-flex items-center gap-1 font-semibold text-[var(--app-brand)]">
        进入 <NIcon :component="ArrowRight" :size="16" />
      </span>
    </RouterLink>
  </div>
</template>
