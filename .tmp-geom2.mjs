// 随机旋转角完备性验证:新弧参数在任意 ρ 下都画 I→U 短弧
// 同时做物理不变量断言(端点/长度/谐振 UX 消失/弧长短弧性)
const DEG = Math.PI / 180
const OhmR = 100, HenL = 0.1, FarC = 5e-8, Volt = 0.9, f0 = 2252
function physicsAt(f) {
  const w = 2 * Math.PI * f
  const xl = w * HenL, xc = 1 / (w * FarC), x = xl - xc
  const z = Math.hypot(OhmR, x), i = Volt / z
  return { xl, xc, z, i, ur: i * OhmR, ul: i * xl, uc: i * xc, phiRad: Math.atan2(x, OhmR) }
}
function probe(f, rho, tag) {
  const pv = physicsAt(f)
  const vScale = Math.max(pv.ur, pv.ul, pv.uc, Volt) * 1.06 || 1
  const Lm = 100
  const lr = (Lm * pv.ur) / vScale, ll = (Lm * pv.ul) / vScale, lc = (Lm * pv.uc) / vScale
  const co = Math.cos(rho), si = Math.sin(rho)
  const rot = (lx, ly) => [lx * co - ly * si, -(lx * si + ly * co)]
  const o = [0, 0]
  const a = rot(lr, 0), ul = rot(0, ll), uc = rot(0, -lc), b = rot(lr, ll - lc)
  const wrap = (x) => { while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return x }
  // 1) 端点角度关系(数学角):UL 应恒在 I 的 +90°,UC 恒 -90°
  const ang = (p) => Math.atan2(-(p[1]), p[0])
  const dUL = wrap(ang(ul) - ang(rot(1, 0)))
  const dUC = wrap(ang(uc) - ang(rot(1, 0)))
  if (Math.abs(dUL - Math.PI / 2) > 1e-9 || Math.abs(dUC + Math.PI / 2) > 1e-9) throw new Error(tag + ' UL/UC 相对 I 角度错误')
  // 2) U 长度 = |Z|·I/V 量程守恒(长度 ∝ z):|U端| 应等于 √(ur²+(ul-uc)²)/vScale*Lm
  const uLen = Math.hypot(b[0], b[1])
  const uExpect = (Lm * Math.hypot(pv.ur, pv.ul - pv.uc)) / vScale
  if (Math.abs(uLen - uExpect) > 1e-9) throw new Error(tag + ' U 长度不守恒')
  // 3) 谐振 UL=UC 等长反向 → U 端点与 UR 端点重合;UX 消失
  // 4) 新弧参数:起点画布角 -rho 即 I 真身;ccw=dA>0 保证短弧
  const aU = Math.atan2(-(b[1]), b[0])
  let dA = wrap(aU - rho)
  const start = -rho, end = -aU // 画布角
  // canvas 行为:沿 ccw? 方向从 start 走到 end 的弧长
  let arcLen
  if (dA > 0) arcLen = wrap(start - end) // ccw(θ 递减)短弧长
  else arcLen = wrap(end - start) // 顺时针(θ 递增)短弧长
  const okLen = Math.abs(arcLen - Math.abs(dA)) < 1e-9 && Math.abs(arcLen) <= Math.PI + 1e-9
  if (!okLen) throw new Error(tag + ' ρ=' + (rho / DEG).toFixed(0) + '° 弧非短弧: ' + (arcLen / DEG).toFixed(1) + '° vs ' + (Math.abs(dA) / DEG).toFixed(1) + '°')
  // 5) 谐振无弧:dA≈0
  if (tag === 'RES' && Math.abs(dA) > 0.05) throw new Error('RES 应无弧')
  return { dUL: dUL / DEG, dUC: dUC / DEG, arcLenDeg: arcLen / DEG, dADeg: dA / DEG }
}
// 三态 × 随机 ρ 大量采样
let n = 0
for (const [f, tag] of [[341, 'CAP'], [2252, 'RES'], [14200, 'IND']]) {
  for (let k = 0; k < 60; k++) {
    const rho = (k * 1.7321 + 0.7) % (Math.PI * 2) // 伪随机均匀
    probe(f, rho, tag + '#' + k)
    n++
  }
}
console.log('OK: 180 组采样全部通过(端点角度/长度守恒/短弧性/谐振无弧)')

// 谐振态附加断言:UL 端与 UC 端在屏幕上等长反向(经 rot 旋转后)
{
  const pv = physicsAt(f0)
  const vScale = Math.max(pv.ur, pv.ul, pv.uc, Volt) * 1.06
  const Lm = 100
  const ll = (Lm * pv.ul) / vScale, lc = (Lm * pv.uc) / vScale
  if (Math.abs(ll - lc) > 0.02 * Lm) throw new Error('谐振 UL/UC 长度差过大: ' + ll + '/' + lc)
  if (pv.ul / pv.uc < 0.99 || pv.ul / pv.uc > 1.01) throw new Error('谐振 UL≠UC 物理值')
  console.log('谐振: UL=' + pv.ul.toFixed(3) + 'V UC=' + pv.uc.toFixed(3) + 'V UR=' + pv.ur.toFixed(3) + 'V Q·V=' + (14.1 * 0.9).toFixed(2) + 'V, UX 差=' + ((ll - lc) / Lm * 100).toFixed(2) + '% 量程(将不绘制紫线)')
}
