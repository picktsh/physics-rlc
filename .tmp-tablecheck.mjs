// 探针:截图「六、关键参数速查表」当前视觉效果,并提取表头/每行实际背景色
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const URL = 'http://localhost:5173/'
const PORT = 9339
const prof = mkdtempSync(join(tmpdir(), 'tbchk-'))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const withTimeout = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => { throw new Error('timeout: ' + tag) })])

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1500,1100', '--force-device-scale-factor=1',
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
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1100, deviceScaleFactor: 1, mobile: false })
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
  await ev('[...document.querySelectorAll(".snav-item")][0].click()')
  await sleep(900)
  // 滚动到速查表并提取颜色
  const info = await ev(`(() => {
    const sec = [...document.querySelectorAll('section.card')].find(s => s.textContent.includes('关键参数速查表'))
    if (!sec) return { err: 'section not found' }
    sec.scrollIntoView({ block: 'center' })
    const table = sec.querySelector('table')
    const wrap = table.parentElement
    const headBg = getComputedStyle(table.querySelector('thead tr')).backgroundColor
    const rows = [...table.querySelectorAll('tbody tr')].map(r => ({
      bg: getComputedStyle(r).backgroundColor,
      cls: r.className.split(' ').filter(c => c.includes('bg-')).join(' ')
    }))
    const rect = wrap.getBoundingClientRect()
    return { headBg, rows, rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } }
  })()`)
  await sleep(500)
  log('colors:', JSON.stringify(info))
  const clip = { x: info.rect.x - 8, y: info.rect.y - 8, width: info.rect.w + 16, height: info.rect.h + 16, scale: 1 }
  const shot = await cdp('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false })
  writeFileSync('.tmp-table-shot.png', Buffer.from(shot.data, 'base64'))
  log('shot saved .tmp-table-shot.png', info.rect.w + 'x' + info.rect.h)
  // 强制悬停第 2 行(第一条深条纹),验证悬停反馈色
  await cdp('DOM.enable')
  await cdp('CSS.enable')
  const { root } = await cdp('DOM.getDocument', {})
  const { nodeId } = await cdp('DOM.querySelector', { nodeId: root.nodeId, selector: 'tbody tr:nth-child(2)' })
  await cdp('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] })
  await sleep(300)
  const hoverBg = await ev(`getComputedStyle(document.querySelector('tbody tr:nth-child(2)')).backgroundColor`)
  log('hover bg on striped row:', hoverBg)
  const shot2 = await cdp('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false })
  writeFileSync('.tmp-table-hover-shot.png', Buffer.from(shot2.data, 'base64'))
  log('shot saved .tmp-table-hover-shot.png')
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
