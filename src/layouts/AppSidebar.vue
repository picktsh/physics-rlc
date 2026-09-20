<script setup>
// 左侧导航目录:数据源为 config/nav(与路由、首页卡片同源)。
// 带 children 的一级分组渲染为可折叠开关:父项仅开合子项、不导航;路由进入某组子项时自动展开该组。
// 桌面端内联渲染,移动端由父布局放进 NDrawer;点击子项导航后由父层关闭抽屉。
// 样式全量 UnoCSS 原子类,8px 网格:图标 24 / 内边距 8 / 图文间距 8 / 项高 40 / 项间距 8。
// 折叠态(页眉汉堡按钮切换,见 DefaultLayout)靠祖先 .sidebar-collapsed 的任意变体隐藏文字标签;
// 侧栏与项内边距恒定 → 图标左偏移不变 → 展开⇄收起零横向位移,与页眉按钮共轴。
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { NIcon } from 'naive-ui'
import { ChevronDown } from '@vicons/carbon'
import { navRoutes } from '@/config/nav.js'

defineEmits(['navigate'])

const route = useRoute()

const groups = navRoutes.filter((item) => item.children?.length)

// 分组开合状态(按组名记忆);仅在路由进入组内子项时自动展开,不干预用户的手动开合
const groupOpen = ref({})
watch(
  () => route.name,
  (name) => {
    for (const g of groups) {
      if (g.children.some((c) => c.name === name)) groupOpen.value[g.name] = true
    }
  },
  { immediate: true },
)

function toggleGroup(name) {
  groupOpen.value[name] = !groupOpen.value[name]
}

// 当前路由在组内:父项保持主色,即使子项被手动收起也能定位所在分组
function isGroupActive(group) {
  return group.children.some((c) => c.name === route.name)
}
</script>

<template>
  <nav class="flex flex-col gap-8px" aria-label="实验章节">
    <template v-for="item in navRoutes" :key="item.name">
      <!-- 页面节点:普通导航链接 -->
      <RouterLink
        v-if="!item.children"
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

      <!-- 分组节点:标题行只作开合开关(不导航);子项沿用页面节点的导航样式并加左缩进体现层级 -->
      <template v-else>
        <button
          type="button"
          :title="item.label"
          :aria-expanded="!!groupOpen[item.name]"
          class="group flex h-40px w-full items-center gap-8px rounded-lg p-8px text-left text-[var(--muted)] transition-colors hover:bg-[var(--tab-hover-bg)] hover:text-[var(--navy)]"
          :class="{ 'text-[var(--navy-deep)]': isGroupActive(item) }"
          @click="toggleGroup(item.name)"
        >
          <span class="flex shrink-0 items-center text-[var(--faint)] transition-colors group-hover:text-[var(--navy)]">
            <NIcon :component="item.icon" :size="24" />
          </span>
          <span class="truncate text-15px font-semibold [.sidebar-collapsed_&]:hidden">{{ item.label }}</span>
          <span
            class="ml-auto flex shrink-0 items-center text-[var(--faint)] transition-transform duration-300 [.sidebar-collapsed_&]:hidden"
            :class="{ 'rotate-180': groupOpen[item.name] }"
          >
            <NIcon :component="ChevronDown" :size="16" />
          </span>
        </button>

        <!-- 开合即时生效(不做高度过渡):子项必须在点击父项后立刻可命中,
             高度过渡期间点击会落在包裹容器上导致首次点击丢失;视觉动感由子项淡入提供。
             收起态用 invisible 退出命中与键盘焦点链(opacity 不影响命中,不能只靠透明)。 -->
        <div class="grid" :class="groupOpen[item.name] ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'">
          <div class="overflow-hidden" :class="groupOpen[item.name] ? undefined : 'invisible'">
            <div
              class="flex flex-col gap-8px transition-opacity duration-200"
              :class="groupOpen[item.name] ? 'opacity-100' : 'opacity-0'"
            >
              <RouterLink
                v-for="child in item.children"
                :key="child.name"
                :to="child.path"
                :title="child.label"
                class="group flex h-40px items-center gap-8px rounded-lg p-8px pl-32px no-underline text-[var(--muted)] transition-colors hover:bg-[var(--tab-hover-bg)] hover:text-[var(--navy)] [&.router-link-active]:bg-[var(--tab-active-bg)] [&.router-link-active]:text-[var(--navy-deep)] [&.router-link-active]:font-bold [.sidebar-collapsed_&]:pl-8px"
                @click="$emit('navigate')"
              >
                <span
                  class="flex shrink-0 items-center text-[var(--faint)] transition-colors group-hover:text-[var(--navy)] [.router-link-active_&]:text-[var(--navy-deep)]"
                >
                  <NIcon :component="child.icon" :size="24" />
                </span>
                <span class="truncate text-15px font-semibold [.sidebar-collapsed_&]:hidden">{{ child.label }}</span>
              </RouterLink>
            </div>
          </div>
        </div>
      </template>
    </template>
  </nav>
</template>
