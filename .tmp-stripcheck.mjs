// 探针:逐 tab 检测「电路参数速览条」(.param-strip)是否存在(预期全 false:已全站移除);截公式原理/电路搭建顶部对照图
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const URL = 'http://localhost:5173/'
const PORT = 9340
const prof = mkdtempSync(join(tmpdir(), 'stchk-'))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const withTimeout = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => { throw new Error('timeout: ' + tag) })])

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1500,1000', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, 'about:blank'
], { stdio: 'ignore' })
let ws, msgQ = [], wsReady, errors = []
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

async function main() {
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
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.text || 'exception')
    const i = msgQ.findIndex((x) => x.id === m.id)
    if (i < 0) return
    const [q] = msgQ.splice(i, 1)
    m.error ? q.reject(new Error(m.error.message)) : q.resolve(m.result)
  })
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false })
  await cdp('Page.navigate', { url: URL })
  await sleep(2200)
  const now = new Date()
  const code = String(((now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours()) * 2)
  for (let i = 0; i < 24; i++) {
    const s = await ev('document.querySelector(".snav-item") ? "ok" : "wait"')
    if (s === 'ok') break
    await ev(`sessionStorage.setItem('otp-code', '${code}'); location.reload();`)
    await sleep(800)
  }
  // 逐 tab 检测参数条存在性
  const labels = ['公式原理', '视频资源', '电路搭建', '仿真分析', '相位差判别法', 'LC 电压幅值法', 'RLC工程应用']
  const report = {}
  for (let i = 0; i < labels.length; i++) {
    await ev(`[...document.querySelectorAll(".snav-item")][${i}].click()`)
    await sleep(650)
    const has = await ev(`!!document.querySelector('.param-strip')`)
    report[labels[i]] = has
  }
  log('param-strip presence:', JSON.stringify(report))
  const anyShown = Object.values(report).some(Boolean)
  if (anyShown) throw new Error('参数条应已全站移除: ' + JSON.stringify(report))
  const shotTop = async (tabIdx, file) => {
    await ev(`[...document.querySelectorAll(".snav-item")][${tabIdx}].click(); window.scrollTo(0, 0)`)
    await sleep(800)
    const r = await cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1500, height: 520, scale: 1 }, captureBeyondViewport: false })
    writeFileSync(file, Buffer.from(r.data, 'base64'))
    log('shot:', file)
  }
  await shotTop(0, '.tmp-strip-formula.png')
  await shotTop(2, '.tmp-strip-circuit.png')
  if (errors.length) log('PAGE ERRORS:', errors.join('; '))
  log('OK')
}

main().then(async () => {
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
