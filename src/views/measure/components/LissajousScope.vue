<template>
  <div>
    <!-- 图表区：2列布局 (模仿 LCVoltageMethod) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <!-- 列1: 示波器·李萨如图 -->
      <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] flex flex-col h-full">
        <div
          class="card-hd flex items-center justify-between px-4 py-2.5 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)] rounded-t-lg"
        >
          <span class="font-semibold text-[color:var(--app-text)]">示波器 · 李萨如图</span>
          <span class="bg-[var(--app-primary)] text-white px-2 py-0.5 rounded text-xs font-semibold">X-Y MODE</span>
        </div>
        <div class="bg-[var(--app-surface-sunken)] overflow-hidden relative flex-1 flex flex-col">
          <canvas ref="scopeCanvasRef" class="w-full block cursor-crosshair" :height="canvasHeight"></canvas>
          <div class="absolute bottom-2 left-3 text-xs text-white/50 font-mono pointer-events-none">
            {{ cursorInfo }}
          </div>
        </div>
      </section>

      <!-- 列2: 幅频特性曲线 -->
      <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] flex flex-col h-full">
        <div
          class="card-hd flex items-center justify-between px-4 py-2.5 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)] rounded-t-lg"
        >
          <span class="font-semibold text-[color:var(--app-text)]">幅频特性曲线 f-I</span>
          <span class="text-xs text-[color:var(--app-text-muted)]"></span>
        </div>
        <NForm label-placement="top" :show-feedback="false">
          <div class="px-4 py-2 border-b border-[color:var(--app-border-light)]">
            <NFormItem label="横坐标">
              <div class="flex items-center gap-2 flex-wrap">
                <div class="w-24">
                  <NInputNumber
                    v-model:value="freqMin"
                    :show-button="false"
                    :precision="QUANTITY.f.decimals"
                    :step="QUANTITY.f.step"
                    placeholder="最小"
                  />
                </div>
                <span>~</span>
                <div class="w-24">
                  <NInputNumber
                    v-model:value="freqMax"
                    :show-button="false"
                    :precision="QUANTITY.f.decimals"
                    :step="QUANTITY.f.step"
                    placeholder="最大"
                  >
                    <template #suffix>{{ QUANTITY.f.unit }}</template>
                  </NInputNumber>
                </div>
                <NButton secondary type="primary" @click="applyFreqRange">应用</NButton>
              </div>
            </NFormItem>
          </div>
        </NForm>
        <div class="p-3 bg-[var(--app-surface-sunken)] flex-1 flex items-center">
          <canvas ref="ampCanvasRef" class="w-full block cursor-crosshair" :height="canvasHeight"></canvas>
        </div>
      </section>
    </div>

    <!-- 操作控制 (模仿 LCVoltageMethod 操作控制) -->
    <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] mb-4">
      <div
        class="card-hd flex items-center justify-between px-4 py-2.5 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)] rounded-t-lg"
      >
        <span class="font-semibold text-[color:var(--app-text)]">操作控制</span>
      </div>
      <div class="flex gap-3 flex-wrap p-3">
        <NButton secondary :type="isSweeping ? 'error' : 'default'" @click="toggleSweep">
          <template #icon><NIcon :component="isSweeping ? Stop : Reset" /></template>
          {{ isSweeping ? '停止扫描' : '自动扫描' }}
        </NButton>
        <NButton secondary @click="exportCSV">
          <template #icon><NIcon :component="Download" /></template>
          导出CSV
        </NButton>
        <NButton secondary type="error" @click="clearData">
          <template #icon><NIcon :component="TrashCan" /></template>
          清空数据
        </NButton>
      </div>
    </section>

    <!-- 底部: 数据表格 + 实时面板 (模仿 LCVoltageMethod) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <!-- 实验数据记录 -->
      <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)]">
        <div
          class="card-hd flex items-center justify-between px-4 py-2.5 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)] rounded-t-lg"
        >
          <span class="font-semibold text-[color:var(--app-text)]">实验数据记录</span>
          <span class="text-xs text-[color:var(--app-text-muted)]">{{ acquiredData.length }} 个数据点</span>
        </div>
        <NDataTable
          size="small"
          :columns="dataColumns"
          :data="acquiredData"
          :row-class-name="(row, i) => (i === resonanceIdx ? 'bg-[var(--app-error-bg)]' : '')"
          :max-height="320"
          :scroll-x="640"
        />
      </section>

      <!-- 实时数据面板 -->
      <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)]">
        <div
          class="card-hd flex items-center justify-between px-4 py-2.5 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)] rounded-t-lg"
        >
          <span class="font-semibold text-[color:var(--app-text)]">实时数据面板</span>
        </div>
        <div v-if="simulated" class="p-4 space-y-2">
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div
              class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center"
            >
              <div class="text-xs text-[color:var(--app-text-muted)] mb-1">电阻电压 峰峰值 (Vpp)</div>
              <div class="text-lg font-bold font-mono text-[color:var(--app-brand)]">
                {{ fmt('u', measures.Urpp) }}
              </div>
            </div>
            <div
              class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center"
            >
              <div class="text-xs text-[color:var(--app-text-muted)] mb-1">电阻电压 有效值 (Vrms)</div>
              <div class="text-lg font-bold font-mono text-[color:var(--app-success)]">
                {{ fmt('u', measures.Ur) }}
              </div>
            </div>
            <div
              class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center"
            >
              <div class="text-xs text-[color:var(--app-text-muted)] mb-1">回路电流 I ({{ QUANTITY.i.unit }})</div>
              <div class="text-lg font-bold font-mono text-[color:var(--app-warning)]">{{ fmt('i', measures.I) }}</div>
            </div>
            <div
              class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center"
            >
              <div class="text-xs text-[color:var(--app-text-muted)] mb-1">阻抗 |Z| ({{ QUANTITY.z.unit }})</div>
              <div class="text-lg font-bold font-mono text-[color:var(--app-brand)]">{{ fmt('z', measures.Z) }}</div>
            </div>
            <div
              class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center"
            >
              <div class="text-xs text-[color:var(--app-text-muted)] mb-1">相位 φ ({{ QUANTITY.phi.unit }})</div>
              <div class="text-lg font-bold font-mono text-[color:var(--app-error)]">
                {{ fmt('phi', measures.phi) }}
              </div>
            </div>
          </div>
          <div class="border-t border-dashed border-[color:var(--app-border)] pt-3 mt-1">
            <div class="flex gap-4 py-1.5">
              <span class="text-[color:var(--app-text-muted)]">理论谐振频率 f₀</span>
              <span class="font-semibold text-[color:var(--app-text)]">{{ fmt('f', measures.f0) }} {{ QUANTITY.f.unit }}</span>
            </div>
            <!-- Q(±45°法):串联RLC中 φ=±45° 即半功率点,由扫描数据插值 f2/f1 后 Q=f0/(f2-f1);样式与 LC 电压幅值法 Q 行统一 -->
            <div class="flex gap-4 py-1.5">
              <span class="text-[color:var(--app-text-muted)] font-semibold">Q（±45°法）</span>
              <span v-if="qMeasured != null" class="font-semibold text-[color:var(--app-success)]">{{ fmt('q', qMeasured) }}</span>
              <span v-else class="font-semibold text-[color:var(--app-text-faint)]">—（完成自动扫描后按 ±45° 相位插值）</span>
            </div>
          </div>
          <!-- 本次扫描 Q 结果横条(模板与 LC 电压幅值法统一):扫描结束(扫满/手动停止)后由扫描数据 ±45° 插值算出;扫描中/清空后显示 — -->
          <div
            class="rounded-lg border px-3 py-2 text-center font-semibold"
            :class="
              qMeasured != null
                ? 'border-[color:var(--app-success-border)] bg-[var(--app-success-bg)] text-[color:var(--app-success)]'
                : 'border-[color:var(--app-border)] bg-[var(--app-surface-sunken)] text-[color:var(--app-text-faint)]'
            "
          >
            🔹 本次扫描 Q（±45°法）= {{ qMeasured != null ? fmt('q', qMeasured) : '—' }}
          </div>
        </div>
        <!-- 未仿真占位:实时值直接由 params 计算,未仿真时会显示默认数据,故按 simulated 门控 -->
        <div v-else class="p-4 text-center text-sm text-[color:var(--app-text-faint)]">
          未仿真：请先到「电路搭建」点击「开始仿真」后查看实时数据
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, h, watch, onMounted, onActivated, onDeactivated, onUnmounted, nextTick } from 'vue'
import { NButton, NDataTable, NForm, NFormItem, NIcon, NInputNumber, useMessage } from 'naive-ui'
import { Stop, Reset, Download, TrashCan } from '@vicons/carbon'
import { impedance, current, resonantFreq } from '@/utils/physics'
import { canvasTheme } from '@/utils/canvasTheme'
import { SIMULATE_HINT } from '@/stores/rlcCalculator'
import { QUANTITY, fmt } from '@/utils/quantity'

const props = defineProps({
  params: {
    type: Object,
    required: true,
  },
  // 电路搭建页仿真成功标记:未仿真不得扫描(扫描参数须来自电路搭建数据)
  simulated: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update-freq'])

const message = useMessage()

const scopeCanvasRef = ref(null)
const ampCanvasRef = ref(null)
const canvasHeight = ref(typeof window !== 'undefined' && window.innerWidth < 640 ? 320 : 540)

// 状态
const acquiredData = ref([])
const isSweeping = ref(false)
const stopRequested = ref(false)
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
let animId = null

// 计算测量值(频率口径 kHz,与 params 零换算)
const measures = computed(() => {
  const freq = props.params.fStart || 1
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
  const voltX = ((scopeCursor.value.x - 0.5) * 2 * Xamp * 1.2).toFixed(QUANTITY.u.decimals)
  const voltY = (-(scopeCursor.value.y - 0.5) * 2 * Yamp * 1.2).toFixed(QUANTITY.u.decimals)
  return `X=${voltX}V  Y=${voltY}V`
})

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

// Q(±45°法)实测:串联RLC中 φ=±45° 即半功率点,由扫描数据线性插值出 f1/f2 后 Q=f0/(f2-f1);
// 扫描进行中不展现(与「带宽仅扫描结束后展现」口径一致),数据未覆盖 ±45° 时返回 null 显示「—」
const qMeasured = computed(() => {
  if (isSweeping.value || acquiredData.value.length < 2) return null
  const f0 = measures.value.f0
  if (!isFinite(f0) || f0 <= 0) return null
  const sorted = [...acquiredData.value].sort((a, b) => a.freq - b.freq)
  const cross = (target) => {
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]
      const b = sorted[i + 1]
      if ((a.phase - target) * (b.phase - target) <= 0 && a.phase !== b.phase) {
        return a.freq + ((target - a.phase) / (b.phase - a.phase)) * (b.freq - a.freq)
      }
    }
    return null
  }
  const f2 = cross(45)
  const f1 = cross(-45)
  if (f1 == null || f2 == null || f2 <= f1) return null
  return f0 / (f2 - f1)
})

// 扫描结果生成提示:仅在本轮「从无到有」时提示一次,停止/清理的重复路径不会重复弹
watch(qMeasured, (val, prev) => {
  if (val != null && prev == null) message.success('Q值已生成，可在数据面板查看')
})

// 实验数据记录表(NDataTable:粘顶表头 + scroll-x 横向滚动适配移动端;数值列右对齐,精度走 quantity 总表)
const dataColumns = [
  { title: '#', key: 'idx', align: 'center', width: 56, render: (_, i) => i + 1 },
  { title: `f (${QUANTITY.f.unit})`, key: 'freq', align: 'right', render: (r) => fmt('f', r.freq) },
  { title: `I (${QUANTITY.i.unit})`, key: 'current', align: 'right', render: (r) => fmt('i', r.current) },
  { title: `Urpp (${QUANTITY.u.unit})`, key: 'urpp', align: 'right', render: (r) => fmt('u', r.urpp) },
  { title: `|Z| (${QUANTITY.z.unit})`, key: 'impedance', align: 'right', render: (r) => fmt('z', r.impedance) },
  { title: `φ (${QUANTITY.phi.unit})`, key: 'phase', align: 'right', render: (r) => fmt('phi', r.phase) },
  {
    title: '标记',
    key: 'mark',
    align: 'center',
    width: 96,
    render: (_, i) =>
      i === resonanceIdx.value ? h('span', { class: 'font-bold text-[color:var(--app-error)]' }, '★ 谐振') : '',
  },
]

// 智能格式化轴标签，避免数字过长覆盖图表
function formatAxisNum(v) {
  const a = Math.abs(v)
  if (a >= 1000) return v.toFixed(0)
  if (a >= 100) return v.toFixed(1)
  if (a >= 1) return v.toFixed(2)
  return v.toFixed(3)
}

// 绘制红色五角星
function drawStar(ctx, x, y, r, color) {
  ctx.save()
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 12
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const outerAngle = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const innerAngle = outerAngle + Math.PI / 5
    const ox = x + r * Math.cos(outerAngle)
    const oy = y + r * Math.sin(outerAngle)
    const ix = x + r * 0.4 * Math.cos(innerAngle)
    const iy = y + r * 0.4 * Math.sin(innerAngle)
    if (i === 0) ctx.moveTo(ox, oy)
    else ctx.lineTo(ox, oy)
    ctx.lineTo(ix, iy)
  }
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.restore()
}

// HiDPI Canvas 设置
function setupHiDPICanvas(canvas, height) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.parentElement.getBoundingClientRect()
  if (rect.width < 2) return null // 组件隐藏(keep-alive 切走)期间布局为 0,跳过绘制以免画布缓冲被清零
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
  const s = setupHiDPICanvas(canvas, canvasHeight.value)
  if (!s) return
  const { ctx, W, H } = s
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

  // 李萨如图形(相位椭圆与频率绝对值无关,仅取初始相位参考)
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
  ctx.fillStyle = '#7d8dab'
  ctx.font = '11px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('X: Us (激励电压)', cx, H - 6)
  ctx.save()
  ctx.translate(12, cy)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Y: Ur (电阻电压)', 0, 0)
  ctx.restore()

  // 刻度
  ctx.fillStyle = '#7d8dab'
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
  const ct = canvasTheme()
  const s = setupHiDPICanvas(canvas, canvasHeight.value)
  if (!s) return
  const { ctx, W, H } = s
  const pad = { l: 65, r: 25, t: 30, b: 50 }
  const gW = W - pad.l - pad.r,
    gH = H - pad.t - pad.b

  ctx.fillStyle = ct.bg
  ctx.fillRect(0, 0, W, H)

  const f0 = measures.value.f0
  const curFreq = props.params.fStart || 1
  let fMin, fMax
  if (fixedRange.value) {
    fMin = fixedRange.value.fMin
    fMax = fixedRange.value.fMax
  } else {
    fMin = Math.max(0.05, f0 * 0.2)
    fMax = f0 * 3
    if (curFreq > fMax) fMax = curFreq * 1.5
    if (curFreq < fMin) fMin = curFreq * 0.5
  }
  const fRange = fMax - fMin
  const Imax = props.params.R > 0 ? (props.params.V / props.params.R) * 1000 : (props.params.V / 0.1) * 1000
  const iMax = Imax * 1.2

  // 网格
  ctx.strokeStyle = ct.grid
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
  ctx.strokeStyle = ct.axis
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

  // 采集数据曲线
  if (acquiredData.value.length > 1) {
    const sorted = [...acquiredData.value].sort((a, b) => a.freq - b.freq)
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let i = 0; i < sorted.length; i++) {
      const x = pad.l + ((sorted[i].freq - fMin) / fRange) * gW
      const y = pad.t + gH * (1 - sorted[i].current / iMax)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // 采集数据点 (谐振点延后绘制，保证在最上层)
  acquiredData.value.forEach((d, i) => {
    if (i === resonanceIdx.value) return
    const x = pad.l + ((d.freq - fMin) / fRange) * gW
    const y = pad.t + gH * (1 - d.current / iMax)
    ctx.fillStyle = '#2563eb'
    ctx.shadowColor = '#2563eb'
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.arc(x, y, 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(x, y, 1.5, 0, Math.PI * 2)
    ctx.fill()
  })

  // 当前频率标记
  const curX = pad.l + ((curFreq - fMin) / fRange) * gW
  const curY = pad.t + gH * (1 - measures.value.I / iMax)
  ctx.fillStyle = '#e0523f'
  ctx.shadowColor = '#e0523f'
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
  ctx.strokeStyle = 'rgba(224,82,63,0.3)'
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
  ctx.fillStyle = '#e0523f'
  ctx.font = 'bold 11px Courier New'
  ctx.textAlign = 'left'
  ctx.fillText(`${fmt('i', measures.value.I)} ${QUANTITY.i.unit}`, curX + 8, curY - 4)
  ctx.fillStyle = ct.label
  ctx.font = '10px Courier New'
  ctx.fillText(`${fmt('f', curFreq)} ${QUANTITY.f.unit}`, curX + 8, curY + 10)

  // 轴标签
  ctx.fillStyle = ct.label
  ctx.font = '12px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('频率 f (' + QUANTITY.f.unit + ')', pad.l + gW / 2, H - 8)
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
  ctx.fillText('电流 I (' + QUANTITY.i.unit + ')', 0, 0)
  ctx.restore()

  // 谐振点绘制在最上层
  if (resonanceIdx.value >= 0 && resonanceIdx.value < acquiredData.value.length) {
    const d = acquiredData.value[resonanceIdx.value]
    const x = pad.l + ((d.freq - fMin) / fRange) * gW
    const y = pad.t + gH * (1 - d.current / iMax)
    ctx.fillStyle = '#eaa23a'
    ctx.shadowColor = '#eaa23a'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(x, y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#eaa23a'
    ctx.font = 'bold 11px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('★ 谐振 (' + fmt('f', d.freq) + ' ' + QUANTITY.f.unit + ', ' + fmt('i', d.current) + ' ' + QUANTITY.i.unit + ')', x, y - 12)
  }

  canvas._plotInfo = { fMin, fRange, iMax, pad, gW, gH }
}

// 动画循环(先续接下帧再绘制,便于外部通过 animId 暂停/恢复)
function animate() {
  animId = requestAnimationFrame(animate)
  animFrame++
  const now = Date.now()
  if (animFrame % (SKIP_FRAMES + 1) !== 0) {
    // 跳帧模式下也要节流幅频图
    if (!isSweeping.value && now - lastAmpDraw > 2000) {
      drawAmpChart()
      lastAmpDraw = now
    }
    return
  }
  drawScope()
  if (!isSweeping.value && now - lastAmpDraw > 2500) {
    drawAmpChart()
    lastAmpDraw = now
  }
}

// 切换扫描/停止
function toggleSweep() {
  if (isSweeping.value) {
    // 请求停止
    stopRequested.value = true
  } else {
    autoSweep()
  }
}

// kHz 口径下按 0.001(=1Hz)吸附,与旧 Hz 整数采样精度等价
const r3 = (x) => Math.round(x * 1000) / 1000

// 自动扫描
async function autoSweep() {
  // 扫描数据必须来自「电路搭建」的仿真参数:未仿真一律拦截(与各方法页统一口径)
  if (!props.simulated) {
    message.warning(SIMULATE_HINT + '，再进行自动扫描')
    return
  }
  if (props.params.L <= 0 || props.params.C <= 0 || props.params.R <= 0) {
    message.error('电路参数异常（R、L、C 需大于 0），请重新搭建并仿真')
    return
  }
  const f0 = resonantFreq(props.params.L, props.params.C)
  if (!isFinite(f0) || f0 <= 0) {
    message.error('电路参数异常，请检查 R、L、C 元件参数')
    return
  }
  // 以谐振频率 f0(kHz) 为中心动态生成扫频范围，保证必定经过谐振点
  const sweepHalfRange = Math.max(f0 * 0.5, 0.1)
  const fStart = Math.max(0.1, r3(f0 - sweepHalfRange))
  const fEnd = r3(f0 + sweepHalfRange)
  const freqs = []
  const N = 50
  for (let i = 0; i <= N; i++) {
    const f = fStart + (fEnd - fStart) * (i / N)
    freqs.push(r3(f))
  }
  const unique = [freqs[0]]
  for (let i = 1; i < freqs.length; i++) {
    if (freqs[i] !== freqs[i - 1]) unique.push(freqs[i])
  }
  acquiredData.value = []
  isSweeping.value = true
  stopRequested.value = false
  fixedRange.value = { fMin: Math.max(0.05, fStart * 0.9), fMax: fEnd * 1.1 }
  for (let idx = 0; idx < unique.length; idx++) {
    // 检查是否请求停止
    if (stopRequested.value) break

    const f = unique[idx]
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 再次检查（await 后可能已请求停止）
    if (stopRequested.value) break

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

    // 更新当前频率，触发李萨如图与幅频图实时变化
    emit('update-freq', f)
    await nextTick()
    drawAmpChart()
  }
  isSweeping.value = false
  stopRequested.value = false
}

// 导出CSV
function exportCSV() {
  if (acquiredData.value.length === 0) return message.warning('请先采集数据')
  const f0 = resonantFreq(props.params.L, props.params.C)
  const resIdx = resonanceIdx.value
  let csv = `序号,频率(${QUANTITY.f.unit}),电流(${QUANTITY.i.unit}),Urpp(${QUANTITY.u.unit}),阻抗(${QUANTITY.z.unit}),相位(${QUANTITY.phi.unit}),标记\r\n`
  acquiredData.value.forEach((d, i) => {
    const tag = i === resIdx ? '谐振' : ''
    csv += `${i + 1},${fmt('f', d.freq)},${fmt('i', d.current)},${fmt('u', d.urpp)},${fmt('z', d.impedance)},${fmt('phi', d.phase)},${tag}\r\n`
  })
  const peak = acquiredData.value.reduce((a, b) => (a.current > b.current ? a : b))
  csv += `\r\n谐振峰值电流:,${fmt('i', peak.current)} ${QUANTITY.i.unit}\r\n`
  csv += `对应频率:,${fmt('f', peak.freq)} ${QUANTITY.f.unit}\r\n`
  csv += `理论谐振频率:,${fmt('f', f0)} ${QUANTITY.f.unit}\r\n`
  navigator.clipboard.writeText(csv).then(() => {
    message.success(`✅ CSV已复制到剪贴板！共 ${acquiredData.value.length} 个数据点`)
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
    message.warning('请输入有效的频率范围（起始>0，终止>起始）')
    return
  }
  fixedRange.value = { fMin: freqMin.value, fMax: freqMax.value }
}

// Canvas事件
onMounted(() => {
  // 示波器游标事件
  const scopeCanvas = scopeCanvasRef.value
  scopeCanvas.addEventListener('mousedown', (e) => {
    const rect = scopeCanvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width
    const my = (e.clientY - rect.top) / rect.height
    if (Math.abs(mx - scopeCursor.value.x) < 0.05 && Math.abs(my - scopeCursor.value.y) < 0.05) {
      dragging = true
    }
  })
  // 触摸事件 - 示波器游标
  scopeCanvas.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault()
      const rect = scopeCanvas.getBoundingClientRect()
      const touch = e.touches[0]
      scopeCursor.value.x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
      scopeCursor.value.y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height))
      dragging = true
    },
    { passive: false },
  )
  scopeCanvas.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault()
      if (!dragging) return
      const rect = scopeCanvas.getBoundingClientRect()
      const touch = e.touches[0]
      scopeCursor.value.x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
      scopeCursor.value.y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height))
    },
    { passive: false },
  )
  scopeCanvas.addEventListener(
    'touchend',
    (e) => {
      e.preventDefault()
      dragging = false
    },
    { passive: false },
  )
  scopeCanvas.addEventListener('mousemove', (e) => {
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
  ampCanvas.addEventListener('click', (e) => {
    handleAmpCanvasClick(e)
  })
  // 触摸事件 - 幅频图
  ampCanvas.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault()
      handleAmpCanvasClick(e)
    },
    { passive: false },
  )

  function handleAmpCanvasClick(e) {
    const pi = ampCanvas._plotInfo
    if (!pi) return
    const rect = ampCanvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const mx = clientX - rect.left
    const ratio = (mx - pi.pad.l) / pi.gW
    if (ratio < 0 || ratio > 1) return
    const newF = r3(pi.fMin + pi.fRange * ratio)
    const clampedF = Math.max(0.1, Math.min(10, newF))
    emit('update-freq', clampedF)
    // 当freqMin/freqMax输入为空时清除fixedRange
    if (!freqMin.value || !freqMax.value) {
      fixedRange.value = null
    }
  }

  // 启动动画
  nextTick(() => {
    animate()
  })

  // 主题切换:幅频图按新配色重绘(示波器为固定深色风格,无需重绘)
  window.addEventListener('themechange', drawAmpChart)
})

// keep-alive 保活期间:切走(组件 DOM 移出文档、布局为 0)时暂停动画循环,
// 切回时恢复循环并立即重绘幅频图,保证画面不因隐藏期的零尺寸绘制而空白
onDeactivated(() => {
  if (animId) {
    cancelAnimationFrame(animId)
    animId = null
  }
})

onActivated(() => {
  if (!animId) animate()
  drawAmpChart()
})

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId)
  window.removeEventListener('themechange', drawAmpChart)
})

watch(
  () => props.params,
  () => {
    drawAmpChart()
  },
  { deep: true },
)
</script>

<style scoped>
canvas {
  display: block;
}
</style>
