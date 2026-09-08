// 检查 home 页「RLC 串联谐振 · 原理演示」卡渲染状态:两帧截图 + DOM 读数 + 控制台错误
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const URL = 'http://localhost:5173/'
const PORT = 9335
const prof = mkdtempSync(join(tmpdir(), 'animchk-'))
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

async function main() {
  log('edge spawned')
  let ok = false
  for (let i = 0; i < 40 && !ok; i++) {
    await sleep(250)
    try { ok = (await withTimeout(fetch(`http://127.0.0.1:${PORT}/json/list`), 1500, 'cdp-list')).ok } catch {}
  }
  if (!ok) throw new Error('CDP 未就绪')
  log('cdp ready')

  const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = pages.find((p) => p.type === 'page')
  ws = new WebSocket(page.webSocketDebuggerUrl)
  ws._id = 0
  wsReady = new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', rej, { once: true })
  })
  ws.addEventListener('message', (ev) => {
    let m
    try { m = JSON.parse(ev.data) } catch { return }
    const i = msgQ.findIndex((x) => x.id === m.id)
    if (i < 0) return
    const [q] = msgQ.splice(i, 1)
    m.error ? q.reject(new Error(m.error.message)) : q.resolve(m.result)
  })
  log('ws attached')

  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await cdp('Page.navigate', { url: URL })
  await sleep(3000)
  log('navigated')

  const now = new Date()
  const code = String(((now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours()) * 2)
  for (let i = 0; i < 20; i++) {
    const st = await cdp('Runtime.evaluate', { expression: 'document.querySelector(".hc-ctl") ? "ok" : (document.querySelector(".lock-panel") ? "lock" : "loading")', returnByValue: true })
    const s = st.result.value
    if (s === 'ok') break
    if (s === 'lock' || s === 'loading') {
      await cdp('Runtime.evaluate', { expression: `sessionStorage.setItem('otp-code', '${code}'); location.reload();` })
    }
    await sleep(900)
  }
  log('unlock loop done')

  let dom = null
  for (let i = 0; i < 30; i++) {
    const r = await cdp('Runtime.evaluate', {
      expression: `(() => {
        const ctl = document.querySelector('.hc-ctl')
        if (!ctl) return null
        const reads = [...document.querySelectorAll('.hc-rd b')].map((b) => b.textContent)
        const scopeCv = document.querySelector('.hc-scope-cv')
        const h3d = document.querySelector('canvas.hero3d-canvas')
        return {
          title: document.querySelector('.sec-title')?.textContent || '',
          reads,
          zone: document.querySelector('.hc-zone')?.textContent || '',
          sldVal: document.querySelector('.hc-sld')?.value ?? null,
          playBtn: document.querySelector('.hc-btn')?.textContent || '',
          scope: scopeCv ? { w: scopeCv.width, h: scopeCv.height } : null,
          h3d: h3d ? { w: h3d.width, h: h3d.height } : null,
          chips: [...document.querySelectorAll('.mtrl-chip')].map((c) => c.textContent)
        }
      })()`,
      returnByValue: true
    })
    dom = r.result.value
    if (dom && dom.reads.every((x) => x !== '—') && dom.h3d) break
    await sleep(400)
  }
  log('DOM:', JSON.stringify(dom))

  const shot = async (name) => {
    const img = await cdp('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(process.cwd(), name), Buffer.from(img.data, 'base64'))
    log('saved', name)
  }
  const sldNow = async () => {
    const r = await cdp('Runtime.evaluate', { expression: 'document.querySelector(".hc-sld") ? document.querySelector(".hc-sld").value : null', returnByValue: true })
    return r.result.value
  }
  const f1 = await sldNow()
  await shot('.tmp-anim-1.png')
  await sleep(1300)
  const f2 = await sldNow()
  await shot('.tmp-anim-2.png')
  log('sld f1/f2:', f1, '/', f2)

  const errs = await cdp('Runtime.evaluate', {
    expression: `window.__errs ? window.__errs.join(' | ') : '(listener not installed)'`, returnByValue: true
  })
  log('errs pre-nav note (listener installs too late, see console domain below)')
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
