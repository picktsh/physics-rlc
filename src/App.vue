<script setup>
import { computed } from 'vue'
import { dateZhCN, darkTheme, NConfigProvider, NMessageProvider, zhCN } from 'naive-ui'
import IndexVue from './views/index.vue'
import { useTheme } from './composables/useTheme'

const { theme } = useTheme()

// 黑配色下启用 naive-ui 内置暗色主题,马卡龙/白配色保持亮色
const naiveTheme = computed(() => (theme.value === 'dark' ? darkTheme : undefined))

// naive-ui 主题定制:三套配色各有主色(白=学术藏青 / 黑=亮蓝 / 马卡龙=柠檬金)+ 直角 + 衬线字体
const themeOverrides = computed(() => {
  const isDark = theme.value === 'dark'
  const isMacaron = theme.value === 'macaron'
  const primaryColor = isDark ? '#5b8ef7' : isMacaron ? '#b8860b' : '#1f4e79'
  const primaryColorHover = isDark ? '#6d9bf7' : isMacaron ? '#d19c26' : '#2a5b8f'
  const primaryColorPressed = isDark ? '#4a7ce0' : isMacaron ? '#9c7109' : '#17375c'
  return {
    common: {
      primaryColor,
      primaryColorHover,
      primaryColorPressed,
      primaryColorSuppl: primaryColor,
      infoColor: primaryColor,
      infoColorHover: primaryColorHover,
      infoColorPressed: primaryColorPressed,
      infoColorSuppl: primaryColor,
      borderRadius: '0px',
      fontSize: '14px',
      fontFamily:
        "Georgia, 'Times New Roman', 'Songti SC', 'STSong', SimSun, 'Noto Serif CJK SC', serif",
    },
    Button: {
      fontWeight: '600',
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
      <IndexVue />
    </NMessageProvider>
  </NConfigProvider>
</template>
