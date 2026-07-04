<template>
  <div class="card">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-600">实测谐振频率</label>
        <div class="relative">
          <input v-model.number="measuredFr" type="number" placeholder="输入实测值" class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm" />
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">Hz</span>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-600">实测通频带</label>
        <div class="relative">
          <input v-model.number="measuredBW" type="number" placeholder="输入实测值" class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm" />
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">Hz</span>
        </div>
      </div>
      <div class="flex flex-col gap-1 justify-end">
        <button @click="calculateError" class="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all">
          计算误差
        </button>
      </div>
    </div>

    <div v-if="showResult" class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div class="text-xs text-amber-700 mb-2">谐振频率误差对比</div>
        <div class="text-sm font-semibold text-gray-800">
          理论: <span class="text-indigo-600">{{ theoryFr }}</span> Hz | 实测: <span class="text-green-600">{{ measuredFr }}</span> Hz
        </div>
        <div class="text-xs text-gray-600 mt-1">
          相对误差: <span class="text-red-500 font-bold">{{ freqRelError }}%</span>
        </div>
      </div>
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div class="text-xs text-amber-700 mb-2">通频带误差对比</div>
        <div class="text-sm font-semibold text-gray-800">
          理论: <span class="text-indigo-600">{{ theoryBW }}</span> Hz | 实测: <span class="text-green-600">{{ measuredBW }}</span> Hz
        </div>
        <div class="text-xs text-gray-600 mt-1">
          相对误差: <span class="text-red-500 font-bold">{{ bwRelError }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  results: {
    type: Object,
    required: true,
  },
})

const measuredFr = ref(null)
const measuredBW = ref(null)
const showResult = ref(false)
const theoryFr = ref('0')
const theoryBW = ref('0')
const freqRelError = ref('0')
const bwRelError = ref('0')

function calculateError() {
  if (isNaN(measuredFr.value) || isNaN(measuredBW.value) || measuredFr.value === null || measuredBW.value === null) {
    alert('请输入完整的实测数据')
    return
  }
  const fr = props.results.fr
  const bw = props.results.BW
  if (fr <= 0 || bw <= 0) {
    alert('请先搭建电路并点击「开始仿真」获取理论值')
    return
  }
  theoryFr.value = fr.toFixed(4)
  theoryBW.value = bw.toFixed(4)
  freqRelError.value = (Math.abs(measuredFr.value - fr) / fr * 100).toFixed(4)
  bwRelError.value = (Math.abs(measuredBW.value - bw) / bw * 100).toFixed(4)
  showResult.value = true
}
</script>
