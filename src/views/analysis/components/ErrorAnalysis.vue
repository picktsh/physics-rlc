<template>
  <div class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)]">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <div class="flex flex-col gap-2">
        <label class="text-xs text-[color:var(--app-text-muted)]">实测谐振频率</label>
        <NInputNumber v-model:value="measuredFr" placeholder="输入实测值" class="w-full">
          <template #suffix>{{ QUANTITY.f.unit }}</template>
        </NInputNumber>
      </div>
      <div class="flex flex-col gap-2">
        <label class="text-xs text-[color:var(--app-text-muted)]">实测通频带</label>
        <NInputNumber v-model:value="measuredBW" placeholder="输入实测值" class="w-full">
          <template #suffix>{{ QUANTITY.bw.unit }}</template>
        </NInputNumber>
      </div>
      <div class="flex flex-col gap-2 justify-end">
        <NButton secondary type="primary" @click="calculateError">计算误差</NButton>
      </div>
    </div>

    <div v-if="showResult" class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="bg-[var(--app-warning-bg)] border border-[color:var(--app-warning-border)] rounded-lg p-4">
        <div class="text-xs text-[color:var(--app-warning)] mb-2">谐振频率误差对比</div>
        <div class="font-semibold text-[color:var(--app-text)]">
          理论: <span class="text-[color:var(--app-brand)]">{{ theoryFr }}</span> {{ QUANTITY.f.unit }} | 实测:
          <span class="text-[color:var(--app-success)]">{{ measuredFr }}</span> {{ QUANTITY.f.unit }}
        </div>
        <div class="text-xs text-[color:var(--app-text-muted)] mt-1">
          相对误差: <span class="text-[color:var(--app-error)] font-bold">{{ freqRelError }}{{ QUANTITY.err.unit }}</span>
        </div>
      </div>
      <div class="bg-[var(--app-warning-bg)] border border-[color:var(--app-warning-border)] rounded-lg p-4">
        <div class="text-xs text-[color:var(--app-warning)] mb-2">通频带误差对比</div>
        <div class="font-semibold text-[color:var(--app-text)]">
          理论: <span class="text-[color:var(--app-brand)]">{{ theoryBW }}</span> {{ QUANTITY.bw.unit }} | 实测:
          <span class="text-[color:var(--app-success)]">{{ measuredBW }}</span> {{ QUANTITY.bw.unit }}
        </div>
        <div class="text-xs text-[color:var(--app-text-muted)] mt-1">
          相对误差: <span class="text-[color:var(--app-error)] font-bold">{{ bwRelError }}{{ QUANTITY.err.unit }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { NButton, NInputNumber, useMessage } from 'naive-ui'
import { QUANTITY, decimalsFor } from '@/utils/quantity'

const props = defineProps({
  results: {
    type: Object,
    required: true,
  },
})

const message = useMessage()

const measuredFr = ref(null)
const measuredBW = ref(null)
const showResult = ref(false)
const theoryFr = ref('0')
const theoryBW = ref('0')
const freqRelError = ref('0')
const bwRelError = ref('0')

function calculateError() {
  if (isNaN(measuredFr.value) || isNaN(measuredBW.value) || measuredFr.value === null || measuredBW.value === null) {
    message.warning('请输入完整的实测数据')
    return
  }
  const fr = props.results.fr
  const bw = props.results.BW
  if (fr <= 0 || bw <= 0) {
    message.warning('请先搭建电路并点击「开始仿真」获取理论值')
    return
  }
  theoryFr.value = fr.toFixed(decimalsFor('f'))
  theoryBW.value = bw.toFixed(decimalsFor('bw'))
  freqRelError.value = ((Math.abs(measuredFr.value - fr) / fr) * 100).toFixed(decimalsFor('err'))
  bwRelError.value = ((Math.abs(measuredBW.value - bw) / bw) * 100).toFixed(decimalsFor('err'))
  showResult.value = true
}
</script>
