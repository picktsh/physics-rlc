<template>
  <div class="simulation-history">
    <!-- 操作栏 -->
    <div class="flex items-center gap-3 mb-3 flex-wrap">
      <span class="font-semibold text-[color:var(--app-text)]">仿真历史记录</span>
      <span
        >共
        <span class="bg-[var(--app-primary)] text-white rounded-full px-2.5 py-0.5 text-xs font-semibold">{{
          history.length
        }}</span>
        条记录</span
      >
      <NButton secondary class="ml-auto" title="保存历史记录为JSON文件" @click="$emit('export')">
        <template #icon><NIcon :component="Save" /></template>
        保存
      </NButton>
      <NUpload class="w-auto" :show-file-list="false" accept=".json" :default-upload="false" @change="handleImportFile">
        <NButton secondary title="从JSON文件加载历史记录">
          <template #icon><NIcon :component="FolderOpen" /></template>
          打开
        </NButton>
      </NUpload>
      <NButton secondary type="error" @click="$emit('clear')">
        <template #icon><NIcon :component="TrashCan" /></template>
        清空记录
      </NButton>
    </div>

    <!-- 历史表格(NDataTable:粘顶表头 + scroll-x 横向滚动适配移动端;数值列右对齐,精度走 quantity 总表) -->
    <div class="table-responsive">
      <NDataTable
        v-if="history.length > 0"
        size="small"
        :columns="historyColumns"
        :data="history"
        :row-key="(r) => r.id"
        :max-height="288"
        :scroll-x="760"
      />
      <div v-else class="text-center py-4 text-[color:var(--app-text-faint)]">
        暂无仿真记录，点击「开始仿真」后数据将自动保存
      </div>
    </div>
  </div>
</template>

<script setup>
import { h } from 'vue'
import { NButton, NDataTable, NIcon, NUpload } from 'naive-ui'
import { Save, FolderOpen, TrashCan } from '@vicons/carbon'
import { QUANTITY, fmt } from '@/utils/quantity'

defineProps({
  history: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['export', 'import', 'clear', 'load', 'delete'])

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
    render: (r, idx) => [
      h(
        NButton,
        { secondary: true, type: 'primary', class: 'mr-1', onClick: () => emit('load', idx) },
        { default: () => '加载' },
      ),
      h(NButton, { secondary: true, type: 'error', onClick: () => emit('delete', idx) }, { default: () => '删除' }),
    ],
  },
]

// NUpload 选到本地 JSON 后透传原生 File 给父组件导入
function handleImportFile({ file }) {
  if (file?.file) emit('import', file.file)
}
</script>

<style scoped>
.simulation-history {
  margin-top: 14px;
  border-top: 1px solid var(--app-border);
  padding-top: 12px;
}
</style>
