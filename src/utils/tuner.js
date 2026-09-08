/**
 * 选频调谐(收音机)纯计算 —— RLC 串联回路作为「选频网络」
 * 天线收到的是多个电台载波的叠加;串联 RLC 对每个频率呈现不同阻抗,
 * 谐振频率 f0 对准的电台电流最大,其余电台被衰减 —— 这就是“调台”。
 * 单位约定与全站一致:R Ω、L mH、C μF、f Hz。
 */

/** 电台定义:名称 / 缩比载波频率 Hz / 发射强度(相对) / 展示色 */
export const STATIONS = [
  { id: 'news', name: '新闻台', freq: 720, amp: 1.0, color: '#2563eb' },
  { id: 'music', name: '音乐台', freq: 1000, amp: 0.9, color: '#0e9f6e' },
  { id: 'weather', name: '气象台', freq: 1280, amp: 0.8, color: '#d97706' },
]

/** 邻频干扰台(弱信号):专用于演示低 Q 时串台 */
export const INTERFERER = { id: 'interf', name: '邻频干扰', freq: 860, amp: 0.55, color: '#d14a3f' }

/** 本页固定电感(mH)与调谐范围(Hz),载波频率做了 1/1000 缩比(AM 中波) */
export const TUNER_L_MH = 100
export const TUNE_F_MIN = 500
export const TUNE_F_MAX = 1500
export const R_MIN = 5
export const R_MAX = 200

/** 各载波的固定初相位(rad,写死保证波形稳定可读) */
const PHASES = { news: 0.9, music: 2.4, weather: 4.1, interf: 1.7 }

/**
 * 由调谐频率 f0(Hz)与 R(Ω)求电路状态
 * @returns {{ f0:number, R:number, C_uF:number, Q:number, BW:number,
 *             comps:Array<{id,name,freq,amp,color,I,phi,h,dB,dBText}> }}
 */
export function tunerState(f0, R, interfOn) {
  const L = TUNER_L_MH * 1e-3
  const w0 = 2 * Math.PI * f0
  const C = 1 / (w0 * w0 * L) // F
  const Q = w0 * L / R
  const BW = f0 / Q
  const comps = []
  const all = [...STATIONS, ...(interfOn ? [INTERFERER] : [])]
  for (const s of all) {
    const w = 2 * Math.PI * s.freq
    const X = w * L - 1 / (w * C)
    const Z = Math.sqrt(R * R + X * X)
    const I = s.amp / Z // 电流正比分量(未乘源电压常数)
    comps.push({
      id: s.id,
      name: s.name,
      freq: s.freq,
      amp: s.amp,
      color: s.color,
      I,
      h: R / Z, // 相对响应 h = I/I_谐振
      phi: Math.atan2(X, R),
    })
  }
  // 目标台 = 离 f0 最近的正式电台(干扰台不参与“收听”)
  let target = comps.filter((c) => c.id !== INTERFERER.id).sort((a, b) => Math.abs(a.freq - f0) - Math.abs(b.freq - f0))[0]
  if (!target) target = comps[0]
  const others = comps.filter((c) => c.id !== target.id)
  let adj = null
  for (const c of others) if (!adj || c.I > adj.I) adj = c
  const dB = target && adj && adj.I > 0 ? 20 * Math.log10(target.I / adj.I) : 0
  for (const c of comps) {
    const d = c.id === target.id ? 0 : target.I > 0 && c.I > 0 ? 20 * Math.log10(c.I / target.I) : -Infinity
    c.dB = d
    c.dBText = c.id === target.id ? '基准 0 dB' : d <= -80 ? '≈ 0' : d.toFixed(1) + ' dB'
  }
  return {
    f0,
    R,
    C_uF: C * 1e6,
    Q,
    BW,
    target,
    adj,
    select: dB, // 邻台抑制(dB)
    comps,
  }
}

/**
 * 选频曲线采样(相对电流 h(f),等幅源下的回路响应)
 * @returns {Array<{f:number,h:number}>}
 */
export function tunerCurve(f0, R) {
  const Q = (2 * Math.PI * f0 * TUNER_L_MH * 1e-3) / R
  const pts = []
  const N = 320
  const fLo = TUNE_F_MIN
  const fHi = TUNE_F_MAX
  for (let i = 0; i <= N; i++) {
    const f = fLo + ((fHi - fLo) * i) / N
    const r = f / f0
    pts.push({ f, h: 1 / Math.sqrt(1 + Q * Q * (r - 1 / r) * (r - 1 / r)) })
  }
  return pts
}

/** 半功率带宽交点(-3dB):在曲线数组上线性插值求 h=1/√2 的两个穿越频率 */
export function tunerBandEdges(f0, R) {
  const pts = tunerCurve(f0, R)
  const thr = 1 / Math.SQRT2
  const cross = []
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    if ((a.h - thr) * (b.h - thr) <= 0) {
      const t = (thr - a.h) / (b.h - a.h)
      cross.push(a.f + (b.f - a.f) * t)
    }
  }
  if (cross.length >= 2) return { lo: cross[0], hi: cross[cross.length - 1] }
  return null
}

/** 时域波形采样:输入为多台叠加(载波),输出为回路电流(含各台衰减与相移) */
export function tunerWaveforms(f0, R, interfOn) {
  const st = tunerState(f0, R, interfOn)
  const L = TUNER_L_MH * 1e-3
  const w0 = 2 * Math.PI * f0
  const C = 1 / (w0 * w0 * L)
  const N = 640
  const T = 0.008 // 时间窗 8ms
  const vin = new Float32Array(N)
  const vout = new Float32Array(N)
  let inScale = 0
  let outScale = 0
  for (const s of STATIONS) inScale += s.amp
  const all = [...STATIONS, ...(interfOn ? [INTERFERER] : [])]
  for (const c of st.comps) outScale += c.I
  inScale = inScale || 1
  outScale = outScale || 1
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * T
    let a = 0
    let b = 0
    for (const s of all) {
      const w = 2 * Math.PI * s.freq
      a += s.amp * Math.sin(w * t + (PHASES[s.id] ?? 0))
      const comp = st.comps.find((c) => c.id === s.id)
      if (comp) b += comp.I * Math.sin(w * t + comp.phi + (PHASES[s.id] ?? 0))
    }
    vin[i] = a / inScale
    vout[i] = b / outScale
  }
  return { vin, vout, N, T, comps: st.comps, target: st.target, select: st.select, Q: st.Q }
}
