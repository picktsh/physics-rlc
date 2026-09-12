<template>
  <div>
    <!-- ============ 1. 模块说明 ============ -->
    <section class="card mb-3">
      <h2 class="sec-title hr-title">心率检测</h2>
      <p class="text-[14.5px] text-[#56647a] leading-6">
        心率检测是 RLC 电路的工程应用场景之一:传感器拾取脉搏信号,经选频/滤波网络处理后提取有效分量,据此计算心率。
      </p>
      <p class="text-[13.5px] text-[#8a97ab] leading-6 mt-1">
        通过 Web Serial API 连接 STM32 心率传感器模块,实时显示脉搏波形与心率值。
      </p>

      <!-- 有源 RC 带通滤波器电路图与原理 -->
      <div class="mt-4 p-4 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
        <h3 class="text-[15px] font-semibold text-[#334155] mb-2">有源 RC 带通滤波器</h3>
        <p class="text-[13px] text-[#64748b] leading-5 mb-3">
          心率信号频率仅 0.5–4 Hz,纯无源 RLC 在此频段需要亨利级电感和法拉级电容,工程上不可行。实际生物电/光传感器均采用有源 RC 滤波器:第一级高通隔直 (0.48 Hz) 去除直流基线,第二级低通 (4.08 Hz) 滤除高频噪声,运放缓冲级隔离前后级避免负载效应。
        </p>
        <div class="flex justify-center">
          <svg viewBox="0 0 500 170" class="w-full" style="max-width: 500px">
            <!-- 标题 -->
            <text x="250" y="14" text-anchor="middle" font-size="13" fill="#334155" font-weight="600">有源 RC 带通滤波器 (等效选频网络)</text>
            <!-- ===== 第一级: 高通 ===== -->
            <text x="120" y="30" text-anchor="middle" font-size="10" fill="#94a3b8">第一级 · 高通 0.48 Hz</text>
            <!-- IN 端子 -->
            <circle cx="28" cy="70" r="3.5" fill="#e94560"/>
            <text x="28" y="90" text-anchor="middle" font-size="10" fill="#64748b">IN</text>
            <!-- 输入线 → C1 -->
            <line x1="31" y1="70" x2="65" y2="70" stroke="#334155" stroke-width="2"/>
            <!-- C1 (隔直电容, 平行板) -->
            <line x1="65" y1="57" x2="65" y2="83" stroke="#334155" stroke-width="2.5"/>
            <line x1="73" y1="57" x2="73" y2="83" stroke="#334155" stroke-width="2.5"/>
            <text x="69" y="50" text-anchor="middle" font-size="11" fill="#2563eb" font-weight="600">C₁</text>
            <text x="69" y="100" text-anchor="middle" font-size="9.5" fill="#64748b">10 μF</text>
            <!-- C1 → R1 -->
            <line x1="73" y1="70" x2="105" y2="70" stroke="#334155" stroke-width="2"/>
            <!-- R1 (电阻, 矩形) -->
            <rect x="105" y="63" width="48" height="14" fill="none" stroke="#334155" stroke-width="2" rx="1"/>
            <text x="129" y="56" text-anchor="middle" font-size="11" fill="#2563eb" font-weight="600">R₁</text>
            <text x="129" y="100" text-anchor="middle" font-size="9.5" fill="#64748b">33 kΩ</text>
            <!-- R1 → 结点 -->
            <line x1="153" y1="70" x2="210" y2="70" stroke="#334155" stroke-width="2"/>
            <!-- R1 接地 (虚线) -->
            <line x1="129" y1="77" x2="129" y2="120" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 2"/>
            <text x="129" y="132" text-anchor="middle" font-size="8" fill="#94a3b8">GND</text>
            <!-- ===== 运放缓冲 ===== -->
            <text x="240" y="30" text-anchor="middle" font-size="10" fill="#94a3b8">缓冲级</text>
            <!-- 运放三角形 -->
            <polygon points="218,56 218,84 250,70" fill="#f1f5f9" stroke="#334155" stroke-width="2"/>
            <text x="226" y="66" font-size="8" fill="#64748b">−</text>
            <text x="226" y="78" font-size="8" fill="#64748b">+</text>
            <!-- 运放输出线 -->
            <line x1="250" y1="70" x2="275" y2="70" stroke="#334155" stroke-width="2"/>
            <!-- ===== 第二级: 低通 ===== -->
            <text x="355" y="30" text-anchor="middle" font-size="10" fill="#94a3b8">第二级 · 低通 4.08 Hz</text>
            <!-- 结点圆点 -->
            <circle cx="275" cy="70" r="2.5" fill="#334155"/>
            <!-- R2 向上分支 -->
            <line x1="275" y1="70" x2="275" y2="55" stroke="#334155" stroke-width="2"/>
            <!-- R2 (水平矩形, 向上分支) -->
            <rect x="268" y="37" width="14" height="18" fill="none" stroke="#334155" stroke-width="2" rx="1"/>
            <text x="258" y="48" text-anchor="end" font-size="11" fill="#2563eb" font-weight="600">R₂</text>
            <text x="258" y="60" text-anchor="end" font-size="9.5" fill="#64748b">390 kΩ</text>
            <!-- R2 → 输出线 -->
            <line x1="275" y1="37" x2="275" y2="30" stroke="#334155" stroke-width="2"/>
            <line x1="275" y1="30" x2="420" y2="30" stroke="#334155" stroke-width="2"/>
            <line x1="420" y1="30" x2="420" y2="70" stroke="#334155" stroke-width="2"/>
            <!-- C2 向下分支到 GND -->
            <line x1="275" y1="70" x2="275" y2="95" stroke="#334155" stroke-width="2"/>
            <!-- C2 (平行板) -->
            <line x1="264" y1="95" x2="286" y2="95" stroke="#334155" stroke-width="2.5"/>
            <line x1="264" y1="101" x2="286" y2="101" stroke="#334155" stroke-width="2.5"/>
            <text x="296" y="100" font-size="11" fill="#2563eb" font-weight="600">C₂</text>
            <text x="296" y="112" font-size="9.5" fill="#64748b">0.1 μF</text>
            <!-- C2 → GND -->
            <line x1="275" y1="101" x2="275" y2="120" stroke="#334155" stroke-width="1.5"/>
            <!-- GND 符号 -->
            <line x1="267" y1="120" x2="283" y2="120" stroke="#334155" stroke-width="2"/>
            <line x1="270" y1="124" x2="280" y2="124" stroke="#334155" stroke-width="1.5"/>
            <line x1="273" y1="128" x2="277" y2="128" stroke="#334155" stroke-width="1"/>
            <!-- 输出线 → OUT -->
            <line x1="420" y1="70" x2="450" y2="70" stroke="#334155" stroke-width="2"/>
            <!-- OUT 端子 -->
            <circle cx="450" cy="70" r="3.5" fill="#e94560"/>
            <text x="450" y="90" text-anchor="middle" font-size="10" fill="#64748b">OUT</text>
            <text x="465" y="66" font-size="10" fill="#334155">Vout</text>
            <!-- 参数标注 -->
            <text x="250" y="158" text-anchor="middle" font-size="10" fill="#64748b">
              高通 f_c = 1/(2πR₁C₁) ≈ 0.48 Hz  ·  低通 f_c = 1/(2πR₂C₂) ≈ 4.08 Hz  ·  通带 0.5 – 4 Hz
            </text>
          </svg>
        </div>
      </div>
    </section>

    <!-- ============ 2. 连接控制 ============ -->
    <section class="card mb-3">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <div class="status-dot" :class="connected ? 'connected' : 'disconnected'"></div>
          <span class="text-[14px] font-medium" :class="connected ? 'text-green-600' : 'text-gray-500'">
            {{ statusText }}
          </span>
        </div>
        <div>
          <button
            class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            :class="
              !serialSupported
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : connected
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
            "
            :disabled="!serialSupported"
            @click="toggleConnect"
          >
            {{ connected ? '断开连接' : '连接串口' }}
          </button>
          <p v-if="!serialSupported" class="text-xs text-red-500 mt-2">
            当前浏览器不支持 Web Serial API，请使用 Chrome 或 Edge 浏览器访问
          </p>
        </div>
      </div>
    </section>

    <!-- ============ 3. 数据概览（BPM + ADC + 电压） ============ -->
    <section class="card mb-3">
      <div class="grid grid-cols-3 gap-4">
        <div class="info-item">
          <div class="bpm-value" :class="{ pulse: connected }">
            {{ bpm === null ? '--' : bpm }}
          </div>
          <div class="info-label">BPM (每分钟心跳)</div>
        </div>
        <div class="info-item">
          <div class="info-value">{{ adcValue === null ? '--' : adcValue }}</div>
          <div class="info-label">ADC 原始值</div>
        </div>
        <div class="info-item">
          <div class="info-value">{{ voltageValue }}</div>
          <div class="info-label">电压 (V)</div>
        </div>
      </div>
    </section>

    <!-- ============ 4. 波形图 ============ -->
    <section class="card mb-3">
      <h3 class="sec-title mb-2">脉搏波形 (滤波后)</h3>
      <div ref="chartRef" class="w-full" style="height: 260px"></div>
    </section>

    <!-- ============ 5. 串口日志 ============ -->
    <section class="card mb-3">
      <h3 class="sec-title mb-2">串口数据日志</h3>
      <div class="log-area" ref="logRef">
        <div v-for="(log, idx) in logs" :key="idx" class="log-line">{{ log }}</div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'

// ============ 状态 ============
const connected = ref(false)
const statusText = ref('未连接')
const bpm = ref(null)
const adcValue = ref(null)
const voltageValue = ref('--')
const logs = ref([])
const serialSupported = ref(false) // 是否支持Web Serial API

// ============ 串口变量 ============
let port = null
let reader = null
let keepReading = false

// ============ ECharts 变量 ============
const chartRef = ref(null)
const logRef = ref(null)
let chart = null
const maxPoints = 300 // 300个点，每个100ms = 30秒
let waveformData = []
let timeLabels = []

// 初始化时间标签：从左到右是 30s前 → 现在
function initTimeLabels() {
  timeLabels = []
  for (let i = 0; i < maxPoints; i++) {
    // 每50个点显示一个刻度（对应5秒）
    // 位置：0, 50, 100, 150, 200, 250, 299
    if (i === 0 || i === 50 || i === 100 || i === 150 || i === 200 || i === 250 || i === maxPoints - 1) {
      const secFromNow = Math.round((maxPoints - 1 - i) * 0.1)
      timeLabels.push(secFromNow + 's')
    } else {
      timeLabels.push('')
    }
  }
}

// ============ BPM 计算 ============
const hrWindowSize = 100
let hrBuffer = []
let lastPeakTime = 0
let peakDetected = false

// 3 秒窗口: 收集瞬时 BPM, 去异常后取中位数
const bpmWindowMs = 3000
let bpmCollectBuffer = []   // 3 秒内的瞬时 BPM
let bpmUpdateTimer = null   // 定时刷新显示
let lastValidBpm = null     // 上一次有效 BPM (无数据时保持)
let lastInstantBpm = null   // 上一次被接受的瞬时 BPM (用于逐拍校验)
const bpmMaxJump = 30       // 相邻两次 BPM 差值超过此值视为异常

// ============ 有源 RC 带通数字滤波器 ============
// 等效选频网络 (替代无源 RLC,因亚赫兹频段 RLC 参数不现实)
// 高通: C₁=10μF, R₁=33kΩ → f_c≈0.48Hz
// 低通: R₂=390kΩ, C₂=0.1μF → f_c≈4.08Hz
// 双线性变换 (fs=100Hz) 得到两级级联 IIR 系数

// 高通级: H(z) = (b0 + b1·z⁻¹ + b2·z⁻²) / (1 + a1·z⁻¹)
const HP_B0 = 0.96874
const HP_B1 = -1.93748
const HP_B2 = 0.96874
const HP_A1 = -0.93748

// 低通级: H(z) = (b0 + b1·z⁻¹) / (1 + a1·z⁻¹)
const LP_B0 = 0.05814
const LP_B1 = 0.05814
const LP_A1 = -0.88372

let hpX1 = 0, hpX2 = 0, hpY1 = 0 // 高通状态
let lpX1 = 0, lpY1 = 0             // 低通状态

function applyRlcFilter(x) {
  // 第一级: 高通 (隔直, 去除 DC 基线和极低频漂移)
  const hp = HP_B0 * x + HP_B1 * hpX1 + HP_B2 * hpX2 - HP_A1 * hpY1
  hpX2 = hpX1; hpX1 = x; hpY1 = hp
  // 第二级: 低通 (滤除高频噪声: 工频干扰、电路噪声)
  const lp = LP_B0 * hp + LP_B1 * lpX1 - LP_A1 * lpY1
  lpX1 = hp; lpY1 = lp
  return lp
}

function resetRlcFilter() {
  hpX1 = 0; hpX2 = 0; hpY1 = 0
  lpX1 = 0; lpY1 = 0
}

// ============ 初始化图表 ============
function initChart() {
  if (!chartRef.value) return

  chart = echarts.init(chartRef.value)
  initTimeLabels()
  waveformData = new Array(maxPoints).fill(0)

  const option = {
    grid: {
      left: 50,
      right: 20,
      top: 20,
      bottom: 35,
    },
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLabel: {
        color: '#8a97ab',
        fontSize: 11,
        interval: 0, // 强制渲染全部标签(空标签不可见),避免末位 0s 刻度被默认间隔过滤
      },
      axisLine: {
        lineStyle: { color: '#cfd9e8' },
      },
    },
    yAxis: {
      type: 'value',
      min: 1948,
      max: 2148,
      axisLabel: {
        color: '#8a97ab',
        fontSize: 11,
        formatter: (val) => ((val * 3.3) / 4095).toFixed(2) + 'V',
      },
      splitLine: {
        lineStyle: { color: '#eaeef6' },
      },
    },
    series: [
      {
        data: waveformData,
        type: 'line',
        showSymbol: false,
        lineStyle: {
          color: '#e94560',
          width: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(233, 69, 96, 0.3)' },
              { offset: 1, color: 'rgba(233, 69, 96, 0)' },
            ],
          },
        },
      },
    ],
    animation: false, // 关闭动画，提高性能
  }

  chart.setOption(option)

  // 窗口resize
  window.addEventListener('resize', resizeChart)
}

function resizeChart() {
  if (chart) chart.resize()
}

// ============ 更新波形 ============
function updateChart() {
  if (!chart) return

  chart.setOption({
    series: [
      {
        data: waveformData,
      },
    ],
  })
}

// ============ BPM 计算 (适配零均值滤波信号) ============
function calculateBpm(filtered) {
  const now = Date.now()

  hrBuffer.push(filtered)
  if (hrBuffer.length > hrWindowSize) {
    hrBuffer.shift()
  }

  if (hrBuffer.length < hrWindowSize) return

  // 用窗口内最大绝对值的 50% 作为自适应阈值
  let maxAbs = 0
  for (let i = 0; i < hrBuffer.length; i++) {
    const a = Math.abs(hrBuffer[i])
    if (a > maxAbs) maxAbs = a
  }
  const threshold = maxAbs * 0.5
  if (threshold < 1) return // 信号太弱,跳过

  const prevVal = hrBuffer[hrBuffer.length - 2]
  if (!peakDetected && filtered > threshold && prevVal <= threshold) {
    peakDetected = true

    if (lastPeakTime > 0) {
      const interval = now - lastPeakTime
      if (interval > 300 && interval < 2000) {
        const instantBpm = Math.round(60000 / interval)
        // 逐拍校验: 与上一次瞬时 BPM 比较, 差值过大则丢弃 (传感器抖动)
        if (lastInstantBpm !== null && Math.abs(instantBpm - lastInstantBpm) > bpmMaxJump) {
          // 异常跳变, 不进入收集缓冲区
        } else {
          lastInstantBpm = instantBpm
          bpmCollectBuffer.push(instantBpm)
        }
      }
    }
    lastPeakTime = now
  }

  if (filtered < threshold * 0.4) {
    peakDetected = false
  }
}

// ============ 异常值剔除 (IQR 四分位距法) ============
// 传感器抖动/运动伪影可能产生远离主体分布的 BPM 跳变,
// IQR 法将超出 [Q1 - 1.5×IQR, Q3 + 1.5×IQR] 的值视为异常并剔除
function removeOutliers(arr) {
  if (arr.length <= 2) return [...arr]
  const sorted = [...arr].sort((a, b) => a - b)
  const n = sorted.length
  const q1Idx = (n - 1) * 0.25
  const q3Idx = (n - 1) * 0.75
  const q1 = sorted[Math.floor(q1Idx)] + (q1Idx % 1) * (sorted[Math.ceil(q1Idx)] - sorted[Math.floor(q1Idx)])
  const q3 = sorted[Math.floor(q3Idx)] + (q3Idx % 1) * (sorted[Math.ceil(q3Idx)] - sorted[Math.floor(q3Idx)])
  const iqr = q3 - q1
  const lo = q1 - 1.5 * iqr
  const hi = q3 + 1.5 * iqr
  return sorted.filter(v => v >= lo && v <= hi)
}

// ============ 3 秒定时处理: 去异常 → 中位数 → 更新显示 ============
function processBpmWindow() {
  if (bpmCollectBuffer.length === 0) {
    // 本窗口无有效峰值, 保持上次值不刷新
    return
  }
  const clean = removeOutliers(bpmCollectBuffer)
  bpmCollectBuffer = [] // 清空, 开始下一个 3 秒窗口

  if (clean.length === 0) {
    // 全部被判定为异常, 保持上次值
    return
  }
  // 中位数作为最终 BPM (比均值更抗残余异常值)
  clean.sort((a, b) => a - b)
  const mid = Math.floor(clean.length / 2)
  const median = clean.length % 2 !== 0
    ? clean[mid]
    : Math.round((clean[mid - 1] + clean[mid]) / 2)
  lastValidBpm = median
  bpm.value = median
}

function startBpmTimer() {
  stopBpmTimer()
  bpmUpdateTimer = setInterval(processBpmWindow, bpmWindowMs)
}

function stopBpmTimer() {
  if (bpmUpdateTimer) {
    clearInterval(bpmUpdateTimer)
    bpmUpdateTimer = null
  }
}

// ============ 添加日志 ============
function addLog(text) {
  const time = new Date().toLocaleTimeString()
  logs.value.push(`[${time}] ${text}`)
  if (logs.value.length > 100) {
    logs.value.shift()
  }
  // 自动滚动到底部
  nextTick(() => {
    if (logRef.value) {
      logRef.value.scrollTop = logRef.value.scrollHeight
    }
  })
}

// ============ 串口连接 ============
async function toggleConnect() {
  if (!serialSupported.value) {
    return
  }

  if (connected.value) {
    await disconnect()
    return
  }

  try {
    port = await navigator.serial.requestPort()
    await port.open({ baudRate: 115200 })

    // 清空之前的数据
    waveformData = new Array(maxPoints).fill(0)
    bpm.value = null
    adcValue.value = null
    voltageValue.value = '--'
    hrBuffer = []
    lastPeakTime = 0
    peakDetected = false
    bpmCollectBuffer = []
    lastValidBpm = null
    lastInstantBpm = null
    resetRlcFilter()
    startBpmTimer()

    connected.value = true
    statusText.value = '已连接，正在接收数据...'
    keepReading = true
    addLog('串口已连接，波特率 115200')
    updateChart()

    readLoop().catch((e) => {
      // 读取循环意外异常:恢复未连接状态,避免界面卡在「已连接」
      console.error('读取循环异常:', e)
      if (connected.value) {
        connected.value = false
        statusText.value = '连接已断开'
        port = null
        reader = null
        addLog('读取异常,连接已断开')
      }
    })
  } catch (e) {
    if (e?.name === 'NotFoundError') {
      // 用户在系统串口选择框中取消选择,保持未连接状态,不视为错误
      addLog('已取消选择串口')
      return
    }
    console.error('串口错误:', e)
    statusText.value = '连接失败'
    addLog('连接失败: ' + e.message)
  }
}

async function disconnect() {
  if (!port && !keepReading) return // 未连接/已清理:避免重复执行与冗余日志
  keepReading = false
  stopBpmTimer()
  // 先置断开状态再取消读取:readLoop 收尾时据此跳过「设备连接已断开」分支,避免双日志
  connected.value = false
  statusText.value = '未连接'
  if (reader) {
    try {
      await reader.cancel()
    } catch (e) {}
  }
  if (port) {
    try {
      await port.close()
    } catch (e) {}
  }
  port = null
  reader = null
  addLog('串口已断开')
}

// ============ 读取数据循环 ============
let sampleCounter = 0
const pointIntervalMs = 100 // 波形每点100ms
const sampleIntervalMs = 10 // 单片机10ms采样
const skipCount = Math.round(pointIntervalMs / sampleIntervalMs)

async function readLoop() {
  let buffer = ''
  const decoder = new TextDecoder()

  while (port && keepReading) {
    reader = port.readable.getReader()
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          // 读取结束（设备断开），退出循环
          keepReading = false
          break
        }

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('{')) {
            try {
              const data = JSON.parse(trimmed)
              const raw = data.adc
              const adc = Number(raw)
              // 字段缺失或非数值:忽略该帧,避免污染显示/波形/BPM
              if (raw === null || raw === undefined || !Number.isFinite(adc)) continue

              adcValue.value = adc
              voltageValue.value = ((adc * 3.3) / 4095).toFixed(2)

              // RC 带通滤波: 每个采样点都经过滤波器
              const filtered = applyRlcFilter(adc)

              // 计算BPM (使用滤波后信号,峰值更清晰)
              calculateBpm(filtered)

              // 抽稀存入波形：滤波后信号 × 增益 + DC偏置(2048)居中显示
              sampleCounter++
              if (sampleCounter >= skipCount) {
                sampleCounter = 0
                waveformData.push(filtered * 5 + 2048)
                if (waveformData.length > maxPoints) {
                  waveformData.shift()
                }
                updateChart()
              }

              // 写日志
              addLog(trimmed)
            } catch (e) {
              // 解析失败，忽略
            }
          }
        }
      }
    } catch (e) {
      // 读取中断(多为设备拔出/异常):记录日志,由下方收尾逻辑统一更新连接状态
      addLog('读取中断: ' + (e?.message || e))
      keepReading = false
      break
    } finally {
      if (reader) {
        try {
          reader.releaseLock()
        } catch (e) {}
      }
    }
  }

  // 连接断开后自动更新状态（设备拔出或异常断开）
  // 数据保留不清空，下次重新连接时才清空
  if (connected.value) {
    connected.value = false
    statusText.value = '连接已断开'
    port = null
    reader = null
    addLog('设备连接已断开')
  }
}

// ============ 生命周期 ============
onMounted(() => {
  // 检测是否支持Web Serial API
  serialSupported.value = 'serial' in navigator
  if (!serialSupported.value) {
    statusText.value = '浏览器不支持串口功能'
  }
  initChart()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart)
  disconnect()
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

<style scoped>
.hr-title {
  font-size: 22px;
  line-height: 1.4;
  margin-bottom: 10px;
}

/* 状态指示灯 */
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.status-dot.connected {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}
.status-dot.disconnected {
  background: #9ca3af;
}

/* BPM 显示 */
.bpm-value {
  font-size: 36px;
  font-weight: bold;
  color: #e94560;
  line-height: 1.2;
}
.bpm-value.pulse {
  animation: pulse 1s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* 数据信息 */
.info-item {
  text-align: center;
  padding: 6px 10px;
}
.info-value {
  font-size: 24px;
  color: #2563eb;
  font-weight: bold;
}
.info-label {
  font-size: 12px;
  color: #8a97ab;
  margin-top: 2px;
}

/* 日志区域 */
.log-area {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 10px;
  height: 140px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #4ecca3;
  line-height: 1.5;
}
.log-line {
  white-space: nowrap;
}
</style>
