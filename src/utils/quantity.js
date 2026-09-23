// 全站物理量「单位 + 小数位 + 步长」总表 —— 单一数据源。
// 口径(2026-09 与团队确认):存储单位 = 显示单位 = 输入单位,编辑/展示层零换算;
// 唯一转 SI 的位置在 physics.js 与各画布绘制函数内部(f×1000、C×1e-6)。
// 覆盖:电路搭建/阻尼振荡两页元件参数、数据分析三法、LC 电压幅值、李萨如、工程应用(收音机)、历史记录。
// adaptive: true 表示该场景小数位随数量级浮动(画布坐标轴刻度、时间标签 ns/µs/ms/s、公式页装饰读数),
// 在此集中声明口径但不在代码里绑定固定位数。

export const QUANTITY = {
  // ───── 电路元件参数(输入) ─────
  R: { unit: 'Ω', decimals: 1, step: 1 }, // 电阻 / 变阻器
  L: { unit: 'H', decimals: 3, step: 0.001 }, // 电感(原内部 mH,现全站直接存 H)
  C: { unit: 'μF', decimals: 4, step: 0.001 }, // 电容 / 可调电容
  V: { unit: 'V', decimals: 2, step: 0.1 }, // 信号源幅值
  // ───── 电量(输入 + 展示) ─────
  f: { unit: 'kHz', decimals: 4, step: 0.05 }, // 频率族:f/f₀/f₁/f₂/扫频窗口/信号源频率(原 Hz,全站改 kHz)
  bw: { unit: 'kHz', decimals: 4 }, // 通频带 / Δf
  i: { unit: 'mA', decimals: 4, step: 0.1 }, // 电流(含实测录入,4 位防失谐点数据截断)
  u: { unit: 'V', decimals: 2 }, // 电压读数:UL/UC/UR/URpp/光标瞬时电压
  z: { unit: 'Ω', decimals: 4 }, // 阻抗模 |Z|
  phi: { unit: '°', decimals: 1 }, // 相位差(谐振判读 0.1° 足够)
  period: { unit: 'ms', decimals: 4 }, // 信号源周期
  t: { unit: 's', decimals: 4 }, // 振荡周期 T / 时间常数 τ
  rate: { unit: 'rad/s', decimals: 2 }, // 阻尼系数 α / 固有角频率 ω₀ / ωd
  // ───── 无量纲 / 百分比 ─────
  q: { unit: '', decimals: 2 }, // 品质因数 Q
  zeta: { unit: '', decimals: 3 }, // 阻尼比 ζ
  err: { unit: '%', decimals: 2 }, // 误差百分比
  duty: { unit: '%', decimals: 1 }, // 方波占空比
  tol: { unit: '%', decimals: 1 }, // 元件公差
  db: { unit: 'dB', decimals: 1 }, // 接收电平 / 邻台抑制
  // ───── 自适应场景(仅声明口径,不绑定小数位) ─────
  tAxis: { unit: 's', adaptive: true }, // 画布时间刻度 ns/µs/ms/s
  axisTick: { adaptive: true }, // 坐标轴刻度数字
  hero: { adaptive: true }, // 公式页首屏装饰动画读数
}

// 元件类型 → 物理量 key(两搭建页共用)
export const COMPONENT_QTY = { R: 'R', RV: 'R', L: 'L', C: 'C', CV: 'C', V: 'V' }

// 元件参数编辑视图:元件类型 → { unit, decimals, step },模板直接消费
export const COMPONENT_VALUE_CONFIG = Object.fromEntries(
  Object.entries(COMPONENT_QTY).map(([type, key]) => [type, QUANTITY[key]]),
)

// 展示用固定小数位字符串;未登记 key 或非数值返回 '—'
export function fmt(key, v) {
  const d = QUANTITY[key]?.decimals
  return d != null && Number.isFinite(v) ? v.toFixed(d) : '—'
}

// 取某量的固定小数位(输入框 :precision / toFixed 用);未登记量回落 fallback
export const decimalsFor = (key, fallback = 4) => QUANTITY[key]?.decimals ?? fallback

// ───── 仿真历史「配置签名」单一数据源 ─────
// 口径:签名覆盖所有影响计算结果/曲线的参数(R/L/C/V + 频率窗口 fStart/fEnd),
// 各量先按展示精度归一(消除元件值浮点噪声如 100.0001→100.0)再拼规范串,base64 存为去重键。
// 归一粒度=展示粒度:两配置只要展示层完全相同即视为同一条,与去重「完全相同配置」语义一致。
const normQty = (v, key) => (Number.isFinite(v) ? v.toFixed(QUANTITY[key].decimals) : '0')

// 由 params 生成去重键(base64,可逆);空 params 兜底为空值键,避免旧/导入脏数据在 store 初始化回填时抛错致白屏
export function buildConfigKey(params) {
  const p = params || {}
  const s =
    `R=${normQty(p.R, 'R')}|L=${normQty(p.L, 'L')}|C=${normQty(p.C, 'C')}` +
    `|V=${normQty(p.V, 'V')}|fs=${normQty(p.fStart, 'f')}|fe=${normQty(p.fEnd, 'f')}`
  // 内容为 ASCII,encodeURIComponent 兜底防个别环境 btoa 报错
  return btoa(unescape(encodeURIComponent(s)))
}

// 反解析去重键为人类可读的代表串(表内展示用);无法解析返回 '—'
export function parseConfigKey(key) {
  try {
    const o = Object.fromEntries(decodeURIComponent(escape(atob(key))).split('|').map((kv) => kv.split('=')))
    return `R${o.R}·L${o.L}·C${o.C}·V${o.V}·${o.fs}~${o.fe}kHz`
  } catch {
    return '—'
  }
}
