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
  const circuitMode = ref('wire')

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

  function extractCircuitParams() {
    let R = 0, L = 0, C_inv = 0, V = 5
    for (const comp of components.value) {
      const v = comp.value
      if (comp.type === 'R') R += v
      else if (comp.type === 'L') L += v
      else if (comp.type === 'C' && v > 0) C_inv += 1 / v
      else if (comp.type === 'V') V = v
    }
    const C = C_inv > 0 ? 1 / C_inv : 0
    return { R, L, C, V }
  }

  function simulate() {
    const hasV = components.value.some(c => c.type === 'V')
    if (!hasV) return false
    const ep = extractCircuitParams()
    updateParams(ep)
    return true
  }

  function resetCircuit() {
    components.value = []
    wires.value = []
    circuitMode.value = 'wire'
    measuredData.value = []
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
    circuitMode,
    measuredData,
    calculate,
    updateParams,
    resetParams,
    simulate,
    resetCircuit,
    extractCircuitParams,
  }
})
