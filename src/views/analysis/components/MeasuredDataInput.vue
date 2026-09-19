<template>
  <div class="rounded-lg bg-[var(--card-bg)] p-16px shadow-[var(--card-shadow)]">
    <!-- 粘贴区域 -->
    <div class="mb-4">
      <textarea
        v-model="pasteText"
        placeholder="1.6 4.2&#10;1.9 6.5&#10;2.1 8.2&#10;2.25 9.0&#10;2.4 7.8&#10;2.7 5.2&#10;3.0 3.4"
        class="w-full p-3 border border-gray-300 rounded-lg text-sm resize-y min-h-[80px]"
      ></textarea>
      <div class="text-xs text-gray-500 mt-1">
        格式示例：频率(kHz) 电流(mA)，每行一组（示例为默认电路 L=100mH、C=0.05μF 的理论谐振曲线附近取值，峰在 2.252
        kHz）
      </div>
      <div class="mt-2 flex gap-2">
        <button
          @click="pasteFromClipboard"
          class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold shadow-sm transition-all"
        >
          粘贴
        </button>
        <button
          @click="parsePasteData"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
        >
          解析并导入
        </button>
      </div>
    </div>

    <!-- 数据表格 -->
    <table class="w-full text-xs border-collapse mb-3">
      <thead>
        <tr class="bg-gray-50">
          <th class="border border-gray-200 px-2 py-1.5">序号</th>
          <th class="border border-gray-200 px-2 py-1.5">频率 (kHz)</th>
          <th class="border border-gray-200 px-2 py-1.5">电流 (mA)</th>
          <th class="border border-gray-200 px-2 py-1.5">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(d, idx) in localData" :key="idx">
          <td class="border border-gray-200 px-2 py-1.5 text-center">{{ idx + 1 }}</td>
          <td class="border border-gray-200 px-2 py-1.5">
            <input
              type="text"
              :value="toFixed4(localData[idx].freq)"
              @change="localData[idx].freq = parseFloat($event.target.value) || 0"
              class="w-full px-1 py-0.5 border border-gray-300 rounded text-xs"
            />
          </td>
          <td class="border border-gray-200 px-2 py-1.5">
            <input
              type="text"
              :value="toFixed4(localData[idx].current)"
              @change="localData[idx].current = parseFloat($event.target.value) || 0"
              class="w-full px-1 py-0.5 border border-gray-300 rounded text-xs"
            />
          </td>
          <td class="border border-gray-200 px-2 py-1.5 text-center">
            <button @click="deleteRow(idx)" class="text-red-500 hover:text-red-700">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="flex gap-2 flex-wrap">
      <button @click="addRow" class="text-blue-600 text-sm hover:text-blue-800">+ 添加数据行</button>
      <button
        @click="$emit('plot')"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
      >
        绘制实测曲线
      </button>
      <button
        @click="calculateQValue"
        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
      >
        计算 Q 值
      </button>
    </div>

    <!-- Q 值计算结果 -->
    <div v-if="qResult.show" class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 class="text-base font-bold text-green-800 mb-3 flex items-center gap-2">
        <span class="text-xl">📊</span> Q 值计算结果
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div class="p-3 bg-white rounded border border-green-100">
          <div class="text-gray-600 text-xs mb-1">谐振频率 f₀</div>
          <div class="text-xl font-bold text-green-700">{{ qResult.fr }} kHz</div>
        </div>
        <div class="p-3 bg-white rounded border border-green-100">
          <div class="text-gray-600 text-xs mb-1">最大电流 Iₘₓ</div>
          <div class="text-xl font-bold text-green-700">{{ qResult.imax }} mA</div>
        </div>
        <div class="p-3 bg-white rounded border border-green-100">
          <div class="text-gray-600 text-xs mb-1">品质因数 Q</div>
          <div class="text-xl font-bold text-green-700">{{ qResult.Q }}</div>
        </div>
        <div class="p-3 bg-white rounded border border-green-100">
          <div class="text-gray-600 text-xs mb-1">带宽 BW</div>
          <div class="text-xl font-bold text-green-700">{{ qResult.BW }} kHz</div>
        </div>
        <div class="p-3 bg-white rounded border border-green-100">
          <div class="text-gray-600 text-xs mb-1">下截止频率 f₁</div>
          <div class="text-xl font-bold text-green-700">{{ qResult.f1 }} kHz</div>
        </div>
        <div class="p-3 bg-white rounded border border-green-100">
          <div class="text-gray-600 text-xs mb-1">上截止频率 f₂</div>
          <div class="text-xl font-bold text-green-700">{{ qResult.f2 }} kHz</div>
        </div>
      </div>
      <div class="mt-4 p-3 bg-white rounded border border-green-100 text-xs text-gray-700">
        <div class="font-semibold mb-1">计算公式：</div>
        <div class="mb-1">• 谐振频率：通过实测数据峰值拟合得到 f₀</div>
        <div class="mb-2" style="line-height: 1.9;">
          • 半功率点电流：I = I
          <sub>max</sub> × 
          <span style="display: inline-block; vertical-align: middle; text-align: center; margin: 0 5px; font-size: 16px; line-height: 1.3;">
            <span style="border-bottom: 2px solid #1f2937; display: block; padding: 2px 8px; font-weight: bold;">1</span>
            <span style="display: block; padding: 2px 8px; font-weight: bold;">√2 ≈ 0.707</span>
          </span>
          × I
          <sub>max</sub>
        </div>
        <div class="mb-2" style="line-height: 1.9;">
          • 品质因数：Q = 
          <span style="display: inline-block; vertical-align: middle; text-align: center; margin: 0 5px; font-size: 16px; line-height: 1.3;">
            <span style="border-bottom: 2px solid #1f2937; display: block; padding: 2px 8px; font-weight: bold;">f₀</span>
            <span style="display: block; padding: 2px 8px; font-weight: bold;">f₂ - f₁</span>
          </span>
          = f₀/BW
        </div>
        <div>• 带宽：BW = f₂ - f₁（半功率点之间的频率宽度）</div>
      </div>
    </div>

    <!-- 误差分析 -->
    <div v-if="qResult.show" class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 class="text-base font-bold text-blue-800 mb-3 flex items-center gap-2">
        <span class="text-xl"></span> 误差分析
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div class="p-3 bg-white rounded border border-blue-100">
          <div class="text-gray-600 text-xs mb-1">理论 Q 值（基于标称元件）</div>
          <div class="flex items-center gap-2">
            <input
              type="number"
              :value="errorAnalysis.manualQ || errorAnalysis.theoreticalQ"
              @change="errorAnalysis.manualQ = $event.target.value ? parseFloat($event.target.value) : null"
              class="w-full px-2 py-1 border border-gray-300 rounded text-lg font-bold text-blue-700"
              placeholder="手动输入或留空"
            />
            <button
              v-if="errorAnalysis.manualQ"
              @click="errorAnalysis.manualQ = null"
              class="px-2 py-1 text-red-500 hover:text-red-700 text-xs"
              title="清除手动输入"
            >
              ✕
            </button>
          </div>
          <div v-if="!errorAnalysis.manualQ" class="text-xs text-gray-500 mt-1">自动计算 (R/L/C)</div>
        </div>
        <div class="p-3 bg-white rounded border border-blue-100">
          <div class="text-gray-600 text-xs mb-1">实测 Q 值</div>
          <div class="text-xl font-bold text-blue-700">{{ qResult.Q }}</div>
        </div>
        <div class="p-3 bg-white rounded border border-blue-100">
          <div class="text-gray-600 text-xs mb-1">绝对误差 ΔQ</div>
          <div class="text-lg font-bold text-blue-700">{{ Math.abs(errorAnalysis.diff).toFixed(2) }}</div>
        </div>
        <div class="p-3 bg-white rounded border border-blue-100">
          <div class="text-gray-600 text-xs mb-1">相对误差 δ</div>
          <div class="text-lg font-bold text-blue-700">{{ errorAnalysis.relativeError }}%</div>
        </div>
      </div>
      <div class="mt-4 p-3 bg-white rounded border border-blue-100 text-xs text-gray-700">
        <div class="font-semibold mb-2">误差来源分析：</div>
        <ul class="list-disc list-inside space-y-1 text-gray-600">
          <li><strong>元件公差：</strong>R、L、C 实际值与标称值的偏差（通常±5%~±10%）</li>
          <li><strong>测量误差：</strong>电流表、频率计的精度限制及读数误差</li>
          <li><strong>环境因素：</strong>温度变化导致元件参数漂移，电磁干扰</li>
          <li><strong>方法误差：</strong>半功率点定位不精确，抛物线拟合的近似性</li>
          <li><strong>电路寄生参数：</strong>导线电阻、电感分布电容等未计入模型</li>
        </ul>
        <div class="mt-2 p-2 bg-blue-50 rounded text-[12px] text-blue-800">
          💡 提示：若相对误差超过 15%，请检查实验操作是否规范，或重新采集数据
        </div>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="mt-4 pt-4 border-t border-gray-200">
      <div class="flex items-center gap-3 mb-3 flex-wrap">
        <span class="text-sm font-semibold text-gray-700">实测历史记录</span>
        <span
          >共
          <span class="bg-blue-600 text-white rounded-full px-2.5 py-0.5 text-xs font-semibold">{{
            history.length
          }}</span>
          条记录</span
        >
        <button
          @click="$emit('export-history')"
          class="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-all"
        >
          <NIcon :component="Save" /> 保存
        </button>
        <label
          class="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-all cursor-pointer"
        >
          打开
          <input type="file" accept=".json" class="hidden" @change="$emit('import-history', $event.target.files[0])" />
        </label>
        <button
          @click="$emit('clear-history')"
          class="ml-auto inline-flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-all"
        >
          <NIcon :component="TrashCan" /> 清空记录
        </button>
      </div>
      <div class="max-h-48 overflow-y-auto">
        <table v-if="history.length > 0" class="w-full text-xs border-collapse">
          <thead>
            <tr class="bg-gray-50">
              <th class="border border-gray-200 px-2 py-1.5">时间</th>
              <th class="border border-gray-200 px-2 py-1.5">数据点数</th>
              <th class="border border-gray-200 px-2 py-1.5">频率范围</th>
              <th class="border border-gray-200 px-2 py-1.5">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in history" :key="r.id">
              <td class="border border-gray-200 px-2 py-1.5 whitespace-nowrap text-xs">{{ r.time }}</td>
              <td class="border border-gray-200 px-2 py-1.5 text-center">{{ r.count }}</td>
              <td class="border border-gray-200 px-2 py-1.5 text-center">{{ r.freqRange }}</td>
              <td class="border border-gray-200 px-2 py-1.5 whitespace-nowrap text-center">
                <button
                  @click="$emit('load-history', idx)"
                  class="text-blue-600 border border-blue-600 bg-white rounded px-2 py-0.5 text-xs mr-1 hover:bg-blue-50"
                >
                  加载
                </button>
                <button
                  @click="$emit('delete-history', idx)"
                  class="text-red-600 border border-red-600 bg-white rounded px-2 py-0.5 text-xs hover:bg-red-50"
                >
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="text-center py-6 text-gray-400 text-sm">暂无实测数据历史记录</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { NIcon } from 'naive-ui'
import { Save, TrashCan } from '@vicons/carbon'

// Q 值计算结果
const qResult = ref({
  show: false,
  fr: 0,
  imax: 0,
  Q: 0,
  BW: 0,
  f1: 0,
  f2: 0
})

// 误差分析结果
const errorAnalysis = ref({
  theoreticalQ: '-',
  manualQ: null, // 手动输入的 Q 值，null 表示使用自动计算值
  diff: 0,
  relativeError: 0
})

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  history: {
    type: Array,
    default: () => [],
  },
  theoreticalParams: {
    type: Object,
    default: () => null, // { R, L, C } 用于计算理论 Q 值
  },
})

const emit = defineEmits([
  'update:data',
  'plot',
  'export-history',
  'import-history',
  'clear-history',
  'load-history',
  'delete-history',
])

const pasteText = ref('')
const localData = ref([...props.data])

// 仅在外部数据引用变化时同步（避免与内部编辑形成死循环）
watch(
  () => props.data,
  (newVal) => {
    // 只有当外部传入的是不同数组时才同步，防止自身 emit 触发的回写
    if (newVal !== localData.value) {
      localData.value = [...newVal]
    }
  },
)

// 使用 nextTick + flag 防止 emit 后立即被 prop watch 覆盖
let isInternalUpdate = false

watch(
  localData,
  (newVal) => {
    if (isInternalUpdate) return
    isInternalUpdate = true
    emit('update:data', [...newVal])
    // 等待父组件可能的响应后再重置标记
    setTimeout(() => {
      isInternalUpdate = false
    }, 0)
  },
  { deep: true },
)

function toFixed4(val) {
  return typeof val === 'number' && !isNaN(val) ? val.toFixed(4) : '0.0000'
}

// 从系统剪贴板读取文本填入粘贴区；浏览器权限拒绝时提示用户手动粘贴
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) pasteText.value = text
  } catch {
    alert('无法访问剪贴板，请手动粘贴到输入框')
  }
}

function parsePasteData() {
  const lines = pasteText.value.split('\n')
  const newData = []
  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 2) {
      const freq = parseFloat(parts[0])
      const current = parseFloat(parts[1])
      if (!isNaN(freq) && !isNaN(current)) {
        newData.push({ freq, current })
      }
    }
  }
  newData.sort((a, b) => a.freq - b.freq)
  localData.value = newData
  pasteText.value = ''
}

function addRow() {
  localData.value.push({ freq: 0, current: 0 })
}

function deleteRow(index) {
  localData.value.splice(index, 1)
}

// 计算 Q 值及谐振参数
function calculateQValue() {
  const data = localData.value
  if (data.length < 5) {
    alert('至少需要 5 个数据点才能进行 Q 值计算')
    return
  }

  // 1. 找到最大电流及其对应的频率
  let maxIdx = 0
  let maxI = data[0].current
  for (let i = 1; i < data.length; i++) {
    if (data[i].current > maxI) {
      maxI = data[i].current
      maxIdx = i
    }
  }

  const fr = data[maxIdx].freq
  const imax = maxI
  const halfPower = imax / Math.sqrt(2) // 半功率点电流

  // 2. 使用抛物线拟合同峰值附近的数据，精确计算谐振频率
  if (maxIdx > 0 && maxIdx < data.length - 1) {
    const y0 = data[maxIdx - 1].current
    const y1 = data[maxIdx].current
    const y2 = data[maxIdx + 1].current
    const x0 = data[maxIdx - 1].freq
    const x1 = data[maxIdx].freq
    const x2 = data[maxIdx + 1].freq

    // 抛物线拟合：通过三点 (x0,y0), (x1,y1), (x2,y2)
    // 顶点公式：x_peak = x1 - (x2-x0)*(y2-y0)/(2*(y2-2*y1+y0))
    const denom = 2 * (y2 - 2 * y1 + y0)
    if (Math.abs(denom) > 1e-6) {
      const xPeak = x1 - (x2 - x0) * (y2 - y0) / denom
      const yPeak = y1 - (y2 - y0) ** 2 / (8 * denom)
      
      // 更新结果
      qResult.value.fr = parseFloat(xPeak.toFixed(4))
      qResult.value.imax = parseFloat(yPeak.toFixed(4))
    } else {
      qResult.value.fr = parseFloat(fr.toFixed(4))
      qResult.value.imax = parseFloat(imax.toFixed(4))
    }
  } else {
    qResult.value.fr = parseFloat(fr.toFixed(4))
    qResult.value.imax = parseFloat(imax.toFixed(4))
  }

  // 3. 查找半功率点（上下截止频率）
  // 从峰值向左找 f1
  let f1 = 0
  for (let i = maxIdx; i >= 0; i--) {
    if (data[i].current <= halfPower) {
      // 线性插值求精确点
      if (i > 0) {
        const frac = (data[i].current - halfPower) / (data[i].current - data[i-1].current)
        f1 = data[i].freq + frac * (data[i-1].freq - data[i].freq)
      } else {
        f1 = data[i].freq
      }
      break
    }
  }

  // 从峰值向右找 f2
  let f2 = 0
  for (let i = maxIdx; i < data.length; i++) {
    if (data[i].current <= halfPower) {
      // 线性插值求精确点
      if (i < data.length - 1) {
        const frac = (data[i].current - halfPower) / (data[i].current - data[i+1].current)
        f2 = data[i].freq + frac * (data[i+1].freq - data[i].freq)
      } else {
        f2 = data[i].freq
      }
      break
    }
  }

  // 4. 计算带宽和 Q 值
  const BW = f2 - f1
  const Q = BW > 0 ? fr / BW : 0

  qResult.value.f1 = parseFloat(f1.toFixed(4))
  qResult.value.f2 = parseFloat(f2.toFixed(4))
  qResult.value.BW = parseFloat(BW.toFixed(4))
  qResult.value.Q = parseFloat(Q.toFixed(2))
  qResult.value.show = true

  // 5. 误差分析：如果父组件传入了 R、L、C 标称值，则计算理论 Q 值
  // params 中的 L 单位是 mH，C 单位是 μF，需要转换为标准单位
  if (props.theoreticalParams && props.theoreticalParams.R && props.theoreticalParams.L && props.theoreticalParams.C) {
    const { R, L, C } = props.theoreticalParams
    // L: mH -> H (除以 1000), C: μF -> F (除以 1e6)
    const L_H = L / 1000
    const C_F = C / 1e6
    // 理论 Q 值公式：Q = (1/R) * sqrt(L/C)
    const theoreticalQ = (1 / R) * Math.sqrt(L_H / C_F)
    
    errorAnalysis.value.theoreticalQ = parseFloat(theoreticalQ.toFixed(2))
  }

  // 使用手动输入的 Q 值或自动计算的 Q 值
  const usedTheoreticalQ = errorAnalysis.value.manualQ !== null ? errorAnalysis.value.manualQ : errorAnalysis.value.theoreticalQ
  
  if (usedTheoreticalQ && usedTheoreticalQ > 0) {
    const diff = Q - usedTheoreticalQ
    const relativeError = Math.abs(diff / usedTheoreticalQ) * 100
    
    errorAnalysis.value.diff = parseFloat(diff.toFixed(2))
    errorAnalysis.value.relativeError = parseFloat(relativeError.toFixed(1))
  }

  alert(`✅ Q 值计算完成！\n谐振频率：${qResult.value.fr} kHz\n最大电流：${qResult.value.imax} mA\n品质因数：Q = ${qResult.value.Q}\n带宽：${qResult.value.BW} kHz`)
}
</script>
