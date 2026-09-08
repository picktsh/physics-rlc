// 几何验证:φ 相位弧的 canvas 参数
// 复现 drawPhasor 的坐标与弧参数,数值证明新旧参数下弧的实际屏幕位置
// canvas: y 向下;arc 角度 0=右,正值=屏幕顺时针
// 相量图内部:rot 用数学坐标(上为正),aU/rho 均为数学角;canvas 角 = -数学角
const DEG = Math.PI / 180

// ---- 物理(低频容性 f=341Hz 与高频感性 f=14.2k、谐振),与组件参数一致 ----
const OhmR = 100, HenL = 0.1, FarC = 5e-8, Volt = 0.9, f0 = 2252
function physicsAt(f) {
  const w = 2 * Math.PI * f
  const xl = w * HenL, xc = 1 / (w * FarC), x = xl - xc
  const z = Math.hypot(OhmR, x), i = Volt / z
  return { ur: i * OhmR, ul: i * xl, uc: i * xc, phiRad: Math.atan2(x, OhmR) }
}

// ---- 相量端点(与组件同一 rot 公式,ρ=0 静止采样) ----
function endpoints(pv, phRho = 0) {
  const vScale = Math.max(pv.ur, pv.ul, pv.uc, Volt) * 1.06 || 1
  const Lm = 100 // 任意单位,只关心方向
  const lr = (Lm * pv.ur) / vScale, ll = (Lm * pv.ul) / vScale, lc = (Lm * pv.uc) / vScale
  const co = Math.cos(phRho), si = Math.sin(phRho)
  // 屏幕坐标 rot(lx,ly) = [lx*co - ly*si, -(lx*si + ly*co)]
  const rot = (lx, ly) => [lx * co - ly * si, -(lx * si + ly * co)]
  const a = rot(lr, 0) // UR 端
  const b = rot(lr, ll - lc) // U 端
  return { a, b, lr, ll, lc, vScale }
}

// canvas arc 区间描述:给定 start/end/ccw,返回实际覆盖的画布角区间(短弧表示法,归一到以 start 为中心)
function arcSpan(start, end, ccw) {
  // 模拟 canvas:arc 从 start 沿指定方向到 end,取模 2π
  let d = end - start
  if (ccw) while (d > 0) d -= Math.PI * 2
  else while (d < 0) d += Math.PI * 2
  const dir = ccw ? '逆时针(θ 减小)' : '顺时针(θ 增大)'
  return { dir, dRad: d, dDeg: (d * 180) / Math.PI, ccw }
}

function analyze(f, tag) {
  const pv = physicsAt(f)
  const { a, b } = endpoints(pv)
  const cx = 0, cy = 0
  const phRho = 0
  // 组件内代码
  const aU = Math.atan2(-(b[1] - cy), b[0] - cx) // U 端的数学角(atan2(y_math,x))
  let dA = aU - phRho
  while (dA > Math.PI) dA -= Math.PI * 2
  while (dA < -Math.PI) dA += Math.PI * 2
  // 旧参数
  const oldS = arcSpan(phRho, phRho + dA, dA < 0)
  // 新参数(建议):canvas 角取负;感性 dA>0 → ccw
  const newS = arcSpan(-phRho, -aU, dA > 0)
  const uThetaCanvas = -aU // U 端画布角
  const iThetaCanvas = -phRho // I 轴画布角
  const wrap = (x) => {
    while (x > Math.PI) x -= Math.PI * 2
    while (x < -Math.PI) x += Math.PI * 2
    return x
  }
  const shortD = wrap(uThetaCanvas - iThetaCanvas) // 从 I 到 U 的短弧画布角差
  console.log('==== ' + tag + '  φ=' + (pv.phiRad / DEG).toFixed(1) + '° ====')
  console.log('  U 端画布角= ' + (uThetaCanvas / DEG).toFixed(1) + '°, I 画布角= ' + (iThetaCanvas / DEG).toFixed(1) + '°, 短弧角差= ' + (shortD / DEG).toFixed(1) + '°')
  console.log('  旧 arc(rho, rho+dA, ccw=dA<0): ' + oldS.dir + ' 扫过 ' + oldS.dDeg.toFixed(0) + '°')
  console.log('  新 arc(-rho, -aU, ccw=dA>0): ' + newS.dir + ' 扫过 ' + newS.dDeg.toFixed(0) + '°')
  console.log('  判据:弧应为 I→U 短弧(≤180°, 与 U 同侧)')
  return { shortD, old: oldS.dDeg, fresh: newS.dDeg }
}

const low = analyze(341, '低频 341Hz 容性')
const high = analyze(14200, '高频 14.2kHz 感性')
const res = analyze(f0, '谐振 2252Hz')

// 断言:新参数=短弧(与短弧角差符号/大小一致);旧参数=错侧大弧
const ok = (r, name) => {
  const target = r.shortD / DEG // 目标短弧:画布 I→U 方向与度数
  const sameSide = (sweep) => Math.abs(Math.abs(sweep) - Math.abs(target)) < 1e-6
  const rightSide = (sweep) => Math.sign(sweep) === Math.sign(target)
  const desc = (sweep) => '扫' + sweep.toFixed(1) + '°(' + (sameSide(sweep) ? '大小对' : '大小错') + ',' + (rightSide(sweep) ? '方向对' : '方向反') + ')'
  console.log('  [' + name + '] 旧参数: ' + desc(r.old) + ' → 弧在 U 的' + (rightSide(r.old) ? '同侧' : '对侧(镜像/绕远)'))
  console.log('  [' + name + '] 新参数: ' + desc(r.fresh) + ' → 弧在 U 的' + (rightSide(r.fresh) ? '同侧 ✓' : '对侧 ✗'))
  if (sameSide(r.old) && rightSide(r.old)) throw new Error(name + ': 旧参数竟然正确?')
  if (!(sameSide(r.fresh) && rightSide(r.fresh))) throw new Error(name + ': 新参数未达预期')
}
ok(low, '容性')
ok(high, '感性')
ok(res, '谐振')
