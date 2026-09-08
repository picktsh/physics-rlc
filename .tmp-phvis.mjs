// 页面级回归:相量图视觉层次化后 三态 像素断言
// - 容性/感性:白 U 主线存在、紫 U_X 虚线存在、φ 弧存在
// - 谐振:UL(蓝)≈UC(青)等长反向、U_X 消失、φ 弧消失、白主线(短 U=UR)
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9353
const prof = mkdtempSync(join(tmpdir(), 'phvi-'))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1500,1250', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, 'about:blank'
], { stdio: 'ignore' })
let ws, msgQ = [], wsReady, errors = []
function cdp(method, params = {}) {
  return Promise.race([
    (async () => {
      await wsReady
      const id = ++ws._id
      ws.send(JSON.stringify({ id, method, params }))
      return new Promise((resolve, reject) => msgQ.push({ id, resolve, reject }))
    })(),
    sleep(8000).then(() => { throw new Error('cdp timeout: ' + method) }),
  ])
}
async function ev(expression) {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true })
  return r.result.value
}
const mainTimer = setTimeout(() => { console.error('GLOBAL TIMEOUT'); process.exit(2) }, 90000)
// 目标色:W 白(233,239,252) / B 蓝(96,165,250) / C 青(34,211,238) / X 紫混(114,102,168) / A 弧(159,166,179)
const TARGETS = { W: '233,239,252', B: '96,165,250', C: '34,211,238', X: '114,102,168', A: '159,166,179' }
const SCAN = (key) => `(() => {
  const cv = document.querySelector('.hc-ph-cv')
  const g = cv.getContext('2d')
  const W = cv.width, H = cv.height
  const d = g.getImageData(0, 0, W, H).data
  const [tr, tg, tb] = '${TARGETS[key]}'.split(',').map(Number)
  const dpr = W / ${'${geoW}'}
  const cx = W / 2, cy = H / 2
  let count = 0
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4
      const dr = d[i] - tr, dg = d[i + 1] - tg, db = d[i + 2] - tb
      const tol = '${key}' === 'X' ? 46 : 42
      if (dr * dr + dg * dg + db * db < tol * tol) count++
    }
  }
  return count
})()`
async function main() {
  let ok = false
  for (let i = 0; i < 40 && !ok; i++) {
    await sleep(250)
    try { ok = (await fetch(`http://127.0.0.1:${PORT}/json/list`)).ok } catch {}
  }
  if (!ok) throw new Error('CDP 未就绪')
  const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl)
  ws._id = 0
  wsReady = new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', () => rej(new Error('ws err')), { once: true })
  })
  ws.addEventListener('message', (evt) => {
    const m = JSON.parse(evt.data)
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.text || 'x')
    const i = msgQ.findIndex((x) => x.id === m.id)
    if (i < 0) return
    const [q] = msgQ.splice(i, 1)
    m.error ? q.reject(new Error(m.error.message)) : q.resolve(m.result)
  })
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1250, deviceScaleFactor: 1, mobile: false })
  await cdp('Page.navigate', { url: 'http://localhost:5173/' })
  await sleep(2200)
  const now = new Date()
  const code = String(((now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours()) * 2)
  for (let i = 0; i < 20; i++) {
    const s = await ev('document.querySelector(".hc-ctl") ? "ok" : "wait"')
    if (s === 'ok') break
    await ev(`sessionStorage.setItem('otp-code', '${code}'); sessionStorage.setItem('activeTab', 'demo'); location.reload();`)
    await sleep(800)
  }
  await sleep(800)
  const geoW = await ev('Math.round(document.querySelector(".hc-ph-cv").getBoundingClientRect().width)')
  log('canvas 宽:', geoW)
  const count = (key) => ev(SCAN(key).replace('${geoW}', geoW))
  const reads = () => ev('[...document.querySelectorAll(".hc-rd b")].map((x) => x.textContent)')
  const badge = () => ev('document.querySelector(".hc-os-st")?.textContent || ""')
  const setSld = async (v) => {
    await ev(`(() => { const s = document.querySelector('.hc-sld'); s.value = '${v}'; s.dispatchEvent(new Event('input')) })()`)
    await sleep(900)
  }
  const snap = async (tag) => {
    const o = {}
    for (const k of ['X', 'A', 'W']) o[k] = await count(k)
    if (tag === 'RES') { o.B = await count('B'); o.C = await count('C') }
    return o
  }
  await setSld('0') // 容性
  const cap = await snap('CAP')
  const capR = await reads()
  log('CAP:', JSON.stringify(cap), capR.join('/'), '|', await badge())
  if (cap.X < 3) throw new Error('CAP U_X 虚线缺失: ' + cap.X)
  if (cap.A < 6) throw new Error('CAP φ 弧缺失: ' + cap.A)
  if (cap.W < 25) throw new Error('CAP 白 U 主线缺失: ' + cap.W)
  await setSld('506') // 谐振
  const res = await snap('RES')
  log('RES:', JSON.stringify(res), (await reads()).join('/'))
  if (res.X > 2) throw new Error('RES U_X 应消失: ' + res.X)
  if (res.A > 3) throw new Error('RES φ 弧应消失: ' + res.A)
  if (res.W < 4) throw new Error('RES 白 U 端点缺失: ' + res.W)
  const ratio = Math.max(res.B, res.C) / (Math.min(res.B, res.C) + 1)
  if (res.B < 18 || res.C < 18) throw new Error('RES 蓝/青线像素不足: ' + res.B + '/' + res.C)
  if (ratio > 1.6) throw new Error('RES UL/UC 不等长: ' + res.B + '/' + res.C)
  await setSld('1000') // 感性
  const ind = await snap('IND')
  log('IND:', JSON.stringify(ind), (await reads()).join('/'), '|', await badge())
  if (ind.X < 3) throw new Error('IND U_X 虚线缺失: ' + ind.X)
  if (ind.A < 6) throw new Error('IND φ 弧缺失: ' + ind.A)
  if (ind.W < 25) throw new Error('IND 白 U 主线缺失: ' + ind.W)
  if (errors.length) throw new Error('console 错误: ' + errors.join(';'))
  log('PAGE ERRORS: 0')
  log('OK: 层次化视觉三态回归通过')
}
main().then(async () => {
  log('DONE')
  clearTimeout(mainTimer)
  try { edge.kill() } catch {}
  await sleep(500)
  rmSync(prof, { recursive: true, force: true, maxRetries: 4 })
  process.exit(0)
}).catch(async (e) => {
  console.error('FAIL', e.message)
  clearTimeout(mainTimer)
  try { edge.kill() } catch {}
  await sleep(300)
  process.exit(1)
})
