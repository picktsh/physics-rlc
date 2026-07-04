<script setup>
import { ref } from 'vue'
import { useRLCCalculator } from './composables/useRLCCalculator'
import { useHistoryDB } from './composables/useHistoryDB'
import CircuitBoard from './components/CircuitBoard.vue'
import ResultCards from './components/ResultCards.vue'
import ChartPanel from './components/ChartPanel.vue'
import ErrorAnalysis from './components/ErrorAnalysis.vue'
import MeasuredDataInput from './components/MeasuredDataInput.vue'
import LissajousScope from './components/LissajousScope.vue'
import FrequencySweep from './components/FrequencySweep.vue'
import SimulationHistory from './components/SimulationHistory.vue'

const { params, results, ampCurveData, phaseCurveData, impedanceCurveData, updateParams } = useRLCCalculator()
const {
  simulationHistory,
  measuredHistory,
  saveSimulationRecord,
  saveMeasuredRecord,
  deleteSimulationRecord,
  deleteMeasuredRecord,
  clearSimulationHistory,
  clearMeasuredHistory,
  exportSimulationHistory,
  importSimulationHistory,
  exportMeasuredHistory,
  importMeasuredHistory,
} = useHistoryDB()

const chartPanelRef = ref(null)
const components = ref([])
const wires = ref([])
const circuitMode = ref('wire')
const measuredData = ref([])

// 从电路中提取参数
function extractParams() {
  let R = 0,
    L = 0,
    C_inv = 0,
    V = 5
  for (const comp of components.value) {
    const v = parseFloat(comp.value) || 0
    if (comp.type === 'R') R += v
    else if (comp.type === 'L') L += v
    else if (comp.type === 'C' && v > 0) C_inv += 1 / v
    else if (comp.type === 'V') V = v
  }
  const C = C_inv > 0 ? 1 / C_inv : 0
  return { R, L, C, V }
}

// 开始仿真
function handleSimulate() {
  const hasV = components.value.some(c => c.type === 'V')
  if (!hasV) {
    alert('请先拖拽元件搭建RLC电路，至少需要一个信号源V')
    return
  }
  const ep = extractParams()
  updateParams(ep)

  // 保存仿真记录
  saveSimulationRecord({
    params: { ...params.value },
    results: { ...results.value },
  })
}

// 清空电路（完整重置所有状态）
function handleReset() {
  components.value = []
  wires.value = []
  circuitMode.value = 'wire'
  measuredData.value = []
  updateParams({ R: 100, L: 10, C: 1, V: 5, fStart: 100, fEnd: 2000 })
}

// 实测数据绘制（measuredData 是 ChartPanel 的 prop，响应式自动触发重绘）
function handlePlotMeasured() {
  saveMeasuredRecord(measuredData.value)
}

// 频率扫描完成
function handleSweepDone(data) {
  measuredData.value = data
}

// 李萨如幅频图点击更新频率
function handleLissaFreqUpdate(freq) {
  updateParams({ fStart: freq, fEnd: freq })
}

// 加载仿真历史
function handleLoadSimHistory(idx) {
  const r = simulationHistory.value[idx]
  if (!r) return
  updateParams({
    R: r.params.R,
    L: r.params.L,
    C: r.params.C,
    V: r.params.V,
    fStart: r.params.fStart,
    fEnd: r.params.fEnd,
  })
  alert(`已加载 ${r.time} 的仿真参数`)
}

// 加载实测历史
function handleLoadMeasHistory(idx) {
  const r = measuredHistory.value[idx]
  if (!r) return
  measuredData.value = JSON.parse(JSON.stringify(r.data))
}

// 导入历史文件处理
async function handleImportSimHistory(file) {
  if (!file) return
  try {
    const count = await importSimulationHistory(file)
    alert(`成功导入仿真记录（共 ${count} 条）`)
  } catch (err) {
    alert('文件解析失败：' + err.message)
  }
}

async function handleImportMeasHistory(file) {
  if (!file) return
  try {
    const count = await importMeasuredHistory(file)
    alert(`成功导入实测记录（共 ${count} 条）`)
  } catch (err) {
    alert('文件解析失败：' + err.message)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-400 to-purple-500 p-3 md:p-4">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <header class="text-center text-white mb-6">
        <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 text-2xl font-bold shadow-lg">
          RLC
        </div>
        <h1 class="text-2xl font-bold mb-2">🔬 RLC电路实验助手</h1>
        <p class="text-sm opacity-90">你的AI实验助手</p>
      </header>

      <!-- 1. 电子拖拽接线台 -->
      <section class="card mb-4">
        <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>🧩</span>
          <span>电子拖拽接线台</span>
        </div>
        <CircuitBoard
          v-model:components="components"
          v-model:wires="wires"
          v-model:mode="circuitMode"
          @simulate="handleSimulate"
          @reset="handleReset"
        />
      </section>

      <!-- 2. 计算结果 -->
      <section class="card mb-4">
        <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>📊</span>
          <span>计算结果</span>
        </div>
        <ResultCards :results="results" />
        <!-- 仿真历史记录 -->
        <SimulationHistory
          :history="simulationHistory"
          @export="exportSimulationHistory"
          @import="handleImportSimHistory"
          @clear="clearSimulationHistory"
          @load="handleLoadSimHistory"
          @delete="deleteSimulationRecord"
        />
      </section>

      <!-- 3. 三大特性曲线图 -->
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
          :measured-data="measuredData"
          @update-fstart="val => updateParams({ fStart: val })"
          @update-fend="val => updateParams({ fEnd: val })"
        />
      </section>

      <!-- 4. 误差分析 -->
      <section class="card mb-4">
        <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>📝</span>
          <span>误差分析</span>
        </div>
        <ErrorAnalysis :results="results" />
      </section>

      <!-- 5. 实测数据输入 -->
      <section class="card mb-4">
        <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>📊</span>
          <span>实测数据输入</span>
        </div>
        <MeasuredDataInput
          v-model:data="measuredData"
          :history="measuredHistory"
          @plot="handlePlotMeasured"
          @export-history="exportMeasuredHistory"
          @import-history="handleImportMeasHistory"
          @clear-history="clearMeasuredHistory"
          @load-history="handleLoadMeasHistory"
          @delete-history="deleteMeasuredRecord"
        />
      </section>

      <!-- 6. 李萨如图形分析 -->
      <section class="card mb-4">
        <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>📐</span>
          <span>李萨如图形分析</span>
        </div>
        <LissajousScope :params="params" @update-freq="handleLissaFreqUpdate" />
      </section>

      <!-- 7. 频率扫描 -->
      <section class="card mb-4">
        <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>🔍</span>
          <span>频率扫描</span>
        </div>
        <FrequencySweep :params="params" @sweep-done="handleSweepDone" />
      </section>
    </div>
  </div>
</template>
