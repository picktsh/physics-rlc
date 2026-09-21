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

    <!-- 历史表格 -->
    <div class="max-h-72 overflow-y-auto overflow-x-auto table-responsive">
      <table v-if="history.length > 0" class="w-full text-xs border-collapse">
        <thead>
          <tr class="bg-[var(--app-surface-sunken)]">
            <th class="border border-[color:var(--app-border)] px-2 py-1.5">时间</th>
            <th class="border border-[color:var(--app-border)] px-2 py-1.5">R(Ω)</th>
            <th class="border border-[color:var(--app-border)] px-2 py-1.5 hide-on-mobile">L(mH)</th>
            <th class="border border-[color:var(--app-border)] px-2 py-1.5 hide-on-mobile">C(μF)</th>
            <th class="border border-[color:var(--app-border)] px-2 py-1.5 hide-on-mobile">V(V)</th>
            <th class="border border-[color:var(--app-border)] px-2 py-1.5">f₀(Hz)</th>
            <th class="border border-[color:var(--app-border)] px-2 py-1.5 hide-on-mobile">Q</th>
            <th class="border border-[color:var(--app-border)] px-2 py-1.5 hide-on-mobile">BW(Hz)</th>
            <th class="border border-[color:var(--app-border)] px-2 py-1.5 hide-on-mobile">Imax(mA)</th>
            <th class="border border-[color:var(--app-border)] px-2 py-1.5">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in history" :key="r.id" class="hover:bg-[var(--app-surface-brand)]">
            <td class="border border-[color:var(--app-border)] px-2 py-1.5 whitespace-nowrap text-xs">{{ r.time }}</td>
            <td class="border border-[color:var(--app-border)] px-2 py-1.5 text-center">{{ r.params.R }}</td>
            <td class="border border-[color:var(--app-border)] px-2 py-1.5 text-center hide-on-mobile">
              {{ r.params.L }}
            </td>
            <td class="border border-[color:var(--app-border)] px-2 py-1.5 text-center hide-on-mobile">
              {{ r.params.C }}
            </td>
            <td class="border border-[color:var(--app-border)] px-2 py-1.5 text-center hide-on-mobile">
              {{ r.params.V }}
            </td>
            <td
              class="border border-[color:var(--app-border)] px-2 py-1.5 text-center text-[color:var(--app-brand)] font-semibold"
            >
              {{ r.results.fr.toFixed(4) }}
            </td>
            <td class="border border-[color:var(--app-border)] px-2 py-1.5 text-center hide-on-mobile">
              {{ r.results.Q.toFixed(4) }}
            </td>
            <td class="border border-[color:var(--app-border)] px-2 py-1.5 text-center hide-on-mobile">
              {{ r.results.BW.toFixed(4) }}
            </td>
            <td class="border border-[color:var(--app-border)] px-2 py-1.5 text-center hide-on-mobile">
              {{ r.results.Imax.toFixed(4) }}
            </td>
            <td class="border border-[color:var(--app-border)] px-2 py-1.5 whitespace-nowrap text-center">
              <NButton secondary type="primary" class="mr-1" @click="$emit('load', idx)">加载</NButton>
              <NButton secondary type="error" @click="$emit('delete', idx)">删除</NButton>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="text-center py-4 text-[color:var(--app-text-faint)]">
        暂无仿真记录，点击「开始仿真」后数据将自动保存
      </div>
    </div>
  </div>
</template>

<script setup>
import { NButton, NIcon, NUpload } from 'naive-ui'
import { Save, FolderOpen, TrashCan } from '@vicons/carbon'

defineProps({
  history: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['export', 'import', 'clear', 'load', 'delete'])

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
