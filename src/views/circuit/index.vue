<script setup>
// 电路搭建页:2D/3D 拖拽建电路 + 仿真。仿真成功后自动落一条历史记录(迁自旧 home/index.vue)。
import CircuitBoard from './components/CircuitBoard.vue'
import { useRLCCalculatorStore } from '@/stores/rlcCalculator'
import { useHistoryStore } from '@/stores/historyDB'

const calcStore = useRLCCalculatorStore()
const historyStore = useHistoryStore()

function handleSimulate() {
  const result = calcStore.simulate()
  if (!result.success) {
    alert(result.message || '请先拖拽元件搭建RLC电路，至少需要一个信号源V')
    return
  }
  historyStore.saveSimulationRecord({
    params: { ...calcStore.params },
    results: { ...calcStore.results },
  })
}
</script>

<template>
  <section class="rounded-lg bg-[var(--card-bg)] p-16px shadow-[var(--card-shadow)] mb-4">
    <h2
      class="text-16px font-bold leading-normal tracking-[0.5px] text-[var(--ink)] [font-family:var(--font-head)] border-l-4 border-l-[var(--navy)] mb-16px"
    >
      电路搭建与仿真
    </h2>
    <!-- 操作提示:置于板块标题下方,与工具栏行分开 -->
    <p class="-mt-10px mb-12px text-xs leading-5 text-gray-500">
      拖拽元件到画布搭建 RLC 电路 · 点击元件编辑参数 · 接线模式:点端点→加拐点→点目标端点完成折线 ·
      删除模式:点元件/导线删除 · 3D 视图空白拖拽旋转 · 滚轮缩放
    </p>
    <CircuitBoard
      v-model:components="calcStore.components"
      v-model:wires="calcStore.wires"
      v-model:junctions="calcStore.junctions"
      v-model:mode="calcStore.circuitMode"
      @simulate="handleSimulate"
      @reset="calcStore.resetCircuit()"
    />
  </section>
</template>
