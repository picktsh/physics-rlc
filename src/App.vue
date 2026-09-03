<script setup>
import { dateZhCN, NConfigProvider, NMessageProvider, zhCN } from 'naive-ui'
import IndexVue from './views/index.vue'

// naive-ui 主题定制：与页面整体蓝色主色保持一致
const themeOverrides = {
  common: {
    primaryColor: '#2563eb',
    primaryColorHover: '#3b82f6',
    primaryColorPressed: '#1d4ed8',
    primaryColorSuppl: '#2563eb',
    infoColor: '#2563eb',
    infoColorHover: '#3b82f6',
    infoColorPressed: '#1d4ed8',
    infoColorSuppl: '#2563eb',
    borderRadius: '8px',
    fontSize: '14px',
  },
  Button: {
    fontWeight: '500',
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
