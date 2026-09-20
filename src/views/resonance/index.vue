<script setup>
// 实验入口页:展示本实验的四个功能模块入口,点击直达对应子页面。
// 卡片数据源为 config/nav 的 resonance.children(与侧栏分组、路由同源),改标签/描述只动 nav.js。
import { NIcon } from 'naive-ui'
import { ArrowRight } from '@vicons/carbon'
import { navRoutes } from '@/config/nav'

const modules = navRoutes.find((item) => item.name === 'resonance')?.children ?? []
</script>

<template>
  <div class="grid grid-cols-1 gap-16px sm:grid-cols-2 xl:grid-cols-4">
    <RouterLink
      v-for="mod in modules"
      :key="mod.name"
      :to="mod.path"
      class="group flex flex-col gap-8px rounded-lg bg-[var(--card-bg)] p-16px shadow-[var(--card-shadow)] no-underline transition hover:-translate-y-2px"
    >
      <div class="flex items-center gap-12px">
        <span
          class="flex size-48px shrink-0 items-center justify-center rounded-lg bg-[var(--soft-blue)] text-[var(--navy)]"
        >
          <NIcon :component="mod.icon" :size="26" />
        </span>
        <h2 class="text-20px font-bold text-[var(--ink)] [font-family:var(--font-head)]">{{ mod.label }}</h2>
      </div>
      <p class="flex-1 text-14px leading-[1.7] text-[var(--muted)]">{{ mod.desc }}</p>
      <span class="inline-flex items-center gap-4px text-14px font-semibold text-[var(--navy)]">
        进入 <NIcon :component="ArrowRight" :size="16" />
      </span>
    </RouterLink>
  </div>
</template>
