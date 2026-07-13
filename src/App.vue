<script setup>
import { dateZhCN, NConfigProvider, NMessageProvider, zhCN } from 'naive-ui'
import IndexVue from './views/index.vue'
</script>

<template>
  <NConfigProvider inline-theme-disabled :locale="zhCN" :date-locale="dateZhCN">
    <NMessageProvider>
      <IndexVue />
    </NMessageProvider>
  </NConfigProvider>
</template>
