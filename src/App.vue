<script setup>
import { ref, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { NConfigProvider, NMessageProvider, zhCN, dateZhCN } from 'naive-ui'
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
import LCVoltageMethod from './components/LCVoltageMethod.vue'
import DoubaoChat from './components/DoubaoChat.vue'

// ---- 密码验证 ----
const PASSWORD = 'rlccstm'
const authenticated = ref(false)
const passwordInput = ref('')
const passwordError = ref('')

function handlePassword() {
  if (passwordInput.value === PASSWORD) {
    authenticated.value = true
    passwordError.value = ''
  } else {
    passwordError.value = '❌ 密码错误，请重试'
    passwordInput.value = ''
  }
}

function handleKeydown(e) {
  if (e.key === 'Enter') handlePassword()
}

const calcStore = useRLCCalculatorStore()
const historyStore = useHistoryStore()

const { params, results, ampCurveData, phaseCurveData, impedanceCurveData } = storeToRefs(calcStore)
const { simulationHistory, measuredHistory } = storeToRefs(historyStore)

const activeTab = ref(sessionStorage.getItem('activeTab') || 'formula')
watch(activeTab, (val) => {
  sessionStorage.setItem('activeTab', val)
})

const tabs = [
  { key: 'formula', label: '📖 公式原理' },
  { key: 'circuit', label: '🧩 电路搭建' },
  { key: 'analysis', label: '📊 仿真分析' },
  { key: 'measure', label: '📋 相位差判别法' },
  { key: 'lc-voltage', label: '📋 LC电压幅值法' },
]

const chartPanelRef = ref(null)

// 实测数据绘制
function handlePlotMeasured() {
  historyStore.saveMeasuredRecord(calcStore.measuredData)
  // 保存后触发图表重绘
  nextTick(() => {
    chartPanelRef.value?.drawChart?.()
  })
}

// 仿真并自动保存历史
function handleSimulate() {
  const result = calcStore.simulate()
  if (!result.success) {
    alert(result.message || '请先拖拽元件搭建RLC电路，至少需要一个信号源V')
    return
  }
  // 仿真成功后自动保存仿真记录
  historyStore.saveSimulationRecord({
    params: { ...calcStore.params },
    results: { ...calcStore.results },
  })
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
  } catch (err) {
    alert('文件解析失败：' + err.message)
  }
}

async function handleImportMeasHistory(file) {
  if (!file) return
  try {
    const count = await historyStore.importMeasuredHistory(file)
    alert(`成功导入实测记录（共 ${count} 条）`)
  } catch (err) {
    alert('文件解析失败：' + err.message)
  }
}
</script>

<template>
  <NConfigProvider :locale="zhCN" :date-locale="dateZhCN">
    <NMessageProvider>
      <!-- ====== 密码验证门 ====== -->
      <div v-if="!authenticated" class="min-h-screen bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div class="text-center mb-6">
            <div class="text-4xl mb-3">🔬</div>
            <h2 class="text-xl font-bold text-gray-800">RLC电路实验助手</h2>
            <p class="text-sm text-gray-500 mt-1">请输入密码以继续</p>
          </div>
          <input
            v-model="passwordInput"
            type="password"
            placeholder="请输入密码"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-center outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition-all"
            @keydown="handleKeydown"
          />
          <p v-if="passwordError" class="text-red-500 text-xs text-center mt-2">{{ passwordError }}</p>
          <button
            @click="handlePassword"
            class="w-full mt-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            进入
          </button>
        </div>
      </div>

      <!-- ====== 主应用内容（验证通过后显示） ====== -->
      <template v-if="authenticated">
        <div class="min-h-screen bg-gradient-to-br from-indigo-400 to-purple-500 p-2 sm:p-3 md:p-4">
          <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <header class="text-center text-white mb-4">
              <h1 class="text-xl font-bold">🔬 RLC电路实验助手</h1>
              <p class="text-sm opacity-90">你的AI实验助手</p>
            </header>

            <!-- Tab 导航 -->
            <div class="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                :class="[
                  'tab-btn px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-200',
                  activeTab === tab.key
                    ? 'bg-white text-indigo-700 shadow-lg scale-105'
                    : 'bg-white/20 text-white/90 hover:bg-white/30 backdrop-blur-sm',
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
                  v-model:junctions="calcStore.junctions"
                  v-model:mode="calcStore.circuitMode"
                  @simulate="handleSimulate"
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
                <ResultCards :results="results" :simulated="calcStore.simulated" />
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
                  :simulated="calcStore.simulated"
                  @update-fstart="(val) => calcStore.updateParams({ fStart: val })"
                  @update-fend="(val) => calcStore.updateParams({ fEnd: val })"
                />
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

              <section class="card mb-4">
                <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span>📝</span>
                  <span>误差分析</span>
                </div>
                <ErrorAnalysis :results="results" />
              </section>
            </template>

            <!-- Tab 内容: 相位差判别法 (布局模仿 LC电压幅值法) -->
            <template v-if="activeTab === 'measure'">
              <LissajousScope :params="params" @update-freq="handleLissaFreqUpdate" />

              <!-- 频率扫描 (模仿 LCVoltageMethod 的操作控制样式) -->
              <section class="card mb-4">
                <div class="card-hd flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                  <span class="text-sm font-semibold text-gray-800">🔍 频率扫描</span>
                </div>
                <div class="p-3">
                  <FrequencySweep :params="params" @sweep-done="handleSweepDone" />
                </div>
              </section>
            </template>

            <!-- Tab 内容: 公式原理 -->
            <template v-if="activeTab === 'formula'">
              <FormulaPrinciple />
            </template>

            <!-- Tab 内容: LC电压幅值法 -->
            <template v-if="activeTab === 'lc-voltage'">
              <LCVoltageMethod />
            </template>
          </div>

          <DoubaoChat />
        </div>
      </template>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
.card-hd {
  border-bottom: 1px solid #e2e8f0;
}
</style>
