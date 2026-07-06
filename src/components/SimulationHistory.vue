<template>
  <div class="simulation-history">
    <!-- 操作栏 -->
    <div class="flex items-center gap-3 mb-3 flex-wrap">
      <span class="text-sm font-semibold text-gray-700">📋 仿真历史记录</span>
      <span>共 <span class="bg-indigo-500 text-white rounded-full px-2.5 py-0.5 text-xs font-semibold">{{ history.length }}</span> 条记录</span>
      <button @click="$emit('export')" class="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-all" title="保存历史记录为JSON文件">💾 保存</button>
      <label class="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-all cursor-pointer" title="从JSON文件加载历史记录">
        📂 打开
        <input type="file" accept=".json" class="hidden" @change="$emit('import', $event.target.files[0])" />
      </label>
      <button @click="$emit('clear')" class="ml-auto px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-all">🗑️ 清空记录</button>
    </div>

    <!-- 历史表格 -->
    <div class="max-h-72 overflow-y-auto overflow-x-auto table-responsive">
      <table v-if="history.length > 0" class="text-xs border-collapse">
        <thead>
          <tr class="bg-gray-50">
            <th class="border border-gray-200 px-2 py-1.5">时间</th>
            <th class="border border-gray-200 px-2 py-1.5">R(Ω)</th>
            <th class="border border-gray-200 px-2 py-1.5 hide-on-mobile">L(mH)</th>
            <th class="border border-gray-200 px-2 py-1.5 hide-on-mobile">C(μF)</th>
            <th class="border border-gray-200 px-2 py-1.5 hide-on-mobile">V(V)</th>
            <th class="border border-gray-200 px-2 py-1.5">f₀(Hz)</th>
            <th class="border border-gray-200 px-2 py-1.5 hide-on-mobile">Q</th>
            <th class="border border-gray-200 px-2 py-1.5 hide-on-mobile">BW(Hz)</th>
            <th class="border border-gray-200 px-2 py-1.5 hide-on-mobile">Imax(mA)</th>
            <th class="border border-gray-200 px-2 py-1.5">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in history" :key="r.id" class="hover:bg-blue-50">
            <td class="border border-gray-200 px-2 py-1.5 whitespace-nowrap text-xs">{{ r.time }}</td>
            <td class="border border-gray-200 px-2 py-1.5 text-center">{{ r.params.R }}</td>
            <td class="border border-gray-200 px-2 py-1.5 text-center hide-on-mobile">{{ r.params.L }}</td>
            <td class="border border-gray-200 px-2 py-1.5 text-center hide-on-mobile">{{ r.params.C }}</td>
            <td class="border border-gray-200 px-2 py-1.5 text-center hide-on-mobile">{{ r.params.V }}</td>
            <td class="border border-gray-200 px-2 py-1.5 text-center text-indigo-600 font-semibold">{{ r.results.fr.toFixed(4) }}</td>
            <td class="border border-gray-200 px-2 py-1.5 text-center hide-on-mobile">{{ r.results.Q.toFixed(4) }}</td>
            <td class="border border-gray-200 px-2 py-1.5 text-center hide-on-mobile">{{ r.results.BW.toFixed(4) }}</td>
            <td class="border border-gray-200 px-2 py-1.5 text-center hide-on-mobile">{{ r.results.Imax.toFixed(4) }}</td>
            <td class="border border-gray-200 px-2 py-1.5 whitespace-nowrap text-center">
              <button @click="$emit('load', idx)" class="text-indigo-600 border border-indigo-600 bg-white rounded px-1.5 sm:px-2 py-0.5 text-xs mr-1 hover:bg-indigo-50">加载</button>
              <button @click="$emit('delete', idx)" class="text-red-600 border border-red-600 bg-white rounded px-1.5 sm:px-2 py-0.5 text-xs hover:bg-red-50">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="text-center py-8 text-gray-400 text-sm">暂无仿真记录，点击「开始仿真」后数据将自动保存</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  history: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['export', 'import', 'clear', 'load', 'delete'])
</script>

<style scoped>
.simulation-history {
  margin-top: 14px;
  border-top: 1px solid #eee;
  padding-top: 12px;
}
</style>
