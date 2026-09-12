import { defineStore } from 'pinia'
import { ref } from 'vue'
import { calculateRLC } from '../utils/physics'

/**
 * 阻尼振荡实验(08 tab)电路搭建 Store —— 独立电路数据与仿真
 * 与 03 tab「电路搭建」的 rlcCalculator 完全独立:元件/导线/公差/仿真互不影响;
 * 3D 场景交互(拖入放置 / 拖动移动 / 端点接线 / 右键删除)统一经本 store 方法落数据,
 * 所有写操作均替换数组引用,经 props 回流触发 3D 场景全量重建(吸附导线、刷新焊盘)
 */
export const useDampingCircuitStore = defineStore('dampingCircuit', () => {
  // ===== 电路数据(独立一份) =====
  const components = ref([])
  const wires = ref([])
  const junctions = ref([]) // 3D 直接搭建不产生中间节点,保留字段以复用校验与渲染逻辑

  // 元件默认值与可调量程(与 03 tab 一致;滑线变阻器/可调电容仿真语义同 R/C)
  const DEFAULT_VALUES = { R: 100, RV: 100, L: 100, C: 0.05, CV: 0.05, V: 0.9 }
  const VALUE_RANGE = { RV: { min: 10, max: 1000 }, CV: { min: 0.005, max: 0.2 } }

  // ===== 公差设置(独立一份) =====
  const toleranceEnabled = ref(false)
  const tolerancePercent = ref(5)
  // 缓存当前仿真用的带公差值(避免每次读取时随机变化)
  let _toleranceCache = null

  function applyTolerance(values) {
    if (!toleranceEnabled.value) return values
    if (_toleranceCache) return _toleranceCache
    const offset = (Math.random() - 0.5) * 2 * (tolerancePercent.value / 100)
    _toleranceCache = {
      R: values.R * (1 + offset),
      L: values.L * (1 + offset),
      C: values.C * (1 + offset),
      V: values.V,
    }
    return _toleranceCache
  }

  function clearToleranceCache() {
    _toleranceCache = null
  }

  // ===== 仿真结果 =====
  // { success, message, params:{R,L,C,V}, fr, Q, BW, alpha, omega0, zeta, dampingType, tolerance }
  const simulation = ref(null)
  const simulated = ref(false)

  // ===== 搭建操作(全部替换数组引用) =====
  function makeEndpoints(x, y) {
    return [
      { x: x - 30, y, id: Date.now() + Math.random(), side: 'left' },
      { x: x + 30, y, id: Date.now() + Math.random() + 1, side: 'right' },
    ]
  }

  /**
   * 拖入放置:添加元件并返回新索引
   * @param {string} type 元件类型 R/RV/L/C/CV/V
   * @param {number} x 电路坐标 x
   * @param {number} y 电路坐标 y
   */
  function addComponent(type, x, y) {
    const comp = {
      type,
      x,
      y,
      id: Date.now() + Math.random(),
      value: DEFAULT_VALUES[type] || 0,
      endpoints: makeEndpoints(x, y),
    }
    components.value = [...components.value, comp]
    return components.value.length - 1
  }

  // 关联导线端点吸附:优先端点索引,缺省按旧坐标就近匹配(兼容无 ep 字段的旧数据)
  function pickEndpoint(newEps, oldEps, epIdx, refX, refY) {
    if (epIdx === 0 || epIdx === 1) return newEps[epIdx]
    const d0 = Math.hypot(refX - oldEps[0].x, refY - oldEps[0].y)
    const d1 = Math.hypot(refX - oldEps[1].x, refY - oldEps[1].y)
    return newEps[d0 <= d1 ? 0 : 1]
  }

  /**
   * 拖动移动:元件端点(±30)跟随新位置,关联导线端点坐标同步吸附
   */
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

  /**
   * 右键删除元件:清理关联导线,后续元件索引前移重排(导线 comp 引用同步修正)
   */
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

  /** 删除导线 */
  function removeWire(index) {
    wires.value = wires.value.filter((_, i) => i !== index)
  }

  /**
   * 端点接线:a/b = { compIndex, epIndex }
   * 拒绝同元件同端点自连;同一对端点的重复连线去重(拖动误触防护)
   */
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
    const wire = {
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
    }
    wires.value = [...wires.value, wire]
    return true
  }

  /** 参数面板修改元件值(按类型量程钳制) */
  function updateComponentValue(index, value) {
    const comp = components.value[index]
    if (!comp) return
    const num = parseFloat(value)
    if (isNaN(num)) return
    const range = VALUE_RANGE[comp.type]
    const v = range ? Math.min(Math.max(num, range.min), range.max) : num
    components.value = components.value.map((c, i) => (i === index ? { ...c, value: v } : c))
  }

  /** 清空电路(元件/导线/仿真结果/公差缓存) */
  function resetCircuit() {
    components.value = []
    wires.value = []
    junctions.value = []
    simulation.value = null
    simulated.value = false
    clearToleranceCache()
  }

  // ===== 校验 / 参数提取(自 03 tab 复制,以本 store 数据为源) =====
  function buildGraph() {
    const adj = new Map()
    const nodeComp = new Map()

    function nk(ci, ei) {
      return `${ci}-${ei}`
    }
    function addEdge(a, b) {
      if (!adj.has(a)) adj.set(a, new Set())
      if (!adj.has(b)) adj.set(b, new Set())
      adj.get(a).add(b)
      adj.get(b).add(a)
    }

    // 元件内部边
    for (let ci = 0; ci < components.value.length; ci++) {
      const comp = components.value[ci]
      const k0 = nk(ci, 0),
        k1 = nk(ci, 1)
      addEdge(k0, k1)
      nodeComp.set(k0, { compIndex: ci, type: comp.type, value: comp.value })
      nodeComp.set(k1, { compIndex: ci, type: comp.type, value: comp.value })
    }

    // 导线边
    for (const wire of wires.value) {
      const k1 = resolveWireNode(wire.comp1, wire.ep1, wire.junc1)
      const k2 = resolveWireNode(wire.comp2, wire.ep2, wire.junc2)
      addEdge(k1, k2)
    }

    return { adj, nodeComp, nk }
  }

  /**
   * 解析导线端点为图节点 key
   * juncIdx >= 0 表示中间节点,否则用元件端点(epIdx 精确指定,缺省按坐标就近)
   */
  function resolveWireNode(compIdx, epIdx, juncIdx) {
    if (juncIdx !== undefined && juncIdx >= 0 && juncIdx < junctions.value.length) {
      return `j-${juncIdx}`
    }
    if (compIdx >= 0 && compIdx < components.value.length) {
      return `${compIdx}-${epIdx === 1 ? 1 : 0}`
    }
    return 'unknown'
  }

  /** 验证电路是否形成有效闭合回路(需含信号源 V) */
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
        if (cur === end) {
          found = true
          break
        }
        const neighbors = adj.get(cur)
        if (!neighbors) continue
        for (const nb of neighbors) {
          // 跳过 V 自身内部边
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

  /** 基于实际连线拓扑提取电路参数(串联等效 R 求和、C 倒数和;含公差应用) */
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

    // BFS 找路径
    const parent = new Map()
    const visited = new Set([start])
    const queue = [start]
    let found = false
    while (queue.length > 0 && !found) {
      const cur = queue.shift()
      if (cur === end) {
        found = true
        break
      }
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
    let R_total = 0,
      L_total = 0,
      C_inv_total = 0

    for (let i = 0; i < pathNodes.length - 1; i++) {
      const a = pathNodes[i],
        b = pathNodes[i + 1]
      const infoA = nodeComp.get(a),
        infoB = nodeComp.get(b)
      if (infoA && infoB && infoA.compIndex === infoB.compIndex && !visitedComps.has(infoA.compIndex)) {
        visitedComps.add(infoA.compIndex)
        const comp = components.value[infoA.compIndex]
        if (comp.type === 'R' || comp.type === 'RV') R_total += comp.value
        else if (comp.type === 'L') L_total += comp.value
        else if ((comp.type === 'C' || comp.type === 'CV') && comp.value > 0) C_inv_total += 1 / comp.value
      }
    }

    const C = C_inv_total > 0 ? 1 / C_inv_total : 0
    const raw = { R: R_total, L: L_total, C, V }
    return applyTolerance(raw)
  }

  /**
   * 仿真:校验回路 → 提取参数 → 计算谐振/阻尼振荡特征量
   * 阻尼振荡特征量(L: mH → SI; C: μF → SI):
   *   α = R/2L(衰减系数,rad/s)、ω0 = 1/√(LC)(固有角频率)、ζ = α/ω0(阻尼比)
   *   ζ<1 欠阻尼(衰减振荡) / ζ=1 临界阻尼 / ζ>1 过阻尼
   */
  function simulate() {
    const validation = validateCircuit()
    if (!validation.valid) {
      simulation.value = { success: false, message: validation.message }
      simulated.value = false
      return { success: false, message: validation.message }
    }
    clearToleranceCache()
    const ep = extractCircuitParams()
    if (ep.error) {
      simulation.value = { success: false, message: ep.error }
      simulated.value = false
      return { success: false, message: ep.error }
    }
    const { R, L, C, V } = ep
    const base = calculateRLC(R, L, C, V)
    const Lh = L * 1e-3
    const Cf = C * 1e-6
    const omega0 = Lh > 0 && Cf > 0 ? 1 / Math.sqrt(Lh * Cf) : 0
    const alpha = Lh > 0 ? R / (2 * Lh) : 0
    const zeta = omega0 > 0 ? alpha / omega0 : Infinity
    const dampingType = zeta > 1 ? 'over' : zeta === 1 ? 'critical' : 'under'
    const message = '仿真完成:已从实际连线拓扑提取等效参数'
    simulation.value = {
      success: true,
      message,
      params: { R, L, C, V },
      fr: base.fr,
      Q: base.Q,
      BW: base.BW,
      alpha,
      omega0,
      zeta,
      dampingType,
      tolerance: toleranceEnabled.value
        ? { enabled: true, percent: tolerancePercent.value }
        : { enabled: false, percent: 0 },
    }
    simulated.value = true
    return { success: true, message }
  }

  return {
    components,
    wires,
    junctions,
    DEFAULT_VALUES,
    VALUE_RANGE,
    toleranceEnabled,
    tolerancePercent,
    simulation,
    simulated,
    applyTolerance,
    clearToleranceCache,
    addComponent,
    moveComponent,
    removeComponent,
    removeWire,
    connectEndpoints,
    updateComponentValue,
    resetCircuit,
    validateCircuit,
    extractCircuitParams,
    simulate,
  }
})
