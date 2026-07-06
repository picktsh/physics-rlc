<template>
  <div>
    <!-- 参数区 -->
    <section class="card mb-4">
      <div class="flex flex-wrap items-center gap-2 sm:gap-3 p-2 sm:p-4 bg-gray-50 rounded-lg">
        <div class="flex items-center gap-1 text-xs sm:text-sm">
          <label class="font-semibold text-gray-700">R</label>
          <input type="number" v-model.number="R" step="1" min="0.1" class="w-14 sm:w-16 h-7 sm:h-8 border border-gray-300 rounded px-1 text-xs sm:text-sm text-center" />
          <span class="text-xs text-gray-500">Ω</span>
        </div>
        <div class="flex items-center gap-1 text-xs sm:text-sm">
          <label class="font-semibold text-gray-700">L</label>
          <input type="number" v-model.number="L_mH" step="0.1" min="0.01" class="w-14 sm:w-16 h-7 sm:h-8 border border-gray-300 rounded px-1 text-xs sm:text-sm text-center" />
          <span class="text-xs text-gray-500">mH</span>
        </div>
        <div class="flex items-center gap-1 text-xs sm:text-sm">
          <label class="font-semibold text-gray-700">C</label>
          <input type="number" v-model.number="C_uF" step="0.01" min="0.0001" class="w-14 sm:w-16 h-7 sm:h-8 border border-gray-300 rounded px-1 text-xs sm:text-sm text-center" />
          <span class="text-xs text-gray-500">μF</span>
        </div>
        <div class="flex items-center gap-1 text-xs sm:text-sm">
          <label class="font-semibold text-gray-700">Us</label>
          <input type="number" v-model.number="Us" step="0.1" min="0.1" class="w-14 sm:w-16 h-7 sm:h-8 border border-gray-300 rounded px-1 text-xs sm:text-sm text-center" />
          <span class="text-xs text-gray-500">V</span>
        </div>
        <div class="flex items-center gap-1 sm:gap-2 flex-1 min-w-[160px] sm:min-w-[200px]">
          <label class="font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">f</label>
          <input type="number" v-model.number="f" step="1" class="w-16 sm:w-20 h-7 sm:h-8 border border-gray-300 rounded px-1 text-xs sm:text-sm text-center" />
          <span class="text-xs text-gray-500">Hz</span>
          <input type="range" :min="freqMin" :max="freqMax" step="1" v-model.number="f" class="flex-1 min-w-[60px] cursor-pointer" />
          <span class="text-xs sm:text-sm font-semibold text-indigo-600 min-w-[70px] sm:min-w-[80px] text-right">{{ t4(f) }} Hz</span>
        </div>
        <button @click="searchResonance" class="w-full sm:w-auto px-3 sm:px-5 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:shadow-lg transition-all">🔍 搜索谐振</button>
      </div>
    </section>

    <!-- 图表区：2列布局 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <!-- ===== 行1列1: UL/UC 波形 ===== -->
      <div class="card flex flex-col h-full">
        <div class="card-hd flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-lg">
          <span class="text-sm font-semibold text-gray-800">📊 UL / UC 双通道时域波形</span>
          <span class="text-xs text-gray-500">谐振时两波形峰值相等·相位相反</span>
        </div>
        <div class="p-3 space-y-3 flex-1 flex flex-col">
          <div>
            <div class="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-1">
              <span class="inline-block w-2.5 h-2.5 rounded-full" style="background:#e8633a"></span>电感电压 U<sub>L</sub>
            </div>
            <canvas ref="ulCanvasRef" class="w-full border border-gray-100 rounded" style="height:130px"></canvas>
          </div>
          <div>
            <div class="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-1">
              <span class="inline-block w-2.5 h-2.5 rounded-full" style="background:#3b82f6"></span>电容电压 U<sub>C</sub>
            </div>
            <canvas ref="ucCanvasRef" class="w-full border border-gray-100 rounded" style="height:130px"></canvas>
          </div>
          <div class="mt-auto space-y-3">
            <div ref="resGainRef" class="text-xs font-semibold text-center text-green-700 bg-green-50 rounded p-2"></div>
            <div class="flex items-center gap-2">
              <button @click="toggleNoiseScan" :class="['flex-1 py-2 rounded-lg text-sm font-semibold transition-all', isNoiseScanning ? 'bg-red-500 text-white hover:bg-red-600' : noiseEnabled ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300']">
                {{ isNoiseScanning ? '⏹ 停止噪声扫描' : noiseEnabled ? '📊 噪声模式已开启' : '🔊 开启噪声' }}
              </button>
              <span v-if="noiseEnabled" class="text-xs text-amber-600 font-semibold whitespace-nowrap">±0.5% 随机误差</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 行1列2: 李萨如图 (UL vs UC) ===== -->
      <section class="card flex flex-col h-full">
        <div class="card-hd flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-lg">
          <span class="text-sm font-semibold text-gray-800">🟢 李萨如图 (UL–UC XY 轨迹)</span>
        </div>
        <div class="text-xs text-gray-600 px-4 pt-3 pb-1 bg-gray-50 border-b border-gray-200">
          示波器·李萨如图 ( X轴：<strong>U<sub>L</sub></strong> 电感电压 | Y轴：<strong>U<sub>C</sub></strong> 电容电压 )
        </div>
        <div class="flex justify-center p-3 bg-gray-50 flex-1 flex items-center">
          <canvas ref="xyULUCCanvasRef" class="w-full max-w-[360px] aspect-square border border-gray-200 rounded" style="height:360px"></canvas>
        </div>
        <div ref="ulucLissajousStatusRef" class="text-sm font-semibold text-center py-2 transition-all">UL / UC 振幅比 = —</div>
      </section>

      <!-- ===== 行2列1: 幅频特性曲线 ===== -->
      <section class="card flex flex-col h-full">
        <div class="card-hd flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-lg">
          <span class="text-sm font-semibold text-gray-800">📈 辅助 · 幅频特性曲线 ( f–I )</span>
          <span class="text-xs text-gray-500">峰值点对应 UL=UC 谐振频率</span>
        </div>
        <div class="p-3 bg-gray-50 flex-1 flex items-center">
          <canvas ref="ampCanvasRef" class="w-full border border-gray-200 rounded" style="height:380px" @click="handleAmpClick"></canvas>
        </div>
        <div class="flex justify-center gap-6 px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs flex-wrap">
          <span><span class="text-gray-500">f₀ = </span><span ref="mF0Ref" class="font-semibold text-gray-800">—</span></span>
          <span><span class="text-gray-500">Δf = </span><span ref="mDfRef" class="font-semibold text-gray-800">—</span></span>
          <span><span class="text-gray-500">Q = </span><span ref="mQRef" class="font-semibold text-gray-800">—</span><span ref="mQLabelRef" class="ml-1 font-semibold text-green-600"></span></span>
        </div>
      </section>

      <!-- ===== 行2列2: 李萨如图 (Us vs Ur) ===== -->
      <div class="card flex flex-col h-full">
        <div class="card-hd flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-lg">
          <span class="text-sm font-semibold text-gray-800">🔵 李萨如图 (Us-Ur XY 轨迹)</span>
        </div>
        <div class="text-xs text-gray-600 px-4 pt-3 pb-1 bg-gray-50 border-b border-gray-200">
          示波器·李萨如图 ( X轴：<strong>Us</strong> 回路激励总电压 | Y轴：<strong>Ur</strong> 电阻分压，等效表征回路电流 )
        </div>
        <div class="flex justify-center p-3 bg-gray-50 flex-1 flex items-center">
          <canvas ref="xyCanvasRef" class="w-full max-w-[360px] aspect-square border border-gray-200 rounded" style="height:360px"></canvas>
        </div>
        <div ref="phaseStatusRef" class="text-sm font-semibold text-center py-2 transition-all">相位差 φ = 0.0° | 待计算</div>
        <div ref="qHintRef" class="hidden text-xs text-gray-600 text-center px-4 pb-2 leading-relaxed"></div>
      </div>
    </div>

    <!-- 操作控制 -->
    <section class="card mb-4">
      <div class="card-hd flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <span class="text-xs sm:text-sm font-semibold text-gray-800">🎛️ 操作控制</span>
      </div>
      <div class="flex flex-wrap items-center gap-2 sm:gap-3 p-2 sm:p-3">
        <button @click="autoScan" class="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:shadow-lg transition-all">{{ isScanning ? '⏹️ 停止' : '🔄 自动扫频' }}</button>
        <button @click="exportCSV" class="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm hover:bg-gray-300 transition-all">📥 导出CSV</button>
        <button @click="clearData" class="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-50 text-red-600 rounded-lg text-xs sm:text-sm hover:bg-red-100 transition-all">🗑️ 清空</button>
        <span class="text-xs sm:text-sm text-gray-600">阈值</span>
        <input type="number" v-model.number="threshold" step="1" min="5" max="20" class="w-12 sm:w-14 h-7 sm:h-8 border border-gray-300 rounded px-1 text-xs sm:text-sm text-center" />
        <span class="text-xs text-gray-500">%</span>
      </div>
    </section>

    <!-- 底部: 数据表格 + 实时面板 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <!-- 数据表格 -->
      <div class="card">
        <div class="card-hd flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-lg">
          <span class="text-xs sm:text-sm font-semibold text-gray-800">📋 实验数据记录</span>
          <span class="text-xs text-gray-500 hide-on-mobile">UL、UC 幅值对比支撑谐振判定</span>
        </div>
        <div class="max-h-72 overflow-y-auto overflow-x-auto table-responsive">
          <table class="text-xs border-collapse">
            <thead>
              <tr class="bg-gray-50 sticky top-0">
                <th class="border border-gray-200 px-1.5 sm:px-2 py-1.5">#</th>
                <th class="border border-gray-200 px-1.5 sm:px-2 py-1.5">f (Hz)</th>
                <th class="border border-gray-200 px-1.5 sm:px-2 py-1.5">I (mA)</th>
                <th class="border border-gray-200 px-1.5 sm:px-2 py-1.5">U<sub>L</sub> (V)</th>
                <th class="border border-gray-200 px-1.5 sm:px-2 py-1.5">U<sub>C</sub> (V)</th>
                <th class="border border-gray-200 px-1.5 sm:px-2 py-1.5 hide-on-mobile">|Z| (Ω)</th>
                <th class="border border-gray-200 px-1.5 sm:px-2 py-1.5 hide-on-mobile">φ (°)</th>
                <th class="border border-gray-200 px-1.5 sm:px-2 py-1.5 hide-on-mobile">Q</th>
              </tr>
            </thead>
            <tbody id="lcTableBody">
              <tr v-if="collected.length === 0">
                <td colspan="8" class="text-center text-gray-400 py-8 text-xs">暂无数据，请采集</td>
              </tr>
              <tr v-for="(d, idx) in collected" :key="idx" :class="{ 'bg-green-50 font-semibold text-green-800': Math.abs(d.f - f0) < 1e-4 }">
                <td class="border border-gray-200 px-1.5 sm:px-2 py-1.5 text-center">{{ idx + 1 }}</td>
                <td class="border border-gray-200 px-1.5 sm:px-2 py-1.5 text-center">{{ t4(d.f) }}{{ Math.abs(d.f - f0) < 1e-4 ? ' ⭐' : '' }}</td>
                <td class="border border-gray-200 px-1.5 sm:px-2 py-1.5 text-center">{{ t4(d.I * 1e3) }}</td>
                <td class="border border-gray-200 px-1.5 sm:px-2 py-1.5 text-center">{{ t4(d.UL) }}</td>
                <td class="border border-gray-200 px-1.5 sm:px-2 py-1.5 text-center">{{ t4(d.UC) }}</td>
                <td class="border border-gray-200 px-1.5 sm:px-2 py-1.5 text-center hide-on-mobile">{{ t4(d.Z) }}</td>
                <td class="border border-gray-200 px-1.5 sm:px-2 py-1.5 text-center hide-on-mobile">{{ t4(d.phi * 180 / Math.PI) }}</td>
                <td class="border border-gray-200 px-1.5 sm:px-2 py-1.5 text-center hide-on-mobile">{{ d.Q !== undefined ? t4(d.Q) : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 实时面板 -->
      <div class="card">
        <div class="card-hd flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-lg">
          <span class="text-xs sm:text-sm font-semibold text-gray-800">📊 实时数据面板</span>
          <span class="text-xs text-gray-500 hide-on-mobile">UL/UC 幅值 + 李萨如相位协同判定</span>
        </div>
        <div class="p-4 space-y-2">
          <template v-if="selectedPoint">
            <div class="text-xs text-indigo-600 font-semibold mb-2 flex items-center gap-2">
              📌 已选中采集点 f = {{ t4(selectedPoint.f) }} Hz
              <button @click="selectedPoint = null; drawAmpChart()" class="text-xs text-gray-400 hover:text-red-500 ml-auto">✕ 取消</button>
            </div>
            <div class="flex gap-6 py-1.5 border-b border-dashed border-gray-100 text-sm">
              <span class="text-gray-500">回路电流 I</span><span class="font-semibold text-gray-800">{{ t4(selectedPoint.I * 1e3) }} mA</span>
            </div>
            <div class="flex gap-6 py-1.5 border-b border-dashed border-gray-100 text-sm">
              <span class="text-gray-500">总阻抗 |Z|</span><span class="font-semibold text-gray-800">{{ t4(selectedPoint.Z) }} Ω</span>
            </div>
            <div class="flex gap-6 py-1.5 border-b border-dashed border-gray-100 text-sm">
              <span class="text-gray-500">相位差 φ</span><span class="font-semibold text-gray-800">{{ t4(selectedPoint.phi * 180 / Math.PI) }}°</span>
            </div>
            <div class="flex gap-6 py-1.5 border-b border-dashed border-gray-100 text-sm">
              <span class="text-gray-500">Ur 有效值</span><span class="font-semibold text-gray-800">{{ t4(selectedPoint.I * R / 1000 / Math.SQRT2) }} V</span>
            </div>
            <div class="border-t border-dashed border-gray-200 my-1"></div>
            <div class="flex gap-6 py-1.5 border-b border-dashed border-gray-100 text-sm">
              <span class="text-gray-500">UL 有效值</span><span class="font-semibold text-gray-800">{{ t4(selectedPoint.UL / Math.SQRT2) }} V</span>
            </div>
            <div class="flex gap-6 py-1.5 border-b border-dashed border-gray-100 text-sm">
              <span class="text-gray-500">UC 有效值</span><span class="font-semibold text-gray-800">{{ t4(selectedPoint.UC / Math.SQRT2) }} V</span>
            </div>
            <div class="flex gap-6 py-1.5 text-sm">
              <span class="text-gray-500 font-semibold">UL / UC 谐振判定</span>
              <span :class="['font-semibold', selUlucClass]">{{ selUlucText }}</span>
            </div>
          </template>
          <template v-else>
            <div class="flex gap-6 py-1.5 border-b border-dashed border-gray-100 text-sm">
              <span class="text-gray-500">回路电流 I</span><span class="font-semibold text-gray-800">{{ t4(I_peak * 1e3) }} mA</span>
            </div>
            <div class="flex gap-6 py-1.5 border-b border-dashed border-gray-100 text-sm">
              <span class="text-gray-500">总阻抗 |Z|</span><span class="font-semibold text-gray-800">{{ t4(Z) }} Ω</span>
            </div>
            <div class="flex gap-6 py-1.5 border-b border-dashed border-gray-100 text-sm">
              <span class="text-gray-500">相位差 φ</span><span class="font-semibold text-gray-800">{{ t4(phi * 180 / Math.PI) }}°</span>
            </div>
            <div class="flex gap-6 py-1.5 border-b border-dashed border-gray-100 text-sm">
              <span class="text-gray-500">Ur 有效值</span><span class="font-semibold text-gray-800">{{ t4(Ur_peak / Math.SQRT2) }} V</span>
            </div>
            <div class="border-t border-dashed border-gray-200 my-1"></div>
            <div class="flex gap-6 py-1.5 border-b border-dashed border-gray-100 text-sm">
              <span class="text-gray-500">UL 有效值</span><span class="font-semibold text-gray-800">{{ t4(UL_peak / Math.SQRT2) }} V</span>
            </div>
            <div class="flex gap-6 py-1.5 border-b border-dashed border-gray-100 text-sm">
              <span class="text-gray-500">UC 有效值</span><span class="font-semibold text-gray-800">{{ t4(UC_peak / Math.SQRT2) }} V</span>
            </div>
            <div class="flex gap-6 py-1.5 text-sm">
              <span class="text-gray-500 font-semibold">UL / UC 谐振判定</span>
              <span :class="['font-semibold', ulucClass]">{{ ulucText }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 误差分析 -->
    <section class="card mb-4">
      <div class="card-hd flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <span class="text-sm font-semibold text-gray-800">📉 误差分析 · 数据预处理</span>
      </div>
      <div class="p-4">
        <div class="flex gap-4 flex-wrap text-xs mb-3">
          <span class="bg-gray-100 px-3 py-1.5 rounded">总采集 <strong class="text-indigo-600">{{ collected.length }}</strong></span>
          <span class="bg-gray-100 px-3 py-1.5 rounded">有效保留 <strong class="text-indigo-600">{{ validData.length }}</strong></span>
          <span class="bg-gray-100 px-3 py-1.5 rounded">剔除异常 <strong class="text-red-600">{{ rejectedData.length }}</strong></span>
          <span class="bg-gray-100 px-3 py-1.5 rounded">平均误差 <strong class="text-indigo-600">{{ collected.length ? t4(avgErr) + '%' : '—' }}</strong></span>
          <span class="bg-gray-100 px-3 py-1.5 rounded">最大误差 <strong class="text-red-600">{{ maxErr > 0 ? t4(maxErr) + '%' : '—' }}</strong></span>
        </div>
        <div class="max-h-28 overflow-y-auto mb-2">
          <table v-if="rejectedData.length > 0" class="w-full text-xs border-collapse">
            <thead>
              <tr class="bg-red-50 sticky top-0">
                <th class="border border-red-200 px-2 py-1 text-red-800">#</th>
                <th class="border border-red-200 px-2 py-1 text-red-800">f (Hz)</th>
                <th class="border border-red-200 px-2 py-1 text-red-800">I实测 (mA)</th>
                <th class="border border-red-200 px-2 py-1 text-red-800">I理论 (mA)</th>
                <th class="border border-red-200 px-2 py-1 text-red-800">误差%</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in rejectedData" :key="i">
                <td class="border border-red-100 px-2 py-1 text-center">{{ i + 1 }}</td>
                <td class="border border-red-100 px-2 py-1 text-center">{{ t4(p.f) }}</td>
                <td class="border border-red-100 px-2 py-1 text-center">{{ t4(p.I * 1e3) }}</td>
                <td class="border border-red-100 px-2 py-1 text-center">{{ t4(p.theoryI * 1e3) }}</td>
                <td class="border border-red-100 px-2 py-1 text-center">{{ p.err.toFixed(2) }}%</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="text-center text-gray-400 py-4 text-xs">无剔除数据，所有采集点均在阈值内</div>
        </div>
        <div class="text-xs text-amber-800 bg-amber-50 rounded px-3 py-2 leading-relaxed">{{ analysisText }}</div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

// ---- 参数状态 ----
const R = ref(100)
const L_mH = ref(100)
const C_uF = ref(0.05)
const Us = ref(0.9)
const f = ref(2250.7)
const threshold = ref(10)
const isScanning = ref(false)
const isNoiseScanning = ref(false)
const noiseEnabled = ref(false)
const freqMin = ref(100)
const freqMax = ref(10000)

// ---- 计算状态 ----
const L_H = ref(0)
const C_F = ref(0)
const Z = ref(0)
const I_peak = ref(0)
const Ur_peak = ref(0)
const UL_peak = ref(0)
const UC_peak = ref(0)
const phi = ref(0)
const f0 = ref(0)

// ---- 数据 ----
const sweepData = ref([])
const collected = ref([])
const validData = ref([])
const selectedPoint = ref(null)
const rejectedData = ref([])
const avgErr = ref(0)
const maxErr = ref(0)
const analysisText = ref('等待采集数据分析...')

// ---- 动画 ----
let cursorAngle = 0
let animId = null

// ---- Canvas refs ----
const ulCanvasRef = ref(null)
const ucCanvasRef = ref(null)
const xyCanvasRef = ref(null)
const xyULUCCanvasRef = ref(null)
const ampCanvasRef = ref(null)
const resGainRef = ref(null)
const phaseStatusRef = ref(null)
const qHintRef = ref(null)
const ulucLissajousStatusRef = ref(null)
const mF0Ref = ref(null)
const mDfRef = ref(null)
const mQRef = ref(null)
const mQLabelRef = ref(null)

// ---- 工具函数 ----
const t4 = (x) => x.toFixed(4)
const clamp = (v, l, h) => Math.min(h, Math.max(l, v))

// 绘制红色五角星
function drawStar(ctx, x, y, r, color) {
  ctx.save()
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 10
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

// ---- 电路计算 ----
function calcResonantFreq() {
  return 1 / (2 * Math.PI * Math.sqrt(L_H.value * C_F.value))
}

function calcCircuit(freq) {
  const ω = 2 * Math.PI * freq
  const XL = ω * L_H.value
  const XC = 1 / (ω * C_F.value)
  const d = XL - XC
  const impedance = Math.sqrt(R.value * R.value + d * d)
  const Ip = Us.value / impedance
  return {
    Z: impedance,
    I_peak: Ip,
    Ur_peak: Ip * R.value,
    UL_peak: Ip * XL,
    UC_peak: Ip * XC,
    phi: Math.atan2(d, R.value),
    Q: Math.sqrt(L_H.value / C_F.value) / R.value,
    freq
  }
}

function calcAll() {
  L_H.value = L_mH.value / 1e3
  C_F.value = C_uF.value * 1e-6
  f0.value = calcResonantFreq()
  const result = calcCircuit(f.value)
  Z.value = result.Z
  I_peak.value = result.I_peak
  Ur_peak.value = result.Ur_peak
  UL_peak.value = result.UL_peak
  UC_peak.value = result.UC_peak
  phi.value = result.phi
}

// ---- 波形绘制 ----
function drawWaveform(ctx, w, h, amp, phaseOffset, color) {
  ctx.clearRect(0, 0, w, h)
  const mL = 70, pw = w - mL - 12, ph = h - 34
  const sc = ph * 0.45 / Math.max(UL_peak.value, UC_peak.value, 0.001)
  const mid = 22 + ph / 2

  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(mL, mid)
  ctx.lineTo(mL + pw, mid)
  ctx.stroke()

  const N = Math.floor(pw)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const v = amp * Math.sin(2 * Math.PI * i / N * 2.5 - phi.value + phaseOffset)
    const x = mL + i / N * pw
    const y = mid - v * sc
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()

  const py = mid - amp * sc
  const ny = mid + amp * sc
  ctx.setLineDash([3, 4])
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.35
  ctx.beginPath()
  ctx.moveTo(mL, py)
  ctx.lineTo(mL + pw, py)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(mL, ny)
  ctx.lineTo(mL + pw, ny)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1

  ctx.fillStyle = '#64748b'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(t4(amp) + 'V', mL - 4, py)
  ctx.fillText('-' + t4(amp) + 'V', mL - 4, ny)
  ctx.fillText('0', mL - 4, mid)
}

function drawULUC() {
  const canvas = ulCanvasRef.value
  if (!canvas) return
  const rect = canvas.parentElement.getBoundingClientRect()
  canvas.width = rect.width * (window.devicePixelRatio || 1)
  canvas.height = 130 * (window.devicePixelRatio || 1)
  canvas.style.height = '130px'
  const ctx = canvas.getContext('2d')
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
  drawWaveform(ctx, rect.width, 130, UL_peak.value, Math.PI / 2, '#e8633a')

  const canvas2 = ucCanvasRef.value
  if (!canvas2) return
  const rect2 = canvas2.parentElement.getBoundingClientRect()
  canvas2.width = rect2.width * (window.devicePixelRatio || 1)
  canvas2.height = 130 * (window.devicePixelRatio || 1)
  canvas2.style.height = '130px'
  const ctx2 = canvas2.getContext('2d')
  ctx2.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
  drawWaveform(ctx2, rect2.width, 130, UC_peak.value, -Math.PI / 2, '#3b82f6')
}

// ---- 李萨如图 ----
function drawLissajous() {
  const canvas = xyCanvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const size = Math.min(rect.width, rect.height)
  canvas.width = size * dpr
  canvas.height = size * dpr
  canvas.style.width = size + 'px'
  canvas.style.height = size + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const cx = size / 2, cy = size / 2
  const ds = size / 2 - 44
  const ma = Math.max(Us.value, Ur_peak.value, 0.001)
  const s = ds / ma

  ctx.fillStyle = '#1a1f2e'
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = '#252d3d'
  ctx.lineWidth = 0.5
  ctx.strokeRect(cx - ds, cy - ds, ds * 2, ds * 2)
  for (let i = 0; i <= 10; i++) {
    const x = cx - ds + ds * 2 * i / 10
    ctx.beginPath()
    ctx.moveTo(x, cy - ds)
    ctx.lineTo(x, cy + ds)
    ctx.stroke()
    const y = cy - ds + ds * 2 * i / 10
    ctx.beginPath()
    ctx.moveTo(cx - ds, y)
    ctx.lineTo(cx + ds, y)
    ctx.stroke()
  }

  ctx.strokeStyle = '#354055'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx, cy - ds)
  ctx.lineTo(cx, cy + ds)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - ds, cy)
  ctx.lineTo(cx + ds, cy)
  ctx.stroke()

  ctx.fillStyle = '#6a7a8a'
  ctx.font = '11px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('X：Us 激励电压', cx, cy + ds + 6)
  ctx.save()
  ctx.fillStyle = '#6a7a8a'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.translate(cx - ds - 8, cy)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Y：Ur 等效回路电流', 0, 0)
  ctx.restore()

  ctx.fillStyle = '#5a6a7a'
  ctx.font = '10px system-ui'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText('O', cx - 3, cy + 3)

  // Lissajous curve
  ctx.beginPath()
  for (let i = 0; i <= 300; i++) {
    const th = i / 300 * 2 * Math.PI
    const px = cx + Math.sin(th) * s * Us.value
    const py = cy - Math.sin(th - phi.value) * s * Ur_peak.value
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.strokeStyle = '#36d1dc'
  ctx.lineWidth = 2.5
  ctx.stroke()

  // cursor dot
  const gx = cx + Math.sin(cursorAngle) * s * Us.value
  const gy = cy - Math.sin(cursorAngle - phi.value) * s * Ur_peak.value
  ctx.fillStyle = '#76ffd8'
  ctx.shadowColor = '#76ffd8'
  ctx.shadowBlur = 14
  ctx.beginPath()
  ctx.arc(gx, gy, 4, 0, 2 * Math.PI)
  ctx.fill()
  ctx.shadowBlur = 0
}

// ---- 李萨如图 (UL vs UC) ----
function drawLissajousULUC() {
  const canvas = xyULUCCanvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const size = Math.min(rect.width, rect.height)
  canvas.width = size * dpr
  canvas.height = size * dpr
  canvas.style.width = size + 'px'
  canvas.style.height = size + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const cx = size / 2, cy = size / 2
  const ds = size / 2 - 44
  const ma = Math.max(UL_peak.value, UC_peak.value, 0.001)
  const s = ds / ma

  ctx.fillStyle = '#1a1f2e'
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = '#252d3d'
  ctx.lineWidth = 0.5
  ctx.strokeRect(cx - ds, cy - ds, ds * 2, ds * 2)
  for (let i = 0; i <= 10; i++) {
    const x = cx - ds + ds * 2 * i / 10
    ctx.beginPath()
    ctx.moveTo(x, cy - ds)
    ctx.lineTo(x, cy + ds)
    ctx.stroke()
    const y = cy - ds + ds * 2 * i / 10
    ctx.beginPath()
    ctx.moveTo(cx - ds, y)
    ctx.lineTo(cx + ds, y)
    ctx.stroke()
  }

  ctx.strokeStyle = '#354055'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx, cy - ds)
  ctx.lineTo(cx, cy + ds)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - ds, cy)
  ctx.lineTo(cx + ds, cy)
  ctx.stroke()

  // X轴标签：UL
  ctx.fillStyle = '#6a7a8a'
  ctx.font = '11px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('X：Uₗ 电感电压', cx, cy + ds + 6)
  ctx.save()
  ctx.fillStyle = '#6a7a8a'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.translate(cx - ds - 8, cy)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Y：Uᴄ 电容电压', 0, 0)
  ctx.restore()

  ctx.fillStyle = '#5a6a7a'
  ctx.font = '10px system-ui'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText('O', cx - 3, cy + 3)

  // Lissajous curve: UL vs UC
  // UL = UL_peak * sin(θ + π/2) = UL_peak * cos(θ)
  // UC = UC_peak * sin(θ - π/2) = -UC_peak * cos(θ)
  // UL与UC相位差180°，canvas Y轴翻转后显示为正斜率
  ctx.beginPath()
  for (let i = 0; i <= 300; i++) {
    const th = i / 300 * 2 * Math.PI
    const px = cx + Math.sin(th + Math.PI / 2) * s * UL_peak.value
    const py = cy - Math.sin(th - Math.PI / 2) * s * UC_peak.value
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.strokeStyle = '#36d1dc'
  ctx.lineWidth = 2.5
  ctx.stroke()

  // cursor dot
  const gx = cx + Math.sin(cursorAngle + Math.PI / 2) * s * UL_peak.value
  const gy = cy - Math.sin(cursorAngle - Math.PI / 2) * s * UC_peak.value
  ctx.fillStyle = '#76ffd8'
  ctx.shadowColor = '#76ffd8'
  ctx.shadowBlur = 14
  ctx.beginPath()
  ctx.arc(gx, gy, 4, 0, 2 * Math.PI)
  ctx.fill()
  ctx.shadowBlur = 0

  // 更新UL/UC振幅比状态
  if (ulucLissajousStatusRef.value) {
    const ratio = UC_peak.value > 0.001
      ? (UL_peak.value / UC_peak.value)
      : 0
    const pd = phi.value * 180 / Math.PI
    const diff = Math.abs(UL_peak.value - UC_peak.value)
    let t, c, b
    if (diff < 0.001 || Math.abs(pd) < 3) {
      t = 'UL / UC = -' + t4(ratio) + ' ✅ 谐振状态（UL≈UC）'
      c = '#10b981'; b = '#ecfdf5'
    } else if (ratio > 1) {
      t = 'UL / UC = -' + t4(ratio) + ' ⚡ 感性失谐（UL与UC反相，|UL|>|UC|）'
      c = '#f59e0b'; b = '#fffbeb'
    } else {
      t = 'UL / UC = -' + t4(ratio) + ' 🔵 容性失谐（UL与UC反相，|UC|>|UL|）'
      c = '#3b82f6'; b = '#eff6ff'
    }
    ulucLissajousStatusRef.value.textContent = t
    ulucLissajousStatusRef.value.style.color = c
    ulucLissajousStatusRef.value.style.background = b
  }
}

// ---- 状态更新 ----
function updatePhaseStatus() {
  const pd = phi.value * 180 / Math.PI
  const a = Math.abs(pd)
  let t, c, b
  if (a < 3) {
    t = '相位差 φ = ' + t4(pd) + '° ✅ 谐振状态（φ≈0°，UL≈UC）'
    c = '#10b981'; b = '#ecfdf5'
  } else if (pd > 0) {
    t = '相位差 φ = ' + t4(pd) + '° ⚡ 感性失谐 — UL>UC, φ>0'
    c = '#f59e0b'; b = '#fffbeb'
  } else {
    t = '相位差 φ = ' + t4(pd) + '° 🔵 容性失谐 — UC>UL, φ<0'
    c = '#3b82f6'; b = '#eff6ff'
  }
  if (phaseStatusRef.value) {
    phaseStatusRef.value.textContent = t
    phaseStatusRef.value.style.color = c
    phaseStatusRef.value.style.background = b
  }
}

function updateResGain() {
  const q = Math.sqrt(L_H.value / C_F.value) / R.value
  if (resGainRef.value) {
    resGainRef.value.style.color = '#065f46'
    const extra = Math.abs(phi.value) < 1e-9 ? '' : '<span style="font-weight:400;font-size:11px;margin-left:8px;">【仅谐振点满足 UL=UC=Q·Us，失谐时放大倍数小于理论Q】</span>'
    resGainRef.value.innerHTML = '🔺 电压放大倍数 ≈ Q = ' + t4(q) + '（Us 的 ' + q.toFixed(1) + ' 倍）' + extra
  }
}

// ---- 幅频数据生成 ----
function generateSweepData(n) {
  const lo = f0.value - 800
  const hi = f0.value + 800
  const d = []
  for (let i = 0; i < n; i++) {
    const r = i / (n - 1)
    const freq = lo + (hi - lo) * r
    const c = calcCircuit(freq)
    d.push({ f: freq, I: c.I_peak, UL: c.UL_peak, UC: c.UC_peak, Z: c.Z, phi: c.phi })
  }
  const c0 = calcCircuit(f0.value)
  let idx = d.findIndex(p => p.f >= f0.value)
  if (idx < 0) idx = d.length
  d.splice(idx, 0, { f: f0.value, I: c0.I_peak, UL: c0.UL_peak, UC: c0.UC_peak, Z: c0.Z, phi: c0.phi })
  return d
}

// ---- 幅频图绘制 ----
function drawAmpChart() {
  const canvas = ampCanvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = 380 * dpr
  canvas.style.height = '380px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const W = rect.width, H = 380
  const mL = 50, pw = W - 70, ph = H - 46
  ctx.clearRect(0, 0, W, H)

  if (!sweepData.value.length) sweepData.value = generateSweepData(250)
  const data = sweepData.value
  if (data.length < 2) return

  let mi = 0
  data.forEach((p, i) => { if (p.I > data[mi].I) mi = i })
  const maxI = data[mi].I
  const Ih = maxI / Math.SQRT2
  const dm = maxI * 1.18

  let li = -1, ri = -1
  for (let i = mi - 1; i >= 0; i--) { if (data[i].I <= Ih) { li = i; break } }
  for (let i = mi + 1; i < data.length; i++) { if (data[i].I <= Ih) { ri = i; break } }

  const fL = li >= 0 ? data[li].f + (Ih - data[li].I) / (data[li + 1].I - data[li].I) * (data[li + 1].f - data[li].f) : data[0].f
  const fR = ri >= 0 ? data[ri - 1].f + (Ih - data[ri - 1].I) / (data[ri].I - data[ri - 1].I) * (data[ri].f - data[ri - 1].f) : data[data.length - 1].f
  const bw = fR > fL ? fR - fL : 0
  const fMn = data[0].f, fMx = data[data.length - 1].f
  const lm = Math.log10(fMn), lr = Math.log10(fMx) - lm
  const mx = (f) => mL + (Math.log10(f) - lm) / lr * pw
  const my = (v) => 18 + ph - (v / dm) * ph
  const yh = my(Ih)

  // grid
  ctx.strokeStyle = '#e8edf4'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 5; i++) {
    const y = 18 + i / 5 * ph
    ctx.beginPath(); ctx.moveTo(mL, y); ctx.lineTo(mL + pw, y); ctx.stroke()
  }
  for (let d = Math.ceil(lm); d <= Math.floor(Math.log10(fMx)); d++) {
    const ff = Math.pow(10, d)
    if (ff >= fMn && ff <= fMx) {
      const x = mx(ff)
      ctx.beginPath(); ctx.moveTo(x, 18); ctx.lineTo(x, 18 + ph); ctx.stroke()
    }
  }

  // border & labels
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1.5
  ctx.strokeRect(mL, 18, pw, ph)
  ctx.fillStyle = '#475569'
  ctx.font = '10px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('f (Hz)', mL + pw / 2, 18 + ph + 6)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.save()
  ctx.translate(14, 18 + ph / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('I (mA)', 0, 0)
  ctx.restore()

  // curve
  ctx.beginPath()
  data.forEach(p => ctx.lineTo(mx(p.f), my(p.I)))
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  ctx.stroke()

  // half power line
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(mL, yh)
  ctx.lineTo(mL + pw, yh)
  ctx.stroke()
  ctx.fillStyle = '#f59e0b'
  ctx.font = '9px system-ui'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText('Iₚ/√2', mL + 3, yh - 2)
  ctx.setLineDash([])

  // peak point
  const peakX = mx(data[mi].f)
  const peakY = my(maxI)
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(peakX, peakY, 4.5, 0, 2 * Math.PI)
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.stroke()
  // 红色五角星 — 只有扫频实际采集到谐振点后才显示
  const hasResonanceData = collected.value.some(p => Math.abs(p.f - f0.value) < 1)
  if (hasResonanceData) {
    drawStar(ctx, peakX, peakY - 16, 8, '#ff4757')
    ctx.fillStyle = '#ff4757'
    ctx.font = 'bold 10px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('★ 谐振', peakX, peakY - 24)
  }

  // bandwidth markers
  if (bw > 0) {
    ctx.fillStyle = '#3b82f6'
    ctx.beginPath(); ctx.arc(mx(fL), yh, 3.5, 0, 2 * Math.PI); ctx.fill()
    ctx.beginPath(); ctx.arc(mx(fR), yh, 3.5, 0, 2 * Math.PI); ctx.fill()
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 0.8
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(mx(fL), yh - 12)
    ctx.lineTo(mx(fR), yh - 12)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#3b82f6'
    ctx.font = '10px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('Δf=' + t4(bw) + 'Hz', (mx(fL) + mx(fR)) / 2, yh - 14)
  }

  const q = calcCircuit(f0.value)
  if (mF0Ref.value) mF0Ref.value.textContent = t4(f0.value) + ' Hz'
  if (mDfRef.value) mDfRef.value.textContent = t4(bw) + ' Hz'
  if (mQRef.value) mQRef.value.textContent = t4(q.Q)
  if (mQLabelRef.value) mQLabelRef.value.textContent = q.Q < 5 ? '低Q，选频差' : q.Q <= 15 ? '中高Q，选频良好' : '高Q，选频优秀'

  // valid data points
  if (validData.value.length) {
    validData.value.forEach(p => {
      const x = mx(p.f), y = my(p.I)
      const isSelected = selectedPoint.value && Math.abs(p.f - selectedPoint.value.f) < 1e-6
      ctx.fillStyle = isSelected ? '#ef4444' : '#2563eb'
      ctx.shadowColor = isSelected ? '#ef4444' : 'transparent'
      ctx.shadowBlur = isSelected ? 10 : 0
      ctx.beginPath(); ctx.arc(x, y, isSelected ? 5.5 : 3.5, 0, 2 * Math.PI); ctx.fill()
      ctx.shadowBlur = 0
      if (isSelected) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 2 * Math.PI); ctx.stroke()
      }
    })
  }

  // rejected data points
  if (rejectedData.value.length) {
    rejectedData.value.forEach(p => {
      const x = mx(p.f), y = my(p.I)
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.stroke()
    })
  }
}

// ---- 误差分析 ----
function filterData() {
  const th = threshold.value
  validData.value = []
  rejectedData.value = []
  let te = 0, me = 0
  collected.value.forEach(p => {
    const ω = 2 * Math.PI * p.f
    const It = Us.value / Math.sqrt(R.value * R.value + (ω * L_H.value - 1 / (ω * C_F.value)) ** 2)
    const err = Math.abs(p.I - It) / It * 100
    if (err <= th) {
      validData.value.push({ ...p, err })
    } else {
      rejectedData.value.push({ ...p, theoryI: It, err })
    }
    te += err
    if (err > me) me = err
  })
  avgErr.value = collected.value.length ? te / collected.value.length : 0
  maxErr.value = me

  if (!rejectedData.value.length) {
    analysisText.value = '✅ 所有采集数据误差均在阈值(' + th + '%)以内，数据质量良好。'
    return
  }
  const avg = (te / collected.value.length).toFixed(2)
  let src
  if (me > 50) {
    src = '疑似电路暂态干扰或参数突变，建议检查连接或重新采集；'
  } else if (avg > th * 0.6) {
    src = '系统可能存在浮点采样精度漂移，建议降低频率步长、增加采样点数；'
  } else {
    src = '系统运行稳定，个别点偏离属正常浮点计算容差，阈值设置合理。'
  }
  analysisText.value = '📊 共剔除 ' + rejectedData.value.length + ' 个异常点，最大误差 ' + me.toFixed(2) + '%，平均误差 ' + avg + '%。' + src
}

// ---- 采集数据 ----
function collectPoint() {
  const r = calcCircuit(f.value)
  collected.value.push({ f: f.value, I: r.I_peak, UL: r.UL_peak, UC: r.UC_peak, Z: r.Z, phi: r.phi, Q: r.Q })
  filterData()
}

// ---- 导出CSV ----
function exportCSV() {
  if (!collected.value.length) { alert('暂无数据可导出。'); return }
  const bom = '\uFEFF'
  const now = new Date().toLocaleDateString()
  const vh = '序号,频率(Hz),电流(mA),UL(V),UC(V),阻抗(Ω),相位(°),Q值,误差%'
  const vr = validData.value.map((p, i) =>
    [i + 1, t4(p.f), t4(p.I * 1e3), t4(p.UL), t4(p.UC), t4(p.Z), t4(p.phi * 180 / Math.PI), t4(p.Q), p.err.toFixed(2) + '%'].join(',')
  ).join('\n')
  let extra = ''
  if (rejectedData.value.length) {
    const rh = '\n\n=== 被剔除错误点明细 ===\n序号,频率(Hz),实测电流(mA),理论电流(mA),误差%,UL(V),UC(V)'
    const rr = rejectedData.value.map((p, i) =>
      [i + 1, t4(p.f), t4(p.I * 1e3), t4(p.theoryI * 1e3), p.err.toFixed(2) + '%', t4(p.UL), t4(p.UC)].join(',')
    ).join('\n')
    extra = rh + '\n' + rr
  }
  const blob = new Blob([bom + vh + '\n' + vr + extra], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'RLC_ErrorFilter_' + now + '.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

// ---- 清空数据 ----
function clearData() {
  if (!collected.value.length) return
  if (!confirm('确认清空所有数据？')) return
  collected.value = []
  validData.value = []
  rejectedData.value = []
  filterData()
}

// ---- 幅频图点击事件 - 选中已采集点显示数据 ----
function handleAmpClick(event) {
  const canvas = ampCanvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const clickY = event.clientY - rect.top

  // 获取幅频图的坐标映射
  const data = sweepData.value
  if (data.length < 2) return
  let mi = 0
  data.forEach((p, i) => { if (p.I > data[mi].I) mi = i })
  const maxI = data[mi].I
  const dm = maxI * 1.18
  const fMn = data[0].f, fMx = data[data.length - 1].f
  const lm = Math.log10(fMn), lr = Math.log10(fMx) - lm
  const mx = (f) => 50 + (Math.log10(f) - lm) / lr * (rect.width - 70)
  const my = (v) => 18 + (380 - 46) - (v / dm) * (380 - 46)

  // 寻找最近的已采集点
  let nearest = null
  let minDist = 20
  for (const p of collected.value) {
    const px = mx(p.f)
    const py = my(p.I)
    const d = Math.sqrt((clickX - px) ** 2 + (clickY - py) ** 2)
    if (d < minDist) {
      minDist = d
      nearest = p
    }
  }

  if (nearest) {
    selectedPoint.value = nearest
  } else {
    selectedPoint.value = null
  }
  drawAmpChart()
}

// ---- 自动扫频 ----
function autoScan() {
  if (isScanning.value) {
    isScanning.value = false
    return
  }
  isScanning.value = true
  const f0_val = f0.value
  const freqs = Array.from({ length: 51 }, (_, i) => 1950 * Math.pow(2550 / 1950, i / 50))
  let insIdx = freqs.findIndex(f => f >= f0_val)
  if (insIdx < 0) insIdx = freqs.length
  freqs.splice(insIdx, 0, f0_val)
  let step = 0

  function stepFunc() {
    if (!isScanning.value || step >= freqs.length) {
      isScanning.value = false
      if (step >= freqs.length) calcAll()
      return
    }
    const freq = freqs[step]
    f.value = freq
    calcAll()
    sweepData.value = generateSweepData(250)
    collectPoint()
    refreshAll()
    step++
    const r = freq / f0_val
    const delay = Math.abs(r - 1) < 1e-9 ? 1500 : r >= 0.9 && r <= 1.1 ? 700 : r >= 0.8 && r <= 1.2 ? 450 : r >= 0.6 && r <= 1.4 ? 300 : 200
    setTimeout(stepFunc, delay)
  }
  stepFunc()
}

// ---- 搜索谐振频率 ----
function searchResonance() {
  const freq = f0.value
  f.value = freq
  alert('✅ 搜寻完成！谐振频率 f₀ = ' + t4(freq) + ' Hz\nUL = ' + t4(UL_peak.value) + ' V, UC = ' + t4(UC_peak.value) + ' V\nφ = ' + t4(phi.value * 180 / Math.PI) + '°')
}

// ---- 带噪声采集数据 ----
function collectPointWithNoise() {
  const r = calcCircuit(f.value)
  // ±0.5% 随机测量噪声
  const noise = 1 + (Math.random() - 0.5) * 0.01
  const I_noisy = r.I_peak * noise
  const ω = 2 * Math.PI * f.value
  const XL = ω * L_H.value
  const XC = 1 / (ω * C_F.value)
  collected.value.push({
    f: f.value,
    I: I_noisy,
    UL: I_noisy * XL,
    UC: I_noisy * XC,
    Z: r.Z,
    phi: r.phi,
    Q: r.Q,
  })
  filterData()
}

// ---- 带噪声自动扫频 ----
function autoScanWithNoise() {
  if (isNoiseScanning.value) { isNoiseScanning.value = false; return }
  isNoiseScanning.value = true
  noiseEnabled.value = true
  collected.value = []
  validData.value = []
  rejectedData.value = []

  const f0_val = f0.value
  const freqs = Array.from({ length: 51 }, (_, i) => 1950 * Math.pow(2550 / 1950, i / 50))
  let insIdx = freqs.findIndex(f => f >= f0_val)
  if (insIdx < 0) insIdx = freqs.length
  freqs.splice(insIdx, 0, f0_val)
  let step = 0

  function stepFunc() {
    if (!isNoiseScanning.value || step >= freqs.length) {
      isNoiseScanning.value = false
      if (step >= freqs.length) calcAll()
      return
    }
    const freq = freqs[step]
    f.value = freq
    calcAll()
    sweepData.value = generateSweepData(250)
    collectPointWithNoise()
    refreshAll()
    step++
    if (step < freqs.length) {
      const r = freq / f0_val
      const delay = Math.abs(r - 1) < 1e-9 ? 1500 : r >= 0.9 && r <= 1.1 ? 700 : r >= 0.8 && r <= 1.2 ? 450 : r >= 0.6 && r <= 1.4 ? 300 : 200
      setTimeout(stepFunc, delay)
    } else {
      isNoiseScanning.value = false
    }
  }
  stepFunc()
}

// ---- 切换噪声扫描 ----
function toggleNoiseScan() {
  if (isNoiseScanning.value) {
    isNoiseScanning.value = false
    return
  }
  if (noiseEnabled.value) {
    // 关闭噪声模式
    noiseEnabled.value = false
    collected.value = []
    validData.value = []
    rejectedData.value = []
    filterData()
    return
  }
  autoScanWithNoise()
}

// ---- 刷新所有显示 ----
function refreshAll() {
  nextTick(() => {
    drawULUC()
    drawLissajous()
    drawLissajousULUC()
    drawAmpChart()
    updatePhaseStatus()
    updateResGain()
  })
}

// ---- 计算属性 ----
const ulucText = computed(() => {
  const pd = phi.value * 180 / Math.PI
  const diff = Math.abs(UL_peak.value - UC_peak.value)
  const ratio = UL_peak.value > 0.001 && UC_peak.value > 0.001
    ? (UL_peak.value > UC_peak.value ? UL_peak.value / UC_peak.value : UC_peak.value / UL_peak.value) : 1
  if (diff < 0.001 || Math.abs(pd) < 3) return '✅ 谐振！UL≈UC'
  return UL_peak.value > UC_peak.value
    ? '⚡ 感性失谐 UL>UC (' + t4(ratio) + '倍)'
    : '🔵 容性失谐 UC>UL (' + t4(ratio) + '倍)'
})

const ulucClass = computed(() => {
  const pd = phi.value * 180 / Math.PI
  const diff = Math.abs(UL_peak.value - UC_peak.value)
  if (diff < 0.001 || Math.abs(pd) < 3) return 'text-green-600'
  return UL_peak.value > UC_peak.value ? 'text-amber-600' : 'text-blue-600'
})

// 选中点的谐振判定
const selUlucText = computed(() => {
  if (!selectedPoint.value) return ''
  const pd = selectedPoint.value.phi * 180 / Math.PI
  const diff = Math.abs(selectedPoint.value.UL - selectedPoint.value.UC)
  const ratio = selectedPoint.value.UL > 0.001 && selectedPoint.value.UC > 0.001
    ? (selectedPoint.value.UL > selectedPoint.value.UC ? selectedPoint.value.UL / selectedPoint.value.UC : selectedPoint.value.UC / selectedPoint.value.UL) : 1
  if (diff < 0.001 || Math.abs(pd) < 3) return '✅ 谐振！UL≈UC'
  return selectedPoint.value.UL > selectedPoint.value.UC
    ? '⚡ 感性失谐 UL>UC (' + t4(ratio) + '倍)'
    : '🔵 容性失谐 UC>UL (' + t4(ratio) + '倍)'
})

const selUlucClass = computed(() => {
  if (!selectedPoint.value) return ''
  const pd = selectedPoint.value.phi * 180 / Math.PI
  const diff = Math.abs(selectedPoint.value.UL - selectedPoint.value.UC)
  if (diff < 0.001 || Math.abs(pd) < 3) return 'text-green-600'
  return selectedPoint.value.UL > selectedPoint.value.UC ? 'text-amber-600' : 'text-blue-600'
})

// ---- 参数变化监听 ----
watch([R, L_mH, C_uF, Us, f], () => {
  selectedPoint.value = null
  calcAll()
  sweepData.value = generateSweepData(250)
  refreshAll()
})

watch(threshold, () => {
  if (collected.value.length) {
    filterData()
    drawAmpChart()
  }
})

// ---- 动画循环 ----
function animate() {
  cursorAngle += 0.025
  if (cursorAngle > 2 * Math.PI) cursorAngle -= 2 * Math.PI
  drawLissajous()
  drawLissajousULUC()
  animId = requestAnimationFrame(animate)
}

// ---- 生命周期 ----
onMounted(() => {
  calcAll()
  sweepData.value = generateSweepData(250)
  nextTick(() => {
    refreshAll()
    animId = requestAnimationFrame(animate)
  })
})

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId)
})
</script>

<style scoped>
.card-hd {
  border-bottom: 1px solid #e2e8f0;
}
canvas {
  display: block;
}
</style>
