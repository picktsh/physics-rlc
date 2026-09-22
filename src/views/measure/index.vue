<script setup>
// 相位差判别法(李萨如)路由包装层:从 store 取 params/simulated 注入组件,并处理频率联动。
// 组件名须与 config/nav 的 keepAliveNames 一致,保证切页时后台扫频进度不丢。
import { storeToRefs } from 'pinia'
import LissajousScope from './components/LissajousScope.vue'
import { useRLCCalculatorStore } from '@/stores/rlcCalculator'

defineOptions({ name: 'MeasurePage' })

const calcStore = useRLCCalculatorStore()
const { params, simulated } = storeToRefs(calcStore)

// 李萨如幅频图点击 → 联动更新频率窗口
function handleLissaFreqUpdate(freq) {
  calcStore.updateParams({ fStart: freq, fEnd: freq })
}
</script>

<template>
  <LissajousScope :params="params" :simulated="simulated" @update-freq="handleLissaFreqUpdate" />
</template>
