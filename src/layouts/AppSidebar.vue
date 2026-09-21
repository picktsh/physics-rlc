<script setup>
// 左侧导航目录:数据源为 config/nav(与路由、首页卡片同源)。
// 带 children 的一级分组渲染为可折叠开关:父项仅开合子项、不导航;路由进入某组子项时自动展开该组。
// 桌面端内联渲染,移动端由父布局放进 NDrawer;点击子项导航后由父层关闭抽屉。
// 样式全量 UnoCSS 原子类,8px 网格:图标 24 / 内边距 8 / 图文间距 8 / 项高 40 / 项间距 8。
// 折叠态(页眉汉堡按钮切换,见 DefaultLayout)靠祖先 .sidebar-collapsed 的任意变体淡出文字标签(配合 aside overflow-x 裁切与宽度过渡);
// 侧栏与项内边距恒定 → 图标左偏移不变 → 展开⇄收起零横向位移,与页眉按钮共轴。
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { NCollapseTransition, NIcon } from 'naive-ui'
import { ChevronDown } from '@vicons/carbon'
import { navRoutes } from '@/config/nav.js'

defineEmits(['navigate'])

const route = useRoute()

const groups = navRoutes.filter((item) => item.children?.length)

// 递归收集节点及其所有后代名:nested 容器(如「数据分析」)的子路由也计入,
// 保证进入其子页(/measure 等)时所属分组能自动展开并高亮
const descendantNames = (node) => [node.name, ...(node.children?.flatMap(descendantNames) ?? [])]
const groupContains = (group, name) => !!group.children?.some((c) => descendantNames(c).includes(name))

// 分组开合状态(按组名记忆);仅在路由进入组内子项时自动展开,不干预用户的手动开合
const groupOpen = ref({})
watch(
  () => route.name,
  (name) => {
    for (const g of groups) {
      if (groupContains(g, name)) groupOpen.value[g.name] = true
    }
  },
  { immediate: true },
)

function toggleGroup(name) {
  groupOpen.value[name] = !groupOpen.value[name]
}

// 当前路由在组内(含 nested 容器的子页):父项保持主色,即使子项被手动收起也能定位所在分组
function isGroupActive(group) {
  return groupContains(group, route.name)
}
</script>

<template>
  <nav class="flex flex-col gap-2" aria-label="实验章节">
    <template v-for="item in navRoutes" :key="item.name">
      <!-- 页面节点:普通导航链接 -->
      <RouterLink
        v-if="!item.children"
        :to="item.path"
        :title="item.label"
        class="group flex h-40px items-center gap-2 rounded-lg p-2 no-underline text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-brand)] hover:text-[var(--app-brand)] [&.router-link-active]:bg-[var(--app-surface-brand-strong)] [&.router-link-active]:text-[var(--app-brand-strong)] [&.router-link-active]:font-bold"
        @click="$emit('navigate')"
      >
        <span
          class="flex shrink-0 items-center text-[var(--app-text-faint)] transition-colors group-hover:text-[var(--app-brand)] [.router-link-active_&]:text-[var(--app-brand-strong)]"
        >
          <NIcon :component="item.icon" :size="24" />
        </span>
        <span class="truncate text-base font-semibold transition-opacity duration-300 [.sidebar-collapsed_&]:opacity-0">{{ item.label }}</span>
      </RouterLink>

      <!-- 分组节点:标题行只作开合开关(不导航);子项沿用页面节点的导航样式并加左缩进体现层级 -->
      <template v-else>
        <button
          type="button"
          :title="item.label"
          :aria-expanded="!!groupOpen[item.name]"
          class="group flex h-40px w-full items-center gap-2 rounded-lg p-2 text-left text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-brand)] hover:text-[var(--app-brand)]"
          :class="{ 'text-[var(--app-brand-strong)]': isGroupActive(item) }"
          @click="toggleGroup(item.name)"
        >
          <span class="flex shrink-0 items-center text-[var(--app-text-faint)] transition-colors group-hover:text-[var(--app-brand)]">
            <NIcon :component="item.icon" :size="24" />
          </span>
          <span class="truncate text-base font-semibold transition-opacity duration-300 [.sidebar-collapsed_&]:opacity-0">{{ item.label }}</span>
          <span
            class="ml-auto flex shrink-0 items-center text-[var(--app-text-faint)] transition-all duration-300 [.sidebar-collapsed_&]:opacity-0"
            :class="{ 'rotate-180': groupOpen[item.name] }"
          >
            <NIcon :component="ChevronDown" :size="16" />
          </span>
        </button>

        <!-- 分组子项:NCollapseTransition 做高度展开/收起动画(代码更整洁,取代旧 grid-rows+invisible hack) -->
        <NCollapseTransition :show="!!groupOpen[item.name]">
          <div class="flex flex-col gap-2">
            <RouterLink
              v-for="child in item.children"
              :key="child.name"
              :to="child.path"
              :title="child.label"
              class="group flex h-40px items-center gap-2 rounded-lg p-2 pl-4 no-underline text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-brand)] hover:text-[var(--app-brand)] [&.router-link-active]:bg-[var(--app-surface-brand-strong)] [&.router-link-active]:text-[var(--app-brand-strong)] [&.router-link-active]:font-bold [.sidebar-collapsed_&]:pl-2"
              @click="$emit('navigate')"
            >
              <span
                class="flex shrink-0 items-center text-[var(--app-text-faint)] transition-colors group-hover:text-[var(--app-brand)] [.router-link-active_&]:text-[var(--app-brand-strong)]"
              >
                <NIcon :component="child.icon" :size="24" />
              </span>
              <span class="truncate text-base font-semibold transition-opacity duration-300 [.sidebar-collapsed_&]:opacity-0">{{
                child.label
              }}</span>
            </RouterLink>
          </div>
        </NCollapseTransition>
      </template>
    </template>
  </nav>
</template>
