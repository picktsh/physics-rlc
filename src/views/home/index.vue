<script setup>
// 首页落地:功能卡片网格(参考示例站)。卡片数据源为 config/nav,排除「首页」自身。
// 页面标题/副标题由 DefaultLayout 统一渲染,此处只出卡片。
import { NIcon } from 'naive-ui'
import { ArrowRight } from '@vicons/carbon'
import { navRoutes } from '@/config/nav'

const features = navRoutes.filter((item) => item.name !== 'home')
</script>

<template>
  <div class="grid grid-cols-1 gap-16px sm:grid-cols-2 xl:grid-cols-3">
    <RouterLink
      v-for="item in features"
      :key="item.name"
      :to="item.path"
      class="group flex flex-col gap-8px rounded-lg bg-[var(--card-bg)] p-16px shadow-[var(--card-shadow)] no-underline transition hover:-translate-y-2px"
    >
      <div class="flex items-center gap-12px">
        <span
          class="flex size-48px shrink-0 items-center justify-center rounded-lg bg-[var(--soft-blue)] text-[var(--navy)]"
        >
          <NIcon :component="item.icon" :size="26" />
        </span>
        <h2 class="text-20px font-bold text-[var(--ink)] [font-family:var(--font-head)]">{{ item.label }}</h2>
      </div>
      <p class="flex-1 text-14px leading-[1.7] text-[var(--muted)]">{{ item.desc }}</p>
      <span class="inline-flex items-center gap-4px text-14px font-semibold text-[var(--navy)]">
        进入 <NIcon :component="ArrowRight" :size="16" />
      </span>
    </RouterLink>
  </div>
</template>
