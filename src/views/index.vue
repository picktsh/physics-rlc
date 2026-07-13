<script setup>
import { defineAsyncComponent } from 'vue'
import { useAppStore } from '../stores/app'

const HomeLock = defineAsyncComponent(() => import('./home/lock.vue'))
const HomeIndex = defineAsyncComponent(() => import('./home/index.vue'))

const appStore = useAppStore()
</script>

<template>
  <div class="min-h-100dvh bg-gradient-to-br from-indigo-400 to-purple-500">
    <HomeLock v-if="!appStore.otpPassed" />
    <HomeIndex v-else />
  </div>
</template>
