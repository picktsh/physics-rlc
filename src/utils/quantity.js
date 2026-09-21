// 全站物理量「单位 + 小数精度」单一数据源:元件参数编辑器与结果/表格展示共用,避免各处 toFixed 漂移。
// 收编范围(有边界,按团队约定):
//   ① 元件参数编辑(R/RV/L/C/CV/V)的单位 / 精度 / 步长;
//   ② 结果与表格展示的固定小数位(目前仅登记「品质因数 Q = 2 位」,其余量沿用调用处默认)。
// 画布内瞬态读数(damping 曲线上的 V、tuner 的 dB、坐标轴刻度等)口径不同,故不纳入本模块。

// 元件参数编辑:precision=显示固定小数位,step=键盘上下步长,unit=显示单位;
// scale=内部存储单位 ÷ 显示单位的倍数(电感内部按 mH 参与物理计算,编辑以 H 展示,故 1000)。
export const COMPONENT_VALUE_CONFIG = {
  R: { precision: 1, step: 1, unit: 'Ω' },
  RV: { precision: 1, step: 1, unit: 'Ω' },
  L: { precision: 3, step: 0.001, unit: 'H', scale: 1000 },
  C: { precision: 4, step: 0.001, unit: 'μF' },
  CV: { precision: 4, step: 0.001, unit: 'μF' },
  V: { unit: 'V' },
}

// 内部存储值 → 编辑器显示值(按 scale 换算;无 scale 的类型原样返回)
export function displayValue(type, stored) {
  const scale = COMPONENT_VALUE_CONFIG[type]?.scale
  return scale && Number.isFinite(stored) ? stored / scale : stored
}

// 编辑器显示值 → 内部存储值(按 scale 换算;无 scale 的类型原样返回)
export function storedValue(type, displayed) {
  const scale = COMPONENT_VALUE_CONFIG[type]?.scale
  return scale && Number.isFinite(displayed) ? displayed * scale : displayed
}

// 结果 / 表格展示的固定小数位:未登记的量沿用调用处 fallback(默认 4 位)
export const RESULT_DECIMALS = { Q: 2 }
export const decimalsFor = (key, fallback = 4) => RESULT_DECIMALS[key] ?? fallback
