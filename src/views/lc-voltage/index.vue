<template>
  <div>
    <!-- 图表区：2列布局 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <!-- ===== 行1列1: UL/UC 波形 ===== -->
      <div class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] flex flex-col h-full">
        <div
          class="card-hd flex items-center justify-between px-4 py-2.5 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)] rounded-t-lg"
        >
          <span class="font-semibold text-[color:var(--app-text)]">UL / UC 双通道时域波形</span>
          <span class="text-xs text-[color:var(--app-text-muted)]">谐振时两波形峰值相等·相位相反</span>
        </div>
        <div class="p-3 space-y-3 flex-1 flex flex-col">
          <div>
            <div class="flex items-center gap-2 text-xs font-semibold text-[color:var(--app-text)] mb-1">
              <span class="inline-block w-2.5 h-2.5 rounded-full" style="background: #d9962b"></span>电感电压 U<sub
                >L</sub
              >
            </div>
            <canvas
              ref="ulCanvasRef"
              class="w-full border border-[color:var(--app-border-light)] rounded"
              style="height: 130px"
            ></canvas>
          </div>
          <div>
            <div class="flex items-center gap-2 text-xs font-semibold text-[color:var(--app-text)] mb-1">
              <span class="inline-block w-2.5 h-2.5 rounded-full" style="background: #2563eb"></span>电容电压 U<sub
                >C</sub
              >
            </div>
            <canvas
              ref="ucCanvasRef"
              class="w-full border border-[color:var(--app-border-light)] rounded"
              style="height: 130px"
            ></canvas>
          </div>
          <div class="mt-auto space-y-3">
            <div
              ref="resGainRef"
              class="text-xs font-semibold text-center text-[color:var(--app-success)] bg-[var(--app-success-bg)] rounded p-2"
            ></div>
            <div class="flex items-center gap-2">
              <NButton
                secondary
                class="flex-1"
                :type="isNoiseScanning ? 'error' : noiseEnabled ? 'warning' : 'default'"
                @click="toggleNoiseScan"
              >
                <template #icon>
                  <NIcon :component="isNoiseScanning ? Stop : noiseEnabled ? ChartBar : VolumeUp" />
                </template>
                {{ isNoiseScanning ? '停止噪声扫描' : noiseEnabled ? '噪声模式已开启' : '开启噪声' }}
              </NButton>
              <span v-if="noiseEnabled" class="text-xs text-[color:var(--app-warning)] font-semibold whitespace-nowrap"
                >±0.5% 随机误差</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 行1列2: 李萨如图 (UL vs UC) ===== -->
      <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] flex flex-col h-full">
        <div
          class="card-hd flex items-center justify-between px-4 py-2.5 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)] rounded-t-lg"
        >
          <span class="font-semibold text-[color:var(--app-text)]">李萨如图 (UL–UC XY 轨迹)</span>
        </div>
        <div
          class="text-xs text-[color:var(--app-text-muted)] px-4 pt-3 pb-1 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)]"
        >
          示波器·李萨如图 ( X轴：<strong>U<sub>L</sub></strong> 电感电压 | Y轴：<strong>U<sub>C</sub></strong> 电容电压
          )
        </div>
        <div class="flex justify-center p-3 bg-[var(--app-surface-sunken)] flex-1 flex items-center">
          <canvas
            ref="xyULUCCanvasRef"
            class="w-full max-w-[360px] aspect-square border border-[color:var(--app-border)] rounded"
            style="height: 360px"
          ></canvas>
        </div>
        <div ref="ulucLissajousStatusRef" class="font-semibold text-center py-2 transition-all">UL / UC 振幅比 = —</div>
      </section>

      <!-- ===== 行2列1: 幅频特性曲线 ===== -->
      <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] flex flex-col h-full">
        <div
          class="card-hd flex items-center justify-between px-4 py-2.5 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)] rounded-t-lg"
        >
          <span class="font-semibold text-[color:var(--app-text)]">辅助 · 幅频特性曲线 ( f–I )</span>
          <span class="text-xs text-[color:var(--app-text-muted)]">峰值点对应 UL=UC 谐振频率</span>
        </div>
        <div class="relative p-3 bg-[var(--app-surface-sunken)] flex-1 flex items-center">
          <canvas
            ref="ampCanvasRef"
            class="w-full border border-[color:var(--app-border)] rounded"
            style="height: 380px"
            @click="handleAmpClick"
          ></canvas>
          <!-- Imax/√2 截止线公式标注:KaTeX 分式渲染,-translate-y-full 令分式底边对齐虚线上方;
               坐标由 drawAmpChart 每次重绘同步写入 halfPowerMark -->
          <div
            v-if="halfPowerMark"
            class="absolute -translate-y-full pointer-events-none text-xs text-[color:var(--app-warning)] leading-none"
            :style="{ left: halfPowerMark.x + 'px', top: halfPowerMark.y + 'px' }"
          >
            <span v-html="K('\\dfrac{I_{max}}{\\sqrt{2}}')"></span><span>= {{ halfPowerMark.value }}{{ QUANTITY.i.unit }}</span>
          </div>
        </div>
        <div
          class="flex justify-center gap-4 px-4 py-2 bg-[var(--app-surface-sunken)] border-t border-[color:var(--app-border)] text-xs flex-wrap"
        >
          <span
            ><span class="text-[color:var(--app-text-muted)]">f₀ = </span
            ><span ref="mF0Ref" class="font-semibold text-[color:var(--app-text)]">—</span></span
          >
          <span
            ><span class="text-[color:var(--app-text-muted)]">Δf = </span
            ><span ref="mDfRef" class="font-semibold text-[color:var(--app-text)]">—</span></span
          >
          <span
            ><span class="text-[color:var(--app-text-muted)]">Q = </span
            ><span ref="mQRef" class="font-semibold text-[color:var(--app-text)]">—</span
            ><span ref="mQLabelRef" class="ml-1 font-semibold text-[color:var(--app-success)]"></span
          ></span>
        </div>
      </section>

      <!-- ===== 行2列2: 李萨如图 (Us vs Ur) ===== -->
      <div class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] flex flex-col h-full">
        <div
          class="card-hd flex items-center justify-between px-4 py-2.5 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)] rounded-t-lg"
        >
          <span class="font-semibold text-[color:var(--app-text)]">李萨如图 (Us-Ur XY 轨迹)</span>
        </div>
        <div
          class="text-xs text-[color:var(--app-text-muted)] px-4 pt-3 pb-1 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)]"
        >
          示波器·李萨如图 ( X轴：<strong>Us</strong> 回路激励总电压 | Y轴：<strong>Ur</strong>
          电阻分压，等效表征回路电流 )
        </div>
        <div class="flex justify-center p-3 bg-[var(--app-surface-sunken)] flex-1 flex items-center">
          <canvas
            ref="xyCanvasRef"
            class="w-full max-w-[360px] aspect-square border border-[color:var(--app-border)] rounded"
            style="height: 360px"
          ></canvas>
        </div>
        <div ref="phaseStatusRef" class="font-semibold text-center py-2 transition-all">相位差 φ = 0.0° | 待计算</div>
        <div
          ref="qHintRef"
          class="hidden text-xs text-[color:var(--app-text-muted)] text-center px-4 pb-2 leading-relaxed"
        ></div>
      </div>
    </div>

    <!-- 操作控制 -->
    <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] mb-4">
      <div
        class="card-hd flex items-center justify-between px-3 py-2 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)] rounded-t-lg"
      >
        <span class="text-xs font-semibold text-[color:var(--app-text)]">操作控制</span>
      </div>
      <div class="p-2">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <NButton secondary type="primary" @click="autoScan">
            <template #icon><NIcon :component="isScanning ? Stop : Reset" /></template>
            {{ isScanning ? '停止' : '自动扫频' }}
          </NButton>
          <NButton secondary @click="exportCSV">
            <template #icon><NIcon :component="Download" /></template>
            导出CSV
          </NButton>
          <NButton secondary type="error" @click="clearData">
            <template #icon><NIcon :component="TrashCan" /></template>
            清空
          </NButton>
          <!-- 阈值：标签走 prefix、单位 % 走 suffix；ml-auto 右对齐到行尾，与下方搜索谐振右边缘齐 -->
          <label class="ml-auto">
            <NInputNumber v-model:value="threshold" :show-button="false" :step="0.1" :min="0.1" :max="20" class="w-32">
              <template #prefix>阈值:</template>
              <template #suffix>{{ QUANTITY.err.unit }}</template>
            </NInputNumber>
          </label>
        </div>
        <div class="my-2 border-t border-dashed border-[color:var(--app-border)]"></div>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <!-- f：变量符号作 prefix、单位 kHz 作 suffix(口径见 utils/quantity.js)；滑块 flex-1 填满消除空旷 -->
          <NInputNumber
            v-model:value="f"
            :show-button="false"
            :step="QUANTITY.f.step"
            :precision="QUANTITY.f.decimals"
            class="w-32 sm:w-36"
          >
            <template #prefix>f:</template>
            <template #suffix>{{ QUANTITY.f.unit }}</template>
          </NInputNumber>
          <NSlider v-model:value="f" :min="freqMin" :max="freqMax" :step="0.001" class="min-w-[140px] flex-1" />
          <NButton secondary type="primary" class="w-full sm:w-auto" @click="searchResonance">
            <template #icon><NIcon :component="Search" /></template>
            搜索谐振
          </NButton>
        </div>
      </div>
    </section>

    <!-- 底部: 数据表格 + 实时面板 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <!-- 数据表格 -->
      <div class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)]">
        <div
          class="card-hd flex items-center justify-between px-3 py-2 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)] rounded-t-lg"
        >
          <span class="text-xs font-semibold text-[color:var(--app-text)]">实验数据记录</span>
          <span class="text-xs text-[color:var(--app-text-muted)] hide-on-mobile">UL、UC 幅值对比支撑谐振判定</span>
        </div>
        <NDataTable
          size="small"
          :columns="tableColumns"
          :data="collected"
          :row-class-name="resRowClass"
          :max-height="288"
          :scroll-x="680"
        />
      </div>

      <!-- 实时面板 -->
      <div class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)]">
        <div
          class="card-hd flex items-center justify-between px-3 py-2 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)] rounded-t-lg"
        >
          <span class="text-xs font-semibold text-[color:var(--app-text)]">实时数据面板</span>
          <span class="text-xs text-[color:var(--app-text-muted)] hide-on-mobile">UL/UC 幅值 + 李萨如相位协同判定</span>
        </div>
        <div class="p-4 space-y-2">
          <template v-if="selectedPoint">
            <div class="text-xs text-[color:var(--app-brand)] font-semibold mb-2 flex items-center gap-2">
              📌 已选中采集点 f = {{ fmt('f', selectedPoint.f) }} {{ QUANTITY.f.unit }}
              <NButton
                text
                class="ml-auto text-[color:var(--app-text-faint)] hover:text-[color:var(--app-error)]"
                @click="
                  () => {
                    selectedPoint = null
                    drawAmpChart()
                  }
                "
              >
                <NIcon :component="Close" /> 取消
              </NButton>
            </div>
            <!-- 数值卡片网格(与相位差判别法面板同风格):6 项主数值,桌面 3 列两行,移动 2 列 -->
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
                <div class="text-xs text-[color:var(--app-text-muted)] mb-1">回路电流 I ({{ QUANTITY.i.unit }})</div>
                <div class="text-lg font-bold font-mono text-[color:var(--app-warning)]">{{ fmt('i', selectedPoint.I * 1e3) }}</div>
              </div>
              <div class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
                <div class="text-xs text-[color:var(--app-text-muted)] mb-1">总阻抗 |Z| ({{ QUANTITY.z.unit }})</div>
                <div class="text-lg font-bold font-mono text-[color:var(--app-brand)]">{{ fmt('z', selectedPoint.Z) }}</div>
              </div>
              <div class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
                <div class="text-xs text-[color:var(--app-text-muted)] mb-1">相位差 φ ({{ QUANTITY.phi.unit }})</div>
                <div class="text-lg font-bold font-mono text-[color:var(--app-error)]">
                  {{ fmt('phi', (selectedPoint.phi * 180) / Math.PI) }}
                </div>
              </div>
              <div class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
                <div class="text-xs text-[color:var(--app-text-muted)] mb-1">Ur 有效值 ({{ QUANTITY.u.unit }})</div>
                <div class="text-lg font-bold font-mono text-[color:var(--app-success)]">
                  {{ fmt('u', (selectedPoint.I * R) / 1000 / Math.SQRT2) }}
                </div>
              </div>
              <div class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
                <div class="text-xs text-[color:var(--app-text-muted)] mb-1">UL 有效值 ({{ QUANTITY.u.unit }})</div>
                <div class="text-lg font-bold font-mono text-[color:var(--app-warning)]">{{ fmt('u', selectedPoint.UL / Math.SQRT2) }}</div>
              </div>
              <div class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
                <div class="text-xs text-[color:var(--app-text-muted)] mb-1">UC 有效值 ({{ QUANTITY.u.unit }})</div>
                <div class="text-lg font-bold font-mono text-[color:var(--app-brand)]">{{ fmt('u', selectedPoint.UC / Math.SQRT2) }}</div>
              </div>
            </div>
            <div class="border-t border-dashed border-[color:var(--app-border)] pt-3 mt-1">
              <div class="flex gap-4 py-1.5">
                <span class="text-[color:var(--app-text-muted)] font-semibold">UL / UC 谐振判定</span>
                <span :class="['font-semibold', selUlucClass]">{{ selUlucText }}</span>
              </div>
            </div>
          </template>
          <template v-else>
            <!-- 数值卡片网格(与相位差判别法面板同风格):6 项主数值,桌面 3 列两行,移动 2 列 -->
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
                <div class="text-xs text-[color:var(--app-text-muted)] mb-1">回路电流 I ({{ QUANTITY.i.unit }})</div>
                <div class="text-lg font-bold font-mono text-[color:var(--app-warning)]">{{ fmt('i', I_peak * 1e3) }}</div>
              </div>
              <div class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
                <div class="text-xs text-[color:var(--app-text-muted)] mb-1">总阻抗 |Z| ({{ QUANTITY.z.unit }})</div>
                <div class="text-lg font-bold font-mono text-[color:var(--app-brand)]">{{ fmt('z', Z) }}</div>
              </div>
              <div class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
                <div class="text-xs text-[color:var(--app-text-muted)] mb-1">相位差 φ ({{ QUANTITY.phi.unit }})</div>
                <div class="text-lg font-bold font-mono text-[color:var(--app-error)]">{{ fmt('phi', (phi * 180) / Math.PI) }}</div>
              </div>
              <div class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
                <div class="text-xs text-[color:var(--app-text-muted)] mb-1">Ur 有效值 ({{ QUANTITY.u.unit }})</div>
                <div class="text-lg font-bold font-mono text-[color:var(--app-success)]">{{ fmt('u', Ur_peak / Math.SQRT2) }}</div>
              </div>
              <div class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
                <div class="text-xs text-[color:var(--app-text-muted)] mb-1">UL 有效值 ({{ QUANTITY.u.unit }})</div>
                <div class="text-lg font-bold font-mono text-[color:var(--app-warning)]">{{ fmt('u', UL_peak / Math.SQRT2) }}</div>
              </div>
              <div class="bg-gradient-to-br from-[var(--app-surface-sunken)] to-[var(--app-surface-muted)] rounded-lg p-3 text-center">
                <div class="text-xs text-[color:var(--app-text-muted)] mb-1">UC 有效值 ({{ QUANTITY.u.unit }})</div>
                <div class="text-lg font-bold font-mono text-[color:var(--app-brand)]">{{ fmt('u', UC_peak / Math.SQRT2) }}</div>
              </div>
            </div>
            <div class="border-t border-dashed border-[color:var(--app-border)] pt-3 mt-1">
              <div class="flex gap-4 py-1.5">
                <span class="text-[color:var(--app-text-muted)] font-semibold">UL / UC 谐振判定</span>
                <span :class="['font-semibold', ulucClass]">{{ ulucText }}</span>
              </div>
            </div>
          </template>
          <!-- Q(幅值法):谐振时 UL=UC=Q·Us,由实测幅值反求;失谐时 UL/Us 只是电压放大倍数,不给 Q -->
          <div class="flex gap-4 py-1.5">
            <span class="text-[color:var(--app-text-muted)] font-semibold">Q（幅值法）</span>
            <span v-if="ampQ != null" class="font-semibold text-[color:var(--app-success)]">{{ fmt('q', ampQ) }}</span>
            <span v-else class="font-semibold text-[color:var(--app-text-faint)]">—（仅谐振点满足 UL=UC=Q·Us）</span>
          </div>
          <!-- 本次扫频 Q 结果横条:扫描结束(扫满/手动停止)后由本轮采集数据中的谐振点算出;扫描中/清空后显示 — -->
          <div
            class="rounded-lg border px-3 py-2 text-center font-semibold"
            :class="
              sweepQ != null
                ? 'border-[color:var(--app-success-border)] bg-[var(--app-success-bg)] text-[color:var(--app-success)]'
                : 'border-[color:var(--app-border)] bg-[var(--app-surface-sunken)] text-[color:var(--app-text-faint)]'
            "
          >
            🔹 本次扫频 Q（幅值法）= {{ sweepQ != null ? fmt('q', sweepQ) : '—' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 误差分析 -->
    <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] mb-4">
      <div
        class="card-hd flex items-center justify-between px-4 py-2.5 bg-[var(--app-surface-sunken)] border-b border-[color:var(--app-border)] rounded-t-lg"
      >
        <span class="font-semibold text-[color:var(--app-text)]">误差分析 · 数据预处理</span>
      </div>
      <div class="p-4">
        <div class="flex gap-4 flex-wrap text-xs mb-3">
          <span class="bg-[var(--app-surface-muted)] px-3 py-1.5 rounded"
            >总采集 <strong class="text-[color:var(--app-brand)]">{{ collected.length }}</strong></span
          >
          <span class="bg-[var(--app-surface-muted)] px-3 py-1.5 rounded"
            >有效保留 <strong class="text-[color:var(--app-brand)]">{{ validData.length }}</strong></span
          >
          <span class="bg-[var(--app-surface-muted)] px-3 py-1.5 rounded"
            >剔除异常 <strong class="text-[color:var(--app-error)]">{{ rejectedData.length }}</strong></span
          >
          <span class="bg-[var(--app-surface-muted)] px-3 py-1.5 rounded"
            >平均误差
            <strong class="text-[color:var(--app-brand)]">{{ collected.length ? fmt('err', avgErr) + '%' : '—' }}</strong
            ></span
          >
          <span class="bg-[var(--app-surface-muted)] px-3 py-1.5 rounded"
            >最大误差
            <strong class="text-[color:var(--app-error)]">{{ maxErr > 0 ? fmt('err', maxErr) + '%' : '—' }}</strong
            ></span
          >
        </div>
        <div class="mb-2">
          <NDataTable
            v-if="rejectedData.length > 0"
            size="small"
            :columns="rejectedColumns"
            :data="rejectedData"
            :max-height="112"
            :scroll-x="520"
          />
          <div v-else class="text-center text-[color:var(--app-text-faint)] py-4 text-xs">
            无剔除数据，所有采集点均在阈值内
          </div>
        </div>
        <div
          class="text-xs text-[color:var(--app-warning)] bg-[var(--app-warning-bg)] rounded px-3 py-2 leading-relaxed"
        >
          {{ analysisText }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onActivated, onDeactivated, onUnmounted, nextTick } from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { NButton, NDataTable, NIcon, NInputNumber, NSlider, useDialog, useMessage } from 'naive-ui'
const message = useMessage()
const dialog = useDialog()
import { storeToRefs } from 'pinia'
import { Search, Stop, ChartBar, VolumeUp, Reset, TrashCan, Close, Download } from '@vicons/carbon'
import { canvasTheme } from '@/utils/canvasTheme'
import { useRLCCalculatorStore, SIMULATE_HINT } from '@/stores/rlcCalculator'
import { QUANTITY, fmt, decimalsFor } from '@/utils/quantity'

// 组件名须与 config/nav 的 keepAliveNames 一致,保证切页时后台扫频进度不丢
defineOptions({ name: 'LCVoltageMethod' })

// ---- 参数状态 ----
// 电路参数统一取自「电路搭建」store(单一数据源),本页只读引用,不再单独维护输入
const calcStore = useRLCCalculatorStore()
const { params } = storeToRefs(calcStore)
const R = computed(() => params.value.R)
const L_H_par = computed(() => params.value.L) // params.L 已是 H(零换算)
const C_uF = computed(() => params.value.C)
const Us = computed(() => params.value.V)
const f = ref(2.2507) // 工作频率 kHz(默认对准 f₀≈2.2508kHz)
const threshold = ref(10)
const isScanning = ref(false)
const isNoiseScanning = ref(false)
const noiseEnabled = ref(false)
const freqMin = ref(0.1)
const freqMax = ref(10)

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
// Imax/√2 截止线公式标注(KaTeX 分式,HTML 覆盖层):坐标由 drawAmpChart 每次重绘时写入
const halfPowerMark = ref(null)

// ---- 工具函数 ----
const t4 = (x) => x.toFixed(4)
const clamp = (v, l, h) => Math.min(h, Math.max(l, v))

// 实验数据记录表(NDataTable:粘顶表头 + scroll-x 横向滚动适配移动端;数值列右对齐,精度走 quantity 总表)
const tableColumns = [
  { title: '#', key: 'idx', align: 'center', width: 52, render: (_, i) => i + 1 },
  {
    title: `f (${QUANTITY.f.unit})`,
    key: 'f',
    align: 'right',
    render: (d) => fmt('f', d.f) + (Math.abs(d.f - f0.value) < 1e-4 ? ' ⭐' : ''),
  },
  { title: `I (${QUANTITY.i.unit})`, key: 'I', align: 'right', render: (d) => fmt('i', d.I * 1e3) },
  { title: `UL (${QUANTITY.u.unit})`, key: 'UL', align: 'right', render: (d) => fmt('u', d.UL) },
  { title: `UC (${QUANTITY.u.unit})`, key: 'UC', align: 'right', render: (d) => fmt('u', d.UC) },
  { title: `|Z| (${QUANTITY.z.unit})`, key: 'Z', align: 'right', render: (d) => fmt('z', d.Z) },
  { title: `φ (${QUANTITY.phi.unit})`, key: 'phi', align: 'right', render: (d) => fmt('phi', (d.phi * 180) / Math.PI) },
  { title: 'Q', key: 'Q', align: 'right', render: (d) => (d.Q !== undefined ? fmt('q', d.Q) : '-') },
]
// 谐振行高亮(与图内黄点/⭐同一判定):行级 class 由 UnoCSS 全局生成,不受 scoped 限制
const resRowClass = (d) =>
  Math.abs(d.f - f0.value) < 1e-4 ? 'bg-[var(--app-surface-brand-strong)] font-semibold text-[color:var(--app-brand-strong)]' : ''

// 被剔除异常点明细表
const rejectedColumns = [
  { title: '#', key: 'idx', align: 'center', width: 52, render: (_, i) => i + 1 },
  { title: `f (${QUANTITY.f.unit})`, key: 'f', align: 'right', render: (p) => fmt('f', p.f) },
  { title: `I实测 (${QUANTITY.i.unit})`, key: 'I', align: 'right', render: (p) => fmt('i', p.I * 1e3) },
  { title: `I理论 (${QUANTITY.i.unit})`, key: 'theoryI', align: 'right', render: (p) => fmt('i', p.theoryI * 1e3) },
  { title: `误差 ${QUANTITY.err.unit}`, key: 'err', align: 'right', render: (p) => fmt('err', p.err) + QUANTITY.err.unit },
]

/** 渲染 LaTeX 为 KaTeX HTML(与分析页/公式原理/收音机页同一封装) */
function K(tex, display = false) {
  return katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: 'ignore',
  })
}

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

// ---- 电路计算(入参/出参频率均 kHz;L_H/C_F 为内部 SI 中间量) ----
function calcResonantFreq() {
  return 1 / (2 * Math.PI * Math.sqrt(L_H.value * C_F.value)) / 1e3
}

function calcCircuit(freq_kHz) {
  const ω = 2 * Math.PI * freq_kHz * 1e3
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
    freq: freq_kHz,
  }
}

function calcAll() {
  L_H.value = L_H_par.value
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
  const ct = canvasTheme()
  ctx.clearRect(0, 0, w, h)
  const mL = 70,
    pw = w - mL - 12,
    ph = h - 34
  const sc = (ph * 0.45) / Math.max(UL_peak.value, UC_peak.value, 0.001)
  const mid = 22 + ph / 2

  ctx.strokeStyle = ct.grid
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
    const v = amp * Math.sin(((2 * Math.PI * i) / N) * 2.5 - phi.value + phaseOffset)
    const x = mL + (i / N) * pw
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

  ctx.fillStyle = ct.label
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(fmt('u', amp) + QUANTITY.u.unit, mL - 4, py)
  ctx.fillText('-' + fmt('u', amp) + QUANTITY.u.unit, mL - 4, ny)
  ctx.fillText('0', mL - 4, mid)
}

function drawULUC() {
  const canvas = ulCanvasRef.value
  if (!canvas) return
  const rect = canvas.parentElement.getBoundingClientRect()
  if (rect.width < 2) return // 组件隐藏(keep-alive 切走)期间布局为 0,跳过以免画布缓冲被清零
  canvas.width = rect.width * (window.devicePixelRatio || 1)
  canvas.height = 130 * (window.devicePixelRatio || 1)
  canvas.style.height = '130px'
  const ctx = canvas.getContext('2d')
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
  drawWaveform(ctx, rect.width, 130, UL_peak.value, Math.PI / 2, '#d9962b')

  const canvas2 = ucCanvasRef.value
  if (!canvas2) return
  const rect2 = canvas2.parentElement.getBoundingClientRect()
  if (rect2.width < 2) return
  canvas2.width = rect2.width * (window.devicePixelRatio || 1)
  canvas2.height = 130 * (window.devicePixelRatio || 1)
  canvas2.style.height = '130px'
  const ctx2 = canvas2.getContext('2d')
  ctx2.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
  drawWaveform(ctx2, rect2.width, 130, UC_peak.value, -Math.PI / 2, '#2563eb')
}

// ---- 李萨如图 ----
function drawLissajous() {
  const canvas = xyCanvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const size = Math.min(rect.width, rect.height)
  if (size < 2) return // 隐藏期间跳过,不覆盖内联宽度,避免恢复后画布锁死为 0 宽
  canvas.width = size * dpr
  canvas.height = size * dpr
  canvas.style.width = size + 'px'
  canvas.style.height = size + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const cx = size / 2,
    cy = size / 2
  const ds = size / 2 - 44
  const ma = Math.max(Us.value, Ur_peak.value, 0.001)
  const s = ds / ma

  ctx.fillStyle = '#1a1f2e'
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = '#252d3d'
  ctx.lineWidth = 0.5
  ctx.strokeRect(cx - ds, cy - ds, ds * 2, ds * 2)
  for (let i = 0; i <= 10; i++) {
    const x = cx - ds + (ds * 2 * i) / 10
    ctx.beginPath()
    ctx.moveTo(x, cy - ds)
    ctx.lineTo(x, cy + ds)
    ctx.stroke()
    const y = cy - ds + (ds * 2 * i) / 10
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

  ctx.fillStyle = '#9fb0cf'
  ctx.font = '11px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('X：Us 激励电压', cx, cy + ds + 6)
  ctx.save()
  ctx.fillStyle = '#9fb0cf'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.translate(cx - ds - 8, cy)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Y：Ur 等效回路电流', 0, 0)
  ctx.restore()

  ctx.fillStyle = '#96a9c9'
  ctx.font = '10px system-ui'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText('O', cx - 3, cy + 3)

  // Lissajous curve
  ctx.beginPath()
  for (let i = 0; i <= 300; i++) {
    const th = (i / 300) * 2 * Math.PI
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
  if (size < 2) return // 隐藏期间跳过,不覆盖内联宽度,避免恢复后画布锁死为 0 宽
  canvas.width = size * dpr
  canvas.height = size * dpr
  canvas.style.width = size + 'px'
  canvas.style.height = size + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const cx = size / 2,
    cy = size / 2
  const ds = size / 2 - 44
  const ma = Math.max(UL_peak.value, UC_peak.value, 0.001)
  const s = ds / ma

  ctx.fillStyle = '#1a1f2e'
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = '#252d3d'
  ctx.lineWidth = 0.5
  ctx.strokeRect(cx - ds, cy - ds, ds * 2, ds * 2)
  for (let i = 0; i <= 10; i++) {
    const x = cx - ds + (ds * 2 * i) / 10
    ctx.beginPath()
    ctx.moveTo(x, cy - ds)
    ctx.lineTo(x, cy + ds)
    ctx.stroke()
    const y = cy - ds + (ds * 2 * i) / 10
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
  ctx.fillStyle = '#9fb0cf'
  ctx.font = '11px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('X：Uₗ 电感电压', cx, cy + ds + 6)
  ctx.save()
  ctx.fillStyle = '#9fb0cf'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.translate(cx - ds - 8, cy)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Y：Uᴄ 电容电压', 0, 0)
  ctx.restore()

  ctx.fillStyle = '#96a9c9'
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
    const th = (i / 300) * 2 * Math.PI
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
    const ratio = UC_peak.value > 0.001 ? UL_peak.value / UC_peak.value : 0
    const pd = (phi.value * 180) / Math.PI
    const diff = Math.abs(UL_peak.value - UC_peak.value)
    let t, c, b
    if (diff < 0.001 || Math.abs(pd) < 3) {
      t = 'UL / UC = -' + t4(ratio) + ' ✅ 谐振状态（UL≈UC）'
      c = '#23a876'
      b = '#e8f1ea'
    } else if (ratio > 1) {
      t = 'UL / UC = -' + t4(ratio) + ' ⚡ 感性失谐（UL与UC反相，|UL|>|UC|）'
      c = '#d9962b'
      b = '#f8f2e3'
    } else {
      t = 'UL / UC = -' + t4(ratio) + ' 🔵 容性失谐（UL与UC反相，|UC|>|UL|）'
      c = '#2563eb'
      b = '#e8f0fe'
    }
    ulucLissajousStatusRef.value.textContent = t
    ulucLissajousStatusRef.value.style.color = c
    ulucLissajousStatusRef.value.style.background = b
  }
}

// ---- 状态更新 ----
function updatePhaseStatus() {
  const pd = (phi.value * 180) / Math.PI
  const a = Math.abs(pd)
  let t, c, b
  if (a < 3) {
    t = '相位差 φ = ' + fmt('phi', pd) + QUANTITY.phi.unit + ' ✅ 谐振状态（φ≈0°，UL≈UC）'
    c = '#23a876'
    b = '#e8f1ea'
  } else if (pd > 0) {
    t = '相位差 φ = ' + fmt('phi', pd) + QUANTITY.phi.unit + ' ⚡ 感性失谐 — UL>UC, φ>0'
    c = '#d9962b'
    b = '#f8f2e3'
  } else {
    t = '相位差 φ = ' + fmt('phi', pd) + QUANTITY.phi.unit + ' 🔵 容性失谐 — UC>UL, φ<0'
    c = '#2563eb'
    b = '#e8f0fe'
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
    resGainRef.value.style.color = '#23a876'
    const extra =
      Math.abs(phi.value) < 1e-9
        ? ''
        : '<span style="font-weight:400;font-size:11px;margin-left:8px;">【仅谐振点满足 UL=UC=Q·Us，失谐时放大倍数小于理论Q】</span>'
    resGainRef.value.innerHTML =
      '🔺 电压放大倍数 ≈ Q = ' +
      fmt('q', q) +
      '（Us 的 ' +
      q.toFixed(decimalsFor('q')) +
      ' 倍）' +
      extra
  }
}

// ---- 幅频数据生成 ----
function generateSweepData(n) {
  // 横轴窗口 f0±0.8kHz;f0≤0.8kHz 时(如电路搭建页调大 C/L 后)下限会 ≤0,log10 结果为 NaN 致整图空白,
  // 故下限不低于 f0/4(f0≥1.0667kHz 时 f0-0.8≥f0/4,与旧窗口完全一致)。
  const lo = Math.max(f0.value - 0.8, f0.value / 4)
  const hi = f0.value + 0.8
  const d = []
  for (let i = 0; i < n; i++) {
    const r = i / (n - 1)
    const freq = lo + (hi - lo) * r
    const c = calcCircuit(freq)
    d.push({ f: freq, I: c.I_peak, UL: c.UL_peak, UC: c.UC_peak, Z: c.Z, phi: c.phi })
  }
  const c0 = calcCircuit(f0.value)
  let idx = d.findIndex((p) => p.f >= f0.value)
  if (idx < 0) idx = d.length
  d.splice(idx, 0, { f: f0.value, I: c0.I_peak, UL: c0.UL_peak, UC: c0.UC_peak, Z: c0.Z, phi: c0.phi })
  return d
}

// ---- 幅频图绘制 ----
function drawAmpChart() {
  const canvas = ampCanvasRef.value
  if (!canvas) return
  // 公式标注每次重绘先清空,画到半功率线时按新坐标重写(早退分支下不残留旧位置)
  halfPowerMark.value = null
  const ct = canvasTheme()
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  if (rect.width < 2) return // 隐藏期间跳过,避免把幅频图画布缓冲清零
  canvas.width = rect.width * dpr
  canvas.height = 380 * dpr
  canvas.style.height = '380px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const W = rect.width,
    H = 380
  const mL = 50,
    pw = W - 70,
    ph = H - 46
  ctx.clearRect(0, 0, W, H)

  if (!sweepData.value.length) sweepData.value = generateSweepData(250)
  const data = sweepData.value
  if (data.length < 2) return

  let mi = 0
  data.forEach((p, i) => {
    if (p.I > data[mi].I) mi = i
  })
  const maxI = data[mi].I
  const dm = maxI * 1.18

  // ---- 带宽(实测口径):仅本轮扫描结束后展现,数据源为过滤后的有效采集点 ----
  // 未扫描不显示任何带宽元素,面板 Δf 同步显示 —
  const showBw = !isScanning.value && !isNoiseScanning.value && validData.value.length >= 2
  let bw = 0
  let fL = 0
  let fR = 0
  let bwIh = 0
  if (showBw) {
    const vd = validData.value
    let vm = 0
    vd.forEach((p, i) => {
      if (p.I > vd[vm].I) vm = i
    })
    // 半功率基准取实测峰值/√2:与实测曲线交点、Δf 标尺端点保持同一基准
    bwIh = vd[vm].I / Math.SQRT2
    let li = -1,
      ri = -1
    for (let i = vm - 1; i >= 0; i--) {
      if (vd[i].I <= bwIh) {
        li = i
        break
      }
    }
    for (let i = vm + 1; i < vd.length; i++) {
      if (vd[i].I <= bwIh) {
        ri = i
        break
      }
    }
    if (li >= 0 && ri >= 0) {
      fL = vd[li].f + ((bwIh - vd[li].I) / (vd[li + 1].I - vd[li].I)) * (vd[li + 1].f - vd[li].f)
      fR = vd[ri - 1].f + ((bwIh - vd[ri - 1].I) / (vd[ri].I - vd[ri - 1].I)) * (vd[ri].f - vd[ri - 1].f)
      if (fR > fL) bw = fR - fL
    }
  }
  const fMn = data[0].f,
    fMx = data[data.length - 1].f
  const lm = Math.log10(fMn),
    lr = Math.log10(fMx) - lm
  const mx = (f) => mL + ((Math.log10(f) - lm) / lr) * pw
  const my = (v) => 18 + ph - (v / dm) * ph
  const yh = showBw ? my(bwIh) : null

  // grid
  ctx.strokeStyle = ct.grid
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 5; i++) {
    const y = 18 + (i / 5) * ph
    ctx.beginPath()
    ctx.moveTo(mL, y)
    ctx.lineTo(mL + pw, y)
    ctx.stroke()
  }
  for (let d = Math.ceil(lm); d <= Math.floor(Math.log10(fMx)); d++) {
    const ff = Math.pow(10, d)
    if (ff >= fMn && ff <= fMx) {
      const x = mx(ff)
      ctx.beginPath()
      ctx.moveTo(x, 18)
      ctx.lineTo(x, 18 + ph)
      ctx.stroke()
    }
  }

  // border & labels
  ctx.strokeStyle = ct.axis
  ctx.lineWidth = 1.5
  ctx.strokeRect(mL, 18, pw, ph)
  ctx.fillStyle = ct.label
  ctx.font = '10px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('f (' + QUANTITY.f.unit + ')', mL + pw / 2, 18 + ph + 6)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.save()
  ctx.translate(14, 18 + ph / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('I (' + QUANTITY.i.unit + ')', 0, 0)
  ctx.restore()

  // 理论参考曲线:灰色虚线(未采集时为画布上唯一的曲线轮廓,采集后作蓝色实测线的对照)
  ctx.setLineDash([5, 4])
  ctx.strokeStyle = ct.label
  ctx.lineWidth = 1.5
  ctx.beginPath()
  data.forEach((p) => ctx.lineTo(mx(p.f), my(p.I)))
  ctx.stroke()
  ctx.setLineDash([])

  // 实测曲线:由有效采集点连线,随扫频逐点生长;首点仅现蓝点,第二点起出现蓝色波形
  if (validData.value.length >= 2) {
    ctx.beginPath()
    validData.value.forEach((p) => ctx.lineTo(mx(p.f), my(p.I)))
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // ---- 带宽元素:半功率虚线 + Imax/√2 标注 + Δf 标尺(仅扫描结束后展现,见上方 showBw) ----
  if (showBw) {
    // half power line:通频带区间(fL~fR)留给紫色通频带虚线,此处断开投影,避免双虚线同段叠加混色
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = '#d9962b'
    ctx.lineWidth = 1
    ctx.beginPath()
    if (bw > 0) {
      ctx.moveTo(mL, yh)
      ctx.lineTo(mx(fL), yh)
      ctx.moveTo(mx(fR), yh)
      ctx.lineTo(mL + pw, yh)
    } else {
      ctx.moveTo(mL, yh)
      ctx.lineTo(mL + pw, yh)
    }
    ctx.stroke()
    ctx.setLineDash([])
    // Imax/√2 标注:公式改由 KaTeX 覆盖层渲染(见模板),此处仅同步位置与数值;
    // offsetLeft/Top 把画布坐标换算到图容器坐标,分式底边贴虚线上方 4px
    halfPowerMark.value = {
      x: canvas.offsetLeft + mL + 3,
      y: canvas.offsetTop + yh - 4,
      value: (bwIh * 1e3).toFixed(4),
    }

    // bandwidth markers:紫色通频带标尺;虚线直接贴画在半功率线上(占据橙色线断开段),
    // 形成"通频带在 Imax/√2 线上量取"的直观效果
    if (bw > 0) {
      ctx.strokeStyle = '#8b5cf6'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(mx(fL), yh)
      ctx.lineTo(mx(fR), yh)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#8b5cf6'
      ctx.beginPath()
      ctx.arc(mx(fL), yh, 3.5, 0, 2 * Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(mx(fR), yh, 3.5, 0, 2 * Math.PI)
      ctx.fill()
      ctx.font = '10px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText('Δf=' + fmt('bw', bw) + QUANTITY.bw.unit, (mx(fL) + mx(fR)) / 2, yh - 8)
    }
  }

  const q = calcCircuit(f0.value)
  if (mF0Ref.value) mF0Ref.value.textContent = fmt('f', f0.value) + ' ' + QUANTITY.f.unit
  if (mDfRef.value) mDfRef.value.textContent = showBw && bw > 0 ? fmt('bw', bw) + ' ' + QUANTITY.bw.unit : '—'
  if (mQRef.value) mQRef.value.textContent = fmt('q', q.Q)
  if (mQLabelRef.value)
    mQLabelRef.value.textContent = q.Q < 5 ? '低Q，选频差' : q.Q <= 15 ? '中高Q，选频良好' : '高Q，选频优秀'

  // valid data points
  if (validData.value.length) {
    validData.value.forEach((p) => {
      const x = mx(p.f),
        y = my(p.I)
      const isSelected = selectedPoint.value && Math.abs(p.f - selectedPoint.value.f) < 1e-6
      ctx.fillStyle = isSelected ? '#d14a3f' : '#3b82f6'
      ctx.shadowColor = isSelected ? '#d14a3f' : 'transparent'
      ctx.shadowBlur = isSelected ? 10 : 0
      ctx.beginPath()
      ctx.arc(x, y, isSelected ? 5.5 : 3.5, 0, 2 * Math.PI)
      ctx.fill()
      ctx.shadowBlur = 0
      if (isSelected) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 5.5, 0, 2 * Math.PI)
        ctx.stroke()
      }
    })
  }

  // rejected data points
  if (rejectedData.value.length) {
    rejectedData.value.forEach((p) => {
      const x = mx(p.f),
        y = my(p.I)
      ctx.strokeStyle = '#8ba0bf'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, 2 * Math.PI)
      ctx.stroke()
    })
  }

  // 黄色谐振点绘制在最上层
  const hasResonanceData = collected.value.some((p) => Math.abs(p.f - f0.value) < 0.001)
  if (hasResonanceData) {
    const peakData = data[mi]
    const peakX = mx(data[mi].f)
    const peakY = my(maxI)
    ctx.fillStyle = '#d9962b'
    ctx.shadowColor = '#d9962b'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(peakX, peakY, 7, 0, 2 * Math.PI)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(peakX, peakY, 3, 0, 2 * Math.PI)
    ctx.fill()
    ctx.fillStyle = '#d9962b'
    ctx.font = 'bold 10px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(
      '★ 谐振 (' + fmt('f', peakData.f) + ' ' + QUANTITY.f.unit + ', ' + fmt('i', peakData.I * 1e3) + ' ' + QUANTITY.i.unit + ')',
      peakX,
      peakY - 24,
    )
  }
}

// ---- 误差分析 ----
function filterData() {
  const th = threshold.value
  validData.value = []
  rejectedData.value = []
  let te = 0,
    me = 0
  collected.value.forEach((p) => {
    const ω = 2 * Math.PI * p.f * 1e3
    const It = Us.value / Math.sqrt(R.value * R.value + (ω * L_H.value - 1 / (ω * C_F.value)) ** 2)
    const err = (Math.abs(p.I - It) / It) * 100
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
  const avg = (te / collected.value.length).toFixed(decimalsFor('err'))
  let src
  if (me > 50) {
    src = '疑似电路暂态干扰或参数突变，建议检查连接或重新采集；'
  } else if (avg > th * 0.6) {
    src = '系统可能存在浮点采样精度漂移，建议降低频率步长、增加采样点数；'
  } else {
    src = '系统运行稳定，个别点偏离属正常浮点计算容差，阈值设置合理。'
  }
  analysisText.value =
    '📊 共剔除 ' +
    rejectedData.value.length +
    ' 个异常点，最大误差 ' +
    me.toFixed(decimalsFor('err')) +
    '%，平均误差 ' +
    avg +
    '%。' +
    src
}

// ---- 采集数据 ----
function collectPoint() {
  const r = calcCircuit(f.value)
  collected.value.push({ f: f.value, I: r.I_peak, UL: r.UL_peak, UC: r.UC_peak, Z: r.Z, phi: r.phi, Q: r.Q })
  filterData()
}

// ---- 导出CSV ----
function exportCSV() {
  if (!collected.value.length) {
    message.warning('暂无数据可导出。')
    return
  }
  const bom = '\uFEFF'
  const now = new Date().toLocaleDateString()
  const vh = `序号,频率(${QUANTITY.f.unit}),电流(${QUANTITY.i.unit}),UL(${QUANTITY.u.unit}),UC(${QUANTITY.u.unit}),阻抗(${QUANTITY.z.unit}),相位(${QUANTITY.phi.unit}),Q值,误差${QUANTITY.err.unit}`
  const vr = validData.value
    .map((p, i) =>
      [
        i + 1,
        fmt('f', p.f),
        fmt('i', p.I * 1e3),
        fmt('u', p.UL),
        fmt('u', p.UC),
        fmt('z', p.Z),
        fmt('phi', (p.phi * 180) / Math.PI),
        fmt('q', p.Q),
        fmt('err', p.err) + QUANTITY.err.unit,
      ].join(','),
    )
    .join('\n')
  let extra = ''
  if (rejectedData.value.length) {
    const rh = `\n\n=== 被剔除错误点明细 ===\n序号,频率(${QUANTITY.f.unit}),实测电流(${QUANTITY.i.unit}),理论电流(${QUANTITY.i.unit}),误差${QUANTITY.err.unit},UL(${QUANTITY.u.unit}),UC(${QUANTITY.u.unit})`
    const rr = rejectedData.value
      .map((p, i) =>
        [i + 1, fmt('f', p.f), fmt('i', p.I * 1e3), fmt('i', p.theoryI * 1e3), fmt('err', p.err) + QUANTITY.err.unit, fmt('u', p.UL), fmt('u', p.UC)].join(','),
      )
      .join('\n')
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
  dialog.warning({
    title: '确认清空',
    content: '确认清空所有数据？',
    positiveText: '清空',
    negativeText: '取消',
    onPositiveClick: () => {
      collected.value = []
      validData.value = []
      rejectedData.value = []
      filterData()
      drawAmpChart() // 清空后同步隐藏带宽标记与采集点(showBw 依赖有效采集数据)
    },
  })
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
  data.forEach((p, i) => {
    if (p.I > data[mi].I) mi = i
  })
  const maxI = data[mi].I
  const dm = maxI * 1.18
  const fMn = data[0].f,
    fMx = data[data.length - 1].f
  const lm = Math.log10(fMn),
    lr = Math.log10(fMx) - lm
  const mx = (f) => 50 + ((Math.log10(f) - lm) / lr) * (rect.width - 70)
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
// 扫频窗口随 f₀ 联动:原 1.95~2.55kHz 是默认参数(f₀≈2.2508kHz)下的固定窗,
// 换算为倍率窗 f₀×[0.8664, 1.1329],谐振点仍单独插入保证被采样。
function buildScanFreqs(f0KHz) {
  const lo = f0KHz * 0.8664
  const hi = f0KHz * 1.1329
  const freqs = Array.from({ length: 51 }, (_, i) => lo * Math.pow(hi / lo, i / 50))
  let insIdx = freqs.findIndex((x) => x >= f0KHz)
  if (insIdx < 0) insIdx = freqs.length
  freqs.splice(insIdx, 0, f0KHz)
  return freqs
}

function autoScan() {
  if (isScanning.value) {
    isScanning.value = false
    drawAmpChart() // 停止即按本轮已达数据展现实测带宽
    return
  }
  // 扫描数据必须来自「电路搭建」的仿真参数:未仿真一律拦截(与各方法页统一口径)
  if (!calcStore.simulated) {
    message.warning(SIMULATE_HINT + '，再进行自动扫频')
    return
  }
  isScanning.value = true
  // 重复点击视为重新扫描:先清空,与噪声扫频行为一致,避免两遍数据叠加导致连线回折
  collected.value = []
  validData.value = []
  rejectedData.value = []
  const f0_val = f0.value
  const freqs = buildScanFreqs(f0_val)
  let step = 0

  function stepFunc() {
    if (!isScanning.value || step >= freqs.length) {
      isScanning.value = false
      if (step >= freqs.length) calcAll()
      drawAmpChart() // 扫描结束才展现实测带宽(停止路径重复调用为幂等)
      return
    }
    const freq = freqs[step]
    // 频率统一规整为 4 位小数:与 f 输入框的 precision=4 及表格 t4 口径一致,避免超精度显示触发输入框删除线
    f.value = Number(freq.toFixed(4))
    calcAll()
    sweepData.value = generateSweepData(250)
    collectPoint()
    refreshAll()
    step++
    const r = freq / f0_val
    const delay =
      Math.abs(r - 1) < 1e-9
        ? 1500
        : r >= 0.9 && r <= 1.1
          ? 700
          : r >= 0.8 && r <= 1.2
            ? 450
            : r >= 0.6 && r <= 1.4
              ? 300
              : 200
    setTimeout(stepFunc, delay)
  }
  stepFunc()
}

// ---- 搜索谐振频率 ----
function searchResonance() {
  if (!calcStore.simulated) {
    message.warning(SIMULATE_HINT + '，再搜索谐振频率')
    return
  }
  const freq = f0.value
  f.value = Number(freq.toFixed(4))
  message.success(
    '✅ 搜寻完成！谐振频率 f₀ = ' +
      fmt('f', freq) +
      ' ' +
      QUANTITY.f.unit +
      '\nUL = ' +
      fmt('u', UL_peak.value) +
      ' ' +
      QUANTITY.u.unit +
      ', UC = ' +
      fmt('u', UC_peak.value) +
      ' ' +
      QUANTITY.u.unit +
      '\nφ = ' +
      fmt('phi', (phi.value * 180) / Math.PI) +
      QUANTITY.phi.unit,
  )
}

// ---- 带噪声采集数据 ----
function collectPointWithNoise() {
  const r = calcCircuit(f.value)
  // ±0.5% 随机测量噪声
  const noise = 1 + (Math.random() - 0.5) * 0.01
  const I_noisy = r.I_peak * noise
  const ω = 2 * Math.PI * f.value * 1e3
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
  if (isNoiseScanning.value) {
    isNoiseScanning.value = false
    drawAmpChart() // 停止即按本轮已达数据展现实测带宽
    return
  }
  isNoiseScanning.value = true
  noiseEnabled.value = true
  collected.value = []
  validData.value = []
  rejectedData.value = []

  const f0_val = f0.value
  const freqs = buildScanFreqs(f0_val)
  let step = 0

  function stepFunc() {
    if (!isNoiseScanning.value || step >= freqs.length) {
      isNoiseScanning.value = false
      if (step >= freqs.length) calcAll()
      drawAmpChart() // 扫描结束才展现实测带宽(停止路径重复调用为幂等)
      return
    }
    const freq = freqs[step]
    // 同 autoScan:频率规整 4 位小数,避免输入框超精度显示触发删除线
    f.value = Number(freq.toFixed(4))
    calcAll()
    sweepData.value = generateSweepData(250)
    collectPointWithNoise()
    refreshAll()
    step++
    if (step < freqs.length) {
      const r = freq / f0_val
      const delay =
        Math.abs(r - 1) < 1e-9
          ? 1500
          : r >= 0.9 && r <= 1.1
            ? 700
            : r >= 0.8 && r <= 1.2
              ? 450
              : r >= 0.6 && r <= 1.4
                ? 300
                : 200
      setTimeout(stepFunc, delay)
    } else {
      isNoiseScanning.value = false
      drawAmpChart() // 扫满一轮才展现实测带宽
    }
  }
  stepFunc()
}

// ---- 切换噪声扫描 ----
function toggleNoiseScan() {
  if (isNoiseScanning.value) {
    isNoiseScanning.value = false
    drawAmpChart() // 停止即按本轮已达数据展现实测带宽
    return
  }
  if (noiseEnabled.value) {
    // 关闭噪声模式
    noiseEnabled.value = false
    collected.value = []
    validData.value = []
    rejectedData.value = []
    filterData()
    drawAmpChart() // 清空采集数据后同步隐藏带宽标记与采集点
    return
  }
  if (!calcStore.simulated) {
    message.warning(SIMULATE_HINT + '，再进行噪声扫描')
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
  const pd = (phi.value * 180) / Math.PI
  const diff = Math.abs(UL_peak.value - UC_peak.value)
  const ratio =
    UL_peak.value > 0.001 && UC_peak.value > 0.001
      ? UL_peak.value > UC_peak.value
        ? UL_peak.value / UC_peak.value
        : UC_peak.value / UL_peak.value
      : 1
  if (diff < 0.001 || Math.abs(pd) < 3) return '✅ 谐振！UL≈UC'
  return UL_peak.value > UC_peak.value
    ? '⚡ 感性失谐 UL>UC (' + t4(ratio) + '倍)'
    : '🔵 容性失谐 UC>UL (' + t4(ratio) + '倍)'
})

const ulucClass = computed(() => {
  const pd = (phi.value * 180) / Math.PI
  const diff = Math.abs(UL_peak.value - UC_peak.value)
  if (diff < 0.001 || Math.abs(pd) < 3) return 'text-[color:var(--app-success)]'
  return UL_peak.value > UC_peak.value ? 'text-[color:var(--app-warning)]' : 'text-[color:var(--app-brand)]'
})

// 选中点的谐振判定
const selUlucText = computed(() => {
  if (!selectedPoint.value) return ''
  const pd = (selectedPoint.value.phi * 180) / Math.PI
  const diff = Math.abs(selectedPoint.value.UL - selectedPoint.value.UC)
  const ratio =
    selectedPoint.value.UL > 0.001 && selectedPoint.value.UC > 0.001
      ? selectedPoint.value.UL > selectedPoint.value.UC
        ? selectedPoint.value.UL / selectedPoint.value.UC
        : selectedPoint.value.UC / selectedPoint.value.UL
      : 1
  if (diff < 0.001 || Math.abs(pd) < 3) return '✅ 谐振！UL≈UC'
  return selectedPoint.value.UL > selectedPoint.value.UC
    ? '⚡ 感性失谐 UL>UC (' + t4(ratio) + '倍)'
    : '🔵 容性失谐 UC>UL (' + t4(ratio) + '倍)'
})

const selUlucClass = computed(() => {
  if (!selectedPoint.value) return ''
  const pd = (selectedPoint.value.phi * 180) / Math.PI
  const diff = Math.abs(selectedPoint.value.UL - selectedPoint.value.UC)
  if (diff < 0.001 || Math.abs(pd) < 3) return 'text-[color:var(--app-success)]'
  return selectedPoint.value.UL > selectedPoint.value.UC
    ? 'text-[color:var(--app-warning)]'
    : 'text-[color:var(--app-brand)]'
})

// Q(幅值法):谐振时 UL=UC=Q·Us,由实测幅值反求(Us 与 UL 同为峰值口径,比值即 Q);
// 与 UL/UC 谐振判定同口径,仅谐振状态给出——失谐时 UL/Us 只是电压放大倍数,返回 null 显示「—」
const ampQ = computed(() => {
  if (selectedPoint.value) {
    const p = selectedPoint.value
    const pd = (p.phi * 180) / Math.PI
    const isRes = Math.abs(p.UL - p.UC) < 0.001 || Math.abs(pd) < 3
    return isRes && Us.value > 0 ? p.UL / Us.value : null
  }
  const pd = (phi.value * 180) / Math.PI
  const isRes = Math.abs(UL_peak.value - UC_peak.value) < 0.001 || Math.abs(pd) < 3
  return isRes && Us.value > 0 ? UL_peak.value / Us.value : null
})

// Q(本次扫频):扫描结束(扫满/手动停止)后,从本轮采集数据中找谐振点(判定与实时行同口径),
// 取距 f0 最近点的 UL/Us(谐振时 UL=UC=Q·Us);扫频结束后工作频率停在窗口末端失谐点,实时行
// 回退显示「—」,故扫频结果单独用此口径给出。扫描进行中/无数据/未覆盖谐振点返回 null
const sweepQ = computed(() => {
  if (isScanning.value || isNoiseScanning.value || Us.value <= 0 || !collected.value.length) return null
  let best = null
  for (const p of collected.value) {
    if (!(p.UL > 0) || !(p.UC > 0)) continue
    const pd = (p.phi * 180) / Math.PI
    if (!(Math.abs(p.UL - p.UC) < 0.001 || Math.abs(pd) < 3)) continue
    if (!best || Math.abs(p.f - f0.value) < Math.abs(best.f - f0.value)) best = p
  }
  return best ? best.UL / Us.value : null
})

// 扫频结果生成提示:仅在本轮「从无到有」时提示一次,停止/清理的重复路径不会重复弹
watch(sweepQ, (val, prev) => {
  if (val != null && prev == null) message.success('Q值已生成，可在数据面板查看')
})

// ---- 参数变化监听 ----
watch([R, L_H_par, C_uF, Us, f], () => {
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
  window.addEventListener('themechange', refreshAll)
})

// keep-alive 保活期间:切走(组件 DOM 移出文档、布局为 0)时暂停动画,
// 切回时恢复动画并全量重绘,保证画面不因隐藏期的零尺寸绘制而空白
onDeactivated(() => {
  if (animId) {
    cancelAnimationFrame(animId)
    animId = null
  }
})

onActivated(() => {
  if (!animId) animId = requestAnimationFrame(animate)
  refreshAll()
})

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId)
  window.removeEventListener('themechange', refreshAll)
})
</script>

<style scoped>
canvas {
  display: block;
}
</style>
