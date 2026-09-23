<script setup>
import { computed, onMounted } from 'vue'
import { dateZhCN, darkTheme, NConfigProvider, NDialogProvider, NMessageProvider, zhCN } from 'naive-ui'
import { useTheme } from './composables/useTheme'
import { useHistoryStore } from './stores/historyDB'

const { theme } = useTheme()

// 启动时回填上次选中的仿真记录(含电路拓扑),使刷新后页面仍展示该数据
const historyStore = useHistoryStore()
onMounted(() => historyStore.restoreSelected())

// 黑配色下启用 naive-ui 内置暗色主题,其余浅色配色(白/马卡龙/绿色)保持亮色
const naiveTheme = computed(() => (theme.value === 'dark' ? darkTheme : undefined))

// naive-ui 主色/状态色单一源:运行时从 <html> 读取 theme.css 的 --app-* token,
// 与 CSS 变量、canvas 强调色同源,消除历史"双份定义漂移"(旧 PRIMARY_BY_THEME 已删)。
function readVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

// naive-ui 主题定制:主色/状态色/字体均随配色切换(读 --app-* token)
const themeOverrides = computed(() => {
  // 依赖 theme.value:切换配色后 setTheme 已同步写入 <html data-theme>,重算时读到新值;
  // 此处仅为建立响应式依赖(getComputedStyle 本身非响应式)
  void theme.value
  const primary = readVar('--app-primary', '#2563eb')
  const primaryHover = readVar('--app-primary-hover', primary)
  return {
    common: {
      primaryColor: primary,
      primaryColorHover: primaryHover,
      primaryColorPressed: primaryHover,
      primaryColorSuppl: primary,
      // info 与主色同色:项目无独立 info 语义,不额外派生 token
      infoColor: primary,
      infoColorHover: primaryHover,
      infoColorPressed: primaryHover,
      infoColorSuppl: primary,
      successColor: readVar('--app-success', '#16a34a'),
      warningColor: readVar('--app-warning', '#d97706'),
      errorColor: readVar('--app-error', '#d14a3f'),
      borderRadius: '8px',
      fontSize: '14px',
      // 字体与全站统一读 --app-font(消除 naive 原衬线 vs 全站无衬线割裂)
      fontFamily: readVar('--app-font', 'sans-serif'),
    },
    Button: {
      fontWeight: '600',
    },
    // 数据表全站统一:表头/行/隔行/悬停/边框/文字均从 --app-* token 取色,
    // 与卡片面/描边同源,消除 naive 默认色在深色主题下与站点色板不协调的问题。
    // 三档色阶:行=base surface,表头与隔行=sunken,悬停=muted(反馈更明显);选中行另用 --app-selection。
    DataTable: {
      thColor: readVar('--app-surface-sunken', '#f6f8fb'),
      thTextColor: readVar('--app-text', '#1c2534'),
      thFontWeight: '600',
      tdColor: readVar('--app-surface', '#ffffff'),
      tdColorStriped: readVar('--app-surface-sunken', '#f6f8fb'),
      tdColorHover: readVar('--app-surface-muted', '#eef1f7'),
      tdTextColor: readVar('--app-text', '#1c2534'),
      borderColor: readVar('--app-border-light', '#eef1f7'),
    },
  }
})
</script>

<template>
  <NConfigProvider
    inline-theme-disabled
    :theme="naiveTheme"
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme-overrides="themeOverrides"
  >
    <NMessageProvider>
      <NDialogProvider>
        <RouterView />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
