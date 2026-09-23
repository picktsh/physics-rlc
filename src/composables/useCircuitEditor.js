import { ref } from 'vue'
import { DEFAULT_VALUES } from '@/components/circuit-elements/parts/registry.js'

// 纯结构编辑状态工厂(Phase 3 builder 层种子):拖放/移动/接线/删除/改值。
// 只承载"电路拓扑与几何"的编辑语义,不含仿真/公差/波形业务(那些归各页 store)。
// 说明:数据沿用 v1 索引模型(wire.comp1/comp2 为数组下标);稳定 ID 引用改造与
// 两页(rlcCalculator / dampingCircuit)迁移统一属 Phase 2/3,需对既有持久化数据做迁移。

// 可调量程(编辑层口径;Phase 2 拟随数据层统一下沉)
const VALUE_RANGE = { RV: { min: 10, max: 1000 }, CV: { min: 0.005, max: 0.2 } }
// 信号源默认附加参数(与阻尼页一致,使 3D 波形屏有初值)
const DEFAULT_SIGNAL = { frequency: 0.1, waveform: 'sine', dutyCycle: 50, period: 10, pulseWidth: 5 }

export function useCircuitEditor() {
  const components = ref([])
  const wires = ref([])
  const junctions = ref([])

  const makeEndpoints = (x, y) => [
    { x: x - 30, y, id: crypto.randomUUID(), side: 'left' },
    { x: x + 30, y, id: crypto.randomUUID(), side: 'right' },
  ]

  function addComponent(type, x, y) {
    const comp = { type, x, y, id: crypto.randomUUID(), value: DEFAULT_VALUES[type] ?? 0, endpoints: makeEndpoints(x, y) }
    if (type === 'V') Object.assign(comp, { ...DEFAULT_SIGNAL })
    components.value = [...components.value, comp]
    return components.value.length - 1
  }

  // 端点吸附:优先端点索引,缺省按旧坐标就近匹配(兼容拖动时导线端引用不齐)
  function pickEndpoint(newEps, oldEps, epIdx, refX, refY) {
    if (epIdx === 0 || epIdx === 1) return newEps[epIdx]
    const d0 = Math.hypot(refX - oldEps[0].x, refY - oldEps[0].y)
    const d1 = Math.hypot(refX - oldEps[1].x, refY - oldEps[1].y)
    return newEps[d0 <= d1 ? 0 : 1]
  }

  function moveComponent(index, x, y) {
    const old = components.value[index]
    if (!old) return
    const endpoints = makeEndpoints(x, y)
    wires.value = wires.value.map((w) => {
      const touchA = w.comp1 === index
      const touchB = w.comp2 === index
      if (!touchA && !touchB) return w
      let { x1, y1, x2, y2 } = w
      if (touchA) {
        const ep = pickEndpoint(endpoints, old.endpoints, w.ep1, w.x1, w.y1)
        x1 = ep.x
        y1 = ep.y
      }
      if (touchB) {
        const ep = pickEndpoint(endpoints, old.endpoints, w.ep2, w.x2, w.y2)
        x2 = ep.x
        y2 = ep.y
      }
      return { ...w, x1, y1, x2, y2, points: [{ x: x1, y: y1 }, { x: x2, y: y2 }] }
    })
    components.value = components.value.map((c, i) => (i === index ? { ...c, x, y, endpoints } : c))
  }

  function removeComponent(index) {
    if (index < 0 || index >= components.value.length) return
    components.value = components.value.filter((_, i) => i !== index)
    wires.value = wires.value
      .filter((w) => w.comp1 !== index && w.comp2 !== index)
      .map((w) => ({
        ...w,
        comp1: w.comp1 > index ? w.comp1 - 1 : w.comp1,
        comp2: w.comp2 > index ? w.comp2 - 1 : w.comp2,
      }))
  }

  function removeWire(index) {
    wires.value = wires.value.filter((_, i) => i !== index)
  }

  function connectEndpoints(a, b) {
    const compA = components.value[a.compIndex]
    const compB = components.value[b.compIndex]
    if (!compA || !compB) return false
    if (a.compIndex === b.compIndex && a.epIndex === b.epIndex) return false
    const epA = compA.endpoints[a.epIndex]
    const epB = compB.endpoints[b.epIndex]
    if (!epA || !epB) return false
    const dup = wires.value.some(
      (w) =>
        (w.comp1 === a.compIndex && w.ep1 === a.epIndex && w.comp2 === b.compIndex && w.ep2 === b.epIndex) ||
        (w.comp1 === b.compIndex && w.ep1 === b.epIndex && w.comp2 === a.compIndex && w.ep2 === a.epIndex)
    )
    if (dup) return false
    wires.value = [
      ...wires.value,
      {
        x1: epA.x,
        y1: epA.y,
        x2: epB.x,
        y2: epB.y,
        points: [
          { x: epA.x, y: epA.y },
          { x: epB.x, y: epB.y },
        ],
        comp1: a.compIndex,
        ep1: a.epIndex,
        comp2: b.compIndex,
        ep2: b.epIndex,
        junc1: -1,
        junc2: -1,
      },
    ]
    return true
  }

  function updateComponentValue(index, value) {
    const comp = components.value[index]
    if (!comp) return
    const num = parseFloat(value)
    if (Number.isNaN(num)) return
    const range = VALUE_RANGE[comp.type]
    const v = range ? Math.min(Math.max(num, range.min), range.max) : num
    components.value = components.value.map((c, i) => (i === index ? { ...c, value: v } : c))
  }

  function reset() {
    components.value = []
    wires.value = []
    junctions.value = []
  }

  return {
    components,
    wires,
    junctions,
    addComponent,
    moveComponent,
    removeComponent,
    removeWire,
    connectEndpoints,
    updateComponentValue,
    reset,
  }
}
