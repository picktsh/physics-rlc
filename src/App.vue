<script setup>
import { dateZhCN, NConfigProvider, NMessageProvider, zhCN } from 'naive-ui'
import IndexVue from './views/index.vue'

// naive-ui 主题定制：学术藏青主色 + 直角 + 衬线字体
const themeOverrides = {
  common: {
    primaryColor: '#1f4e79',
    primaryColorHover: '#2a5b8f',
    primaryColorPressed: '#17375c',
    primaryColorSuppl: '#1f4e79',
    infoColor: '#1f4e79',
    infoColorHover: '#2a5b8f',
    infoColorPressed: '#17375c',
    infoColorSuppl: '#1f4e79',
    borderRadius: '0px',
    fontSize: '14px',
    fontFamily:
      "Georgia, 'Times New Roman', 'Songti SC', 'STSong', SimSun, 'Noto Serif CJK SC', serif",
  },
  Button: {
    fontWeight: '600',
  },
}
</script>

<template>
  <NConfigProvider
    inline-theme-disabled
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme-overrides="themeOverrides"
  >
    <NMessageProvider>
      <IndexVue />
    </NMessageProvider>
  </NConfigProvider>
</template>
