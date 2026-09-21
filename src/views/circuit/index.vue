<script setup>
// 电路搭建页:2D/3D 拖拽建电路 + 仿真。仿真成功后自动落一条历史记录(迁自旧 home/index.vue)。
import CircuitBoard from './components/CircuitBoard.vue'
import { useMessage } from 'naive-ui'
import { useRLCCalculatorStore } from '@/stores/rlcCalculator'
import { useHistoryStore } from '@/stores/historyDB'

const calcStore = useRLCCalculatorStore()
const historyStore = useHistoryStore()
const message = useMessage()

function handleSimulate() {
  const result = calcStore.simulate()
  if (!result.success) {
    message.warning(result.message || '请先拖拽元件搭建RLC电路，至少需要一个信号源V')
    return
  }
  historyStore.saveSimulationRecord({
    params: { ...calcStore.params },
    results: { ...calcStore.results },
  })
}
</script>

<template>
  <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] mb-4">
    <h2
      class="text-base font-bold leading-normal tracking-[0.5px] text-[var(--app-text)] [font-family:var(--app-font-heading)] border-l-4 border-l-[var(--app-brand)] mb-4"
    >
      电路搭建与仿真
    </h2>
    <!-- 操作提示:置于板块标题下方,与工具栏行分开 -->
    <p class="-mt-2 mb-3 text-xs leading-5 text-[color:var(--app-text-muted)]">
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
