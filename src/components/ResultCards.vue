<template>
  <div class="results-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
    <div class="result-card bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
      <div class="text-xs text-gray-600 mb-1">谐振频率 f₀</div>
      <div class="text-lg font-bold text-indigo-500">{{ results.fr.toFixed(4) }}</div>
      <div class="text-xs text-gray-500 mt-1">Hz</div>
    </div>
    <div class="result-card bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
      <div class="text-xs text-gray-600 mb-1">品质因数 Q</div>
      <div class="text-lg font-bold text-indigo-500">{{ results.Q.toFixed(4) }}</div>
    </div>
    <div class="result-card bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
      <div class="text-xs text-gray-600 mb-1">通频带 BW</div>
      <div class="text-lg font-bold text-indigo-500">{{ results.BW.toFixed(4) }}</div>
      <div class="text-xs text-gray-500 mt-1">Hz</div>
    </div>
    <div class="result-card bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
      <div class="text-xs text-gray-600 mb-1">最大电流 Imax</div>
      <div class="text-lg font-bold text-indigo-500">{{ results.Imax.toFixed(4) }}</div>
      <div class="text-xs text-gray-500 mt-1">mA</div>
    </div>
    <div class="result-card bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
      <div class="text-xs text-gray-600 mb-1">0.707×Imax</div>
      <div class="text-lg font-bold text-indigo-500">{{ results.halfPower.toFixed(4) }}</div>
      <div class="text-xs text-gray-500 mt-1">mA</div>
    </div>
    <div class="result-card bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
      <div class="text-xs text-gray-600 mb-1">截止频率 f₁/f₂</div>
      <div class="text-lg font-bold text-indigo-500">{{ results.f1.toFixed(4) }} / {{ results.f2.toFixed(4) }}</div>
      <div class="text-xs text-gray-500 mt-1">Hz</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  results: {
    type: Object,
    required: true,
  },
})
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
