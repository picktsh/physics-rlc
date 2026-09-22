<script setup>
// 「电压最大值法」方法页:计算结果 / 三大特性曲线 / 实测数据输入 / 误差分析。
// 作为「数据分析」容器页(index.vue)的一个 tab 子路由渲染;迁自旧 home/index.vue 的 analysis 段及其配套 handler。
import { ref, nextTick } from 'vue'
import { useMessage } from 'naive-ui'
import { storeToRefs } from 'pinia'
import ResultCards from './components/ResultCards.vue'
import ChartPanel from './components/ChartPanel.vue'
import ErrorAnalysis from './components/ErrorAnalysis.vue'
import MeasuredDataInput from './components/MeasuredDataInput.vue'
import SimulationHistory from './components/SimulationHistory.vue'
import { useRLCCalculatorStore, SIMULATE_HINT } from '@/stores/rlcCalculator'
import { useHistoryStore } from '@/stores/historyDB'
import { QUANTITY } from '@/utils/quantity'

const calcStore = useRLCCalculatorStore()
const historyStore = useHistoryStore()
const message = useMessage()

const { params, results, ampCurveData, phaseCurveData, impedanceCurveData } = storeToRefs(calcStore)
const { simulationHistory, measuredHistory } = storeToRefs(historyStore)

const chartPanelRef = ref(null)

// 实测点频率窗口自动适配:实测范围超出当前窗口时扩窗(各留 12% 边距);已在窗口内则尊重手动设置
function fitWindowToMeasured(data) {
  if (!Array.isArray(data) || data.length === 0) return
  let fMin = Infinity
  let fMax = -Infinity
  for (const d of data) {
    const fK = Number(d.freq) // 实测数据与 params.fStart/fEnd 同口径,均为 kHz(零换算)
    if (!(fK > 0)) continue
    if (fK < fMin) fMin = fK
    if (fK > fMax) fMax = fK
  }
  if (!isFinite(fMin)) return
  const curStart = calcStore.params.fStart
  const curEnd = calcStore.params.fEnd
  // 窗口已退化为单点(如李萨如单频联动)时不再视为有效窗口,强制按实测数据扩窗
  if (curEnd > curStart && fMin >= curStart && fMax <= curEnd) return
  const span = fMax - fMin
  const pad = Math.max(span * 0.12, 0.05) // 单点等退化场景给保底边距(kHz)
  calcStore.updateParams({
    fStart: Math.max(0.001, +(fMin - pad).toFixed(4)),
    fEnd: +(fMax + pad).toFixed(4),
  })
}

// 实测数据绘制(空数据不落库;未仿真时自动补跑仿真;对频率/电流量级异常给出单位提示;窗口外自动扩窗后重绘)
function handlePlotMeasured() {
  const data = calcStore.measuredData
  if (!Array.isArray(data) || data.length === 0) {
    message.warning('暂无实测数据:请先在上方输入或粘贴数据,再点击绘制')
    return
  }
  if (!calcStore.simulated) {
    // 未仿真自动补跑;失败(电路未搭建/未闭合)则提醒并中止,避免用默认参数画“假理论曲线”
    const r = calcStore.simulate()
    if (!r.success) {
      message.warning(r.message || SIMULATE_HINT)
      return
    }
  }
  // 频率单位校验:表格单位为 kHz。Hz 数值直填会超量级,导致蓝色理论曲线贴底
  const maxFreqK = Math.max(...data.map((d) => Number(d.freq) || 0))
  if (maxFreqK > 500) {
    message.warning(
      '提示:实测最大频率约 ' +
        maxFreqK.toFixed(1) +
        ' ' +
        QUANTITY.f.unit +
        ',远超本实验量级。\n若你输入的是 2252 这类 Hz 数值,请除以 1000 改为 2.252(频率单位是 kHz)。',
    )
  }
  // 电流量级校验:与当前仿真全域峰值比较,错配会把蓝色仿真曲线压缩成底部直线
  const measMax = Math.max(...data.map((d) => Number(d.current) || 0))
  const simPeak = calcStore.results.Imax
  if (measMax > 0 && simPeak > 0 && measMax > simPeak * 2.5) {
    message.warning(
      '提示:实测电流峰值 ' +
        measMax.toFixed(2) +
        ' ' +
        QUANTITY.i.unit +
        ',约为当前仿真峰值 ' +
        simPeak.toFixed(2) +
        ' ' +
        QUANTITY.i.unit +
        ' 的 ' +
        (measMax / simPeak).toFixed(1) +
        ' 倍。\n请检查:1) 电流是否以 mA 为单位;2) 电路元件(R/L/C/V)修改后是否重新点过「开始仿真」。否则蓝色曲线会被压缩成底部直线。',
    )
  }
  historyStore.saveMeasuredRecord(data)
  fitWindowToMeasured(data)
  nextTick(() => {
    chartPanelRef.value?.drawChart?.()
  })
}

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
  // 历史记录即一次已完成的仿真:补置 simulated 门控,否则 ChartPanel 永远停在占位图不画曲线
  calcStore.simulated = true
  message.success(`已加载 ${r.time} 的仿真参数`)
}

function handleLoadMeasHistory(idx) {
  const r = historyStore.measuredHistory[idx]
  if (!r) return
  calcStore.measuredData = JSON.parse(JSON.stringify(r.data))
  fitWindowToMeasured(calcStore.measuredData)
}

async function handleImportSimHistory(file) {
  if (!file) return
  try {
    const count = await historyStore.importSimulationHistory(file)
    message.success(`成功导入仿真记录（共 ${count} 条）`)
  } catch (err) {
    message.error('文件解析失败：' + err.message)
  }
}

async function handleImportMeasHistory(file) {
  if (!file) return
  try {
    const count = await historyStore.importMeasuredHistory(file)
    message.success(`成功导入实测记录（共 ${count} 条）`)
  } catch (err) {
    message.error('文件解析失败：' + err.message)
  }
}
</script>

<template>
  <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] mb-4">
    <h2
      class="text-base font-bold leading-normal tracking-[0.5px] text-[var(--app-text)] [font-family:var(--app-font-heading)] border-l-4 border-l-[var(--app-brand)] mb-4"
    >
      计算结果
    </h2>
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

  <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] mb-4">
    <h2
      class="text-base font-bold leading-normal tracking-[0.5px] text-[var(--app-text)] [font-family:var(--app-font-heading)] border-l-4 border-l-[var(--app-brand)] mb-4"
    >
      三大特性曲线
    </h2>
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

  <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] mb-4">
    <h2
      class="text-base font-bold leading-normal tracking-[0.5px] text-[var(--app-text)] [font-family:var(--app-font-heading)] border-l-4 border-l-[var(--app-brand)] mb-4"
    >
      实测数据输入
    </h2>
    <MeasuredDataInput
      v-model:data="calcStore.measuredData"
      :theoretical-params="params"
      :history="measuredHistory"
      @plot="handlePlotMeasured"
      @export-history="historyStore.exportMeasuredHistory()"
      @import-history="handleImportMeasHistory"
      @clear-history="historyStore.clearMeasuredHistory()"
      @load-history="handleLoadMeasHistory"
      @delete-history="historyStore.deleteMeasuredRecord"
    />
  </section>

  <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] mb-4">
    <h2
      class="text-base font-bold leading-normal tracking-[0.5px] text-[var(--app-text)] [font-family:var(--app-font-heading)] border-l-4 border-l-[var(--app-brand)] mb-4"
    >
      误差分析
    </h2>
    <ErrorAnalysis :results="results" />
  </section>
</template>
