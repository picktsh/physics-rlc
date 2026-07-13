<script setup>
import { onMounted, useTemplateRef } from 'vue'
import { NCard, NInputOtp } from 'naive-ui'
import { useAppStore } from '../../stores/app'

const appStore = useAppStore()
const otpWrapRef = useTemplateRef('otpWrapRef')

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
      <div class="mb-16px text-48px">🔒</div>
      <div class="mb-16px text-18px font-700">请输入验证码</div>
      <div ref="otpWrapRef">
        <NInputOtp
          block
          :allow-input="(v) => !v || /^\d+$/.test(v)"
          :length="6"
          :status="appStore.otpMsg ? 'error' : ''"
          @updateValue="appStore.otpUpdate"
          @finish="appStore.otpVerify"
        />
      </div>
      <div class="min-h-20px mt-8px mb-16px text-12px text-[#d03050]">{{ appStore.otpMsg }}</div>
      <div class="text-12px text-gray-500">请联系管理员获取</div>
    </NCard>
  </div>
</template>
