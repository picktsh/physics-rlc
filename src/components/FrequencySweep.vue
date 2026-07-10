<template>
  <div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-600">起始频率</label>
        <input v-model.number="startFreq" type="number" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <span class="text-xs text-gray-500">Hz</span>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-600">终止频率</label>
        <input v-model.number="endFreq" type="number" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <span class="text-xs text-gray-500">Hz</span>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-600">采样点数</label>
        <input v-model.number="points" type="number" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <span class="text-xs text-gray-500">个</span>
      </div>
    </div>

    <div class="flex gap-2 sm:gap-3 mb-4 flex-wrap">
      <button @click="runSweep" class="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:shadow-lg transition-all">
        🔄 开始扫描
      </button>
      <button @click="clearResults" class="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-gray-600 rounded-lg text-xs sm:text-sm hover:bg-gray-300 transition-all">
        🗑️ 清除
      </button>
    </div>

    <div v-if="sweepResults.length > 0" class="max-h-60 overflow-y-auto overflow-x-auto table-responsive">
      <table class="text-xs border-collapse">
        <thead>
          <tr class="bg-gray-50">
            <th class="border border-gray-200 px-2 py-1.5">序号</th>
            <th class="border border-gray-200 px-2 py-1.5">频率 (kHz)</th>
            <th class="border border-gray-200 px-2 py-1.5">电流 (mA)</th>
            <th class="border border-gray-200 px-2 py-1.5">相位 (°)</th>
            <th class="border border-gray-200 px-2 py-1.5">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in sweepResults" :key="idx" :class="getRowClass(item.type)">
            <td class="border border-gray-200 px-2 py-1.5 text-center">{{ idx + 1 }}</td>
            <td class="border border-gray-200 px-2 py-1.5 text-center">{{ item.freq.toFixed(4) }}</td>
            <td class="border border-gray-200 px-2 py-1.5 text-center">{{ item.current.toFixed(4) }}</td>
            <td class="border border-gray-200 px-2 py-1.5 text-center">{{ item.phase.toFixed(4) }}</td>
            <td class="border border-gray-200 px-2 py-1.5 text-center">{{ item.type }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { impedance } from '../utils/physics'

const props = defineProps({
  params: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['sweep-done'])

const startFreq = ref(100)
const endFreq = ref(2000)
const points = ref(50)
const sweepResults = ref([])

function getRowClass(type) {
  if (type === '谐振') return 'bg-green-50'
  if (type === '感性') return 'bg-orange-50'
  return 'bg-blue-50'
}

function runSweep() {
  if (isNaN(startFreq.value) || isNaN(endFreq.value)) {
    alert('请输入完整的频率范围')
    return
  }
  const { R, L, C, V } = props.params
  if (R <= 0 || L <= 0 || C <= 0) {
    alert('请先确保电路中包含 R、L、C 元件')
    return
  }

  sweepResults.value = []
  const results = []
  for (let i = 0; i <= points.value; i++) {
    const f = startFreq.value + ((endFreq.value - startFreq.value) * i) / points.value
    const z = impedance(R, L, C, f)
    const I = (V / z.Z) * 1000
    const phase = z.phi
    const type = Math.abs(phase) < 5 ? '谐振' : phase > 0 ? '感性' : '容性'
    results.push({ freq: f, current: I, phase, type })
  }
  sweepResults.value = results

  // 将扫描结果作为实测数据传递给父组件
  const measuredData = results.map(item => ({ freq: item.freq, current: item.current }))
  emit('sweep-done', measuredData)
}

function clearResults() {
  sweepResults.value = []
  emit('sweep-done', [])
}
</script>
