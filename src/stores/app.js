import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useSessionStorage } from '@vueuse/core'

// 锁屏密码总开关:true 启用 OTP 验证,false 完全关闭(全站只改这一个值即可启停密码功能)
export const LOCK_ENABLED = false

export const useAppStore = defineStore('app', () => {
  const otpCode = useSessionStorage('otp-code', '')
  const otpMsg = ref('')

  const genCode = () => {
    const d = new Date()
    const x = d.getDate()
    const y = d.getHours()
    const z = x * 100 + y
    return (z * 2 + '').padStart(4, '0')
  }

  // 内部记录「本次会话是否已输入正确密码」;开关关闭时不参与到验证状态
  const otpVerified = ref(otpCode.value === genCode())
  // 对外唯一门控状态:开关关闭 → 恒为已验证(守卫自然不会跳 /lock);开关开启 → 跟随 otpVerified
  const otpPassed = computed(() => !LOCK_ENABLED || otpVerified.value)

  const otpUpdate = (value) => {
    otpCode.value = value.join('')
    otpMsg.value = ''
  }

  const otpVerify = (value) => {
    if (value.join('') === genCode()) {
      otpMsg.value = ''
      otpVerified.value = true
    } else {
      otpMsg.value = '密码错误'
      otpVerified.value = false
    }
  }

  return { otpCode, otpMsg, otpPassed, otpUpdate, otpVerify }
})
