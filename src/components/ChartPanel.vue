<template>
  <div class="card">
    <!-- 标签和频率范围 -->
    <div class="flex items-center gap-3 mb-3 flex-wrap">
      <div class="flex gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          :class="['px-4 py-2 text-sm rounded-lg transition-all', currentChart === tab.value ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
          @click="switchChart(tab.value, $event)"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="ml-auto flex items-center gap-2 text-sm text-gray-600 flex-wrap">
        <span>频率范围:</span>
        <input type="range" min="1" max="10000" :value="localFStart" @input="syncFromSlider('start', $event)" class="w-20 cursor-pointer" />
        <input type="number" v-model.number="localFStart" min="1" class="w-16 px-1.5 py-1 border border-gray-300 rounded text-sm" @change="applyFreqRange" />
        <span>~</span>
        <input type="number" v-model.number="localFEnd" min="1" class="w-16 px-1.5 py-1 border border-gray-300 rounded text-sm" @change="applyFreqRange" />
        <input type="range" min="1" max="10000" :value="localFEnd" @input="syncFromSlider('end', $event)" class="w-20 cursor-pointer" />
        <span>Hz</span>
      </div>
    </div>

    <!-- 图表Canvas -->
    <div class="chart-container bg-gray-50 rounded-xl p-3 border border-gray-200 relative">
      <canvas ref="chartCanvasRef" class="w-full cursor-crosshair" :style="{ height: chartHeight + 'px' }" @click="handleChartClick" @mousemove="handleChartHover" @mouseleave="hideTooltip"></canvas>
      <div v-if="tooltip.show" class="chart-tooltip absolute bg-white/95 border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-lg pointer-events-none whitespace-nowrap" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }" v-html="tooltip.content"></div>
    </div>

    <!-- 图例 -->
    <div class="legend flex justify-center gap-4 mt-3 text-xs text-gray-600 flex-wrap">
      <div class="flex items-center gap-1">
        <div class="w-4 h-0.5 bg-indigo-500"></div>
        <span>理论曲线</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-2 h-2 rounded-full bg-green-500"></div>
        <span>实测数据</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-4 h-0 border-t-2 border-dashed border-gray-400"></div>
        <span>0.707倍截止电流</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { impedance, calculateRLC, omega as calcOmega } from '../utils/physics'

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
const chartHeight = ref(typeof window !== 'undefined' && window.innerWidth <= 768 ? 350 : 450)
const SAMPLE_COUNT = 500

const localFStart = ref(props.params.fStart || 100)
const localFEnd = ref(props.params.fEnd || 2000)

const tooltip = ref({ show: false, x: 0, y: 0, content: '' })

const tabs = [
  { label: '幅频特性 I-f', value: 'amp' },
  { label: '相频特性 φ-f', value: 'phase' },
  { label: '阻抗模特性 Z-f', value: 'impedance' },
]

// 获取有效的绘图参数（缺少元件时用默认值）
function getPlotParams() {
  let R = props.params.R || 0
  let L = (props.params.L || 0) * 1e-3
  let C = (props.params.C || 0) * 1e-6
  const V = props.params.V || 5
  let usingDefaults = false
  if (R <= 0) { R = 100; usingDefaults = true }
  if (L <= 0) { L = 10 * 1e-3; usingDefaults = true }
  if (C <= 0) { C = 1 * 1e-6; usingDefaults = true }
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

function drawChart() {
  const info = setupHiDPICanvas()
  if (!info) return
  const { ctx, W, H } = info
  const pad = { top: 40, right: 40, bottom: 50, left: 60 }
  const width = W - pad.left - pad.right
  const height = H - pad.top - pad.bottom

  // 未搭建电路时显示占位图
  if (!props.simulated) {
    drawPlaceholder(ctx, W, H, pad)
    return
  }

  const { R, L, C, V, usingDefaults } = getPlotParams()
  const fStart = localFStart.value
  const fEnd = localFEnd.value
  const N = SAMPLE_COUNT

  // 网格
  ctx.strokeStyle = '#e8e8e8'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top + (height / 5) * i); ctx.lineTo(W - pad.right, pad.top + (height / 5) * i); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(pad.left + (width / 5) * i, pad.top); ctx.lineTo(pad.left + (width / 5) * i, H - pad.bottom); ctx.stroke()
  }

  // 默认值警告
  if (usingDefaults) {
    ctx.fillStyle = 'rgba(255,152,0,0.85)'
    ctx.font = '11px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText('⚠ 部分元件使用默认值（R=100Ω, L=10mH, C=1μF）', pad.left + 5, pad.top - 8)
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
  ctx.strokeStyle = '#ececec'
  ctx.lineWidth = 1
  const gH = H - pad.top - pad.bottom
  const gW = W - pad.left - pad.right
  for (let i = 0; i <= 5; i++) {
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top + (gH / 5) * i); ctx.lineTo(W - pad.right, pad.top + (gH / 5) * i); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(pad.left + (gW / 5) * i, pad.top); ctx.lineTo(pad.left + (gW / 5) * i, H - pad.bottom); ctx.stroke()
  }

  // 坐标轴装饰线
  ctx.strokeStyle = '#d0d0d0'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(pad.left, pad.top)
  ctx.lineTo(pad.left, H - pad.bottom)
  ctx.lineTo(W - pad.right, H - pad.bottom)
  ctx.stroke()

  // 占位主图标 —— 三条虚线示意曲线
  ctx.strokeStyle = '#dcdcdc'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 6])
  // 示意幅频曲线
  ctx.beginPath()
  ctx.moveTo(pad.left + gW * 0.1, H - pad.bottom - gH * 0.5)
  ctx.quadraticCurveTo(pad.left + gW * 0.35, H - pad.bottom - gH * 0.85, cx, H - pad.bottom - gH * 0.75)
  ctx.quadraticCurveTo(pad.left + gW * 0.65, H - pad.bottom - gH * 0.6, W - pad.right - gW * 0.1, H - pad.bottom - gH * 0.4)
  ctx.stroke()
  ctx.setLineDash([])

  // 中央提示文字
  ctx.fillStyle = '#b0b0b0'
  ctx.font = 'bold 16px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('请搭建 RLC 电路并点击「开始仿真」', cx, cy - 24)

  ctx.fillStyle = '#c5c5c5'
  ctx.font = '13px system-ui'
  ctx.fillText('以查看幅频 / 相频 / 阻抗特性曲线', cx, cy + 12)

  // 小箭头提示
  ctx.fillStyle = '#d5d5d5'
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
    const w = 2 * Math.PI * f
    const Z = Math.sqrt(R * R + (w * L - 1 / (w * C)) ** 2)
    const I = (V / Z) * 1000
    if (I > maxI) maxI = I
  }
  maxI = Math.max(maxI * 1.1, 10.5)

  // 理论曲线
  ctx.strokeStyle = '#667eea'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const f = fStart + ((fEnd - fStart) * i) / N
    const w = 2 * Math.PI * f
    const Z = Math.sqrt(R * R + (w * L - 1 / (w * C)) ** 2)
    const I = (V / Z) * 1000
    const x = pad.left + ((f - fStart) / (fEnd - fStart)) * width
    const y = pad.top + height * (1 - I / maxI)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()

  // 理论计算
  const theory = calcTheory(R, L, C, V)

  // 0.707截止线
  const halfPowerY = pad.top + height * (1 - theory.halfPower / maxI)
  ctx.strokeStyle = '#888'
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
  ctx.fillStyle = '#667eea'
  ctx.beginPath()
  ctx.arc(resX, resY, 6, 0, 2 * Math.PI)
  ctx.fill()
  ctx.fillStyle = '#667eea'
  ctx.font = 'bold 11px system-ui'
  ctx.fillText('Imax=' + theory.Imax.toFixed(4) + 'mA', resX - 35, resY - 10)

  // 0.707标注
  ctx.fillStyle = '#ff6b6b'
  ctx.font = '10px system-ui'
  ctx.fillText('0.707×Imax=' + theory.halfPower.toFixed(4) + 'mA', pad.left + 5, halfPowerY - 5)

  // f1/f2截止频率
  const f1x = pad.left + ((theory.f1 - fStart) / (fEnd - fStart)) * width
  const f2x = pad.left + ((theory.f2 - fStart) / (fEnd - fStart)) * width
  ctx.fillStyle = '#dc3545'
  ctx.beginPath(); ctx.arc(f1x, halfPowerY, 6, 0, 2 * Math.PI); ctx.fill()
  ctx.beginPath(); ctx.arc(f2x, halfPowerY, 6, 0, 2 * Math.PI); ctx.fill()

  ctx.fillStyle = '#dc3545'
  ctx.font = 'bold 10px system-ui'
  ctx.fillText('f₁=' + theory.f1.toFixed(4) + 'Hz', f1x - 35, halfPowerY + 22)
  ctx.fillText('f₂=' + theory.f2.toFixed(4) + 'Hz', f2x - 35, halfPowerY + 22)

  // BW通频带线
  ctx.strokeStyle = '#dc3545'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(f1x, halfPowerY)
  ctx.lineTo(f2x, halfPowerY)
  ctx.stroke()

  ctx.fillStyle = '#dc3545'
  ctx.font = 'bold 12px system-ui'
  ctx.fillText('BW=' + theory.BW.toFixed(4) + 'Hz', (f1x + f2x) / 2 - 35, halfPowerY - 18)

  // 虚线到x轴
  ctx.strokeStyle = '#dc3545'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.beginPath(); ctx.moveTo(f1x, halfPowerY); ctx.lineTo(f1x, H - pad.bottom + 10); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(f2x, halfPowerY); ctx.lineTo(f2x, H - pad.bottom + 10); ctx.stroke()
  ctx.setLineDash([])

  // 通频带标签
  ctx.fillStyle = '#dc3545'
  ctx.font = '9px system-ui'
  const bwLabelY = Math.min(halfPowerY, pad.top + height * 0.3)
  ctx.fillText('通频带', (f1x + f2x) / 2 - 20, bwLabelY - 5)

  // 实测数据（Cardinal Spline平滑曲线）
  if (props.measuredData.length > 0) {
    if (props.measuredData.length >= 2) {
      const mPts = props.measuredData.map(md => ({
        x: pad.left + ((md.freq - fStart) / (fEnd - fStart)) * width,
        y: pad.top + height * (1 - md.current / maxI),
      }))
      ctx.strokeStyle = '#28a745'
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
      ctx.fillStyle = '#28a745'
      ctx.beginPath()
      ctx.arc(mx, my, 5, 0, 2 * Math.PI)
      ctx.fill()
    }
  }

  drawAxes(ctx, W, H, width, height, pad, fStart, fEnd, maxI, '频率 f (Hz)', '电流 I (mA)')
}

// 相频特性
function drawPhaseChart(ctx, W, H, width, height, pad, R, L, C, fStart, fEnd, N) {
  ctx.strokeStyle = '#667eea'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const f = fStart + ((fEnd - fStart) * i) / N
    const w = 2 * Math.PI * f
    const phase = Math.atan2(w * L - 1 / (w * C), R) * (180 / Math.PI)
    const x = pad.left + ((f - fStart) / (fEnd - fStart)) * width
    const y = pad.top + height * (1 - (phase + 90) / 180)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()

  // 特殊相位点标注
  const refPhases = [
    { target: 45, label: 'φ=+45°', color: '#ff9800' },
    { target: -45, label: 'φ=−45°', color: '#2196f3' },
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
        ctx.beginPath(); ctx.moveTo(pad.left, py); ctx.lineTo(W - pad.right, py); ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
        // 标记圆点
        ctx.fillStyle = sp.color
        ctx.beginPath(); ctx.arc(px, py, 6, 0, 2 * Math.PI); ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(px, py, 3, 0, 2 * Math.PI); ctx.fill()
        // 标签
        ctx.fillStyle = sp.color
        ctx.font = 'bold 10px system-ui'
        ctx.textAlign = 'left'
        ctx.fillText(sp.label + ' f=' + fCross.toFixed(4) + 'Hz', px + 10, py + 4)
        break
      }
    }
  }

  // 0°基准线
  const zeroY = pad.top + height * 0.5
  ctx.save()
  ctx.strokeStyle = '#28a745'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 4])
  ctx.beginPath(); ctx.moveTo(pad.left, zeroY); ctx.lineTo(W - pad.right, zeroY); ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  // 0°点
  for (let i = 1; i <= N; i++) {
    const f1 = fStart + ((fEnd - fStart) * (i - 1)) / N
    const f2 = fStart + ((fEnd - fStart) * i) / N
    const p1 = Math.atan2(2 * Math.PI * f1 * L - 1 / (2 * Math.PI * f1 * C), R) * (180 / Math.PI)
    const p2 = Math.atan2(2 * Math.PI * f2 * L - 1 / (2 * Math.PI * f2 * C), R) * (180 / Math.PI)
    if ((p1 - 0) * (p2 - 0) <= 0) {
      const t2 = (0 - p1) / (p2 - p1)
      const fZero = f1 + t2 * (f2 - f1)
      const zx = pad.left + ((fZero - fStart) / (fEnd - fStart)) * width
      ctx.fillStyle = '#28a745'
      ctx.beginPath(); ctx.arc(zx, zeroY, 7, 0, 2 * Math.PI); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(zx, zeroY, 3.5, 0, 2 * Math.PI); ctx.fill()
      ctx.fillStyle = '#28a745'
      ctx.font = 'bold 11px system-ui'
      ctx.textAlign = 'left'
      ctx.fillText('φ=0° f=' + fZero.toFixed(4) + 'Hz', zx + 12, zeroY - 8)
      break
    }
  }

  // Y轴刻度（相位映射）
  ctx.fillStyle = '#666'
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
  ctx.fillStyle = '#333'
  ctx.fillText('频率 f (Hz)', W / 2, H - 5)
  ctx.save()
  ctx.translate(25, H / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('相位差 φ (°)', 0, 0)
  ctx.restore()
}

// 阻抗模特性
function drawImpedanceChart(ctx, W, H, width, height, pad, R, L, C, fStart, fEnd, N) {
  let maxZ = 0
  for (let i = 0; i <= N; i++) {
    const f = fStart + ((fEnd - fStart) * i) / N
    const w = 2 * Math.PI * f
    const Z = Math.sqrt(R * R + (w * L - 1 / (w * C)) ** 2)
    if (Z > maxZ) maxZ = Z
  }
  maxZ *= 1.1

  ctx.strokeStyle = '#667eea'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const f = fStart + ((fEnd - fStart) * i) / N
    const w = 2 * Math.PI * f
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
  ctx.fillStyle = '#667eea'
  ctx.beginPath(); ctx.arc(resX, resY, 6, 0, 2 * Math.PI); ctx.fill()
  ctx.fillStyle = '#667eea'
  ctx.font = 'bold 11px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('Zmin=' + R + 'Ω', resX, resY - 12)

  drawAxes(ctx, W, H, width, height, pad, fStart, fEnd, maxZ, '频率 f (Hz)', '|Z(f)| (Ω)')
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
  ctx.fillStyle = '#666'
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
  ctx.fillStyle = '#333'
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
  const fr = omega0 / (2 * Math.PI)
  const Q = (omega0 * L) / R
  const BW = fr / Q
  const Imax = (V / R) * 1000
  const halfPower = Imax * 0.707
  const f1 = fr - BW / 2
  const f2 = fr + BW / 2
  return { fr, Q, BW, Imax, halfPower, f1, f2 }
}

function switchChart(type) {
  currentChart.value = type
  nextTick(() => drawChart())
}

function syncFromSlider(which, event) {
  const val = parseInt(event.target.value)
  if (which === 'start') {
    if (val >= localFEnd.value) localFStart.value = localFEnd.value - 1
    else localFStart.value = val
  } else {
    if (val <= localFStart.value) localFEnd.value = localFStart.value + 1
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

// 图表点击 - tooltip
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
    let maxI = 0, maxZ = 0
    for (let j = 0; j <= N; j++) {
      const tf = fStart + ((fEnd - fStart) * j) / N
      const tw = 2 * Math.PI * tf
      const tZ = Math.sqrt(R * R + (tw * L - 1 / (tw * C)) ** 2)
      const tI = (V / tZ) * 1000
      if (tI > maxI) maxI = tI
      if (tZ > maxZ) maxZ = tZ
    }
    maxI = Math.max(maxI * 1.1, 10.5)
    maxZ *= 1.1

    for (const md of props.measuredData) {
      const mdX = pad.left + ((md.freq - fStart) / (fEnd - fStart)) * width
      let mdY
      if (currentChart.value === 'amp') {
        mdY = pad.top + height * (1 - md.current / maxI)
      } else if (currentChart.value === 'phase') {
        const mdPhase = Math.atan2(2 * Math.PI * md.freq * L - 1 / (2 * Math.PI * md.freq * C), R) * (180 / Math.PI)
        mdY = pad.top + height * (1 - (mdPhase + 90) / 180)
      } else {
        const mdZ = Math.sqrt(R * R + (2 * Math.PI * md.freq * L - 1 / (2 * Math.PI * md.freq * C)) ** 2)
        mdY = pad.top + height * (1 - mdZ / maxZ)
      }
      if (Math.sqrt((clickX - mdX) ** 2 + (clickY - mdY) ** 2) < 12) {
        tooltip.value = { show: true, x: mdX + 10, y: mdY - 10, content: `📗 实测数据<br>频率: ${md.freq.toFixed(4)} Hz<br>电流: ${md.current.toFixed(4)} mA` }
        return
      }
    }
  }

  // 找最近的理论曲线点
  let minDist = 30, closestF = 0, closestI = 0, closestZ = 0, closestPhase = 0
  for (let i = 0; i <= N; i++) {
    const f = fStart + ((fEnd - fStart) * i) / N
    const w = 2 * Math.PI * f
    const Z = Math.sqrt(R * R + (w * L - 1 / (w * C)) ** 2)
    const I = (V / Z) * 1000
    const phase = Math.atan2(w * L - 1 / (w * C), R) * (180 / Math.PI)
    const curveX = pad.left + ((f - fStart) / (fEnd - fStart)) * width
    let curveY
    if (currentChart.value === 'amp') {
      let maxI2 = 0
      for (let j = 0; j <= N; j++) {
        const tf = fStart + ((fEnd - fStart) * j) / N
        const tw = 2 * Math.PI * tf
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
        const tw = 2 * Math.PI * tf
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
    }
  }

  let content = ''
  if (currentChart.value === 'amp') {
    content = `频率: ${closestF.toFixed(4)} Hz<br>电流: ${closestI.toFixed(4)} mA<br>阻抗: ${closestZ.toFixed(4)} Ω`
  } else if (currentChart.value === 'phase') {
    content = `频率: ${closestF.toFixed(4)} Hz<br>相位差: ${closestPhase.toFixed(4)}°<br>感抗: ${(2 * Math.PI * closestF * L).toFixed(4)} Ω<br>容抗: ${(1 / (2 * Math.PI * closestF * C)).toFixed(4)} Ω`
  } else {
    content = `频率: ${closestF.toFixed(4)} Hz<br>阻抗: ${closestZ.toFixed(4)} Ω<br>电流: ${closestI.toFixed(4)} mA`
  }
  tooltip.value = { show: true, x: clickX + 10, y: clickY - 10, content }
}

function handleChartHover(event) {
  if (tooltip.value.show) {
    const canvas = chartCanvasRef.value
    const rect = canvas.getBoundingClientRect()
    tooltip.value.x = event.clientX - rect.left + 10
    tooltip.value.y = event.clientY - rect.top - 10
  }
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

onMounted(() => {
  localFStart.value = props.params.fStart || 100
  localFEnd.value = props.params.fEnd || 2000
  nextTick(() => drawChart())
  window.addEventListener('resize', () => {
    chartHeight.value = window.innerWidth <= 768 ? 350 : 450
    drawChart()
  })
})
</script>

<style scoped>
.chart-tooltip {
  z-index: 10;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
</style>
