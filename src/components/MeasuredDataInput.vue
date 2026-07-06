<template>
  <div class="card">
    <!-- 粘贴区域 -->
    <div class="mb-4">
      <textarea
        v-model="pasteText"
        placeholder="200 10&#10;500 35&#10;700 48&#10;796 50&#10;900 45&#10;1200 25"
        class="w-full p-3 border border-gray-300 rounded-lg text-sm resize-y min-h-[80px]"
      ></textarea>
      <div class="text-xs text-gray-500 mt-1">格式示例：频率(kHz) 电流(mA)，每行一组数据</div>
      <button @click="parsePasteData" class="mt-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all">
        解析并导入
      </button>
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
              <input type="text" :value="toFixed4(localData[idx].freq)" @change="localData[idx].freq = parseFloat($event.target.value) || 0" class="w-full px-1 py-0.5 border border-gray-300 rounded text-xs" />
            </td>
            <td class="border border-gray-200 px-2 py-1.5">
              <input type="text" :value="toFixed4(localData[idx].current)" @change="localData[idx].current = parseFloat($event.target.value) || 0" class="w-full px-1 py-0.5 border border-gray-300 rounded text-xs" />
            </td>
            <td class="border border-gray-200 px-2 py-1.5 text-center">
              <button @click="deleteRow(idx)" class="text-red-500 hover:text-red-700">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

    <div class="flex gap-2 flex-wrap">
      <button @click="addRow" class="text-indigo-600 text-sm hover:text-indigo-800">+ 添加数据行</button>
      <button @click="$emit('plot')" class="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all">
        绘制实测曲线
      </button>
    </div>

    <!-- 历史记录 -->
    <div class="mt-4 pt-4 border-t border-gray-200">
      <div class="flex items-center gap-3 mb-3 flex-wrap">
        <span class="text-sm font-semibold text-gray-700">📋 实测历史记录</span>
        <span>共 <span class="bg-indigo-500 text-white rounded-full px-2.5 py-0.5 text-xs font-semibold">{{ history.length }}</span> 条记录</span>
        <button @click="$emit('export-history')" class="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-all">💾 保存</button>
        <label class="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-all cursor-pointer">
           打开
          <input type="file" accept=".json" class="hidden" @change="$emit('import-history', $event.target.files[0])" />
        </label>
        <button @click="$emit('clear-history')" class="ml-auto px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-all">🗑️ 清空记录</button>
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
                <button @click="$emit('load-history', idx)" class="text-indigo-600 border border-indigo-600 bg-white rounded px-2 py-0.5 text-xs mr-1 hover:bg-indigo-50">加载</button>
                <button @click="$emit('delete-history', idx)" class="text-red-600 border border-red-600 bg-white rounded px-2 py-0.5 text-xs hover:bg-red-50">删除</button>
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

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  history: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:data', 'plot', 'export-history', 'import-history', 'clear-history', 'load-history', 'delete-history'])

const pasteText = ref('')
const localData = ref([...props.data])

// 仅在外部数据引用变化时同步（避免与内部编辑形成死循环）
watch(
  () => props.data,
  newVal => {
    // 只有当外部传入的是不同数组时才同步，防止自身 emit 触发的回写
    if (newVal !== localData.value) {
      localData.value = [...newVal]
    }
  }
)

// 使用 nextTick + flag 防止 emit 后立即被 prop watch 覆盖
let isInternalUpdate = false

watch(
  localData,
  newVal => {
    if (isInternalUpdate) return
    isInternalUpdate = true
    emit('update:data', [...newVal])
    // 等待父组件可能的响应后再重置标记
    setTimeout(() => { isInternalUpdate = false }, 0)
  },
  { deep: true }
)

function toFixed4(val) {
  return (typeof val === 'number' && !isNaN(val)) ? val.toFixed(4) : '0.0000'
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
</script>
