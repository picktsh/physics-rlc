// 验证示波器波形修复:高频/谐振/低频三态下波形连续规整(行内点少 = 连续线),且随时间平滑滚动不闪
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const URL = 'http://localhost:5173/'
const PORT = 9337
const prof = mkdtempSync(join(tmpdir(), 'oscck-'))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const withTimeout = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => { throw new Error('timeout: ' + tag) })])

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1440,1150', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, 'about:blank'
], { stdio: 'ignore' })
let ws, msgQ = [], wsReady
function cdp(method, params = {}) {
  return withTimeout((async () => {
    await wsReady
    const id = ++ws._id
    ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => msgQ.push({ id, resolve, reject }))
  })(), 8000, method)
}
async function ev(expr) {
  const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true })
  return r.result.value
}
// 波形规整度:逐行统计绿/青像素点个数,连续平滑曲线每行交点 ≤3;乱闪重影会显著增多
const LINE_STAT = `(() => {
  const cv = document.querySelector('.hc-os-cv')
  const c = cv.getContext('2d')
  const d = c.getImageData(0, 0, cv.width, cv.height).data
  const W = cv.width, H = cv.height
  const is = (i, r, g, b, t) => Math.abs(d[i] - r) < t && Math.abs(d[i + 1] - g) < t && Math.abs(d[i + 2] - b) < t
  const rowMax = { green: 0, cyan: 0 }
  let green = 0, cyan = 0
  let gRow = 0, cRow = 0
  for (let y = 0; y < H; y++) {
    let g = 0, cc = 0
    for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4
      if (is(i, 125, 255, 168, 42)) { g++; green++ }
      if (is(i, 94, 234, 212, 42)) { cc++; cyan++ }
    }
    if (g > rowMax.green) rowMax.green = g
    if (cc > rowMax.cyan) rowMax.cyan = cc
  }
  return { green, cyan, rowMaxGreen: rowMax.green, rowMaxCyan: rowMax.cyan }
})()`

async function main() {
  log('spawn')
  let ok = false
  for (let i = 0; i < 40 && !ok; i++) {
    await sleep(250)
    try { ok = (await withTimeout(fetch(`http://127.0.0.1:${PORT}/json/list`), 1500, 'cdp')).ok } catch {}
  }
  if (!ok) throw new Error('CDP 未就绪')
  const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl)
  ws._id = 0
  wsReady = new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', rej, { once: true })
  })
  ws.addEventListener('message', (evt) => {
    let m
    try { m = JSON.parse(evt.data) } catch { return }
    const i = msgQ.findIndex((x) => x.id === m.id)
    if (i < 0) return
    const [q] = msgQ.splice(i, 1)
    m.error ? q.reject(new Error(m.error.message)) : q.resolve(m.result)
  })
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1150, deviceScaleFactor: 1, mobile: false })
  await cdp('Page.navigate', { url: URL })
  await sleep(2500)
  const now = new Date()
  const code = String(((now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours()) * 2)
  for (let i = 0; i < 24; i++) {
    const s = await ev('document.querySelector(".hc-ctl") ? "ok" : "wait"')
    if (s === 'ok') break
    await ev(`sessionStorage.setItem('otp-code', '${code}'); location.reload();`)
    await sleep(800)
  }
  for (let i = 0; i < 30; i++) {
    const r = await ev('[...document.querySelectorAll(".hc-rd b")].map((b) => b.textContent)')
    if (r && r.length === 3 && !r.includes('—')) break
    await sleep(400)
  }
  log('ready')
  const setSld = async (v, tag) => {
    await ev(`(() => { const s = document.querySelector('.hc-sld'); s.value = '${v}'; s.dispatchEvent(new Event('input')) })()`)
    await sleep(600)
    const a = await ev(LINE_STAT)
    await sleep(600)
    const b = await ev(LINE_STAT)
    const reads = await ev('[...document.querySelectorAll(".hc-rd b")].map((x) => x.textContent)')
    log(tag, 'reads', reads.join('/'), 'A', JSON.stringify(a), 'B', JSON.stringify(b))
  }
  await setSld('1000', 'HIGH 14kHz') // 旧版最乱点
  await ev('[...document.querySelectorAll(".hc-btn")].find((b) => b.textContent.includes("谐振")).click()')
  await sleep(500)
  await setSld('506', 'RES')
  await setSld('0', 'LOW 341Hz')
  log('OK')
}

main().then(async () => {
  log('DONE')
  try { edge.kill() } catch {}
  await sleep(600)
  rmSync(prof, { recursive: true, force: true, maxRetries: 4 })
  process.exit(0)
}).catch(async (e) => {
  console.error('FAIL', e.message)
  try { edge.kill() } catch {}
  await sleep(400)
  process.exit(1)
})
