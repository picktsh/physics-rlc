<template>
  <div class="simulation-history">
    <!-- 操作栏 -->
    <div class="flex items-center gap-3 mb-3 flex-wrap">
      <span class="font-semibold text-[color:var(--app-text)]">仿真历史记录</span>
      <span
        >共
        <span class="bg-[var(--app-primary)] text-white rounded-full px-2.5 py-0.5 text-xs font-semibold">{{
          simulationHistory.length
        }}</span>
        条记录</span
      >
      <NButton text type="primary" :disabled="simulationHistory.length <= COLLAPSED_ROWS" @click="expanded = !expanded">
        {{ expanded ? '收起' : '展开' }}
      </NButton>
      <NButton secondary type="primary" class="ml-auto" title="导出历史记录为JSON文件" @click="handleExport">
        <template #icon><NIcon :component="Save" /></template>
        导出
      </NButton>
      <NUpload class="w-auto" :show-file-list="false" accept=".json" :default-upload="false" @change="handleImportFile">
        <NButton secondary title="从JSON文件加载历史记录">
          <template #icon><NIcon :component="FolderOpen" /></template>
          打开
        </NButton>
      </NUpload>
      <NButton secondary type="error" @click="confirmClear">
        <template #icon><NIcon :component="TrashCan" /></template>
        清空记录
      </NButton>
    </div>

    <!-- 历史表格(NDataTable:粘顶表头 + scroll-x 横向滚动适配移动端;数值列右对齐,精度走 quantity 总表) -->
    <div class="table-responsive">
      <NDataTable
        v-if="simulationHistory.length > 0"
        size="small"
        striped
        :columns="historyColumns"
        :data="simulationHistory"
        :row-key="(r) => r.id"
        :max-height="tableMaxHeight"
        :scroll-x="780"
        :row-class-name="rowClassName"
        :row-props="rowProps"
      />
      <div v-else class="text-center py-4 text-[color:var(--app-text-faint)]">
        暂无仿真记录，在「电路搭建」点击「开始仿真」后数据将自动保存
      </div>
    </div>
  </div>
</template>

<script setup>
// 仿真历史记录表:数据分析三法 + 电路搭建页两处共用的自包含组件。
// 直接读写 history/rlcCalculator store:加载即整体回填(params+电路拓扑+simulated),
// 选中态持久化到 store 供刷新自动回填;删除/清空等破坏性操作走 useDialog 二次确认。
import { h, ref, computed } from 'vue'
import { NButton, NDataTable, NIcon, NUpload, useDialog, useMessage } from 'naive-ui'
import { Save, FolderOpen, TrashCan } from '@vicons/carbon'
import { storeToRefs } from 'pinia'
import { QUANTITY, fmt } from '@/utils/quantity'
import { useHistoryStore } from '@/stores/historyDB'
import { useRLCCalculatorStore } from '@/stores/rlcCalculator'

const historyStore = useHistoryStore()
const calcStore = useRLCCalculatorStore()
const { simulationHistory, selectedSimId } = storeToRefs(historyStore)
const dialog = useDialog()
const message = useMessage()

// 折叠展示:默认约 3 行,展开约 5 行,超出走表内滚动(NDataTable max-height 含粘顶表头)
const COLLAPSED_ROWS = 3
const EXPANDED_ROWS = 5
const ROW_H = 38
const HEADER_H = 40
const expanded = ref(false)
const tableMaxHeight = computed(() => HEADER_H + (expanded.value ? EXPANDED_ROWS : COLLAPSED_ROWS) * ROW_H)

const historyColumns = [
  { title: '时间', key: 'time', align: 'left', width: 150 },
  { title: `R(${QUANTITY.R.unit})`, key: 'R', align: 'right', render: (r) => fmt('R', r.params.R) },
  { title: `L(${QUANTITY.L.unit})`, key: 'L', align: 'right', render: (r) => fmt('L', r.params.L) },
  { title: `C(${QUANTITY.C.unit})`, key: 'C', align: 'right', render: (r) => fmt('C', r.params.C) },
  { title: `V(${QUANTITY.V.unit})`, key: 'V', align: 'right', render: (r) => fmt('V', r.params.V) },
  {
    title: `f₀(${QUANTITY.f.unit})`,
    key: 'fr',
    align: 'right',
    render: (r) => h('span', { class: 'text-[color:var(--app-brand)] font-semibold' }, fmt('f', r.results.fr)),
  },
  { title: 'Q', key: 'Q', align: 'right', render: (r) => fmt('q', r.results.Q) },
  { title: `BW(${QUANTITY.bw.unit})`, key: 'BW', align: 'right', render: (r) => fmt('bw', r.results.BW) },
  { title: `Imax(${QUANTITY.i.unit})`, key: 'Imax', align: 'right', render: (r) => fmt('i', r.results.Imax) },
  {
    title: '操作',
    key: 'actions',
    align: 'center',
    width: 170,
    render: (r) => [
      h(
        NButton,
        {
          secondary: true,
          type: 'primary',
          class: 'mr-1',
          onClick: (e) => {
            e.stopPropagation()
            loadRecord(r)
          },
        },
        { default: () => '加载' },
      ),
      h(
        NButton,
        {
          secondary: true,
          type: 'error',
          onClick: (e) => {
            e.stopPropagation()
            confirmDelete(r)
          },
        },
        { default: () => '删除' },
      ),
    ],
  },
]

// 整行点击即加载回填;选中行高亮
function rowProps(r) {
  return { style: 'cursor: pointer', onClick: () => loadRecord(r) }
}
function rowClassName(r) {
  return r.id === selectedSimId.value ? 'sim-row-selected' : ''
}

// 加载 = 选中 + 整体回填(params/曲线/电路拓扑/simulated)并持久化选中
function loadRecord(r) {
  historyStore.setSelectedSim(r.id)
  calcStore.applyRecord(r)
  message.success(`已加载 ${r.time} 的仿真`)
}

function confirmDelete(r) {
  dialog.warning({
    title: '删除记录',
    content: `确定删除 ${r.time} 的仿真记录?此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      const idx = simulationHistory.value.findIndex((x) => x.id === r.id)
      if (idx >= 0) historyStore.deleteSimulationRecord(idx)
    },
  })
}

function confirmClear() {
  if (simulationHistory.value.length === 0) return
  dialog.error({
    title: '清空记录',
    content: `确定清空全部 ${simulationHistory.value.length} 条仿真记录?此操作不可恢复。`,
    positiveText: '清空',
    negativeText: '取消',
    onPositiveClick: () => historyStore.clearSimulationHistory(),
  })
}

function handleExport() {
  historyStore.exportSimulationHistory()
}

// NUpload 选到本地 JSON 后透传原生 File 给 store 导入
async function handleImportFile({ file }) {
  if (!file?.file) return
  try {
    const count = await historyStore.importSimulationHistory(file.file)
    message.success(`成功导入仿真记录（共 ${count} 条）`)
  } catch (err) {
    message.error('文件解析失败：' + err.message)
  }
}
</script>

<style scoped>
/* 选中行高亮:用专用 --app-selection(区别于悬停 muted/隔行 sunken);
   选择器带上 .n-data-table-tr 提高特异性,稳过 naive 的 striped 单元格背景 */
:deep(.n-data-table-tr.sim-row-selected .n-data-table-td) {
  background: var(--app-selection);
}
</style>
