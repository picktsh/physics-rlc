import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { calculateRLC, generateAmpCurve, generatePhaseCurve, generateImpedanceCurve } from '../utils/physics'

/**
 * RLC 计算器 Store - 管理电路参数、计算结果和曲线数据
 */
export const useRLCCalculatorStore = defineStore('rlcCalculator', () => {
  // 电路参数
  const params = reactive({
    R: 100,
    L: 100,
    C: 0.05,
    V: 0.9,
    fStart: 1400,
    fEnd: 3200,
  })

  // 计算结果
  const results = reactive({
    fr: 0,
    Q: 0,
    BW: 0,
    Imax: 0,
    halfPower: 0,
    f1: 0,
    f2: 0,
  })

  // 曲线数据
  const ampCurveData = ref([])
  const phaseCurveData = ref([])
  const impedanceCurveData = ref([])

  // 电路搭建状态
  const components = ref([])
  const wires = ref([])
  const junctions = ref([]) // 导线中间节点 {x, y, id}
  const circuitMode = ref('wire')

  // 标记是否已通过电路搭建执行仿真（初始默认不显示曲线）
  const simulated = ref(false)

  // 实测数据
  const measuredData = ref([])

  function calculate() {
    const { R, L, C, V } = params
    Object.assign(results, calculateRLC(R, L, C, V))
    generateCurves()
  }

  function generateCurves() {
    const { R, L, C, V, fStart, fEnd } = params
    ampCurveData.value = generateAmpCurve(R, L, C, V, fStart, fEnd)
    phaseCurveData.value = generatePhaseCurve(R, L, C, fStart, fEnd)
    impedanceCurveData.value = generateImpedanceCurve(R, L, C, fStart, fEnd)
  }

  function updateParams(newParams) {
    Object.assign(params, newParams)
    calculate()
  }

  function resetParams() {
    params.R = 100
    params.L = 100
    params.C = 0.05
    params.V = 0.9
    params.fStart = 1400
    params.fEnd = 3200
    calculate()
  }

  /**
   * 构建电路拓扑图
   * 节点 = 每个端点 (compIndex, epIndex)
   * 边 = 导线 + 元件内部连接
   */
  function buildGraph() {
    const adj = new Map()
    const nodeComp = new Map()

    function nk(ci, ei) { return `${ci}-${ei}` }
    function addEdge(a, b) {
      if (!adj.has(a)) adj.set(a, new Set())
      if (!adj.has(b)) adj.set(b, new Set())
      adj.get(a).add(b)
      adj.get(b).add(a)
    }

    // 元件内部边
    for (let ci = 0; ci < components.value.length; ci++) {
      const comp = components.value[ci]
      const k0 = nk(ci, 0), k1 = nk(ci, 1)
      addEdge(k0, k1)
      nodeComp.set(k0, { compIndex: ci, type: comp.type, value: comp.value })
      nodeComp.set(k1, { compIndex: ci, type: comp.type, value: comp.value })
    }

    // 导线边（支持junction中间节点）
    for (const wire of wires.value) {
      const k1 = resolveWireNode(wire.comp1, wire.junc1, wire.x1, wire.y1)
      const k2 = resolveWireNode(wire.comp2, wire.junc2, wire.x2, wire.y2)
      addEdge(k1, k2)
    }

    return { adj, nodeComp, nk }
  }

  function getEpIndex(compIndex, x, y) {
    if (compIndex < 0 || compIndex >= components.value.length) return 0
    const comp = components.value[compIndex]
    if (!comp) return 0
    const d0 = Math.sqrt((x - comp.endpoints[0].x) ** 2 + (y - comp.endpoints[0].y) ** 2)
    const d1 = Math.sqrt((x - comp.endpoints[1].x) ** 2 + (y - comp.endpoints[1].y) ** 2)
    return d0 <= d1 ? 0 : 1
  }

  /**
   * 解析导线端点为图节点key
   * juncIdx >= 0 表示junction节点，否则用元件端点
   */
  function resolveWireNode(compIdx, juncIdx, x, y) {
    if (juncIdx !== undefined && juncIdx >= 0 && juncIdx < junctions.value.length) {
      return `j-${juncIdx}`
    }
    if (compIdx >= 0 && compIdx < components.value.length) {
      const ei = getEpIndex(compIdx, x, y)
      return `${compIdx}-${ei}`
    }
    // fallback: 通过坐标匹配junction
    for (let ji = 0; ji < junctions.value.length; ji++) {
      const j = junctions.value[ji]
      if (Math.sqrt((x - j.x) ** 2 + (y - j.y) ** 2) < 5) {
        return `j-${ji}`
      }
    }
    return 'unknown'
  }

  /**
   * 验证电路是否形成有效闭合回路
   */
  function validateCircuit() {
    if (components.value.length === 0 || wires.value.length === 0) {
      return { valid: false, message: '请先放置元件并用导线连接成闭合回路' }
    }
    const vIndices = []
    for (let i = 0; i < components.value.length; i++) {
      if (components.value[i].type === 'V') vIndices.push(i)
    }
    if (vIndices.length === 0) {
      return { valid: false, message: '电路中缺少信号源 V' }
    }

    const { adj, nk } = buildGraph()

    for (const vi of vIndices) {
      const start = nk(vi, 0)
      const end = nk(vi, 1)
      const visited = new Set([start])
      const queue = [start]
      let found = false
      while (queue.length > 0) {
        const cur = queue.shift()
        if (cur === end) { found = true; break }
        const neighbors = adj.get(cur)
        if (!neighbors) continue
        for (const nb of neighbors) {
          // 跳过V自身内部边
          if ((cur === start && nb === end) || (cur === end && nb === start)) continue
          if (!visited.has(nb)) {
            visited.add(nb)
            queue.push(nb)
          }
        }
      }
      if (found) return { valid: true, sourceIndex: vi }
    }

    return { valid: false, message: '电路未形成闭合回路，请用导线将所有元件连成完整环路' }
  }

  /**
   * 基于实际连线拓扑提取电路参数
   */
  function extractCircuitParams() {
    const validation = validateCircuit()
    if (!validation.valid) {
      return { R: 0, L: 0, C: 0, V: 5, error: validation.message }
    }

    const { adj, nodeComp, nk } = buildGraph()
    const vi = validation.sourceIndex
    const V = components.value[vi].value || 5
    const start = nk(vi, 0)
    const end = nk(vi, 1)

    // BFS找路径
    const parent = new Map()
    const visited = new Set([start])
    const queue = [start]
    let found = false
    while (queue.length > 0 && !found) {
      const cur = queue.shift()
      if (cur === end) { found = true; break }
      const neighbors = adj.get(cur)
      if (!neighbors) continue
      for (const nb of neighbors) {
        if ((cur === start && nb === end) || (cur === end && nb === start)) continue
        if (!visited.has(nb)) {
          visited.add(nb)
          parent.set(nb, cur)
          queue.push(nb)
        }
      }
    }

    if (!found) return { R: 0, L: 0, C: 0, V, error: '无法找到有效回路' }

    // 回溯路径收集元件
    const pathNodes = []
    let cur = end
    while (cur !== start) {
      pathNodes.unshift(cur)
      cur = parent.get(cur)
    }
    pathNodes.unshift(start)

    const visitedComps = new Set([vi])
    let R_total = 0, L_total = 0, C_inv_total = 0

    for (let i = 0; i < pathNodes.length - 1; i++) {
      const a = pathNodes[i], b = pathNodes[i + 1]
      const infoA = nodeComp.get(a), infoB = nodeComp.get(b)
      if (infoA && infoB && infoA.compIndex === infoB.compIndex && !visitedComps.has(infoA.compIndex)) {
        visitedComps.add(infoA.compIndex)
        const comp = components.value[infoA.compIndex]
        if (comp.type === 'R') R_total += comp.value
        else if (comp.type === 'L') L_total += comp.value
        else if (comp.type === 'C' && comp.value > 0) C_inv_total += 1 / comp.value
      }
    }

    const C = C_inv_total > 0 ? 1 / C_inv_total : 0
    return { R: R_total, L: L_total, C, V }
  }

  function simulate() {
    const validation = validateCircuit()
    if (!validation.valid) {
      return { success: false, message: validation.message }
    }
    const ep = extractCircuitParams()
    if (ep.error) {
      return { success: false, message: ep.error }
    }
    updateParams(ep)
    simulated.value = true
    return { success: true }
  }

  function resetCircuit() {
    components.value = []
    wires.value = []
    junctions.value = []
    circuitMode.value = 'wire'
    measuredData.value = []
    simulated.value = false
    resetParams()
  }

  // 初始化计算
  calculate()

  return {
    params,
    results,
    ampCurveData,
    phaseCurveData,
    impedanceCurveData,
    components,
    wires,
    junctions,
    circuitMode,
    measuredData,
    simulated,
    calculate,
    updateParams,
    resetParams,
    simulate,
    resetCircuit,
    extractCircuitParams,
    validateCircuit,
  }
})
