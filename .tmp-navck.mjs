// 验证:导航激活态改为淡蓝 #dbe7ff(219,231,255)+ 深蓝文字;桌面侧栏与窄屏 ptab 均生效
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const URL = 'http://localhost:5173/'
const PORT = 9339
const prof = mkdtempSync(join(tmpdir(), 'navck-'))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const withTimeout = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => { throw new Error('timeout: ' + tag) })])

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1200,1000', '--force-device-scale-factor=1',
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
  await cdp('Page.navigate', { url: URL })
  await sleep(1800)
  const now = new Date()
  const code = String(((now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours()) * 2)
  for (let i = 0; i < 20; i++) {
    const s = await ev('document.querySelector(".snav-item") ? "ok" : "wait"')
    if (s === 'ok') break
    await ev(`sessionStorage.setItem('otp-code', '${code}'); location.reload();`)
    await sleep(700)
  }
  await sleep(300)
  // 桌面侧栏:点击第 3 项,直接检查其 class 与计算样式
  await ev('[...document.querySelectorAll(".snav-item")][2].click()')
  await sleep(700)
  const side = await ev(`(() => {
    const el = document.querySelectorAll('.snav-item')[2]
    const cs = getComputedStyle(el)
    const num = getComputedStyle(el.querySelector('.snav-num'))
    const lab = getComputedStyle(el.querySelector('.snav-label'))
    return { cls: el.className, bg: cs.backgroundColor, numColor: num.color, labColor: lab.color, labFont: lab.fontSize + '/' + lab.fontWeight }
  })()`)
  log('side active:', JSON.stringify(side))
  if (!side.cls.includes('active')) throw new Error('侧栏第3项未激活: ' + side.cls)
  const sideBg = side.bg.match(/rgba?\((\d+), ?(\d+), ?(\d+)/)
  if (!sideBg || Math.abs(+sideBg[1] - 219) > 6 || Math.abs(+sideBg[2] - 255) > 6) throw new Error('侧栏激活底色非淡蓝: ' + side.bg)
  if (!side.labColor.includes('29, 78, 216') && !side.labColor.includes('29,78,216')) throw new Error('侧栏激活文字色非深蓝: ' + side.labColor)

  // 窄屏 ptab:重设视口 700px 后点击第 4 项,检查 class 与计算样式
  await cdp('Emulation.setDeviceMetricsOverride', { width: 700, height: 1000, deviceScaleFactor: 1, mobile: false })
  await sleep(700)
  await ev('[...document.querySelectorAll(".ptab")][3].click()')
  await sleep(500)
  const ptab = await ev(`(() => {
    const b = document.querySelectorAll('.ptab')[3]
    const cs = getComputedStyle(b)
    return { cls: b.className, bg: cs.backgroundColor, color: cs.color, font: cs.fontWeight }
  })()`)
  log('ptab active:', JSON.stringify(ptab))
  if (!ptab.cls.includes('active')) throw new Error('ptab 第4项未激活: ' + ptab.cls)
  const ptBg = ptab.bg.match(/rgba?\((\d+), ?(\d+), ?(\d+)/)
  if (!ptBg || Math.abs(+ptBg[1] - 219) > 6 || Math.abs(+ptBg[2] - 255) > 6) throw new Error('ptab 激活底色非淡蓝: ' + ptab.bg)
  if (!ptab.color.includes('29, 78, 216') && !ptab.color.includes('29,78,216')) throw new Error('ptab 激活文字色非深蓝: ' + ptab.color)
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
