<script setup>
import { computed } from 'vue'
import { dateZhCN, darkTheme, NConfigProvider, NMessageProvider, zhCN } from 'naive-ui'
import { useTheme } from './composables/useTheme'

const { theme } = useTheme()

// 黑配色下启用 naive-ui 内置暗色主题,其余浅色配色(白/马卡龙/绿色)保持亮色
const naiveTheme = computed(() => (theme.value === 'dark' ? darkTheme : undefined))

// 各配色下 naive-ui 主色(白=学术藏青 / 黑=亮蓝 / 马卡龙=柠檬金 / 绿色=Vue 品牌绿)
const PRIMARY_BY_THEME = {
  light: ['#1f4e79', '#2a5b8f', '#17375c'],
  dark: ['#5b8ef7', '#6d9bf7', '#4a7ce0'],
  macaron: ['#b8860b', '#d19c26', '#9c7109'],
  green: ['#42b883', '#3aa876', '#369e6e'],
}

// naive-ui 主题定制:主色随配色切换 + 直角 + 衬线字体
const themeOverrides = computed(() => {
  const [primaryColor, primaryColorHover, primaryColorPressed] = PRIMARY_BY_THEME[theme.value] || PRIMARY_BY_THEME.light
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
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: "Georgia, 'Times New Roman', 'Songti SC', 'STSong', SimSun, 'Noto Serif CJK SC', serif",
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
      <RouterView />
    </NMessageProvider>
  </NConfigProvider>
</template>
