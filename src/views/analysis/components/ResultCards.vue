<template>
  <div class="results-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
    <div class="result-card bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
      <div class="text-xs text-[color:var(--app-text-muted)] mb-1">谐振频率 f₀</div>
      <div class="text-lg font-bold text-[color:var(--app-brand)]">{{ showVal(results.fr, 'f') }}</div>
      <div class="text-xs text-[color:var(--app-text-muted)] mt-1">{{ QUANTITY.f.unit }}</div>
    </div>
    <div class="result-card bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
      <div class="text-xs text-[color:var(--app-text-muted)] mb-1">品质因数 Q</div>
      <div class="text-lg font-bold text-[color:var(--app-brand)]">{{ showVal(results.Q, 'q') }}</div>
    </div>
    <div class="result-card bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
      <div class="text-xs text-[color:var(--app-text-muted)] mb-1">通频带 BW</div>
      <div class="text-lg font-bold text-[color:var(--app-brand)]">{{ showVal(results.BW, 'bw') }}</div>
      <div class="text-xs text-[color:var(--app-text-muted)] mt-1">{{ QUANTITY.bw.unit }}</div>
    </div>
    <div class="result-card bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
      <div class="text-xs text-[color:var(--app-text-muted)] mb-1">最大电流 Imax</div>
      <div class="text-lg font-bold text-[color:var(--app-brand)]">{{ showVal(results.Imax, 'i') }}</div>
      <div class="text-xs text-[color:var(--app-text-muted)] mt-1">{{ QUANTITY.i.unit }}</div>
    </div>
    <div class="result-card bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
      <div class="text-xs text-[color:var(--app-text-muted)] mb-1">Imax/√2</div>
      <div class="text-lg font-bold text-[color:var(--app-brand)]">{{ showVal(results.halfPower, 'i') }}</div>
      <div class="text-xs text-[color:var(--app-text-muted)] mt-1">{{ QUANTITY.i.unit }}</div>
    </div>
    <div class="result-card bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
      <div class="text-xs text-[color:var(--app-text-muted)] mb-1">截止频率 f₁/f₂</div>
      <div class="text-lg font-bold text-[color:var(--app-brand)]">{{ showVal(results.f1, 'f') }} / {{ showVal(results.f2, 'f') }}</div>
      <div class="text-xs text-[color:var(--app-text-muted)] mt-1">{{ QUANTITY.f.unit }}</div>
    </div>
  </div>
</template>

<script setup>
import { QUANTITY, decimalsFor } from '@/utils/quantity'

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

// 小数位单一来源于 quantity.js(未登记量 fallback 4 位)
function showVal(v, key) {
  return props.simulated && v != null && v !== 0 ? v.toFixed(decimalsFor(key)) : '---'
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
