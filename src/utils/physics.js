/**
 * RLC电路物理计算工具函数
 */

/**
 * 计算角频率
 * @param {number} f - 频率 (Hz)
 * @returns {number} 角频率 (rad/s)
 */
export function omega(f) {
  return 2 * Math.PI * f
}

/**
 * 计算阻抗和相位
 * @param {number} R - 电阻 (Ω)
 * @param {number} L_mH - 电感 (mH)
 * @param {number} C_uF - 电容 (μF)
 * @param {number} f - 频率 (Hz)
 * @returns {Object} { Z, phi, XL, XC }
 */
export function impedance(R, L_mH, C_uF, f) {
  const w = omega(f)
  const L = L_mH * 1e-3
  const C = C_uF * 1e-6
  const XL = w * L
  const XC = 1 / (w * C)
  const Z = Math.sqrt(R * R + (XL - XC) ** 2)
  const phi = Math.atan2(XL - XC, R) * (180 / Math.PI)
  return { Z, phi, XL, XC }
}

/**
 * 计算电流
 * @param {number} V - 电压 (V)
 * @param {number} Z - 阻抗 (Ω)
 * @returns {number} 电流 (mA)
 */
export function current(V, Z) {
  return (V / Z) * 1000
}

/**
 * 计算谐振频率
 * @param {number} L_mH - 电感 (mH)
 * @param {number} C_uF - 电容 (μF)
 * @returns {number} 谐振频率 (Hz)
 */
export function resonantFreq(L_mH, C_uF) {
  const L = L_mH * 1e-3
  const C = C_uF * 1e-6
  if (L <= 0 || C <= 0) return 0
  return 1 / (2 * Math.PI * Math.sqrt(L * C))
}

/**
 * 计算RLC电路特性参数
 * @param {number} R - 电阻 (Ω)
 * @param {number} L_mH - 电感 (mH)
 * @param {number} C_uF - 电容 (μF)
 * @param {number} V - 电压 (V)
 * @returns {Object} { fr, Q, BW, Imax, halfPower, f1, f2 }
 */
export function calculateRLC(R, L_mH, C_uF, V) {
  const L = L_mH * 1e-3
  const C = C_uF * 1e-6

  if (L <= 0 || C <= 0 || R <= 0) {
    return {
      fr: 0,
      Q: 0,
      BW: 0,
      Imax: 0,
      halfPower: 0,
      f1: 0,
      f2: 0,
    }
  }

  const omega0 = 1 / Math.sqrt(L * C)
  const fr = omega0 / (2 * Math.PI)
  const Q = (omega0 * L) / R
  const BW = fr / Q
  const Imax = (V / R) * 1000
  const halfPower = Imax / Math.sqrt(2)
  const f1 = fr - BW / 2
  const f2 = fr + BW / 2

  return {
    fr,
    Q,
    BW,
    Imax,
    halfPower,
    f1,
    f2,
  }
}

/**
 * 生成幅频特性曲线数据
 * @param {number} R - 电阻 (Ω)
 * @param {number} L_mH - 电感 (mH)
 * @param {number} C_uF - 电容 (μF)
 * @param {number} V - 电压 (V)
 * @param {number} fStart - 起始频率 (Hz)
 * @param {number} fEnd - 终止频率 (Hz)
 * @param {number} points - 采样点数
 * @returns {Array} [{ f, I, Z, phase }]
 */
export function generateAmpCurve(R, L_mH, C_uF, V, fStart, fEnd, points = 500) {
  const data = []
  for (let i = 0; i <= points; i++) {
    const f = fStart + ((fEnd - fStart) * i) / points
    const z = impedance(R, L_mH, C_uF, f)
    const I = current(V, z.Z)
    data.push({
      f,
      I,
      Z: z.Z,
      phase: z.phi,
    })
  }
  return data
}

/**
 * 生成相频特性曲线数据
 * @param {number} R - 电阻 (Ω)
 * @param {number} L_mH - 电感 (mH)
 * @param {number} C_uF - 电容 (μF)
 * @param {number} fStart - 起始频率 (Hz)
 * @param {number} fEnd - 终止频率 (Hz)
 * @param {number} points - 采样点数
 * @returns {Array} [{ f, phase }]
 */
export function generatePhaseCurve(R, L_mH, C_uF, fStart, fEnd, points = 500) {
  const data = []
  for (let i = 0; i <= points; i++) {
    const f = fStart + ((fEnd - fStart) * i) / points
    const z = impedance(R, L_mH, C_uF, f)
    data.push({
      f,
      phase: z.phi,
    })
  }
  return data
}

/**
 * 生成阻抗模特性曲线数据
 * @param {number} R - 电阻 (Ω)
 * @param {number} L_mH - 电感 (mH)
 * @param {number} C_uF - 电容 (μF)
 * @param {number} fStart - 起始频率 (Hz)
 * @param {number} fEnd - 终止频率 (Hz)
 * @param {number} points - 采样点数
 * @returns {Array} [{ f, Z }]
 */
export function generateImpedanceCurve(R, L_mH, C_uF, fStart, fEnd, points = 500) {
  const data = []
  for (let i = 0; i <= points; i++) {
    const f = fStart + ((fEnd - fStart) * i) / points
    const z = impedance(R, L_mH, C_uF, f)
    data.push({
      f,
      Z: z.Z,
    })
  }
  return data
}
