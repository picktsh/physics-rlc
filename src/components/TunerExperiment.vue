<template>
  <div>
    <!-- ============ 1. 实验说明 ============ -->
    <section class="card mb-4">
      <h2 class="sec-title tuner-title">收音机选频</h2>
      <p class="text-[14.5px] text-[#56647a] leading-6">
        收音机天线收到的并不是"一个台",而是<b class="text-[#1c2534]">所有电台载波叠加在一起的混合信号</b>。
        串联 RLC 回路对不同频率呈现不同阻抗(谐振时电流最大),把它接在天线之后,调可变电容 C 使谐振频率
        <b class="text-[#2563eb]">f₀</b> 对准某个电台,该台的电流分量就远大于其他台 ——
        这一过程就是<b class="text-[#1c2534]">选频</b>,与「仿真分析」页的幅频特性曲线是同一物理量:工程上称它为选频曲线。
      </p>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] mt-3">
        <span class="chip-flow">天线:多台叠加信号</span>
        <span class="text-[#8a97ab]">→</span>
        <span class="chip-flow">串联 RLC 选频网络</span>
        <span class="text-[#8a97ab]">→</span>
        <span class="chip-flow">旋 C 调 f₀</span>
        <span class="text-[#8a97ab]">→</span>
        <span class="chip-flow">只留目标台 → 检波收听</span>
      </div>
      <div class="mt-3 rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-4 py-3 text-[13.5px] text-[#56647a] leading-7">
        <span class="formula-k" v-html="K('I(f)=\\dfrac{V}{\\sqrt{R^2+\\left(\\omega L-\\dfrac{1}{\\omega C}\\right)^{\\!2}}}')"></span>
        <span class="formula-k ml-2" v-html="K('\\quad f_0=\\dfrac{1}{2\\pi\\sqrt{LC}}')"></span>
        <span class="text-[#8a97ab] ml-2">电台频率取 AM 中波的 1/1000 缩比(0.5~1.5 kHz),原理不变;本页 L = 100 mH 固定,旋钮调 C。</span>
      </div>
    </section>

    <!-- ============ 2. 电台与调谐 ============ -->
    <section class="card mb-4">
      <h2 class="sec-title">电台与调谐</h2>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <span class="text-[14px] text-[#56647a]">电台(点击直接收听)</span>
        <button
          v-for="s in STATIONS"
          :key="s.id"
          type="button"
          class="sta-chip"
          :class="targetId === s.id ? 'sta-chip-on' : ''"
          @click="tuneTo(s.freq)"
        >
          <i class="inline-block w-2 h-2 rounded-full mr-1.5" :style="{ background: s.color }"></i>
          {{ s.name }}
          <b class="font-variant-numeric tabular-nums">{{ s.freq }}</b> Hz
        </button>
        <label class="flex items-center gap-1.5 text-[14px] text-[#56647a] cursor-pointer select-none ml-auto">
          <input v-model="interfOn" type="checkbox" class="w-[14px] h-[14px] accent-[#2563eb] cursor-pointer" />
          <span class="flex items-center gap-1.5">
            <i class="inline-block w-2 h-2 rounded-full bg-[#d14a3f]"></i>邻频干扰台 860 Hz
          </span>
        </label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-4">
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-3 text-[14px] text-[#56647a]">
            <span class="w-[86px] shrink-0">调谐旋钮 f₀</span>
            <input type="range" v-model.number="f0Tune" :min="TUNE_F_MIN" :max="TUNE_F_MAX" step="1" class="tun-slider flex-1" />
            <span class="w-[108px] shrink-0 text-right font-variant-numeric tabular-nums text-[#2563eb] font-semibold">{{ f0Tune }} Hz</span>
          </div>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-1 px-3.5 py-2 bg-[#f6f8fb] rounded-lg text-[13.5px] text-[#8a97ab]">
            <span>可变电容 C = <b class="text-[#1c2534] font-variant-numeric tabular-nums">{{ st.C_uF.toFixed(4) }}</b> μF</span>
            <span>L = 100 mH(固定)</span>
          </div>
          <div class="flex items-center gap-3 text-[14px] text-[#56647a]">
            <span class="w-[86px] shrink-0">阻尼电阻 R</span>
            <input type="range" v-model.number="R" :min="R_MIN" :max="R_MAX" step="1" class="tun-slider flex-1" />
            <span class="w-[108px] shrink-0 text-right font-variant-numeric tabular-nums text-[#1c2534]">{{ R }} Ω</span>
          </div>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-1 px-3.5 py-2 bg-[#f6f8fb] rounded-lg text-[13.5px] text-[#8a97ab]">
            <span>品质因数 Q = <b class="text-[#1c2534] font-variant-numeric tabular-nums">{{ st.Q.toFixed(1) }}</b></span>
            <span>带宽 Δf = <b class="text-[#1c2534] font-variant-numeric tabular-nums">{{ st.BW.toFixed(1) }}</b> Hz</span>
            <span class="text-[#8a97ab]">R 越小 Q 越高,选择性越好;但 Q 过高带宽过窄,偏离一点就收不到</span>
          </div>
        </div>

        <div class="rounded-xl border border-[#e6eaf2] overflow-hidden self-start w-full">
          <div class="flex items-center justify-between px-4 py-2 bg-[#f6f8fb] border-b border-[#e6eaf2] text-[13.5px]">
            <span class="font-semibold text-[#1c2534]">信号表</span>
            <span class="text-[#8a97ab]">正在收听:{{ st.target.name }} {{ st.target.freq }} Hz</span>
          </div>
          <div class="px-4 py-3 flex flex-col gap-3 text-[13.5px]">
            <div>
              <div class="flex justify-between mb-1">
                <span class="text-[#56647a]">接收电平(相对对准)</span>
                <span :class="['font-semibold font-variant-numeric tabular-nums', levelColor]">{{ levelText }}</span>
              </div>
              <div class="meter">
                <div class="meter-fill" :style="{ width: levelPct + '%', background: levelFillBg }"></div>
              </div>
              <div class="text-[12.5px] text-[#8a97ab] mt-0.5">{{ levelHint }}</div>
            </div>
            <div>
              <div class="flex justify-between mb-1">
                <span class="text-[#56647a]">邻台串扰(最大)</span>
                <span class="font-semibold font-variant-numeric tabular-nums text-[#1c2534]">{{ st.adj ? st.adj.name + ' ' + st.adj.dBText : '—' }}</span>
              </div>
              <div class="meter">
                <div class="meter-fill" :class="crosstalk > 10 ? 'bg-[#d14a3f]' : 'bg-[#0e9f6e]'" :style="{ width: Math.min(100, crosstalk * 4) + '%' }"></div>
              </div>
              <div class="text-[12.5px] mt-0.5" :class="crosstalk > 10 ? 'text-[#d14a3f] font-medium' : 'text-[#8a97ab]'">
                {{ crosstalk > 10 ? '⚠ 串台:选择性不足,同时听到两个台 —— 请减小 R 提高 Q' : '邻台被压住,收听干净' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 3. 选频特性 ============ -->
    <section class="card mb-4">
      <h2 class="sec-title">选频曲线与频谱</h2>
      <div class="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
        <div class="rounded-xl bg-[#f6f8fb] border border-[#e6eaf2] p-4 min-w-0">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#56647a] mb-2">
            <span class="flex items-center gap-1.5"><i class="inline-block w-4 border-t-2 border-[#2563eb]"></i>选频曲线(相对电流)</span>
            <span class="flex items-center gap-1.5"><i class="inline-block w-2.5 h-2.5 rounded-full bg-[#d97706]"></i>电台位置</span>
            <span class="flex items-center gap-1.5"><i class="inline-block w-2.5 h-2.5 rounded-full bg-[#d14a3f]"></i>f₀ 调谐点</span>
            <span v-if="bandEdges" class="text-[#8a97ab] ml-auto">-3 dB 带宽 {{ bandEdges.hi - bandEdges.lo }} Hz</span>
          </div>
          <div ref="curveWrapRef" class="w-full">
            <canvas ref="curveCanvasRef" class="w-full block" style="height: 300px"></canvas>
          </div>
        </div>

        <div class="flex flex-col gap-3 min-w-0">
          <div class="rounded-xl bg-[#f6f8fb] border border-[#e6eaf2] p-4 flex-1">
            <div class="text-[13.5px] font-semibold text-[#1c2534] mb-2">天线输入频谱(发射强度)</div>
            <div ref="inSpecWrapRef" class="w-full">
              <canvas ref="inSpecCanvasRef" class="w-full block" style="height: 108px"></canvas>
            </div>
            <div class="text-[12.5px] text-[#8a97ab] mt-1.5">各台强度相当,谁都不占优</div>
          </div>
          <div class="rounded-xl bg-[#f6f8fb] border border-[#e6eaf2] p-4 flex-1">
            <div class="text-[13.5px] font-semibold text-[#1c2534] mb-2">选频后输出(回路电流)</div>
            <div ref="outSpecWrapRef" class="w-full">
              <canvas ref="outSpecCanvasRef" class="w-full block" style="height: 108px"></canvas>
            </div>
            <div class="text-[12.5px] text-[#8a97ab] mt-1.5">只剩目标台分量,其余被衰减(数值为相对目标台的 dB)</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 4. 波形对照 ============ -->
    <section class="card mb-4">
      <h2 class="sec-title">波形对照:调准前与调准后</h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-xl bg-[#f6f8fb] border border-[#e6eaf2] p-4 min-w-0">
          <div class="flex items-center justify-between mb-2 text-[13.5px]">
            <span class="font-semibold text-[#1c2534]">天线输入:多台叠加</span>
            <span class="text-[#8a97ab]">几个不同频率的载波叠在一起,无法直接收听</span>
          </div>
          <div ref="inWaveWrapRef" class="w-full">
            <canvas ref="inWaveCanvasRef" class="w-full block" style="height: 150px"></canvas>
          </div>
        </div>
        <div class="rounded-xl bg-[#f6f8fb] border border-[#e6eaf2] p-4 min-w-0">
          <div class="flex items-center justify-between mb-2 text-[13.5px]">
            <span class="font-semibold text-[#1c2534]">选频输出:回路电流</span>
            <span class="text-[#8a97ab]">接近目标台的单频波形 —— 可以解调了</span>
          </div>
          <div ref="outWaveWrapRef" class="w-full">
            <canvas ref="outWaveCanvasRef" class="w-full block" style="height: 150px"></canvas>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 5. 注脚 ============ -->
    <p class="text-[13px] text-[#8a97ab] leading-6 px-0.5">
      注:本页曲线即「仿真分析」幅频特性在同一条串联 RLC 上的工程化呈现;切回仿真分析页可对照观察 Q 值、带宽与峰形的关系。电台频率为 AM 中波 1/1000 缩比演示值,便于在现有频段内观察,选频原理与真实收音机一致。
    </p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import katex from 'katex'
import {
  STATIONS,
  INTERFERER,
  TUNER_L_MH,
  TUNE_F_MIN,
  TUNE_F_MAX,
  R_MIN,
  R_MAX,
  tunerState,
  tunerCurve,
  tunerBandEdges,
  tunerWaveforms,
} from '../utils/tuner'

/** 渲染 LaTeX 为 KaTeX HTML */
function K(tex, display = false) {
  return katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: 'ignore',
  })
}

/* ---------------- 状态 ---------------- */
const f0Tune = ref(1000) // 调谐频率 Hz(默认对准音乐台)
const R = ref(20) // 阻尼电阻 Ω
const interfOn = ref(false) // 邻频干扰台开关

const st = computed(() => tunerState(f0Tune.value, R.value, interfOn.value))
const targetId = computed(() => st.value.target.id)
const bandEdges = computed(() => tunerBandEdges(f0Tune.value, R.value))

function tuneTo(freq) {
  f0Tune.value = Math.min(TUNE_F_MAX, Math.max(TUNE_F_MIN, freq))
}

/* ---------------- 信号表读数 ---------------- */
const levelText = computed(() => {
  const h = st.value.target.h
  return h >= 0.99 ? '0.0 dB 满格' : (20 * Math.log10(h)).toFixed(1) + ' dB'
})
const levelPct = computed(() => {
  const h = st.value.target.h
  const db = h > 0 ? Math.max(-40, 20 * Math.log10(h)) : -40
  return Math.round(((db + 40) / 40) * 100)
})
const levelColor = computed(() => {
  const h = st.value.target.h
  if (h >= 0.89) return 'text-[#0e9f6e]'
  if (h >= 0.5) return 'text-[#d97706]'
  return 'text-[#d14a3f]'
})
const levelFillBg = computed(() => {
  const h = st.value.target.h
  if (h >= 0.89) return '#0e9f6e'
  if (h >= 0.5) return '#d97706'
  return '#d14a3f'
})
const levelHint = computed(() => {
  const d = Math.abs(st.value.target.freq - f0Tune.value)
  if (d < 2) return '已对准,信号最强 —— 收音机"台"就调在这里'
  if (d < 30) return '微微失谐:继续转动旋钮对准 ' + st.value.target.freq + ' Hz 可满格'
  return '明显失谐:转动调谐旋钮(或点上方电台)对准 ' + st.value.target.freq + ' Hz'
})
const crosstalk = computed(() => {
  const s = st.value
  if (!s.adj || s.adj.id === s.target.id) return 0
  return s.target.dB !== 0 ? -Math.min(0, s.target.dB) : 0
})

/* ---------------- 绘图 ---------------- */
const curveCanvasRef = ref(null)
const inSpecCanvasRef = ref(null)
const outSpecCanvasRef = ref(null)
const inWaveCanvasRef = ref(null)
const outWaveCanvasRef = ref(null)
const curveWrapRef = ref(null)
const inSpecWrapRef = ref(null)
const outSpecWrapRef = ref(null)
const inWaveWrapRef = ref(null)
const outWaveWrapRef = ref(null)

let rafId = 0
function schedule() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    drawAll()
  })
}

function setupCanvas(canvas, wrap, h) {
  if (!canvas || !wrap) return null
  const dpr = window.devicePixelRatio || 1
  const w = wrap.clientWidth
  if (w < 10) return null
  canvas.width = w * dpr
  canvas.height = h * dpr
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  return { ctx, w, h }
}

function grid(ctx, w, h, padL, padR, padT, padB, xTicks, yTicks, xFmt, yFmt, yLabel) {
  ctx.save()
  ctx.strokeStyle = '#e2e8f2'
  ctx.lineWidth = 1
  ctx.fillStyle = '#8a97ab'
  ctx.font = '10.5px sans-serif'
  for (const [tx, v] of xTicks) {
    ctx.beginPath()
    ctx.moveTo(tx, padT)
    ctx.lineTo(tx, h - padB)
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(xFmt(v), tx, h - padB + 6)
  }
  for (const [ty, v] of yTicks) {
    ctx.beginPath()
    ctx.moveTo(padL, ty)
    ctx.lineTo(w - padR, ty)
    ctx.stroke()
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(yFmt(v), padL - 6, ty)
  }
  if (yLabel) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(yLabel, padL + 6, padT + 4)
  }
  ctx.restore()
}

function drawCurve() {
  const c = setupCanvas(curveCanvasRef.value, curveWrapRef.value, 300)
  if (!c) return
  const { ctx, w, h } = c
  const padL = 48
  const padR = 18
  const padT = 22
  const padB = 30
  const xMin = TUNE_F_MIN
  const xMax = TUNE_F_MAX
  const X = (f) => padL + ((f - xMin) / (xMax - xMin)) * (w - padL - padR)
  const Y = (v) => padT + (1 - v) * (h - padT - padB)

  const xTicks = []
  for (let i = 0; i <= 5; i++) {
    const v = xMin + ((xMax - xMin) * i) / 5
    xTicks.push([X(v), v])
  }
  const yTicks = []
  for (let i = 0; i <= 4; i++) yTicks.push([Y(i / 4), i / 4])
  grid(ctx, w, h, padL, padR, padT, padB, xTicks, yTicks, (v) => v + '', (v) => v.toFixed(2), 'h(f)')

  // -3dB 带宽阴影
  const be = bandEdges.value
  if (be) {
    ctx.save()
    ctx.fillStyle = 'rgba(37, 99, 235, 0.06)'
    ctx.fillRect(X(be.lo), Y(1 / Math.SQRT2), X(be.hi) - X(be.lo), padT + (h - padT - padB) - Y(1 / Math.SQRT2))
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.35)'
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    ctx.moveTo(padL, Y(1 / Math.SQRT2))
    ctx.lineTo(w - padR, Y(1 / Math.SQRT2))
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  // 电台位置竖线
  for (const s of [...STATIONS, ...(interfOn.value ? [INTERFERER] : [])]) {
    ctx.save()
    ctx.strokeStyle = s.color
    ctx.globalAlpha = 0.3
    ctx.lineWidth = 1.4
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.moveTo(X(s.freq), padT)
    ctx.lineTo(X(s.freq), h - padB)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  // 选频曲线
  const pts = tunerCurve(f0Tune.value, R.value)
  ctx.save()
  ctx.strokeStyle = '#2563eb'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  pts.forEach((p, i) => {
    const px = X(p.f)
    const py = Y(p.h)
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  })
  ctx.stroke()
  ctx.restore()

  // 调谐点 f0 虚线
  ctx.save()
  ctx.strokeStyle = '#d14a3f'
  ctx.lineWidth = 1.6
  ctx.setLineDash([5, 4])
  ctx.beginPath()
  ctx.moveTo(X(f0Tune.value), padT)
  ctx.lineTo(X(f0Tune.value), h - padB)
  ctx.stroke()
  ctx.restore()

  // 台标签与选中标记
  ctx.save()
  ctx.font = '600 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  for (const s of STATIONS) {
    ctx.fillStyle = s.id === targetId.value ? s.color : '#9aa7ba'
    ctx.fillText(s.name, X(s.freq), padT - 2)
  }
  if (interfOn.value) {
    ctx.fillStyle = '#d14a3f'
    ctx.fillText('干扰', X(INTERFERER.freq), padT - 2)
  }
  // 收听台圆点(在曲线上)
  const t = st.value.target
  ctx.fillStyle = t.color
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(X(t.freq), Y(t.h), 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawSpec(mode) {
  const isIn = mode === 'in'
  const canvas = isIn ? inSpecCanvasRef.value : outSpecCanvasRef.value
  const wrap = isIn ? inSpecWrapRef.value : outSpecWrapRef.value
  const c = setupCanvas(canvas, wrap, 108)
  if (!c) return
  const { ctx, w, h } = c
  const padL = 34
  const padR = 10
  const padT = 16
  const padB = 20
  const items = isIn ? [...STATIONS, ...(interfOn.value ? [INTERFERER] : [])] : st.value.comps
  if (!items.length) return
  const maxV = isIn ? Math.max(...items.map((s) => s.amp)) : Math.max(...items.map((s) => s.I))
  const n = items.length
  const bw = Math.min(46, (w - padL - padR) / n - 12)
  const stepX = (w - padL - padR) / n

  ctx.save()
  ctx.fillStyle = '#8a97ab'
  ctx.font = '10.5px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText('0', padL - 6, h - padB)
  ctx.fillText(isIn ? '强度' : '相对', padL - 6, padT + 6)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.strokeStyle = '#e2e8f2'
  ctx.beginPath()
  ctx.moveTo(padL, padT + 8)
  ctx.lineTo(padL, h - padB)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(padL, h - padB)
  ctx.lineTo(w - padR, h - padB)
  ctx.stroke()
  ctx.restore()

  items.forEach((s, i) => {
    const cx = padL + stepX * i + stepX / 2
    const v = isIn ? s.amp / maxV : s.I / maxV
    const bh = Math.max(3, v * (h - padT - padB - 6))
    ctx.save()
    ctx.fillStyle = isIn ? (s.color || '#64748b') : s.color
    const bx = cx - bw / 2
    ctx.fillRect(bx, h - padB - bh, bw, bh)
    ctx.fillStyle = isIn ? '#64748b' : s.color
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const label = isIn ? s.name : s.dBText
    const ty = h - padB - bh - (isIn ? 4 : 13)
    if (ty > padT) ctx.fillText(label, cx, ty)
    ctx.fillStyle = '#8a97ab'
    ctx.textBaseline = 'top'
    ctx.fillText(s.freq + ' Hz', cx, h - padB + 3)
    ctx.restore()
  })
}

function drawWaves() {
  const wf = tunerWaveforms(f0Tune.value, R.value, interfOn.value)
  const pair = [
    { canvas: inWaveCanvasRef.value, wrap: inWaveWrapRef.value, data: wf.vin, color: '#7c8ca5', title: '天线输入' },
    { canvas: outWaveCanvasRef.value, wrap: outWaveWrapRef.value, data: wf.vout, color: '#2563eb', title: '回路电流' },
  ]
  for (const p of pair) {
    const c = setupCanvas(p.canvas, p.wrap, 150)
    if (!c) continue
    const { ctx, w, h } = c
    const padL = 12
    const padR = 12
    const padT = 12
    const padB = 12
    const mid = (padT + h - padB) / 2
    const amp = (h - padT - padB) * 0.44
    // 中线与上下参考
    ctx.save()
    ctx.strokeStyle = '#e2e8f2'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padL, mid)
    ctx.lineTo(w - padR, mid)
    ctx.stroke()
    ctx.restore()
    ctx.save()
    ctx.strokeStyle = p.color
    ctx.lineWidth = 1.8
    ctx.beginPath()
    const N = wf.N
    for (let i = 0; i < N; i++) {
      const x = padL + ((w - padL - padR) * i) / (N - 1)
      const y = mid - p.data[i] * amp
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
  }
}

function drawAll() {
  drawCurve()
  drawSpec('in')
  drawSpec('out')
  drawWaves()
}

watch([f0Tune, R, interfOn], schedule)

function onResize() {
  schedule()
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  schedule()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
/* 本页卡片一并放大:小节标题比全站 sec-title(16px)大一级 */
.sec-title {
  font-size: 18px;
}
/* 页面总标题:收音机选频 */
.tuner-title {
  font-size: 23px;
  line-height: 1.5;
  margin-bottom: 16px;
}
.chip-flow {
  display: inline-block;
  background: #eaf1ff;
  color: #1d4ed8;
  border: 1px solid #cfe0ff;
  border-radius: 999px;
  padding: 3px 12px;
  font-weight: 600;
  white-space: nowrap;
}
.sta-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid #d5dde7;
  background: #fff;
  color: #56647a;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.sta-chip:hover {
  border-color: #2563eb;
  color: #1d4ed8;
}
.sta-chip-on,
.sta-chip-on:hover {
  background: #eaf1ff;
  border-color: #2563eb;
  color: #1d4ed8;
  font-weight: 600;
}
.tun-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: #d7dee8;
  outline: none;
  cursor: pointer;
}
.tun-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #2563eb;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.25);
  cursor: pointer;
}
.tun-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #2563eb;
  cursor: pointer;
}
.meter {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #e4e9f1;
  overflow: hidden;
}
.meter-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.12s ease;
}
</style>
