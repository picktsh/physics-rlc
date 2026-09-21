<script setup>
// 首页落地:功能卡片网格(参考示例站)。卡片数据源为 config/nav,排除「首页」自身。
// 分组节点的子页面一并展平:首页保持对所有页面卡片直达,与侧栏分组互不影响。
// 页面标题/副标题由 DefaultLayout 统一渲染,此处只出卡片。
import { NIcon } from 'naive-ui'
import { ArrowRight } from '@vicons/carbon'
import { navRoutes } from '@/config/nav'

const features = navRoutes.filter((item) => item.name !== 'home').flatMap((item) => [item, ...(item.children || [])])
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <RouterLink
      v-for="item in features"
      :key="item.name"
      :to="item.path"
      class="group flex flex-col gap-2 rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] no-underline transition hover:-translate-y-2px"
    >
      <div class="flex items-center gap-3">
        <span
          class="flex size-48px shrink-0 items-center justify-center rounded-lg bg-[var(--app-surface-brand)] text-[var(--app-brand)]"
        >
          <NIcon :component="item.icon" :size="26" />
        </span>
        <h2 class="text-20px font-bold text-[var(--app-text)] [font-family:var(--app-font-heading)]">{{ item.label }}</h2>
      </div>
      <p class="flex-1 leading-[1.7] text-[var(--app-text-muted)]">{{ item.desc }}</p>
      <span class="inline-flex items-center gap-1 font-semibold text-[var(--app-brand)]">
        进入 <NIcon :component="ArrowRight" :size="16" />
      </span>
    </RouterLink>
  </div>
</template>
