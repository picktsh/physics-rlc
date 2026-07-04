<script setup>
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRLCCalculatorStore } from './stores/rlcCalculator'
import { useHistoryStore } from './stores/historyDB'
import CircuitBoard from './components/CircuitBoard.vue'
import ResultCards from './components/ResultCards.vue'
import ChartPanel from './components/ChartPanel.vue'
import ErrorAnalysis from './components/ErrorAnalysis.vue'
import MeasuredDataInput from './components/MeasuredDataInput.vue'
import LissajousScope from './components/LissajousScope.vue'
import FrequencySweep from './components/FrequencySweep.vue'
import SimulationHistory from './components/SimulationHistory.vue'
import FormulaPrinciple from './components/FormulaPrinciple.vue'

const calcStore = useRLCCalculatorStore()
const historyStore = useHistoryStore()

const { params, results, ampCurveData, phaseCurveData, impedanceCurveData } = storeToRefs(calcStore)
const { simulationHistory, measuredHistory } = storeToRefs(historyStore)

const activeTab = ref(sessionStorage.getItem('activeTab') || 'circuit')
watch(activeTab, (val) => { sessionStorage.setItem('activeTab', val) })

const tabs = [
  { key: 'circuit', label: '🧩 电路搭建' },
  { key: 'analysis', label: '📊 仿真分析' },
  { key: 'measure', label: '📋 实测数据' },
  { key: 'formula', label: '📖 公式原理' },
]

const chartPanelRef = ref(null)

// 实测数据绘制
function handlePlotMeasured() {
  historyStore.saveMeasuredRecord(calcStore.measuredData)
}

// 频率扫描完成
function handleSweepDone(data) {
  calcStore.measuredData = data
}

// 李萨如幅频图点击更新频率
function handleLissaFreqUpdate(freq) {
  calcStore.updateParams({ fStart: freq, fEnd: freq })
}

// 加载仿真历史
function handleLoadSimHistory(idx) {
  const r = historyStore.simulationHistory[idx]
  if (!r) return
  calcStore.updateParams({
    R: r.params.R, L: r.params.L, C: r.params.C,
    V: r.params.V, fStart: r.params.fStart, fEnd: r.params.fEnd,
  })
  alert(`已加载 ${r.time} 的仿真参数`)
}

// 加载实测历史
function handleLoadMeasHistory(idx) {
  const r = historyStore.measuredHistory[idx]
  if (!r) return
  calcStore.measuredData = JSON.parse(JSON.stringify(r.data))
}

// 导入历史文件处理
async function handleImportSimHistory(file) {
  if (!file) return
  try {
    const count = await historyStore.importSimulationHistory(file)
    alert(`成功导入仿真记录（共 ${count} 条）`)
  } catch (err) { alert('文件解析失败：' + err.message) }
}

async function handleImportMeasHistory(file) {
  if (!file) return
  try {
    const count = await historyStore.importMeasuredHistory(file)
    alert(`成功导入实测记录（共 ${count} 条）`)
  } catch (err) { alert('文件解析失败：' + err.message) }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-400 to-purple-500 p-3 md:p-4">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <header class="text-center text-white mb-4">
        <h1 class="text-xl font-bold">🔬 RLC电路实验助手</h1>
        <p class="text-sm opacity-90">你的AI实验助手</p>
      </header>

      <!-- Tab 导航 -->
      <div class="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="[
            'px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200',
            activeTab === tab.key
              ? 'bg-white text-indigo-700 shadow-lg scale-105'
              : 'bg-white/20 text-white/90 hover:bg-white/30 backdrop-blur-sm'
          ]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab 内容: 电路搭建 -->
      <template v-if="activeTab === 'circuit'">
        <section class="card mb-4">
          <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>🧩</span>
            <span>电子拖拽接线台</span>
          </div>
          <CircuitBoard
            v-model:components="calcStore.components"
            v-model:wires="calcStore.wires"
            v-model:mode="calcStore.circuitMode"
            @simulate="calcStore.simulate() || alert('请先拖拽元件搭建RLC电路，至少需要一个信号源V')"
            @reset="calcStore.resetCircuit()"
          />
        </section>
      </template>

      <!-- Tab 内容: 仿真分析 -->
      <template v-if="activeTab === 'analysis'">
        <section class="card mb-4">
          <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>📊</span>
            <span>计算结果</span>
          </div>
          <ResultCards :results="results" />
          <SimulationHistory
            :history="simulationHistory"
            @export="historyStore.exportSimulationHistory()"
            @import="handleImportSimHistory"
            @clear="historyStore.clearSimulationHistory()"
            @load="handleLoadSimHistory"
            @delete="historyStore.deleteSimulationRecord"
          />
        </section>

        <section class="card mb-4">
          <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>📈</span>
            <span>三大特性曲线图</span>
          </div>
          <ChartPanel
            ref="chartPanelRef"
            :params="params"
            :amp-curve-data="ampCurveData"
            :phase-curve-data="phaseCurveData"
            :impedance-curve-data="impedanceCurveData"
            :measured-data="calcStore.measuredData"
            @update-fstart="val => calcStore.updateParams({ fStart: val })"
            @update-fend="val => calcStore.updateParams({ fEnd: val })"
          />
        </section>

        <section class="card mb-4">
          <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>📝</span>
            <span>误差分析</span>
          </div>
          <ErrorAnalysis :results="results" />
        </section>

        <section class="card mb-4">
          <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>📊</span>
            <span>实测数据输入</span>
          </div>
          <MeasuredDataInput
            v-model:data="calcStore.measuredData"
            :history="measuredHistory"
            @plot="handlePlotMeasured"
            @export-history="historyStore.exportMeasuredHistory()"
            @import-history="handleImportMeasHistory"
            @clear-history="historyStore.clearMeasuredHistory()"
            @load-history="handleLoadMeasHistory"
            @delete-history="historyStore.deleteMeasuredRecord"
          />
        </section>
      </template>

      <!-- Tab 内容: 实测数据 -->
      <template v-if="activeTab === 'measure'">
        <section class="card mb-4">
          <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>📐</span>
            <span>李萨如图形分析</span>
          </div>
          <LissajousScope :params="params" @update-freq="handleLissaFreqUpdate" />
        </section>

        <section class="card mb-4">
          <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>🔍</span>
            <span>频率扫描</span>
          </div>
          <FrequencySweep :params="params" @sweep-done="handleSweepDone" />
        </section>
      </template>

      <!-- Tab 内容: 公式原理 -->
      <template v-if="activeTab === 'formula'">
        <FormulaPrinciple />
      </template>
    </div>
  </div>
</template>
