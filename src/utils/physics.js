/**
 * RLC电路物理计算工具函数
 *
 * 单位口径(与 utils/quantity.js 的 QUANTITY 总表一致,2026-09 起全站统一):
 *   R Ω · L H · C μF · f kHz · V V · 电流输出 mA · fr/BW/f1/f2 输出 kHz
 * 本文件是全站唯一的「域单位 → SI」换算点(仅 C×1e-6、f×1e3);
 * 存储/编辑/展示层不做任何换算,单一数据源防口径漂移。
 */

/**
 * 计算角频率
 * @param {number} f_kHz - 频率 (kHz)
 * @returns {number} 角频率 (rad/s)
 */
export function omega(f_kHz) {
  return 2 * Math.PI * f_kHz * 1e3
}

/**
 * 计算阻抗和相位
 * @param {number} R - 电阻 (Ω)
 * @param {number} L_H - 电感 (H)
 * @param {number} C_uF - 电容 (μF)
 * @param {number} f_kHz - 频率 (kHz)
 * @returns {Object} { Z, phi, XL, XC }
 */
export function impedance(R, L_H, C_uF, f_kHz) {
  const w = omega(f_kHz)
  const C = C_uF * 1e-6
  const XL = w * L_H
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
 * @param {number} L_H - 电感 (H)
 * @param {number} C_uF - 电容 (μF)
 * @returns {number} 谐振频率 (kHz)
 */
export function resonantFreq(L_H, C_uF) {
  const C = C_uF * 1e-6
  if (L_H <= 0 || C <= 0) return 0
  return 1 / (2 * Math.PI * Math.sqrt(L_H * C)) / 1e3
}

/**
 * 计算RLC电路特性参数
 * @param {number} R - 电阻 (Ω)
 * @param {number} L_H - 电感 (H)
 * @param {number} C_uF - 电容 (μF)
 * @param {number} V - 电压 (V)
 * @returns {Object} { fr, Q, BW, Imax, halfPower, f1, f2 } — 频率类均为 kHz,电流 mA
 */
export function calculateRLC(R, L_H, C_uF, V) {
  const C = C_uF * 1e-6

  if (L_H <= 0 || C <= 0 || R <= 0) {
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

  const omega0 = 1 / Math.sqrt(L_H * C)
  const fr = omega0 / (2 * Math.PI) / 1e3 // kHz
  const Q = (omega0 * L_H) / R
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
 * @param {number} L_H - 电感 (H)
 * @param {number} C_uF - 电容 (μF)
 * @param {number} V - 电压 (V)
 * @param {number} fStart - 起始频率 (kHz)
 * @param {number} fEnd - 终止频率 (kHz)
 * @param {number} points - 采样点数
 * @returns {Array} [{ f(kHz), I(mA), Z(Ω), phase(°) }]
 */
export function generateAmpCurve(R, L_H, C_uF, V, fStart, fEnd, points = 500) {
  const data = []
  for (let i = 0; i <= points; i++) {
    const f = fStart + ((fEnd - fStart) * i) / points
    const z = impedance(R, L_H, C_uF, f)
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
 * @param {number} L_H - 电感 (H)
 * @param {number} C_uF - 电容 (μF)
 * @param {number} fStart - 起始频率 (kHz)
 * @param {number} fEnd - 终止频率 (kHz)
 * @param {number} points - 采样点数
 * @returns {Array} [{ f(kHz), phase(°) }]
 */
export function generatePhaseCurve(R, L_H, C_uF, fStart, fEnd, points = 500) {
  const data = []
  for (let i = 0; i <= points; i++) {
    const f = fStart + ((fEnd - fStart) * i) / points
    const z = impedance(R, L_H, C_uF, f)
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
 * @param {number} L_H - 电感 (H)
 * @param {number} C_uF - 电容 (μF)
 * @param {number} fStart - 起始频率 (kHz)
 * @param {number} fEnd - 终止频率 (kHz)
 * @param {number} points - 采样点数
 * @returns {Array} [{ f(kHz), Z(Ω) }]
 */
export function generateImpedanceCurve(R, L_H, C_uF, fStart, fEnd, points = 500) {
  const data = []
  for (let i = 0; i <= points; i++) {
    const f = fStart + ((fEnd - fStart) * i) / points
    const z = impedance(R, L_H, C_uF, f)
    data.push({
      f,
      Z: z.Z,
    })
  }
  return data
}
