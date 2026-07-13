import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useSessionStorage } from '@vueuse/core'

export const useAppStore = defineStore('app', () => {
  const otpCode = useSessionStorage('otp-code', '')
  const otpMsg = ref('')

  const genCode = () => {
    const d = new Date()
    const w = d.getMonth() + 1
    const x = d.getDate()
    const y = d.getHours()
    const z = w * 10000 + x * 100 + y
    return (z * 2 + '').padStart(6, '0')
  }

  const otpPassed = ref(otpCode.value === genCode())

  const otpUpdate = (value) => {
    otpCode.value = value.join('')
    otpMsg.value = ''
  }

  const otpVerify = (value) => {
    if (value.join('') === genCode()) {
      otpMsg.value = ''
      otpPassed.value = true
    } else {
      otpMsg.value = '密码错误'
      otpPassed.value = false
    }
  }

  return { otpCode, otpMsg, otpPassed, otpUpdate, otpVerify }
})
