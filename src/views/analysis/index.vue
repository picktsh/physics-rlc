<script setup>
// 「数据分析」容器页:电路搭建的后半页 —— 三种谐振判别方法用顶部 n-tabs 切换。
// tab 列表单一来源于 config/nav 的 data-analysis.children(标签/路径/名称与路由同源,改配置只动 nav.js);
// 内容区用嵌套 RouterView 渲染当前方法子路由,内层 KeepAlive 缓存「相位差判别法/LC 电压幅值法」的后台扫频进度。
// 组件名须与 nav 的 keepAliveNames 一致:布局层缓存本容器,切走再回来不丢内部各方法页的保活状态。
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NTabs, NTab, NIcon } from 'naive-ui'
import { navRoutes, methodKeepAliveNames } from '@/config/nav'

defineOptions({ name: 'DataAnalysisPage' })

const route = useRoute()
const router = useRouter()

const tabs =
  navRoutes
    .find((r) => r.name === 'resonance')
    ?.children?.find((c) => c.name === 'data-analysis')
    ?.children?.filter((m) => m.name) ?? []

// 当前激活 tab 由子路由名决定,保证直达 /measure 等深链时正确高亮
const activeTab = computed(() => (tabs.some((t) => t.name === route.name) ? route.name : tabs[0]?.name))

function onTabChange(name) {
  const tab = tabs.find((t) => t.name === name)
  if (tab && tab.path !== route.path) router.push(tab.path)
}
</script>

<template>
  <div>
    <NTabs :value="activeTab" type="card" @update:value="onTabChange">
      <NTab v-for="tab in tabs" :key="tab.name" :name="tab.name">
        <span class="inline-flex items-center gap-1.5">
          <NIcon v-if="tab.icon" :component="tab.icon" :size="18" />
          {{ tab.label }}
        </span>
      </NTab>
    </NTabs>

    <div class="pt-4">
      <RouterView v-slot="{ Component }">
        <KeepAlive :include="methodKeepAliveNames">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </div>
  </div>
</template>
