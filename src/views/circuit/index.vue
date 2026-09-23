<script setup>
// 电路搭建页:2D/3D 拖拽建电路 + 仿真。仿真成功后自动落一条历史记录(迁自旧 home/index.vue)。
import { useRouter } from 'vue-router'
import CircuitBoard from './components/CircuitBoard.vue'
import SimulationHistory from '@/views/analysis/components/SimulationHistory.vue'
import { useMessage } from 'naive-ui'
import { useRLCCalculatorStore } from '@/stores/rlcCalculator'
import { useHistoryStore } from '@/stores/historyDB'

const calcStore = useRLCCalculatorStore()
const historyStore = useHistoryStore()
const message = useMessage()
const router = useRouter()

function handleSimulate() {
  const result = calcStore.simulate()
  if (!result.success) {
    message.warning(result.message || '请先拖拽元件搭建RLC电路，至少需要一个信号源V')
    return
  }
  // 记录同时存一份电路拓扑,供后续加载时重建画布(不仅回填参数)
  const r = historyStore.saveSimulationRecord({
    params: { ...calcStore.params },
    results: { ...calcStore.results },
    circuit: {
      components: JSON.parse(JSON.stringify(calcStore.components)),
      wires: JSON.parse(JSON.stringify(calcStore.wires)),
      junctions: JSON.parse(JSON.stringify(calcStore.junctions)),
    },
  })
  if (r.deduped) {
    // 完全相同的配置不重复入库,仅选中已有那条
    message.info('该配置已存在历史记录,已为你选中')
    return
  }
  // 本页无仿真结果可视化;轻提示只做即时反馈,跳转入口是工具栏常驻的「数据分析」按钮
  message.success('仿真完成！已存入下方历史记录，点工具栏「数据分析」查看曲线与判定')
}

// 清空画布 = 放弃当前电路:同时取消选中记录,否则刷新时 restoreSelected 会按选中项把电路回填回来
function handleReset() {
  calcStore.resetCircuit()
  historyStore.setSelectedSim(null)
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
      @analyze="router.push('/data-analysis')"
      @reset="handleReset"
    />
  </section>

  <!-- 仿真历史:与数据分析页共用同一组件;点行/加载即回填电路与参数,可在此基础上改值重仿 -->
  <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] mb-4">
    <SimulationHistory />
  </section>
</template>
