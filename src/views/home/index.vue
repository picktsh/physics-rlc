<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRLCCalculatorStore } from '../../stores/rlcCalculator'
import { useHistoryStore } from '../../stores/historyDB'
import CircuitBoard from '../../components/CircuitBoard.vue'
import ResultCards from '../../components/ResultCards.vue'
import ChartPanel from '../../components/ChartPanel.vue'
import ErrorAnalysis from '../../components/ErrorAnalysis.vue'
import MeasuredDataInput from '../../components/MeasuredDataInput.vue'
import LissajousScope from '../../components/LissajousScope.vue'
import FrequencySweep from '../../components/FrequencySweep.vue'
import SimulationHistory from '../../components/SimulationHistory.vue'
import FormulaPrinciple from '../../components/FormulaPrinciple.vue'
import LCVoltageMethod from '../../components/LCVoltageMethod.vue'
import TunerExperiment from '../../components/TunerExperiment.vue'
import DoubaoChat from '../../components/DoubaoChat.vue'
import HeroCircuit from '../../components/HeroCircuit.vue'

const calcStore = useRLCCalculatorStore()
const historyStore = useHistoryStore()

const { params, results, ampCurveData, phaseCurveData, impedanceCurveData } = storeToRefs(calcStore)
const { simulationHistory, measuredHistory } = storeToRefs(historyStore)

const activeTab = ref(sessionStorage.getItem('activeTab') || 'formula')
watch(activeTab, (val) => {
  sessionStorage.setItem('activeTab', val)
})

const tabs = [
  { key: 'formula', label: '公式原理' },
  { key: 'demo', label: '动画演示' },
  { key: 'circuit', label: '电路搭建' },
  { key: 'analysis', label: '仿真分析' },
  { key: 'measure', label: '相位差判别法' },
  { key: 'lc-voltage', label: 'LC 电压幅值法' },
  { key: 'tuner', label: 'RLC工程应用' },
]

// 原理演示卡底部保留的实验器材清单
const mtrlList = ['信号发生器', '双踪示波器', '交流毫安表', '电阻 R', '标准电感 L', '标准电容 C']

// 当前导航项名称(内容区左上角标题随导航保持一致)
const currentTabLabel = computed(() => tabs.find(t => t.key === activeTab.value)?.label || '')

const chartPanelRef = ref(null)

// 实测点频率窗口自动适配:实测范围超出当前窗口时扩窗(各留 12% 边距);已在窗口内则尊重手动设置
function fitWindowToMeasured(data) {
  if (!Array.isArray(data) || data.length === 0) return
  let fMin = Infinity
  let fMax = -Infinity
  for (const d of data) {
    const fHz = Number(d.freq) * 1000 // 实测数据频率单位为 kHz
    if (!(fHz > 0)) continue
    if (fHz < fMin) fMin = fHz
    if (fHz > fMax) fMax = fHz
  }
  if (!isFinite(fMin)) return
  const curStart = calcStore.params.fStart
  const curEnd = calcStore.params.fEnd
  // 窗口已退化为单点(如李萨如单频联动)时不再视为有效窗口,强制按实测数据扩窗
  if (curEnd > curStart && fMin >= curStart && fMax <= curEnd) return
  const span = fMax - fMin
  const pad = Math.max(span * 0.12, 50) // 单点等退化场景给保底边距
  calcStore.updateParams({
    fStart: Math.max(1, Math.round(fMin - pad)),
    fEnd: Math.round(fMax + pad),
  })
}

// 实测数据绘制(空数据不落库;未仿真时自动补跑仿真;对频率/电流量级异常给出单位提示;窗口外自动扩窗后重绘)
function handlePlotMeasured() {
  const data = calcStore.measuredData
  if (!Array.isArray(data) || data.length === 0) {
    alert('暂无实测数据:请先在上方输入或粘贴数据,再点击绘制')
    return
  }
  // 若尚未仿真:自动补跑一次,蓝色曲线采用电路搭建页的实际参数
  // (电路未闭合/缺元件时 simulate 静默失败,蓝线回退为默认参数的理论曲线,不影响实测绘制)
  if (!calcStore.simulated) {
    calcStore.simulate()
  }
  // 频率单位校验:表格单位为 kHz。若把 Hz 数值直接填入(如 2252 而不是 2.252),会超出常见量级,
  // 窗口被拉远后理论曲线在该频段电流趋近于 0,视觉上就是贴底的蓝色直线
  const maxFreqK = Math.max(...data.map(d => Number(d.freq) || 0))
  if (maxFreqK > 500) {
    alert('提示:实测最大频率约 ' + maxFreqK.toFixed(1) + ' kHz,远超本实验量级。\n若你输入的是 2252 这类 Hz 数值,请除以 1000 改为 2.252(频率单位是 kHz)。')
  }
  // 电流量级校验:与当前仿真全域峰值比较,错配会把蓝色仿真曲线压缩成底部直线
  const measMax = Math.max(...data.map(d => Number(d.current) || 0))
  const simPeak = calcStore.results.Imax
  if (measMax > 0 && simPeak > 0 && measMax > simPeak * 2.5) {
    alert('提示:实测电流峰值 ' + measMax.toFixed(2) + ' mA,约为当前仿真峰值 ' + simPeak.toFixed(2) + ' mA 的 ' + (measMax / simPeak).toFixed(1) + ' 倍。\n请检查:1) 电流是否以 mA 为单位;2) 电路元件(R/L/C/V)修改后是否重新点过「开始仿真」。否则蓝色曲线会被压缩成底部直线。')
  }
  historyStore.saveMeasuredRecord(data)
  fitWindowToMeasured(data)
  // 保存与扩窗后触发图表重绘
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

// 频率扫描完成(数据已按 kHz 约定下发;自动扩窗保证绿线可见)
function handleSweepDone(data) {
  calcStore.measuredData = data
  fitWindowToMeasured(data)
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
  fitWindowToMeasured(calcStore.measuredData)
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
  <div class="app-layout">
    <!-- 左侧竖排目录(≥1024px 显示) -->
    <aside class="side-rail">
      <div class="side-brand">
        <span class="side-brand-cn">RLC 串联谐振电路实验</span>
        <span class="side-brand-en">SERIES RESONANCE · LAB</span>
      </div>
      <nav class="side-nav" role="tablist" aria-label="实验章节">
        <button
          v-for="(tab, i) in tabs"
          :key="'s' + tab.key"
          class="snav-item"
          :class="{ active: activeTab === tab.key }"
          role="tab"
          :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key"
        >
          <span class="snav-num">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="snav-label">{{ tab.label }}</span>
        </button>
      </nav>
      <div class="side-foot">
        《大学物理》实验报告<br />
        RLC 串联电路频率特性研究
      </div>
    </aside>

    <!-- 右侧主内容 -->
    <main class="main-col">
      <div class="w-full max-w-[1560px] mx-auto">
        <!-- 论文题头 -->
        <header>
          <div class="paper-head">
            <h1>{{ currentTabLabel }}</h1>
            <p class="paper-meta">RLC 串联谐振电路实验 · 理论仿真 · 实测比对 · 误差分析</p>
          </div>
        </header>

        <!-- 窄屏目录(顶部横排) -->
        <nav class="paper-tabs" role="tablist">
          <button
            v-for="tab in tabs"
            :key="'t' + tab.key"
            :class="['ptab', activeTab === tab.key ? 'active' : '']"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </nav>

      <!-- Tab 内容: 电路搭建 -->
      <template v-if="activeTab === 'circuit'">
        <section class="card mb-4">
          <h2 class="sec-title">电路搭建与仿真</h2>
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
          <h2 class="sec-title">计算结果</h2>
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
          <h2 class="sec-title">三大特性曲线</h2>
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
          <h2 class="sec-title">实测数据输入</h2>
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
          <h2 class="sec-title">误差分析</h2>
          <ErrorAnalysis :results="results" />
        </section>
      </template>

      <!-- Tab 内容: 相位差判别法 / LC电压幅值法
      用 KeepAlive 保活:两个页面的「自动扫频」由组件内定时链驱动,
      切到其它 tab 时不再卸载组件,扫频在后台继续,切回时进度不丢 -->
      <KeepAlive>
        <LissajousScope
          v-if="activeTab === 'measure'"
          :params="params"
          @update-freq="handleLissaFreqUpdate"
        />
        <LCVoltageMethod v-else-if="activeTab === 'lc-voltage'" />
      </KeepAlive>

      <!-- 频率扫描 (相位差判别法页内的一次性计算工具,无需保活) -->
      <section v-if="activeTab === 'measure'" class="card mb-4">
        <div
          class="card-hd flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-lg"
        >
          <span class="text-sm font-semibold text-gray-800">频率扫描</span>
        </div>
        <div class="p-3">
          <FrequencySweep :params="params" @sweep-done="handleSweepDone" />
        </div>
      </section>

      <!-- Tab 内容: 公式原理 -->
      <template v-if="activeTab === 'formula'">
        <FormulaPrinciple />
      </template>

      <!-- Tab 内容: 动画演示(3D 台面全息演示 RLC 串联谐振,卡底附实验器材清单) -->
      <template v-if="activeTab === 'demo'">
        <section class="card mb-4">
          <h2 class="sec-title">RLC 串联谐振 · 原理演示</h2>
          <HeroCircuit />
          <div class="lab-gear" aria-label="实验器材">
            <span class="lab-gear-t">所需器材</span>
            <span v-for="m in mtrlList" :key="m" class="mtrl-chip">{{ m }}</span>
          </div>
        </section>
      </template>

      <!-- Tab 内容: RLC工程应用(收音机选频) -->
      <template v-if="activeTab === 'tuner'">
        <TunerExperiment />
      </template>
      </div>

      <DoubaoChat />
      </main>
  </div>
</template>

<style scoped>
.card-hd {
  border-bottom: 1px solid #e3e7ee;
}
</style>
