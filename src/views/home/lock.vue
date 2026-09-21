<script setup>
import { onMounted, watch, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NCard, NInputOtp, NIcon } from 'naive-ui'
import { Password } from '@vicons/carbon'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const route = useRoute()
const router = useRouter()
const otpWrapRef = useTemplateRef('otpWrapRef')

// 验证通过后跳回守卫记录的来路(默认首页);路由驱动取代旧版 v-if 切换
watch(
  () => appStore.otpPassed,
  (passed) => {
    if (passed) router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/home')
  },
)

onMounted(() => {
  // 补偿 NInputOtp 缺失传递 inputProps.inputmode 属性
  otpWrapRef.value?.querySelectorAll('input').forEach((el) => {
    el.setAttribute('inputmode', 'numeric')
  })
})
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center">
    <NCard class="w-300px rounded-lg text-center" :bordered="false">
      <div class="mb-4 flex justify-center text-[color:var(--app-brand)]">
        <NIcon :component="Password" :size="48" />
      </div>
      <div class="mb-4 text-18px font-700">请输入验证码</div>
      <div ref="otpWrapRef">
        <NInputOtp
          block
          :allow-input="(v) => !v || /^\d+$/.test(v)"
          :length="4"
          :status="appStore.otpMsg ? 'error' : ''"
          @updateValue="appStore.otpUpdate"
          @finish="appStore.otpVerify"
        />
      </div>
      <div class="min-h-20px mt-2 mb-4 text-xs text-[color:var(--app-error)]">{{ appStore.otpMsg }}</div>
      <div class="text-xs text-[color:var(--app-text-muted)]">请联系管理员获取</div>
    </NCard>
  </div>
</template>
