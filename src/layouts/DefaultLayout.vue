<script setup>
// 应用外壳:全宽粘性页眉 + (桌面内联|移动抽屉)侧栏 + 居中主内容 + 全宽页脚。
// 断点口径与旧版一致(<1024px 视为移动/窄屏);桌面折叠态用 sessionStorage 记忆。
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { NDrawer, NDrawerContent } from 'naive-ui'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import AppFooter from './AppFooter.vue'
import SiteQrcode from '@/components/ui/SiteQrcode.vue'
import DoubaoChat from '@/components/doubao-chat/index.vue'
import { keepAliveNames } from '@/config/nav'

const route = useRoute()
const isMobile = useMediaQuery('(max-width: 1023.98px)')

// 桌面端侧栏折叠(会话记忆);移动端改用抽屉,不复用此状态
const collapsed = ref(sessionStorage.getItem('railCollapsed') === '1')
watch(collapsed, (val) => sessionStorage.setItem('railCollapsed', val ? '1' : '0'))

const drawerOpen = ref(false)

function onToggleMenu() {
  if (isMobile.value) drawerOpen.value = !drawerOpen.value
  else collapsed.value = !collapsed.value
}

// 切换路由后自动收起移动抽屉,避免遮挡新页面内容
watch(
  () => route.fullPath,
  () => (drawerOpen.value = false),
)
</script>

<template>
  <div class="app-shell flex min-h-dvh flex-col bg-[var(--paper)]" :class="{ 'sidebar-collapsed': collapsed && !isMobile }">
    <AppHeader @toggle-menu="onToggleMenu" />

    <div class="flex min-h-0 flex-1 items-stretch">
      <aside
        v-if="!isMobile"
        class="app-sidebar flex shrink-0 flex-col overflow-y-auto border-r border-[var(--line)] bg-[var(--rail-bg)] p-8px"
      >
        <AppSidebar />
        <!-- 侧栏底部站点二维码:折叠为仅图标导轨时由 CSS 隐藏 -->
        <div class="sidebar-qr mt-auto shrink-0 border-t border-[var(--line)] pt-16px text-[var(--muted)]">
          <SiteQrcode />
        </div>
      </aside>

      <main class="min-w-0 flex-1 px-[clamp(14px,2.5vw,40px)] pt-24px pb-56px max-sm:px-12px max-sm:pt-16px max-sm:pb-40px">
        <div class="mx-auto max-w-[1560px]">
          <header class="mb-24px border-b border-[var(--line)] pb-12px">
            <h1 class="text-[clamp(22px,2.6vw,30px)] font-bold leading-[1.35] tracking-[0.5px] text-[var(--ink)] [font-family:var(--font-head)]">
              {{ route.meta.title }}
            </h1>
            <p v-if="route.meta.desc" class="mt-8px text-14px tracking-[0.4px] text-[var(--faint)]">{{ route.meta.desc }}</p>
          </header>

          <RouterView v-slot="{ Component }">
            <KeepAlive :include="keepAliveNames">
              <component :is="Component" />
            </KeepAlive>
          </RouterView>
        </div>
      </main>
    </div>

    <AppFooter />

    <!-- 移动端:侧栏转为左滑抽屉,其余布局与桌面一致 -->
    <NDrawer v-if="isMobile" v-model:show="drawerOpen" :width="280" placement="left">
      <NDrawerContent :native-scrollbar="false">
        <AppSidebar @navigate="drawerOpen = false" />
        <!-- 抽屉底部二维码:方便用手机扫码演示 / 分享给其他手机 -->
        <div class="mt-auto shrink-0 border-t border-[var(--line)] pt-16px text-[var(--muted)]">
          <SiteQrcode />
        </div>
      </NDrawerContent>
    </NDrawer>

    <DoubaoChat />
  </div>
</template>

<style scoped>
/* 外壳几何:自定义属性驱动页眉高度、侧栏宽度与左图标共轴(见 AGENTS.local「外壳与折叠共轴」)。
 * 这些 var 及依赖它们的 sticky 定位 / 高度 calc / 宽度过渡 / 折叠覆盖无法用原子类表达,集中留组件内 */
.app-shell {
  --app-header-h: 60px;
  --app-sidebar-w: 280px;
  /* 左图标竖轴中心(距视口左):页眉汉堡按钮与侧栏导航图标共用此 x,折叠⇄展开时图标零位移 */
  --rail-icon-center: 28px;
}
.app-shell.sidebar-collapsed {
  --app-sidebar-w: 56px;
}
.sidebar-collapsed .sidebar-qr {
  display: none;
}
.app-sidebar {
  position: sticky;
  top: var(--app-header-h);
  align-self: flex-start;
  width: var(--app-sidebar-w);
  height: calc(100dvh - var(--app-header-h));
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
