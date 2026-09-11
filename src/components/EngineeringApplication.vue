<template>
  <div>
    <!-- 二级 tab:心率检测(默认) / 收音机 -->
    <nav class="sub-tabs" role="tablist" aria-label="RLC工程应用子模块">
      <button
        v-for="t in subTabs"
        :key="t.key"
        type="button"
        class="sub-tab"
        :class="{ active: subTab === t.key }"
        role="tab"
        :aria-selected="subTab === t.key"
        @click="subTab = t.key"
      >
        {{ t.label }}
      </button>
    </nav>

    <!-- 子页内容:心率检测 -->
    <HeartRateMonitor v-if="subTab === 'heartrate'" />
    <!-- 子页内容:收音机(原 TunerExperiment) -->
    <TunerExperiment v-else-if="subTab === 'radio'" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import HeartRateMonitor from './HeartRateMonitor.vue'
import TunerExperiment from './TunerExperiment.vue'

const subTabs = [
  { key: 'heartrate', label: '心率检测' },
  { key: 'radio', label: '收音机' },
]

// 二级 tab 选中状态用 sessionStorage 记忆;无记录或非法值时默认心率检测
const storedSubTab = sessionStorage.getItem('tunerSubTab')
const subTab = ref(storedSubTab === 'radio' ? 'radio' : 'heartrate')
watch(subTab, (val) => {
  sessionStorage.setItem('tunerSubTab', val)
})
</script>

<style scoped>
/* 二级 tab(分段式胶囊):选中态沿用全站导航的淡蓝底 + 深蓝字 */
.sub-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  margin-bottom: 16px;
  border-radius: 10px;
  background: #eaeef6;
  border: 1px solid var(--line);
}
.sub-tab {
  padding: 7px 22px;
  border-radius: 7px;
  font-family: var(--font-head);
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--muted);
  white-space: nowrap;
  transition:
    color 0.18s ease,
    background-color 0.18s ease;
}
.sub-tab:hover {
  color: var(--navy);
  background: #edf2fd;
}
.sub-tab.active,
.sub-tab.active:hover {
  background: #dbe7ff;
  color: var(--navy-deep);
  font-weight: 700;
}
</style>
