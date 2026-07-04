import { ref, computed } from 'vue'
import { calculateRLC, generateAmpCurve, generatePhaseCurve, generateImpedanceCurve } from '../utils/physics'

/**
 * RLC计算器 Composable
 */
export function useRLCCalculator() {
  // 电路参数
  const params = ref({
    R: 100,
    L: 10,
    C: 1,
    V: 5,
    fStart: 100,
    fEnd: 2000,
  })

  // 计算结果
  const results = ref({
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

  /**
   * 执行计算
   */
  function calculate() {
    const { R, L, C, V } = params.value
    results.value = calculateRLC(R, L, C, V)
    generateCurves()
  }

  /**
   * 生成曲线数据
   */
  function generateCurves() {
    const { R, L, C, V, fStart, fEnd } = params.value
    ampCurveData.value = generateAmpCurve(R, L, C, V, fStart, fEnd)
    phaseCurveData.value = generatePhaseCurve(R, L, C, fStart, fEnd)
    impedanceCurveData.value = generateImpedanceCurve(R, L, C, fStart, fEnd)
  }

  /**
   * 更新参数并重新计算
   */
  function updateParams(newParams) {
    params.value = { ...params.value, ...newParams }
    calculate()
  }

  /**
   * 重置参数为默认值
   */
  function resetParams() {
    params.value = {
      R: 100,
      L: 10,
      C: 1,
      V: 5,
      fStart: 100,
      fEnd: 2000,
    }
    calculate()
  }

  // 初始化时计算一次
  calculate()

  return {
    params,
    results,
    ampCurveData,
    phaseCurveData,
    impedanceCurveData,
    calculate,
    updateParams,
    resetParams,
  }
}
