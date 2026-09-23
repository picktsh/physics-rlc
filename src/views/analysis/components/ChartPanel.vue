<template>
  <div class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)]">
    <!-- 标签和频率范围 -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
      <div class="flex gap-2 overflow-x-auto scrollbar-hide">
        <NButton
          v-for="tab in tabs"
          :key="tab.value"
          secondary
          :type="currentChart === tab.value ? 'primary' : 'default'"
          class="whitespace-nowrap"
          @click="switchChart(tab.value)"
        >
          {{ tab.label }}
        </NButton>
      </div>
      <NForm label-placement="top" :show-feedback="false" class="sm:ml-auto">
        <NFormItem label="频率范围" class="flex-none">
          <div class="flex items-center gap-2 flex-wrap">
            <div class="w-14 sm:w-20">
              <NSlider
                :min="0.001"
                :max="10"
                :step="0.001"
                :value="localFStart"
                @update:value="(v) => syncFromSlider('start', v)"
              />
            </div>
            <div class="w-16 sm:w-20">
              <NInputNumber
                :min="0.001"
                :show-button="false"
                :precision="QUANTITY.f.decimals"
                :step="QUANTITY.f.step"
                :value="localFStart"
                @update:value="onFreqInput('start', $event)"
              />
            </div>
            <span>~</span>
            <div class="w-16 sm:w-20">
              <NInputNumber
                :min="0.001"
                :show-button="false"
                :precision="QUANTITY.f.decimals"
                :step="QUANTITY.f.step"
                :value="localFEnd"
                @update:value="onFreqInput('end', $event)"
              />
            </div>
            <div class="w-14 sm:w-20">
              <NSlider
                :min="0.001"
                :max="10"
                :step="0.001"
                :value="localFEnd"
                @update:value="(v) => syncFromSlider('end', v)"
              />
            </div>
            <span>{{ QUANTITY.f.unit }}</span>
          </div>
        </NFormItem>
      </NForm>
    </div>

    <!-- 实测提示:实测点仅叠加在幅频图上,避免在相频/阻抗页误以为丢失 -->
    <div
      v-if="measuredData.length > 0 && currentChart !== 'amp'"
      class="mb-1.5 text-xs text-[color:var(--app-warning)]"
    >
      📗 已有实测数据:绿色实测曲线叠加在「幅频特性 I-f」图上,请切换查看
    </div>
    <!-- 实测-仿真量级错配提示:实测电流远大于仿真峰时,蓝线会被压缩成底部直线,引导用户检查单位与参数 -->
    <div
      v-if="
        currentChart === 'amp' && measuredData.length > 0 && ampPeaks.meas > 0 && ampPeaks.meas > ampPeaks.theory * 1.5
      "
      class="mb-1.5 text-xs text-[color:var(--app-warning)]"
    >
      ⚠ 实测电流峰值 {{ ampPeaks.meas.toFixed(2) }} {{ QUANTITY.i.unit }},高于仿真峰值
      {{ ampPeaks.theory.toFixed(2) }}
      {{ QUANTITY.i.unit }}:蓝色仿真曲线被压缩变矮,请核对电流单位(mA)与仿真参数(R/L/C/V,元件修改后需重新仿真)
    </div>
    <!-- 图表Canvas(bg-transparent:保留容器 blueprint-grid 图纸底,画布不遮挡网格) -->
    <div class="chart-container blueprint-grid rounded-lg p-3 border border-[color:var(--app-border)] relative">
      <canvas
        ref="chartCanvasRef"
        class="w-full cursor-crosshair bg-transparent"
        :style="{ height: chartHeight + 'px' }"
        @click="handleChartClick"
      ></canvas>
      <!-- Imax/√2 截止线公式标注:KaTeX 分式渲染,-translate-y-full 令分式底边对齐虚线上方;
           坐标由 drawAmpChart 每次重绘同步写入 halfPowerMark -->
      <div
        v-if="halfPowerMark"
        class="absolute -translate-y-full pointer-events-none text-xs text-[color:var(--app-error)] leading-none"
        :style="{ left: halfPowerMark.x + 'px', top: halfPowerMark.y + 'px' }"
      >
        <span v-html="K('\\dfrac{I_{max}}{\\sqrt{2}}')"></span><span>= {{ halfPowerMark.value }}{{ QUANTITY.i.unit }}</span>
      </div>
      <div
        v-if="tooltip.show"
        class="chart-tooltip absolute bg-[color-mix(in_srgb,var(--app-surface),transparent_5%)] border border-[color:var(--app-border)] rounded-lg px-3 py-2 text-xs shadow-lg pointer-events-none whitespace-nowrap"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        v-html="tooltip.content"
      ></div>
    </div>

    <!-- 图例 -->
    <div class="legend flex justify-center gap-4 mt-3 text-xs text-[color:var(--app-text-muted)] flex-wrap">
      <div class="flex items-center gap-2">
        <div class="w-4 h-0.5 bg-[var(--app-primary)]"></div>
        <span>理论曲线</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-[var(--app-success)]"></div>
        <span>实测数据</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-0 border-t-2 border-dashed border-[color:var(--app-border-dark)]"></div>
        <span class="inline-flex items-center gap-2">
          <span v-html="K('\\dfrac{I_{max}}{\\sqrt{2}}')"></span>
          <span>截止电流</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { NButton, NForm, NFormItem, NInputNumber, NSlider } from 'naive-ui'
import { impedance, calculateRLC } from '@/utils/physics'
import { canvasTheme } from '@/utils/canvasTheme'
import { QUANTITY, decimalsFor } from '@/utils/quantity'

// 角频率:本页入参 f 均为 kHz(SI 换算唯一发生地,与 physics.js 口径一致)
const ω = (fKHz) => 2 * Math.PI * fKHz * 1e3

/** 渲染 LaTeX 为 KaTeX HTML(与公式原理/收音机页同一封装) */
function K(tex, display = false) {
  return katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: 'ignore',
  })
}

const props = defineProps({
  params: { type: Object, required: true },
  ampCurveData: { type: Array, default: () => [] },
  phaseCurveData: { type: Array, default: () => [] },
  impedanceCurveData: { type: Array, default: () => [] },
  measuredData: { type: Array, default: () => [] },
  simulated: { type: Boolean, default: false },
})

const emit = defineEmits(['update-fstart', 'update-fend'])

const chartCanvasRef = ref(null)
const currentChart = ref('amp')
const chartHeight = ref(
  typeof window !== 'undefined' && window.innerWidth < 640 ? 280 : window.innerWidth <= 768 ? 350 : 450,
)
const SAMPLE_COUNT = 500

const localFStart = ref(props.params.fStart || 1.4)
const localFEnd = ref(props.params.fEnd || 3.2)

// 幅频图绘制时窗口内的理论峰值与实测峰值(供量级错配提示条使用)
const ampPeaks = ref({ theory: 0, meas: 0 })

// Imax/√2 截止线公式标注(KaTeX 分式,HTML 覆盖层):坐标由 drawAmpChart 每次重绘时写入
const halfPowerMark = ref(null)

const tooltip = ref({ show: false, x: 0, y: 0, content: '' })

const tabs = [
  { label: '幅频特性 I-f', value: 'amp' },
  { label: '相频特性 φ-f', value: 'phase' },
  { label: '阻抗模特性 Z-f', value: 'impedance' },
]

// 获取有效的绘图参数(存储单位=展示单位:R Ω/L H/C μF;缺少元件时用默认值)
function getPlotParams() {
  let R = props.params.R || 0
  let L = props.params.L || 0
  let C = (props.params.C || 0) * 1e-6
  const V = props.params.V || 5
  let usingDefaults = false
  if (R <= 0) {
    R = 100
    usingDefaults = true
  }
  if (L <= 0) {
    L = 0.01
    usingDefaults = true
  }
  if (C <= 0) {
    C = 1 * 1e-6
    usingDefaults = true
  }
  return { R, L, C, V, usingDefaults }
}

function setupHiDPICanvas() {
  const canvas = chartCanvasRef.value
  if (!canvas) return null
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = chartHeight.value * dpr
  canvas.style.height = chartHeight.value + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  return { ctx, W: rect.width, H: chartHeight.value }
}

// 主题绘制色:每次绘制前从 CSS 变量同步(黑配色下网格/坐标轴/文字自动转浅色,曲线色与图例色块同源)
let ct = canvasTheme()
let chartAccent = ct.accent

function syncChartTheme() {
  ct = canvasTheme()
  chartAccent = ct.accent
}

function drawChart() {
  syncChartTheme()
  const info = setupHiDPICanvas()
  if (!info) return
  const { ctx, W, H } = info
  const pad = { top: 40, right: 40, bottom: 50, left: 60 }
  const width = W - pad.left - pad.right
  const height = H - pad.top - pad.bottom

  // 公式标注仅在幅频图中出现:每次重绘先清空,由 drawAmpChart 重新写入
  halfPowerMark.value = null

  // 未搭建电路且无实测数据时显示占位图
  if (!props.simulated && props.measuredData.length === 0) {
    drawPlaceholder(ctx, W, H, pad)
    return
  }

  const { R, L, C, V, usingDefaults } = getPlotParams()
  // 退化窗口防御(李萨如单频点击等会使 fStart==fEnd):回退到默认显示范围,避免除零导致曲线消失
  let fStart = localFStart.value
  let fEnd = localFEnd.value
  if (!(fEnd > fStart)) {
    fStart = 1.4
    fEnd = 3.2
  }
  const N = SAMPLE_COUNT

  // 网格
  ctx.strokeStyle = ct.grid
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top + (height / 5) * i)
    ctx.lineTo(W - pad.right, pad.top + (height / 5) * i)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pad.left + (width / 5) * i, pad.top)
    ctx.lineTo(pad.left + (width / 5) * i, H - pad.bottom)
    ctx.stroke()
  }

  // 默认值警告
  if (usingDefaults) {
    ctx.fillStyle = 'rgba(169,121,46,0.85)'
    ctx.font = '11px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText('⚠ 部分元件使用默认值（R=100Ω, L=0.01H, C=1μF）', pad.left + 5, pad.top - 8)
  }

  if (currentChart.value === 'amp') {
    drawAmpChart(ctx, W, H, width, height, pad, R, L, C, V, fStart, fEnd, N)
  } else if (currentChart.value === 'phase') {
    drawPhaseChart(ctx, W, H, width, height, pad, R, L, C, fStart, fEnd, N)
  } else {
    drawImpedanceChart(ctx, W, H, width, height, pad, R, L, C, fStart, fEnd, N)
  }
}

// 未仿真时的占位图
function drawPlaceholder(ctx, W, H, pad) {
  const cx = W / 2
  const cy = H / 2

  // 浅色网格
  ctx.strokeStyle = ct.grid
  ctx.lineWidth = 1
  const gH = H - pad.top - pad.bottom
  const gW = W - pad.left - pad.right
  for (let i = 0; i <= 5; i++) {
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top + (gH / 5) * i)
    ctx.lineTo(W - pad.right, pad.top + (gH / 5) * i)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pad.left + (gW / 5) * i, pad.top)
    ctx.lineTo(pad.left + (gW / 5) * i, H - pad.bottom)
    ctx.stroke()
  }

  // 坐标轴装饰线
  ctx.strokeStyle = ct.axis
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(pad.left, pad.top)
  ctx.lineTo(pad.left, H - pad.bottom)
  ctx.lineTo(W - pad.right, H - pad.bottom)
  ctx.stroke()

  // 占位主图标 —— 三条虚线示意曲线
  ctx.strokeStyle = ct.axis
  ctx.lineWidth = 2
  ctx.setLineDash([6, 6])
  // 示意幅频曲线
  ctx.beginPath()
  ctx.moveTo(pad.left + gW * 0.1, H - pad.bottom - gH * 0.5)
  ctx.quadraticCurveTo(pad.left + gW * 0.35, H - pad.bottom - gH * 0.85, cx, H - pad.bottom - gH * 0.75)
  ctx.quadraticCurveTo(
    pad.left + gW * 0.65,
    H - pad.bottom - gH * 0.6,
    W - pad.right - gW * 0.1,
    H - pad.bottom - gH * 0.4,
  )
  ctx.stroke()
  ctx.setLineDash([])

  // 中央提示文字
  ctx.fillStyle = ct.label
  ctx.font = 'bold 16px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('请搭建 RLC 电路并点击「开始仿真」', cx, cy - 24)

  ctx.fillStyle = ct.labelDim
  ctx.font = '13px system-ui'
  ctx.fillText('以查看幅频 / 相频 / 阻抗特性曲线', cx, cy + 12)

  // 小箭头提示
  ctx.fillStyle = ct.axis
  ctx.font = '20px system-ui'
  ctx.fillText('👆', cx, cy + 58)
  ctx.font = '12px system-ui'
  ctx.fillText('切换到「电路搭建」标签页', cx, cy + 88)

  ctx.textBaseline = 'alphabetic'
}

// 幅频特性
function drawAmpChart(ctx, W, H, width, height, pad, R, L, C, V, fStart, fEnd, N) {
  let maxI = 0
  for (let i = 0; i <= N; i++) {
    const f = fStart + ((fEnd - fStart) * i) / N
    const w = ω(f)
    const Z = Math.sqrt(R * R + (w * L - 1 / (w * C)) ** 2)
    const I = (V / Z) * 1000
    if (I > maxI) maxI = I
  }
  maxI = Math.max(maxI * 1.1, 10.5)
  const theoryPeakInWindow = maxI // 仿真峰值(y 轴基准,含下限)
  // 实测电流可能高于理论峰(元件公差/源电压偏差等),把实测最大值并入 y 轴量程,保证绿点不飞出画布顶
  let measPeak = 0
  for (const md of props.measuredData) {
    if (md.current > 0 && md.current > maxI) maxI = md.current
    if (md.current > 0 && md.current > measPeak) measPeak = md.current
  }
  ampPeaks.value = { theory: theoryPeakInWindow, meas: measPeak }

  // 理论曲线
  ctx.strokeStyle = chartAccent
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const f = fStart + ((fEnd - fStart) * i) / N
    const w = ω(f)
    const Z = Math.sqrt(R * R + (w * L - 1 / (w * C)) ** 2)
    const I = (V / Z) * 1000
    const x = pad.left + ((f - fStart) / (fEnd - fStart)) * width
    const y = pad.top + height * (1 - I / maxI)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()

  // 理论计算
  const theory = calcTheory(R, L, C, V)

  // Imax/√2截止线
  const halfPowerY = pad.top + height * (1 - theory.halfPower / maxI)
  ctx.strokeStyle = ct.axis
  ctx.lineWidth = 1
  ctx.setLineDash([5, 3])
  ctx.beginPath()
  ctx.moveTo(pad.left, halfPowerY)
  ctx.lineTo(W - pad.right, halfPowerY)
  ctx.stroke()
  ctx.setLineDash([])

  // Imax标记
  const resX = pad.left + ((theory.fr - fStart) / (fEnd - fStart)) * width
  const resY = pad.top + height * (1 - theory.Imax / maxI)
  ctx.fillStyle = chartAccent
  ctx.beginPath()
  ctx.arc(resX, resY, 6, 0, 2 * Math.PI)
  ctx.fill()
  ctx.fillStyle = chartAccent
  ctx.font = 'bold 12px system-ui'
  ctx.textAlign = 'left'
  ctx.fillText('Imax=' + theory.Imax.toFixed(decimalsFor('i')) + QUANTITY.i.unit, resX - 35, resY - 10)

  // Imax/√2 标注:公式改由 KaTeX 覆盖层渲染(见模板),此处仅同步位置与数值;
  // offsetLeft/Top 把画布坐标换算到图容器坐标,分式底边再上提至虚线上方 12px,与平齐后的 f₁ 标签拉开间距
  const canvasEl = chartCanvasRef.value
  halfPowerMark.value = {
    x: (canvasEl?.offsetLeft || 0) + pad.left + 5,
    y: (canvasEl?.offsetTop || 0) + halfPowerY - 12,
    value: theory.halfPower.toFixed(decimalsFor('i')),
  }

  // f1/f2截止频率
  const f1x = pad.left + ((theory.f1 - fStart) / (fEnd - fStart)) * width
  const f2x = pad.left + ((theory.f2 - fStart) / (fEnd - fStart)) * width
  ctx.fillStyle = '#e0523f'
  ctx.beginPath()
  ctx.arc(f1x, halfPowerY, 6, 0, 2 * Math.PI)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(f2x, halfPowerY, 6, 0, 2 * Math.PI)
  ctx.fill()

  // ---- 通频带标注避让 ----
  // 带外侧三件套统一靠右竖排(通频带/BW 在线上方、f₂ 值在线下方):右上区域无峰形曲线,
  // 也避开左侧延伸过来的 Imax/√2 分式覆盖层;f₁ 在带左外与它们天然隔带不相撞。
  // 窄带/窄屏(移动端)仅整组左移贴绘图右界,不再有任何文字互叠。
  // save/restore 隔离 textAlign,避免残留状态影响下一帧其它标注。
  ctx.save()
  ctx.fillStyle = '#e0523f'
  ctx.font = 'bold 12px system-ui'
  const f1Label = 'f₁=' + theory.f1.toFixed(decimalsFor('f')) + QUANTITY.f.unit
  const f2Label = 'f₂=' + theory.f2.toFixed(decimalsFor('f')) + QUANTITY.f.unit
  const bwLabel = 'BW=' + theory.BW.toFixed(decimalsFor('bw')) + QUANTITY.bw.unit
  const bandText = '通频带'
  // f₁/f₂ 与标记点平齐(基线微偏下使文字垂直居中对齐圆点):带外侧水平延伸,不压带线也不被曲线穿越
  ctx.textAlign = 'right'
  ctx.fillText(f1Label, Math.max(f1x - 8, pad.left + ctx.measureText(f1Label).width + 2), halfPowerY + 4)
  ctx.textAlign = 'left'
  const rightColW = Math.max(
    ctx.measureText(f2Label).width,
    ctx.measureText(bwLabel).width,
    ctx.measureText(bandText).width,
  )
  const rightX = Math.min(f2x + 8, W - pad.right - rightColW)
  ctx.fillText(bandText, rightX, halfPowerY - 22)
  ctx.fillText(bwLabel, rightX, halfPowerY - 7)
  ctx.fillText(f2Label, rightX, halfPowerY + 4)
  ctx.restore()

  // BW通频带线
  ctx.strokeStyle = '#e0523f'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(f1x, halfPowerY)
  ctx.lineTo(f2x, halfPowerY)
  ctx.stroke()

  // 虚线到x轴
  ctx.strokeStyle = '#e0523f'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(f1x, halfPowerY)
  ctx.lineTo(f1x, H - pad.bottom + 10)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(f2x, halfPowerY)
  ctx.lineTo(f2x, H - pad.bottom + 10)
  ctx.stroke()
  ctx.setLineDash([])

  // 实测数据（Cardinal Spline平滑曲线;裁剪到绘图区,防止窗口外的点把连线拉出画布）
  if (props.measuredData.length > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(pad.left, pad.top, width, height)
    ctx.clip()
    if (props.measuredData.length >= 2) {
      const mPts = props.measuredData.map((md) => ({
        x: pad.left + ((md.freq - fStart) / (fEnd - fStart)) * width,
        y: pad.top + height * (1 - md.current / maxI),
      }))
      ctx.strokeStyle = '#16a34a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(mPts[0].x, mPts[0].y)
      for (let i = 0; i < mPts.length - 1; i++) {
        const p0 = mPts[i === 0 ? 0 : i - 1]
        const p1 = mPts[i]
        const p2 = mPts[i + 1]
        const p3 = mPts[i + 2 >= mPts.length ? mPts.length - 1 : i + 2]
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
      }
      ctx.stroke()
    }
    for (const md of props.measuredData) {
      const mx = pad.left + ((md.freq - fStart) / (fEnd - fStart)) * width
      const my = pad.top + height * (1 - md.current / maxI)
      ctx.fillStyle = '#16a34a'
      ctx.beginPath()
      ctx.arc(mx, my, 5, 0, 2 * Math.PI)
      ctx.fill()
    }
    ctx.restore()
  }

  drawAxes(ctx, W, H, width, height, pad, fStart, fEnd, maxI, '频率 f (' + QUANTITY.f.unit + ')', '电流 I (' + QUANTITY.i.unit + ')')
}

// 相频特性
function drawPhaseChart(ctx, W, H, width, height, pad, R, L, C, fStart, fEnd, N) {
  ctx.strokeStyle = chartAccent
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const f = fStart + ((fEnd - fStart) * i) / N
    const w = ω(f)
    const phase = Math.atan2(w * L - 1 / (w * C), R) * (180 / Math.PI)
    const x = pad.left + ((f - fStart) / (fEnd - fStart)) * width
    const y = pad.top + height * (1 - (phase + 90) / 180)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()

  // 特殊相位点标注
  const refPhases = [
    { target: 45, label: 'φ=+45°', color: '#d9962b' },
    { target: -45, label: 'φ=−45°', color: '#3b82f6' },
  ]

  for (const sp of refPhases) {
    for (let i = 1; i <= N; i++) {
      const f1 = fStart + ((fEnd - fStart) * (i - 1)) / N
      const f2 = fStart + ((fEnd - fStart) * i) / N
      const p1 = Math.atan2(2 * Math.PI * f1 * L - 1 / (2 * Math.PI * f1 * C), R) * (180 / Math.PI)
      const p2 = Math.atan2(2 * Math.PI * f2 * L - 1 / (2 * Math.PI * f2 * C), R) * (180 / Math.PI)
      if ((p1 - sp.target) * (p2 - sp.target) <= 0) {
        const t = (sp.target - p1) / (p2 - p1)
        const fCross = f1 + t * (f2 - f1)
        const px = pad.left + ((fCross - fStart) / (fEnd - fStart)) * width
        const py = pad.top + height * (1 - (sp.target + 90) / 180)
        // 水平参考虚线
        ctx.save()
        ctx.strokeStyle = sp.color
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(pad.left, py)
        ctx.lineTo(W - pad.right, py)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
        // 标记圆点
        ctx.fillStyle = sp.color
        ctx.beginPath()
        ctx.arc(px, py, 6, 0, 2 * Math.PI)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, 2 * Math.PI)
        ctx.fill()
        // 标签
        ctx.fillStyle = sp.color
        ctx.font = 'bold 10px system-ui'
        ctx.textAlign = 'left'
        ctx.fillText(sp.label + ' f=' + fCross.toFixed(decimalsFor('f')) + QUANTITY.f.unit, px + 10, py + 4)
        break
      }
    }
  }

  // 0°基准线
  const zeroY = pad.top + height * 0.5
  ctx.save()
  ctx.strokeStyle = '#16a34a'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 4])
  ctx.beginPath()
  ctx.moveTo(pad.left, zeroY)
  ctx.lineTo(W - pad.right, zeroY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  // 0°点
  for (let i = 1; i <= N; i++) {
    const f1 = fStart + ((fEnd - fStart) * (i - 1)) / N
    const f2 = fStart + ((fEnd - fStart) * i) / N
    const p1 = Math.atan2(ω(f1) * L - 1 / (ω(f1) * C), R) * (180 / Math.PI)
    const p2 = Math.atan2(ω(f2) * L - 1 / (ω(f2) * C), R) * (180 / Math.PI)
    if ((p1 - 0) * (p2 - 0) <= 0) {
      const t2 = (0 - p1) / (p2 - p1)
      const fZero = f1 + t2 * (f2 - f1)
      const zx = pad.left + ((fZero - fStart) / (fEnd - fStart)) * width
      ctx.fillStyle = '#16a34a'
      ctx.beginPath()
      ctx.arc(zx, zeroY, 7, 0, 2 * Math.PI)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(zx, zeroY, 3.5, 0, 2 * Math.PI)
      ctx.fill()
      ctx.fillStyle = '#16a34a'
      ctx.font = 'bold 11px system-ui'
      ctx.textAlign = 'left'
      ctx.fillText('φ=0° f=' + fZero.toFixed(decimalsFor('f')) + QUANTITY.f.unit, zx + 12, zeroY - 8)
      break
    }
  }

  // Y轴刻度（相位映射）
  ctx.fillStyle = ct.label
  ctx.font = '11px system-ui'
  ctx.textAlign = 'center'
  for (let i = 0; i <= 5; i++) {
    ctx.fillText(formatAxisNum(fStart + ((fEnd - fStart) * i) / 5), pad.left + (width / 5) * i, H - 20)
  }
  ctx.textAlign = 'right'
  const phaseTicks = [-90, -45, 0, 45, 90]
  for (const tick of phaseTicks) {
    const tickY = pad.top + height * (1 - (tick + 90) / 180)
    ctx.fillText(tick.toString(), pad.left - 8, tickY + 3)
  }
  ctx.font = 'bold 13px system-ui'
  ctx.textAlign = 'center'
  ctx.fillStyle = ct.ink
  ctx.fillText('频率 f (' + QUANTITY.f.unit + ')', W / 2, H - 5)
  ctx.save()
  ctx.translate(25, H / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('相位差 φ (' + QUANTITY.phi.unit + ')', 0, 0)
  ctx.restore()
}

// 阻抗模特性
function drawImpedanceChart(ctx, W, H, width, height, pad, R, L, C, fStart, fEnd, N) {
  let maxZ = 0
  for (let i = 0; i <= N; i++) {
    const f = fStart + ((fEnd - fStart) * i) / N
    const w = ω(f)
    const Z = Math.sqrt(R * R + (w * L - 1 / (w * C)) ** 2)
    if (Z > maxZ) maxZ = Z
  }
  maxZ *= 1.1

  ctx.strokeStyle = chartAccent
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const f = fStart + ((fEnd - fStart) * i) / N
    const w = ω(f)
    const Z = Math.sqrt(R * R + (w * L - 1 / (w * C)) ** 2)
    const x = pad.left + ((f - fStart) / (fEnd - fStart)) * width
    const y = pad.top + height * (1 - Z / maxZ)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()

  // Zmin标记
  const theory = calcTheory(R, L, C, props.params.V || 5)
  const resX = pad.left + ((theory.fr - fStart) / (fEnd - fStart)) * width
  const resY = pad.top + height * (1 - R / maxZ)
  ctx.fillStyle = chartAccent
  ctx.beginPath()
  ctx.arc(resX, resY, 6, 0, 2 * Math.PI)
  ctx.fill()
  ctx.fillStyle = chartAccent
  ctx.font = 'bold 11px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('Zmin=' + R + QUANTITY.z.unit, resX, resY - 12)

  drawAxes(
    ctx,
    W,
    H,
    width,
    height,
    pad,
    fStart,
    fEnd,
    maxZ,
    '频率 f (' + QUANTITY.f.unit + ')',
    '|Z(f)| (' + QUANTITY.z.unit + ')',
  )
}

// 智能格式化轴标签，避免数字过长覆盖图表
function formatAxisNum(v) {
  const a = Math.abs(v)
  if (a >= 1000) return v.toFixed(0)
  if (a >= 100) return v.toFixed(1)
  if (a >= 1) return v.toFixed(2)
  return v.toFixed(3)
}

// 通用坐标轴绘制
function drawAxes(ctx, W, H, width, height, pad, fStart, fEnd, maxVal, xLabel, yLabel) {
  ctx.fillStyle = ct.label
  ctx.font = '11px system-ui'
  ctx.textAlign = 'center'
  for (let i = 0; i <= 5; i++) {
    ctx.fillText(formatAxisNum(fStart + ((fEnd - fStart) * i) / 5), pad.left + (width / 5) * i, H - 20)
  }
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    ctx.fillText(formatAxisNum(maxVal * (1 - i / 5)), pad.left - 8, pad.top + (height / 5) * i + 3)
  }
  ctx.font = 'bold 13px system-ui'
  ctx.textAlign = 'center'
  ctx.fillStyle = ct.ink
  ctx.fillText(xLabel, W / 2, H - 5)
  ctx.save()
  ctx.translate(25, H / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(yLabel, 0, 0)
  ctx.restore()
}

function calcTheory(R, L, C, V) {
  if (L <= 0 || C <= 0 || R <= 0) return { fr: 0, Q: 0, BW: 0, Imax: 0, halfPower: 0, f1: 0, f2: 0 }
  const omega0 = 1 / Math.sqrt(L * C)
  const fr = omega0 / (2 * Math.PI) / 1e3 // kHz
  const Q = (omega0 * L) / R
  const BW = fr / Q
  const Imax = (V / R) * 1000
  const halfPower = Imax / Math.sqrt(2)
  const f1 = fr - BW / 2
  const f2 = fr + BW / 2
  return { fr, Q, BW, Imax, halfPower, f1, f2 }
}

function switchChart(type) {
  currentChart.value = type
  // 切图时收起上一张图的 tooltip:固定显示不随鼠标,跨图残留会指向错误位置
  hideTooltip()
  nextTick(() => drawChart())
}

function syncFromSlider(which, val) {
  // kHz 口径下滑块按 0.001(=1Hz)吸附,与旧 Hz 整数步长精度等价
  val = Math.round(val * 1000) / 1000
  if (which === 'start') {
    if (val >= localFEnd.value) localFStart.value = localFEnd.value - 0.001
    else localFStart.value = val
  } else {
    if (val <= localFStart.value) localFEnd.value = localFStart.value + 0.001
    else localFEnd.value = val
  }
  applyFreqRange()
}

function applyFreqRange() {
  if (localFStart.value <= 0 || localFEnd.value <= 0 || localFEnd.value <= localFStart.value) return
  emit('update-fstart', localFStart.value)
  emit('update-fend', localFEnd.value)
  drawChart()
}

// 输入框逐键同步重绘:applyFreqRange 已拦截中间态(空/0/起止倒挂),合法值即时更新下方线图
function onFreqInput(which, v) {
  if (which === 'start') localFStart.value = v
  else localFEnd.value = v
  applyFreqRange()
}

// 图表点击 - 在最近的曲线点/实测点旁固定显示 tooltip(不随鼠标移动)
function handleChartClick(event) {
  const canvas = chartCanvasRef.value
  const rect = canvas.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const clickY = event.clientY - rect.top
  const pad = { top: 40, right: 40, bottom: 50, left: 60 }
  const width = rect.width - pad.left - pad.right
  const height = chartHeight.value - pad.top - pad.bottom

  if (clickX < pad.left || clickX > rect.width - pad.right || clickY < pad.top || clickY > rect.height - pad.bottom) {
    tooltip.value.show = false
    return
  }

  const { R, L, C, V } = getPlotParams()
  const fStart = localFStart.value
  const fEnd = localFEnd.value
  const N = SAMPLE_COUNT

  // 检查是否点击了实测数据点
  if (props.measuredData.length > 0) {
    let maxI = 0,
      maxZ = 0
    for (let j = 0; j <= N; j++) {
      const tf = fStart + ((fEnd - fStart) * j) / N
      const tw = ω(tf)
      const tZ = Math.sqrt(R * R + (tw * L - 1 / (tw * C)) ** 2)
      const tI = (V / tZ) * 1000
      if (tI > maxI) maxI = tI
      if (tZ > maxZ) maxZ = tZ
    }
    maxI = Math.max(maxI * 1.1, 10.5)
    maxZ *= 1.1

    for (const md of props.measuredData) {
      const mdFreqK = md.freq
      const mdX = pad.left + ((mdFreqK - fStart) / (fEnd - fStart)) * width
      let mdY
      if (currentChart.value === 'amp') {
        mdY = pad.top + height * (1 - md.current / maxI)
      } else if (currentChart.value === 'phase') {
        const mdPhase = Math.atan2(ω(mdFreqK) * L - 1 / (ω(mdFreqK) * C), R) * (180 / Math.PI)
        mdY = pad.top + height * (1 - (mdPhase + 90) / 180)
      } else {
        const mdZ = Math.sqrt(R * R + (ω(mdFreqK) * L - 1 / (ω(mdFreqK) * C)) ** 2)
        mdY = pad.top + height * (1 - mdZ / maxZ)
      }
      if (Math.sqrt((clickX - mdX) ** 2 + (clickY - mdY) ** 2) < 12) {
        tooltip.value = {
          show: true,
          x: mdX + 10,
          y: mdY - 10,
          content: `📗 实测数据<br>频率: ${md.freq.toFixed(decimalsFor('f'))} ${QUANTITY.f.unit}<br>电流: ${md.current.toFixed(decimalsFor('i'))} ${QUANTITY.i.unit}`,
        }
        return
      }
    }
  }

  // 找最近的理论曲线点
  let minDist = 30,
    closestF = 0,
    closestI = 0,
    closestZ = 0,
    closestPhase = 0,
    closestX = 0,
    closestY = 0
  for (let i = 0; i <= N; i++) {
    const f = fStart + ((fEnd - fStart) * i) / N
    const w = ω(f)
    const Z = Math.sqrt(R * R + (w * L - 1 / (w * C)) ** 2)
    const I = (V / Z) * 1000
    const phase = Math.atan2(w * L - 1 / (w * C), R) * (180 / Math.PI)
    const curveX = pad.left + ((f - fStart) / (fEnd - fStart)) * width
    let curveY
    if (currentChart.value === 'amp') {
      let maxI2 = 0
      for (let j = 0; j <= N; j++) {
        const tf = fStart + ((fEnd - fStart) * j) / N
        const tw = ω(tf)
        const tZ = Math.sqrt(R * R + (tw * L - 1 / (tw * C)) ** 2)
        const tI = (V / tZ) * 1000
        if (tI > maxI2) maxI2 = tI
      }
      maxI2 = Math.max(maxI2 * 1.1, 10.5)
      curveY = pad.top + height * (1 - I / maxI2)
    } else if (currentChart.value === 'phase') {
      curveY = pad.top + height * (1 - (phase + 90) / 180)
    } else {
      let maxZ2 = 0
      for (let j = 0; j <= N; j++) {
        const tf = fStart + ((fEnd - fStart) * j) / N
        const tw = ω(tf)
        const tZ = Math.sqrt(R * R + (tw * L - 1 / (tw * C)) ** 2)
        if (tZ > maxZ2) maxZ2 = tZ
      }
      maxZ2 *= 1.1
      curveY = pad.top + height * (1 - Z / maxZ2)
    }
    const dist = Math.sqrt((clickX - curveX) ** 2 + (clickY - curveY) ** 2)
    if (dist < minDist) {
      minDist = dist
      closestF = f
      closestI = I
      closestZ = Z
      closestPhase = phase
      closestX = curveX
      closestY = curveY
    }
  }

  let content = ''
  if (currentChart.value === 'amp') {
    content = `频率: ${closestF.toFixed(decimalsFor('f'))} ${QUANTITY.f.unit}<br>电流: ${closestI.toFixed(decimalsFor('i'))} ${QUANTITY.i.unit}<br>阻抗: ${closestZ.toFixed(decimalsFor('z'))} ${QUANTITY.z.unit}`
  } else if (currentChart.value === 'phase') {
    content = `频率: ${closestF.toFixed(decimalsFor('f'))} ${QUANTITY.f.unit}<br>相位差: ${closestPhase.toFixed(decimalsFor('phi'))}${QUANTITY.phi.unit}<br>感抗: ${(ω(closestF) * L).toFixed(decimalsFor('z'))} ${QUANTITY.z.unit}<br>容抗: ${(1 / (ω(closestF) * C)).toFixed(decimalsFor('z'))} ${QUANTITY.z.unit}`
  } else {
    content = `频率: ${closestF.toFixed(decimalsFor('f'))} ${QUANTITY.f.unit}<br>阻抗: ${closestZ.toFixed(decimalsFor('z'))} ${QUANTITY.z.unit}<br>电流: ${closestI.toFixed(decimalsFor('i'))} ${QUANTITY.i.unit}`
  }
  // 固定显示在选中点旁(不随鼠标移动):坐标取最近曲线点而非点击像素
  tooltip.value = { show: true, x: closestX + 10, y: closestY - 10, content }
}

function hideTooltip() {
  tooltip.value.show = false
}

// 同步外部参数变化
watch(
  () => [props.params.fStart, props.params.fEnd],
  ([newStart, newEnd]) => {
    if (newStart) localFStart.value = newStart
    if (newEnd) localFEnd.value = newEnd
    drawChart()
  },
)

watch(
  () => [props.ampCurveData, props.phaseCurveData, props.impedanceCurveData, props.measuredData],
  () => drawChart(),
  { deep: true },
)

// simulated 翻转(如删除/清空选中记录回落未仿真)时 params 与曲线数组可能未变,须显式重绘才会走占位分支清空画布
watch(
  () => props.simulated,
  () => drawChart(),
)

onMounted(() => {
  localFStart.value = props.params.fStart || 1.4
  localFEnd.value = props.params.fEnd || 3.2
  nextTick(() => drawChart())
  window.addEventListener('resize', () => {
    chartHeight.value = window.innerWidth < 640 ? 280 : window.innerWidth <= 768 ? 350 : 450
    drawChart()
  })
  // 页面配色切换后按新强调色重绘曲线
  window.addEventListener('themechange', drawChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('themechange', drawChart)
})

defineExpose({ drawChart })
</script>

<style scoped>
.chart-tooltip {
  z-index: var(--z-content);
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
</style>
