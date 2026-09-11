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
      <h3 class="sec-title mb-2">脉搏波形</h3>
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
const bpmHistory = []
const bpmAvgCount = 5

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
      min: 0,
      max: 4095,
      axisLabel: {
        color: '#8a97ab',
        fontSize: 11,
        formatter: (val) => ((val * 3.3) / 4095).toFixed(1) + 'V',
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

// ============ BPM 计算 ============
function calculateBpm(adc) {
  const now = Date.now()

  hrBuffer.push(adc)
  if (hrBuffer.length > hrWindowSize) {
    hrBuffer.shift()
  }

  if (hrBuffer.length < hrWindowSize) return

  const avg = hrBuffer.reduce((a, b) => a + b, 0) / hrBuffer.length
  const threshold = avg + 100

  const prevVal = hrBuffer[hrBuffer.length - 2]
  if (!peakDetected && adc > threshold && prevVal <= threshold) {
    peakDetected = true

    if (lastPeakTime > 0) {
      const interval = now - lastPeakTime
      if (interval > 300 && interval < 2000) {
        const instantBpm = Math.round(60000 / interval)
        bpmHistory.push(instantBpm)
        if (bpmHistory.length > bpmAvgCount) {
          bpmHistory.shift()
        }
        bpm.value = Math.round(bpmHistory.reduce((a, b) => a + b, 0) / bpmHistory.length)
      }
    }
    lastPeakTime = now
  }

  if (adc < threshold - 80) {
    peakDetected = false
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
    bpmHistory.length = 0

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

              // 计算BPM
              calculateBpm(adc)

              // 抽稀存入波形：新数据从右边进来，往左推
              sampleCounter++
              if (sampleCounter >= skipCount) {
                sampleCounter = 0
                waveformData.push(adc)
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
