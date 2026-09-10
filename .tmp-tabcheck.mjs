// 验证:视频资源 tab(原动画演示)保留入口且内容为空;3D 演示(控制条+台面,无相量/示波器面板)整合在公式原理第一节,运行正常
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const URL = 'http://localhost:5173/'
const PORT = 9338
const prof = mkdtempSync(join(tmpdir(), 'tabck-'))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const withTimeout = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => { throw new Error('timeout: ' + tag) })])

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1500,1250', '--force-device-scale-factor=1',
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
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.text || 'exception')
    const i = msgQ.findIndex((x) => x.id === m.id)
    if (i < 0) return
    const [q] = msgQ.splice(i, 1)
    m.error ? q.reject(new Error(m.error.message)) : q.resolve(m.result)
  })
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1250, deviceScaleFactor: 1, mobile: false })
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
  // 1) 侧栏顺序与编号
  const side = await ev('[...document.querySelectorAll(".snav-item")].map((x) => ({ n: x.querySelector(".snav-num").textContent, l: x.querySelector(".snav-label").textContent }))')
  log('side:', JSON.stringify(side))
  const idxDemo = side.findIndex((x) => x.l === '视频资源')
  const idxFormula = side.findIndex((x) => x.l === '公式原理')
  if (idxDemo !== idxFormula + 1) throw new Error('视频资源不在公式原理后: ' + idxFormula + ' / ' + idxDemo)
  if (side.length !== 7) throw new Error('侧栏应为 7 项: ' + side.length)
  if (side[idxDemo].n !== '02') throw new Error('视频资源编号应 02: ' + side[idxDemo].n)

  // 2) formula 页:3D 演示整合于第一节卡片(2D 电路图下方),公式内容齐全
  await ev('[...document.querySelectorAll(".snav-item")][0].click()')
  await sleep(900)
  const formulaState = await ev(`({
    h1: document.querySelector('h1')?.textContent,
    hasHero3d: !!document.querySelector('.hero3d-wrap'),
    hasCtl: !!document.querySelector('.hc-ctl'),
    hasPanels: !!document.querySelector('.hc-demos, .hc-ph-cv, .hc-os-cv'),
    inFirstCard: !!document.querySelectorAll('.card')[0]?.querySelector('.hero3d-wrap'),
    cards: [...document.querySelectorAll('.sec-title')].map((x) => x.textContent).slice(0, 4)
  })`)
  log('formula:', JSON.stringify(formulaState))
  if (formulaState.h1 !== '公式原理') throw new Error('h1 应为公式原理: ' + formulaState.h1)
  if (!formulaState.hasHero3d || !formulaState.hasCtl) throw new Error('formula 页 3D 演示区组件缺失')
  if (formulaState.hasPanels) throw new Error('相量图/示波器面板应已移除')
  if (!formulaState.inFirstCard) throw new Error('3D 演示应位于第一节(电路结构)卡片内')
  if (!formulaState.cards.some((c) => c.includes('电路结构'))) throw new Error('formula 页缺公式内容')

  // 3) 动画在跑:整页截图两帧对比(WebGL preserveDrawingBuffer=false 时 readPixels 读不到内容)
  const shots = []
  for (let k = 0; k < 2; k++) {
    await sleep(500)
    const r = await cdp('Page.captureScreenshot', { format: 'png' })
    shots.push(Buffer.from(r.data, 'base64'))
  }
  log('shot bytes:', shots[0].length, shots[1].length)
  if (shots[0].equals(shots[1])) throw new Error('3D 画面两帧无变化(未在动画)')
  let diff = 0
  for (let i = 0; i < Math.min(shots[0].length, shots[1].length); i += 97) {
    if (shots[0][i] !== shots[1][i]) diff++
  }
  log('shot sample diff:', diff)

  // 4) demo 页:内容已清空(仅保留 tab 入口与页头标题)
  await ev('[...document.querySelectorAll(".snav-item")][1].click()')
  await sleep(600)
  const demoState = await ev(`({
    h1: document.querySelector('h1')?.textContent,
    hasHero: !!document.querySelector('.hero3d-wrap, .hc-ctl, .hc-demos'),
    secTitle: !!document.querySelector('.sec-title')
  })`)
  log('demo:', JSON.stringify(demoState))
  if (demoState.h1 !== '视频资源') throw new Error('h1 应为视频资源: ' + demoState.h1)
  if (demoState.hasHero) throw new Error('demo 页 3D 演示应已清空')
  if (demoState.secTitle) throw new Error('demo 页卡片内容应已清空')

  if (errors.length) throw new Error('console 错误: ' + errors.join('; '))
  log('PAGE ERRORS: 0')
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
