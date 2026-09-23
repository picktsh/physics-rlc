<template>
  <div class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)]">
    <!-- 粘贴区域 -->
    <div class="mb-4">
      <NInput
        v-model:value="pasteText"
        type="textarea"
        placeholder="1.6 4.2&#10;1.9 6.5&#10;2.1 8.2&#10;2.25 9.0&#10;2.4 7.8&#10;2.7 5.2&#10;3.0 3.4"
        :autosize="{ minRows: 5, maxRows: 10 }"
      />
      <div class="text-xs text-[color:var(--app-text-muted)] mt-1">
        格式示例：频率(kHz) 电流(mA)，每行一组（示例为默认电路 L=0.1H、C=0.05μF 的理论谐振曲线附近取值，峰在 2.252 kHz）
      </div>
      <div class="mt-2 flex gap-2">
        <NButton secondary @click="pasteFromClipboard">粘贴</NButton>
        <NButton secondary type="primary" @click="parsePasteData">解析并导入</NButton>
      </div>
    </div>

    <!-- 数据表格(NDataTable 编辑态:与全站只读表同一组件 UI;数值列右对齐,精度/步长走 quantity 总表) -->
    <NDataTable class="mb-3" size="small" :columns="editColumns" :data="localData" :scroll-x="460" />

    <div class="flex gap-2 flex-wrap">
      <NButton secondary type="primary" @click="addRow">+ 添加数据行</NButton>
      <NButton secondary type="primary" @click="$emit('plot')">绘制实测曲线</NButton>
      <NButton secondary type="success" @click="calculateQValue">计算 Q 值</NButton>
    </div>

    <!-- Q 值计算结果 -->
    <div
      v-if="qResult.show"
      class="mt-4 p-4 bg-[var(--app-success-bg)] border border-[color:var(--app-success-border)] rounded-lg"
    >
      <h3 class="text-base font-bold text-[color:var(--app-success)] mb-3 flex items-center gap-2">
        <span class="text-xl">📊</span> Q 值计算结果
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-3 bg-[var(--app-surface)] rounded border border-[color:var(--app-success-border)]">
          <div class="text-[color:var(--app-text-muted)] text-xs mb-1">谐振频率 f₀</div>
          <div class="text-xl font-bold text-[color:var(--app-success)]">{{ qResult.fr }} {{ QUANTITY.f.unit }}</div>
        </div>
        <div class="p-3 bg-[var(--app-surface)] rounded border border-[color:var(--app-success-border)]">
          <div class="text-[color:var(--app-text-muted)] text-xs mb-1">最大电流 Iₘₓ</div>
          <div class="text-xl font-bold text-[color:var(--app-success)]">{{ qResult.imax }} {{ QUANTITY.i.unit }}</div>
        </div>
        <div class="p-3 bg-[var(--app-surface)] rounded border border-[color:var(--app-success-border)]">
          <div class="text-[color:var(--app-text-muted)] text-xs mb-1">品质因数 Q</div>
          <div class="text-xl font-bold text-[color:var(--app-success)]">{{ qResult.Q }}</div>
        </div>
        <div class="p-3 bg-[var(--app-surface)] rounded border border-[color:var(--app-success-border)]">
          <div class="text-[color:var(--app-text-muted)] text-xs mb-1">带宽 BW</div>
          <div class="text-xl font-bold text-[color:var(--app-success)]">{{ qResult.BW }} {{ QUANTITY.bw.unit }}</div>
        </div>
        <div class="p-3 bg-[var(--app-surface)] rounded border border-[color:var(--app-success-border)]">
          <div class="text-[color:var(--app-text-muted)] text-xs mb-1">下截止频率 f₁</div>
          <div class="text-xl font-bold text-[color:var(--app-success)]">{{ qResult.f1 }} {{ QUANTITY.f.unit }}</div>
        </div>
        <div class="p-3 bg-[var(--app-surface)] rounded border border-[color:var(--app-success-border)]">
          <div class="text-[color:var(--app-text-muted)] text-xs mb-1">上截止频率 f₂</div>
          <div class="text-xl font-bold text-[color:var(--app-success)]">{{ qResult.f2 }} {{ QUANTITY.f.unit }}</div>
        </div>
      </div>
      <div
        class="mt-4 p-3 bg-[var(--app-surface)] rounded border border-[color:var(--app-success-border)] text-xs text-[color:var(--app-text)]"
      >
        <div class="font-semibold mb-1">计算公式：</div>
        <div class="mb-1">• 谐振频率：通过实测数据峰值拟合得到 f₀</div>
        <div class="mb-2" style="line-height: 1.9">
          • 半功率点电流：I = I
          <sub>max</sub> ×
          <span
            style="
              display: inline-block;
              vertical-align: middle;
              text-align: center;
              margin: 0 5px;
              font-size: 16px;
              line-height: 1.3;
            "
          >
            <span style="border-bottom: 2px solid #1f2937; display: block; padding: 2px 8px; font-weight: bold">1</span>
            <span style="display: block; padding: 2px 8px; font-weight: bold">√2 ≈ 0.707</span>
          </span>
          × I
          <sub>max</sub>
        </div>
        <div class="mb-2" style="line-height: 1.9">
          • 品质因数：Q =
          <span
            style="
              display: inline-block;
              vertical-align: middle;
              text-align: center;
              margin: 0 5px;
              font-size: 16px;
              line-height: 1.3;
            "
          >
            <span style="border-bottom: 2px solid #1f2937; display: block; padding: 2px 8px; font-weight: bold"
              >f₀</span
            >
            <span style="display: block; padding: 2px 8px; font-weight: bold">f₂ - f₁</span>
          </span>
          = f₀/BW
        </div>
        <div>• 带宽：BW = f₂ - f₁（半功率点之间的频率宽度）</div>
      </div>
    </div>

    <!-- 误差分析 -->
    <div
      v-if="qResult.show"
      class="mt-4 p-4 bg-[var(--app-surface-brand)] border border-[color:var(--app-surface-brand-strong)] rounded-lg"
    >
      <h3 class="text-base font-bold text-[color:var(--app-brand-strong)] mb-3 flex items-center gap-2">
        <span class="text-xl"></span> 误差分析
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-3 bg-[var(--app-surface)] rounded border border-[color:var(--app-surface-brand-strong)]">
          <NForm label-placement="top" :show-feedback="false">
            <NFormItem label="理论 Q 值（基于标称元件）">
              <div class="flex w-full items-center gap-2">
                <NInputNumber
                  :value="
                    errorAnalysis.manualQ ??
                    (typeof errorAnalysis.theoreticalQ === 'number' ? errorAnalysis.theoreticalQ : null)
                  "
                  :show-button="false"
                  placeholder="手动输入或留空"
                  @update:value="(v) => (errorAnalysis.manualQ = v)"
                />
                <NButton
                  v-if="errorAnalysis.manualQ"
                  text
                  type="error"
                  title="清除手动输入"
                  @click="errorAnalysis.manualQ = null"
                >
                  ✕
                </NButton>
              </div>
            </NFormItem>
          </NForm>
          <div v-if="!errorAnalysis.manualQ" class="text-xs text-[color:var(--app-text-muted)] mt-1">
            自动计算 (R/L/C)
          </div>
        </div>
        <div class="p-3 bg-[var(--app-surface)] rounded border border-[color:var(--app-surface-brand-strong)]">
          <div class="text-[color:var(--app-text-muted)] text-xs mb-1">实测 Q 值</div>
          <div class="text-xl font-bold text-[color:var(--app-brand-strong)]">{{ qResult.Q }}</div>
        </div>
        <div class="p-3 bg-[var(--app-surface)] rounded border border-[color:var(--app-surface-brand-strong)]">
          <div class="text-[color:var(--app-text-muted)] text-xs mb-1">绝对误差 ΔQ</div>
          <div class="text-lg font-bold text-[color:var(--app-brand-strong)]">
            {{ Math.abs(errorAnalysis.diff).toFixed(decimalsFor('q')) }}
          </div>
        </div>
        <div class="p-3 bg-[var(--app-surface)] rounded border border-[color:var(--app-surface-brand-strong)]">
          <div class="text-[color:var(--app-text-muted)] text-xs mb-1">相对误差 δ</div>
          <div class="text-lg font-bold text-[color:var(--app-brand-strong)]">
            {{ errorAnalysis.relativeError }}{{ QUANTITY.err.unit }}
          </div>
        </div>
      </div>
      <div
        class="mt-4 p-3 bg-[var(--app-surface)] rounded border border-[color:var(--app-surface-brand-strong)] text-xs text-[color:var(--app-text)]"
      >
        <div class="font-semibold mb-2">误差来源分析：</div>
        <ul class="list-disc list-inside space-y-1 text-[color:var(--app-text-muted)]">
          <li><strong>元件公差：</strong>R、L、C 实际值与标称值的偏差（通常±5%~±10%）</li>
          <li><strong>测量误差：</strong>电流表、频率计的精度限制及读数误差</li>
          <li><strong>环境因素：</strong>温度变化导致元件参数漂移，电磁干扰</li>
          <li><strong>方法误差：</strong>半功率点定位不精确，抛物线拟合的近似性</li>
          <li><strong>电路寄生参数：</strong>导线电阻、电感分布电容等未计入模型</li>
        </ul>
        <div class="mt-2 p-2 bg-[var(--app-surface-brand)] rounded text-xs text-[color:var(--app-brand-strong)]">
          💡 提示：若相对误差超过 15%，请检查实验操作是否规范，或重新采集数据
        </div>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="mt-4 pt-4 border-t border-[color:var(--app-border)]">
      <div class="flex items-center gap-3 mb-3 flex-wrap">
        <span class="font-semibold text-[color:var(--app-text)]">实测历史记录</span>
        <span
          >共
          <span class="bg-[var(--app-primary)] text-white rounded-full px-2.5 py-0.5 text-xs font-semibold">{{
            history.length
          }}</span>
          条记录</span
        >
        <NButton secondary type="primary" class="ml-auto" @click="$emit('export-history')">
          <template #icon><NIcon :component="Save" /></template>
          导出
        </NButton>
        <NUpload
          class="w-auto"
          :show-file-list="false"
          accept=".json"
          :default-upload="false"
          @change="handleImportFile"
        >
          <NButton secondary>
            <template #icon><NIcon :component="FolderOpen" /></template>
            打开
          </NButton>
        </NUpload>
        <NButton secondary type="error" @click="$emit('clear-history')">
          <template #icon><NIcon :component="TrashCan" /></template>
          清空记录
        </NButton>
      </div>
      <!-- NDataTable:粘顶表头 + scroll-x 横向滚动适配移动端;数值列右对齐 -->
      <div>
        <NDataTable
          v-if="history.length > 0"
          size="small"
          :columns="historyColumns"
          :data="history"
          :row-key="(r) => r.id"
          :max-height="192"
          :scroll-x="560"
        />
        <div v-else class="text-center py-4 text-[color:var(--app-text-faint)]">暂无实测数据历史记录</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, h, watch } from 'vue'
import { NButton, NDataTable, NForm, NFormItem, NIcon, NInput, NInputNumber, NUpload, useMessage } from 'naive-ui'
import { Save, TrashCan, FolderOpen } from '@vicons/carbon'
import { QUANTITY, decimalsFor } from '@/utils/quantity'

// Q 值计算结果
const qResult = ref({
  show: false,
  fr: 0,
  imax: 0,
  Q: 0,
  BW: 0,
  f1: 0,
  f2: 0,
})

// 误差分析结果
const errorAnalysis = ref({
  theoreticalQ: '-',
  manualQ: null, // 手动输入的 Q 值，null 表示使用自动计算值
  diff: 0,
  relativeError: 0,
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

// 实测数据录入表(编辑态):行对象即 localData 元素,直改 row.freq/current 经 deep watch 回写父层;
// w-full 为单元格铺宽的功能性类(非装饰样式),与全局表单铺宽规则同理
const editColumns = [
  { title: '序号', key: 'idx', align: 'center', width: 64, render: (_, i) => i + 1 },
  {
    title: `频率 (${QUANTITY.f.unit})`,
    key: 'freq',
    align: 'right',
    minWidth: 130,
    render: (row) =>
      h(NInputNumber, {
        value: row.freq,
        'onUpdate:value': (v) => (row.freq = v),
        size: 'small',
        showButton: false,
        min: 0,
        precision: QUANTITY.f.decimals,
        step: QUANTITY.f.step,
        class: 'w-full',
      }),
  },
  {
    title: `电流 (${QUANTITY.i.unit})`,
    key: 'current',
    align: 'right',
    minWidth: 130,
    render: (row) =>
      h(NInputNumber, {
        value: row.current,
        'onUpdate:value': (v) => (row.current = v),
        size: 'small',
        showButton: false,
        min: 0,
        precision: QUANTITY.i.decimals,
        step: QUANTITY.i.step,
        class: 'w-full',
      }),
  },
  {
    title: '操作',
    key: 'actions',
    align: 'center',
    width: 72,
    render: (_, i) => h(NButton, { text: true, type: 'error', onClick: () => deleteRow(i) }, { default: () => '删除' }),
  },
]

// 实测历史记录表(freqRange 为落库时已按 kHz 4 位格式化的字符串)
const historyColumns = [
  { title: '时间', key: 'time', align: 'left', width: 160 },
  { title: '数据点数', key: 'count', align: 'right', width: 90 },
  { title: `频率范围 (${QUANTITY.f.unit})`, key: 'freqRange', align: 'right' },
  {
    title: '操作',
    key: 'actions',
    align: 'center',
    width: 170,
    render: (r, idx) => [
      h(
        NButton,
        { secondary: true, type: 'primary', class: 'mr-1', onClick: () => emit('load-history', idx) },
        { default: () => '加载' },
      ),
      h(
        NButton,
        { secondary: true, type: 'error', onClick: () => emit('delete-history', idx) },
        { default: () => '删除' },
      ),
    ],
  },
]

const pasteText = ref('')
const message = useMessage()
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

// 从系统剪贴板读取文本填入粘贴区；浏览器权限拒绝时提示用户手动粘贴
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) pasteText.value = text
  } catch {
    message.warning('无法访问剪贴板，请手动粘贴到输入框')
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

// NUpload 选到本地 JSON 后,把原生 File 透传给父组件导入(:default-upload=false 不走上传)
function handleImportFile({ file }) {
  if (file?.file) emit('import-history', file.file)
}

function deleteRow(index) {
  localData.value.splice(index, 1)
}

// 计算 Q 值及谐振参数
function calculateQValue() {
  const data = localData.value
  if (data.length < 5) {
    message.warning('至少需要 5 个数据点才能进行 Q 值计算')
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
      const xPeak = x1 - ((x2 - x0) * (y2 - y0)) / denom
      const yPeak = y1 - (y2 - y0) ** 2 / (8 * denom)

      // 更新结果
      qResult.value.fr = parseFloat(xPeak.toFixed(decimalsFor('f')))
      qResult.value.imax = parseFloat(yPeak.toFixed(decimalsFor('i')))
    } else {
      qResult.value.fr = parseFloat(fr.toFixed(decimalsFor('f')))
      qResult.value.imax = parseFloat(imax.toFixed(decimalsFor('i')))
    }
  } else {
    qResult.value.fr = parseFloat(fr.toFixed(decimalsFor('f')))
    qResult.value.imax = parseFloat(imax.toFixed(decimalsFor('i')))
  }

  // 3. 查找半功率点（上下截止频率）
  // 从峰值向左找 f1
  let f1 = 0
  for (let i = maxIdx; i >= 0; i--) {
    if (data[i].current <= halfPower) {
      // 线性插值求精确点
      if (i > 0) {
        const frac = (data[i].current - halfPower) / (data[i].current - data[i - 1].current)
        f1 = data[i].freq + frac * (data[i - 1].freq - data[i].freq)
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
        const frac = (data[i].current - halfPower) / (data[i].current - data[i + 1].current)
        f2 = data[i].freq + frac * (data[i + 1].freq - data[i].freq)
      } else {
        f2 = data[i].freq
      }
      break
    }
  }

  // 4. 计算带宽和 Q 值
  const BW = f2 - f1
  const Q = BW > 0 ? fr / BW : 0

  qResult.value.f1 = parseFloat(f1.toFixed(decimalsFor('f')))
  qResult.value.f2 = parseFloat(f2.toFixed(decimalsFor('f')))
  qResult.value.BW = parseFloat(BW.toFixed(decimalsFor('bw')))
  qResult.value.Q = parseFloat(Q.toFixed(decimalsFor('q')))
  // 结果直接由下方结果面板展开呈现,不弹窗打断
  qResult.value.show = true

  // 5. 误差分析：如果父组件传入了 R、L、C 标称值，则计算理论 Q 值
  // params 口径与展示一致:R Ω、L H、C μF(见 utils/quantity.js)
  if (props.theoreticalParams && props.theoreticalParams.R && props.theoreticalParams.L && props.theoreticalParams.C) {
    const { R, L, C } = props.theoreticalParams
    // C: μF → F (除以 1e6);L 已是 H
    const L_H = L
    const C_F = C / 1e6
    // 理论 Q 值公式：Q = (1/R) * sqrt(L/C)
    const theoreticalQ = (1 / R) * Math.sqrt(L_H / C_F)

    errorAnalysis.value.theoreticalQ = parseFloat(theoreticalQ.toFixed(decimalsFor('q')))
  }

  // 使用手动输入的 Q 值或自动计算的 Q 值
  const usedTheoreticalQ =
    errorAnalysis.value.manualQ !== null ? errorAnalysis.value.manualQ : errorAnalysis.value.theoreticalQ

  if (usedTheoreticalQ && usedTheoreticalQ > 0) {
    const diff = Q - usedTheoreticalQ
    const relativeError = Math.abs(diff / usedTheoreticalQ) * 100

    errorAnalysis.value.diff = parseFloat(diff.toFixed(decimalsFor('q')))
    errorAnalysis.value.relativeError = parseFloat(relativeError.toFixed(decimalsFor('err')))
  }
}
</script>
