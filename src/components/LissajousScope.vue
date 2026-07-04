<template>
  <div class="card">
    <!-- 双Canvas行 -->
    <div class="flex gap-4 mb-4 flex-col lg:flex-row">
      <!-- 示波器Canvas -->
      <div class="flex-1 bg-gray-50 rounded-xl overflow-hidden relative border border-gray-200">
        <div class="text-sm text-gray-600 px-4 pt-3 pb-1 flex justify-between items-center">
          <span>示波器 · 李萨如图 (X=激励电压 Y=电阻电压)</span>
          <span class="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded text-xs font-semibold">X-Y MODE</span>
        </div>
        <canvas ref="scopeCanvasRef" class="w-full block cursor-crosshair" :height="canvasHeight"></canvas>
        <div class="absolute bottom-2 left-3 text-xs text-white/50 font-mono pointer-events-none">{{ cursorInfo }}</div>
      </div>

      <!-- 幅频特性Canvas -->
      <div class="flex-1 bg-gray-50 rounded-xl overflow-hidden relative border border-gray-200">
        <div class="text-sm text-gray-600 px-4 pt-3 pb-1 flex justify-between items-center">
          <span>幅频特性曲线 f-I</span>
          <span class="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded text-xs font-semibold">{{ resonantTag }}</span>
        </div>
        <div class="flex gap-2 items-center px-4 pb-2 text-xs text-gray-600 flex-wrap">
          <span>横坐标:</span>
          <input type="number" v-model.number="freqMin" placeholder="最小" class="w-16 px-1.5 py-1 border border-gray-300 rounded text-xs" />
          <span>~</span>
          <input type="number" v-model.number="freqMax" placeholder="最大" class="w-16 px-1.5 py-1 border border-gray-300 rounded text-xs" />
          <span>Hz</span>
          <button @click="applyFreqRange" class="px-2.5 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600">应用</button>
        </div>
        <canvas ref="ampCanvasRef" class="w-full block cursor-crosshair" :height="canvasHeight"></canvas>
      </div>
    </div>

    <!-- 测量数据栏 -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
        <div class="text-xs text-gray-600 mb-1">电阻电压 峰峰值 (Vpp)</div>
        <div class="text-lg font-bold font-mono text-cyan-600">{{ measures.Urpp.toFixed(4) }}</div>
      </div>
      <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
        <div class="text-xs text-gray-600 mb-1">电阻电压 有效值 (Vrms)</div>
        <div class="text-lg font-bold font-mono text-green-600">{{ measures.Ur.toFixed(4) }}</div>
      </div>
      <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
        <div class="text-xs text-gray-600 mb-1">回路电流 I (mA)</div>
        <div class="text-lg font-bold font-mono text-yellow-600">{{ measures.I.toFixed(4) }}</div>
      </div>
      <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
        <div class="text-xs text-gray-600 mb-1">阻抗 |Z| (Ω)</div>
        <div class="text-lg font-bold font-mono text-cyan-600">{{ measures.Z.toFixed(4) }}</div>
      </div>
      <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center">
        <div class="text-xs text-gray-600 mb-1">相位 φ (°)</div>
        <div class="text-lg font-bold font-mono text-red-600">{{ measures.phi.toFixed(4) }}</div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex gap-3 flex-wrap mb-4">
      <button @click="acquireData" class="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all">
        📌 采集当前点
      </button>
      <button @click="autoSweep" :disabled="isSweeping" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-all disabled:opacity-50">
        🔄 自动扫描{{ isSweeping ? '中...' : '' }}
      </button>
      <button @click="exportCSV" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-all">
        📊 导出CSV
      </button>
      <button @click="clearData" class="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-all">
        🗑 清空数据
      </button>
    </div>

    <!-- 采集数据表格 -->
    <div class="bg-white rounded-xl p-4 shadow-sm">
      <div class="text-sm text-indigo-600 mb-3 font-semibold"> 采集数据 ({{ acquiredData.length }} 点)</div>
      <div class="max-h-80 overflow-y-auto overflow-x-auto">
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="bg-gray-50">
              <th class="border border-gray-200 px-2 py-1.5">#</th>
              <th class="border border-gray-200 px-2 py-1.5">f (Hz)</th>
              <th class="border border-gray-200 px-2 py-1.5">I (mA)</th>
              <th class="border border-gray-200 px-2 py-1.5">Urpp (V)</th>
              <th class="border border-gray-200 px-2 py-1.5">|Z| (Ω)</th>
              <th class="border border-gray-200 px-2 py-1.5">φ (°)</th>
              <th class="border border-gray-200 px-2 py-1.5">标记</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, idx) in acquiredData" :key="idx" :class="{ 'bg-red-50': idx === resonanceIdx }">
              <td class="border border-gray-200 px-2 py-1.5 text-center">{{ idx + 1 }}</td>
              <td class="border border-gray-200 px-2 py-1.5 text-center">{{ d.freq.toFixed(4) }}</td>
              <td class="border border-gray-200 px-2 py-1.5 text-center">{{ d.current.toFixed(4) }}</td>
              <td class="border border-gray-200 px-2 py-1.5 text-center">{{ d.urpp.toFixed(4) }}</td>
              <td class="border border-gray-200 px-2 py-1.5 text-center">{{ d.impedance.toFixed(4) }}</td>
              <td class="border border-gray-200 px-2 py-1.5 text-center">{{ d.phase.toFixed(4) }}</td>
              <td class="border border-gray-200 px-2 py-1.5 text-center">
                <span v-if="idx === resonanceIdx" class="text-red-600 font-bold">★ 谐振</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { impedance, current, resonantFreq } from '../utils/physics'

const props = defineProps({
  params: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update-freq'])

const scopeCanvasRef = ref(null)
const ampCanvasRef = ref(null)
const canvasHeight = ref(420)

// 状态
const acquiredData = ref([])
const isSweeping = ref(false)
const freqMin = ref(null)
const freqMax = ref(null)
const fixedRange = ref(null)

// 游标
const scopeCursor = ref({ x: 0.5, y: 0.5 })
let dragging = false

// 动画
let animPhase = 0
let animFrame = 0
const SKIP_FRAMES = 2
let lastAmpDraw = 0

// 计算测量值
const measures = computed(() => {
  const freq = props.params.fStart || 1000
  const z = impedance(props.params.R, props.params.L, props.params.C, freq)
  const I = current(props.params.V, z.Z)
  const Ur = (I / 1000) * props.params.R
  const Urpp = Ur * 2 * Math.sqrt(2)
  const f0 = resonantFreq(props.params.L, props.params.C)
  return { ...z, I, Ur, Urpp, f0 }
})

const cursorInfo = computed(() => {
  const Xamp = props.params.V
  const Yamp = measures.value.Ur * Math.sqrt(2)
  const voltX = ((scopeCursor.value.x - 0.5) * 2 * Xamp * 1.2).toFixed(4)
  const voltY = (-(scopeCursor.value.y - 0.5) * 2 * Yamp * 1.2).toFixed(4)
  return `X=${voltX}V  Y=${voltY}V`
})

const resonantTag = computed(() => `f₀=${measures.value.f0.toFixed(4)} Hz`)

// 查找谐振点
const resonanceIdx = computed(() => {
  if (acquiredData.value.length === 0) return -1
  let maxI = -Infinity,
    maxIdx = -1
  for (let i = 0; i < acquiredData.value.length; i++) {
    if (acquiredData.value[i].current > maxI) {
      maxI = acquiredData.value[i].current
      maxIdx = i
    }
  }
  const peak = acquiredData.value[maxIdx]
  if (Math.abs(peak.phase) <= 3) return maxIdx
  let bestIdx = -1,
    bestI = -Infinity
  for (let i = 0; i < acquiredData.value.length; i++) {
    if (Math.abs(acquiredData.value[i].phase) <= 3 && acquiredData.value[i].current > bestI) {
      bestI = acquiredData.value[i].current
      bestIdx = i
    }
  }
  return bestIdx
})

// 智能格式化轴标签，避免数字过长覆盖图表
function formatAxisNum(v) {
  const a = Math.abs(v)
  if (a >= 1000) return v.toFixed(0)
  if (a >= 100) return v.toFixed(1)
  if (a >= 1) return v.toFixed(2)
  return v.toFixed(3)
}

// HiDPI Canvas 设置
function setupHiDPICanvas(canvas, height) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.parentElement.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = height * dpr
  canvas.style.height = height + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  return { ctx, W: rect.width, H: height }
}

// 绘制示波器
function drawScope() {
  const canvas = scopeCanvasRef.value
  if (!canvas) return
  const { ctx, W, H } = setupHiDPICanvas(canvas, canvasHeight.value)
  const cx = W / 2,
    cy = H / 2
  const pad = 40,
    gW = W - pad * 2,
    gH = H - pad * 2

  // 背景
  ctx.fillStyle = '#1a1f2e'
  ctx.fillRect(0, 0, W, H)

  // 网格
  ctx.strokeStyle = '#252d3d'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 10; i++) {
    const x = pad + (gW * i) / 10,
      y = pad + (gH * i) / 10
    ctx.beginPath()
    ctx.moveTo(x, pad)
    ctx.lineTo(x, pad + gH)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pad, y)
    ctx.lineTo(pad + gW, y)
    ctx.stroke()
  }

  // 中心线
  ctx.strokeStyle = '#354055'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx, pad)
  ctx.lineTo(cx, pad + gH)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(pad, cy)
  ctx.lineTo(pad + gW, cy)
  ctx.stroke()

  // 李萨如图形
  const w = 2 * Math.PI * (props.params.fStart || 1000)
  const z = measures.value
  const Xamp = props.params.V
  const Yamp = measures.value.Ur * Math.sqrt(2)
  const phiRad = (z.phi * Math.PI) / 180
  const scaleX = gW / 2 / (Xamp * 1.2)
  const scaleY = gH / 2 / (Yamp * 1.2 || 1)

  animPhase += 0.03
  const numPts = 500
  const points = []
  for (let i = 0; i < numPts; i++) {
    const t = animPhase + i * 0.013
    const xSig = Xamp * Math.sin(t)
    const ySig = Yamp * Math.sin(t + phiRad)
    points.push({ x: cx + xSig * scaleX, y: cy - ySig * scaleY })
  }

  for (let i = 1; i < points.length; i++) {
    const alpha = 0.06 + 0.94 * (i / points.length)
    ctx.strokeStyle = `rgba(54,209,220,${alpha.toFixed(4)})`
    ctx.lineWidth = 1.2 + 1.5 * alpha
    ctx.beginPath()
    ctx.moveTo(points[i - 1].x, points[i - 1].y)
    ctx.lineTo(points[i].x, points[i].y)
    ctx.stroke()
  }

  // 光点
  const last = points[points.length - 1]
  ctx.fillStyle = '#76ffd8'
  ctx.shadowColor = '#76ffd8'
  ctx.shadowBlur = 14
  ctx.beginPath()
  ctx.arc(last.x, last.y, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // 游标
  const curX = pad + scopeCursor.value.x * gW
  const curY = pad + scopeCursor.value.y * gH
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = 'rgba(255,71,87,0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(curX, pad)
  ctx.lineTo(curX, pad + gH)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(pad, curY)
  ctx.lineTo(pad + gW, curY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#e74c3c'
  ctx.beginPath()
  ctx.arc(curX, curY, 5, 0, Math.PI * 2)
  ctx.fill()

  // 轴标签
  ctx.fillStyle = '#6a7a8a'
  ctx.font = '11px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('X: Us (激励电压)', cx, H - 6)
  ctx.save()
  ctx.translate(12, cy)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Y: Ur (电阻电压)', 0, 0)
  ctx.restore()

  // 刻度
  ctx.fillStyle = '#5a6a7a'
  ctx.font = '10px Courier New'
  ctx.textAlign = 'center'
  for (let i = 0; i <= 4; i++) {
    const v = formatAxisNum(Xamp * 1.2 * (i / 2 - 1))
    ctx.fillText(v, pad + (gW * i) / 4, H - pad + 14)
  }
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const v = formatAxisNum(Yamp * 1.2 * (1 - i / 2))
    ctx.fillText(v, pad - 4, pad + (gH * i) / 4 + 4)
  }
}

// 绘制幅频图
function drawAmpChart() {
  const canvas = ampCanvasRef.value
  if (!canvas) return
  const { ctx, W, H } = setupHiDPICanvas(canvas, canvasHeight.value)
  const pad = { l: 65, r: 25, t: 30, b: 50 }
  const gW = W - pad.l - pad.r,
    gH = H - pad.t - pad.b

  ctx.fillStyle = '#fafbfd'
  ctx.fillRect(0, 0, W, H)

  const f0 = measures.value.f0
  const curFreq = props.params.fStart || 1000
  let fMin, fMax
  if (fixedRange.value) {
    fMin = fixedRange.value.fMin
    fMax = fixedRange.value.fMax
  } else {
    fMin = Math.max(50, f0 * 0.2)
    fMax = f0 * 3
    if (curFreq > fMax) fMax = curFreq * 1.5
    if (curFreq < fMin) fMin = curFreq * 0.5
  }
  const fRange = fMax - fMin
  const Imax = props.params.R > 0 ? (props.params.V / props.params.R) * 1000 : (props.params.V / 0.1) * 1000
  const iMax = Imax * 1.2

  // 网格
  ctx.strokeStyle = '#e0e4ea'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 10; i++) {
    const x = pad.l + (gW * i) / 10,
      y = pad.t + (gH * i) / 10
    ctx.beginPath()
    ctx.moveTo(x, pad.t)
    ctx.lineTo(x, pad.t + gH)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pad.l, y)
    ctx.lineTo(pad.l + gW, y)
    ctx.stroke()
  }

  // 理论曲线
  ctx.strokeStyle = '#b0bec5'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 3])
  ctx.beginPath()
  for (let i = 0; i <= 300; i++) {
    const f = fMin + (fRange * i) / 300
    const z = impedance(props.params.R, props.params.L, props.params.C, f)
    const I = current(props.params.V, z.Z)
    const x = pad.l + ((f - fMin) / fRange) * gW
    const y = pad.t + gH * (1 - I / iMax)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.setLineDash([])

  // 谐振频率标记
  const f0x = pad.l + ((f0 - fMin) / fRange) * gW
  if (f0x > pad.l && f0x < pad.l + gW) {
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = 'rgba(231,76,60,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(f0x, pad.t)
    ctx.lineTo(f0x, pad.t + gH)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#e74c3c'
    ctx.font = 'bold 11px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(`f₀=${formatAxisNum(f0)}Hz`, f0x, pad.t - 6)
  }

  // 采集数据曲线
  if (acquiredData.value.length > 1) {
    const sorted = [...acquiredData.value].sort((a, b) => a.freq - b.freq)
    ctx.strokeStyle = '#27ae60'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let i = 0; i < sorted.length; i++) {
      const x = pad.l + ((sorted[i].freq - fMin) / fRange) * gW
      const y = pad.t + gH * (1 - sorted[i].current / iMax)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // 采集数据点
  acquiredData.value.forEach((d, i) => {
    const x = pad.l + ((d.freq - fMin) / fRange) * gW
    const y = pad.t + gH * (1 - d.current / iMax)
    if (i === resonanceIdx.value) {
      ctx.fillStyle = '#e74c3c'
      ctx.shadowColor = '#e74c3c'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.arc(x, y, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e74c3c'
      ctx.font = 'bold 11px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('★ 谐振', x, y - 12)
    } else {
      ctx.fillStyle = '#27ae60'
      ctx.shadowColor = '#27ae60'
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(x, y, 4.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  // 当前频率标记
  const curX = pad.l + ((curFreq - fMin) / fRange) * gW
  const curY = pad.t + gH * (1 - measures.value.I / iMax)
  ctx.fillStyle = '#e74c3c'
  ctx.shadowColor = '#e74c3c'
  ctx.shadowBlur = 12
  ctx.beginPath()
  ctx.arc(curX, curY, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(curX, curY, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.setLineDash([3, 3])
  ctx.strokeStyle = 'rgba(231,76,60,0.3)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(curX, curY)
  ctx.lineTo(curX, pad.t + gH)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(curX, curY)
  ctx.lineTo(pad.l, curY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#e74c3c'
  ctx.font = 'bold 11px Courier New'
  ctx.textAlign = 'left'
  ctx.fillText(`${measures.value.I.toFixed(4)} mA`, curX + 8, curY - 4)
  ctx.fillStyle = '#5a6a7a'
  ctx.font = '10px Courier New'
  ctx.fillText(`${curFreq} Hz`, curX + 8, curY + 10)

  // 轴标签
  ctx.fillStyle = '#5a6a7a'
  ctx.font = '12px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('频率 f (Hz)', pad.l + gW / 2, H - 8)
  for (let i = 0; i <= 5; i++) {
    const f = fMin + (fRange * i) / 5
    ctx.fillText(formatAxisNum(f), pad.l + (gW * i) / 5, H - pad.b + 18)
  }
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    const I = iMax * (1 - i / 5)
    ctx.fillText(formatAxisNum(I), pad.l - 6, pad.t + (gH * i) / 5 + 4)
  }
  ctx.save()
  ctx.translate(14, pad.t + gH / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.fillText('电流 I (mA)', 0, 0)
  ctx.restore()

  canvas._plotInfo = { fMin, fRange, iMax, pad, gW, gH }
}

// 动画循环
function animate() {
  animFrame++
  const now = Date.now()
  if (animFrame % (SKIP_FRAMES + 1) !== 0) {
    // 跳帧模式下也要节流幅频图
    if (!isSweeping.value && now - lastAmpDraw > 2000) {
      drawAmpChart()
      lastAmpDraw = now
    }
    requestAnimationFrame(animate)
    return
  }
  drawScope()
  if (!isSweeping.value && now - lastAmpDraw > 2500) {
    drawAmpChart()
    lastAmpDraw = now
  }
  requestAnimationFrame(animate)
}

// 采集数据
function acquireData() {
  const m = measures.value
  const f = props.params.fStart || 1000
  acquiredData.value.push({
    freq: f,
    current: m.I,
    urpp: m.Urpp,
    impedance: m.Z,
    phase: m.phi,
  })
  if (!fixedRange.value) {
    const f0 = m.f0
    fixedRange.value = { fMin: Math.max(50, f0 * 0.2), fMax: f0 * 3 }
    if (f > fixedRange.value.fMax) fixedRange.value.fMax = f * 1.5
    if (f < fixedRange.value.fMin) fixedRange.value.fMin = f * 0.5
  } else {
    if (f > fixedRange.value.fMax) fixedRange.value.fMax = f * 1.3
    if (f < fixedRange.value.fMin) fixedRange.value.fMin = f * 0.7
  }
}

// 自动扫描
async function autoSweep() {
  if (props.params.L <= 0 || props.params.C <= 0 || props.params.R <= 0) {
    alert('请先拖拽元件搭建RLC电路并点击「开始仿真」')
    return
  }
  const f0 = resonantFreq(props.params.L, props.params.C)
  if (!isFinite(f0) || f0 <= 0) {
    alert('电路参数异常，请检查 R、L、C 元件参数')
    return
  }
  const fStart = Math.max(50, f0 * 0.15)
  const fEnd = f0 * 4
  const freqs = []
  const N = 50
  for (let i = 0; i <= N; i++) {
    const t = i / N
    let f
    if (t < 0.35) {
      f = fStart + (f0 * 0.7 - fStart) * (t / 0.35)
    } else if (t < 0.65) {
      const lt = (t - 0.35) / 0.3
      f = f0 * 0.7 + (f0 * 1.3 - f0 * 0.7) * lt
    } else {
      f = f0 * 1.3 + (fEnd - f0 * 1.3) * ((t - 0.65) / 0.35)
    }
    freqs.push(Math.round(f))
  }
  const unique = [freqs[0]]
  for (let i = 1; i < freqs.length; i++) {
    if (freqs[i] !== freqs[i - 1]) unique.push(freqs[i])
  }
  acquiredData.value = []
  isSweeping.value = true
  fixedRange.value = { fMin: 1100, fMax: 3200 }
  for (let idx = 0; idx < unique.length; idx++) {
    const f = unique[idx]
    // 更新params需要通过emit，这里简化处理
    await new Promise(resolve => setTimeout(resolve, 500))
    const z = impedance(props.params.R, props.params.L, props.params.C, f)
    const I = current(props.params.V, z.Z)
    const Ur = (I / 1000) * props.params.R
    const Urpp = Ur * 2 * Math.sqrt(2)
    acquiredData.value.push({
      freq: f,
      current: I,
      urpp: Urpp,
      impedance: z.Z,
      phase: z.phi,
    })
  }
  isSweeping.value = false
}

// 导出CSV
function exportCSV() {
  if (acquiredData.value.length === 0) return alert('请先采集数据')
  const f0 = resonantFreq(props.params.L, props.params.C)
  const resIdx = resonanceIdx.value
  let csv = '序号,频率(Hz),电流(mA),Urpp(V),阻抗(Ω),相位(°),标记\r\n'
  acquiredData.value.forEach((d, i) => {
    const tag = i === resIdx ? '谐振' : ''
    csv += `${i + 1},${d.freq.toFixed(4)},${d.current.toFixed(4)},${d.urpp.toFixed(4)},${d.impedance.toFixed(4)},${d.phase.toFixed(4)},${tag}\r\n`
  })
  const peak = acquiredData.value.reduce((a, b) => (a.current > b.current ? a : b))
  csv += `\r\n谐振峰值电流:,${peak.current.toFixed(4)} mA\r\n`
  csv += `对应频率:,${peak.freq.toFixed(4)} Hz\r\n`
  csv += `理论谐振频率:,${f0.toFixed(4)} Hz\r\n`
  navigator.clipboard.writeText(csv).then(() => {
    alert(`✅ CSV已复制到剪贴板！\n共 ${acquiredData.value.length} 个数据点`)
  })
}

// 清空数据
function clearData() {
  acquiredData.value = []
  fixedRange.value = null
  freqMin.value = null
  freqMax.value = null
}

// 应用频率范围
function applyFreqRange() {
  if (!freqMin.value || !freqMax.value || freqMin.value <= 0 || freqMax.value <= 0 || freqMax.value <= freqMin.value) {
    alert('请输入有效的频率范围（起始>0，终止>起始）')
    return
  }
  fixedRange.value = { fMin: freqMin.value, fMax: freqMax.value }
}

// Canvas事件
onMounted(() => {
  // 示波器游标事件
  const scopeCanvas = scopeCanvasRef.value
  scopeCanvas.addEventListener('mousedown', e => {
    const rect = scopeCanvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width
    const my = (e.clientY - rect.top) / rect.height
    if (Math.abs(mx - scopeCursor.value.x) < 0.05 && Math.abs(my - scopeCursor.value.y) < 0.05) {
      dragging = true
    }
  })
  scopeCanvas.addEventListener('mousemove', e => {
    if (!dragging) return
    const rect = scopeCanvas.getBoundingClientRect()
    scopeCursor.value.x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    scopeCursor.value.y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
  })
  scopeCanvas.addEventListener('mouseup', () => {
    dragging = false
  })
  scopeCanvas.addEventListener('mouseleave', () => {
    dragging = false
  })

  // 幅频图点击事件 - 更新频率
  const ampCanvas = ampCanvasRef.value
  ampCanvas.addEventListener('click', e => {
    const pi = ampCanvas._plotInfo
    if (!pi) return
    const rect = ampCanvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const ratio = (mx - pi.pad.l) / pi.gW
    if (ratio < 0 || ratio > 1) return
    const newF = Math.round(pi.fMin + pi.fRange * ratio)
    const clampedF = Math.max(100, Math.min(10000, newF))
    emit('update-freq', clampedF)
    // 当freqMin/freqMax输入为空时清除fixedRange
    if (!freqMin.value || !freqMax.value) {
      fixedRange.value = null
    }
  })

  // 启动动画
  nextTick(() => {
    animate()
  })
})

watch(() => props.params, () => {
  drawAmpChart()
}, { deep: true })
</script>
