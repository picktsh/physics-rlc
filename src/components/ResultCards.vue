<template>
  <div class="results-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
    <div class="result-card bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
      <div class="text-xs text-gray-600 mb-1">谐振频率 f₀</div>
      <div class="text-lg font-bold text-indigo-500">{{ showVal(results.fr) }}</div>
      <div class="text-xs text-gray-500 mt-1">Hz</div>
    </div>
    <div class="result-card bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
      <div class="text-xs text-gray-600 mb-1">品质因数 Q</div>
      <div class="text-lg font-bold text-indigo-500">{{ showVal(results.Q) }}</div>
    </div>
    <div class="result-card bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
      <div class="text-xs text-gray-600 mb-1">通频带 BW</div>
      <div class="text-lg font-bold text-indigo-500">{{ showVal(results.BW) }}</div>
      <div class="text-xs text-gray-500 mt-1">Hz</div>
    </div>
    <div class="result-card bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
      <div class="text-xs text-gray-600 mb-1">最大电流 Imax</div>
      <div class="text-lg font-bold text-indigo-500">{{ showVal(results.Imax) }}</div>
      <div class="text-xs text-gray-500 mt-1">mA</div>
    </div>
    <div class="result-card bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
      <div class="text-xs text-gray-600 mb-1">Imax/√2</div>
      <div class="text-lg font-bold text-indigo-500">{{ showVal(results.halfPower) }}</div>
      <div class="text-xs text-gray-500 mt-1">mA</div>
    </div>
    <div class="result-card bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
      <div class="text-xs text-gray-600 mb-1">截止频率 f₁/f₂</div>
      <div class="text-lg font-bold text-indigo-500">{{ showVal(results.f1) }} / {{ showVal(results.f2) }}</div>
      <div class="text-xs text-gray-500 mt-1">Hz</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  results: {
    type: Object,
    required: true,
  },
  simulated: {
    type: Boolean,
    default: false,
  },
})

function showVal(v) {
  return props.simulated && v != null && v !== 0 ? v.toFixed(4) : '---'
}
</script>

<style scoped>
.result-card {
  transition: all 0.2s;
}
.result-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
