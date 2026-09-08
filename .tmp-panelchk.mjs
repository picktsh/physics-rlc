// 验证原理讲解面板:相量图 canvas + 示波器 canvas 渲染、三态徽章、谐振/容性/感性联动、控制台无错误
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const URL = 'http://localhost:5173/'
const PORT = 9336
const prof = mkdtempSync(join(tmpdir(), 'panelchk-'))
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

async function main() {
  log('edge spawned')
  let ok = false
  for (let i = 0; i < 40 && !ok; i++) {
    await sleep(250)
    try { ok = (await withTimeout(fetch(`http://127.0.0.1:${PORT}/json/list`), 1500, 'cdp-list')).ok } catch {}
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
  // 先注入全局错误收集,再导航
  await cdp('Page.addScriptToEvaluateOnNewDocument', {
    source: `window.__errs=[];window.addEventListener('error',e=>window.__errs.push('err:'+e.message));window.addEventListener('unhandledrejection',e=>window.__errs.push('rej:'+String(e.reason)));`
  })
  await cdp('Page.navigate', { url: URL })
  await sleep(2500)
  const now = new Date()
  const code = String(((now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours()) * 2)
  for (let i = 0; i < 24; i++) {
    const s = await ev('document.querySelector(".hc-ctl") ? "ok" : (document.querySelector(".lock-panel") ? "lock" : "loading")')
    if (s === 'ok') break
    if (s === 'lock' || s === 'loading') {
      await ev(`sessionStorage.setItem('otp-code', '${code}'); location.reload();`)
    }
    await sleep(800)
  }
  log('unlocked')
  let dom = null
  for (let i = 0; i < 30; i++) {
    dom = await ev(`(() => {
      const ph = document.querySelector('.hc-ph-cv'), os = document.querySelector('.hc-os-cv')
      if (!ph || !os) return null
      const reads = [...document.querySelectorAll('.hc-rd b')].map((b) => b.textContent)
      if (reads.some((x) => x === '—')) return null
      return {
        reads,
        st: document.querySelector('.hc-os-st')?.textContent || '',
        phCv: { w: ph.width, h: ph.height },
        osCv: { w: os.width, h: os.height },
        lg: [...document.querySelectorAll('.hc-lg span')].map((s) => s.textContent.trim()),
        chips: document.querySelectorAll('.mtrl-chip').length,
        playBtn: document.querySelector('.hc-btn')?.textContent || '',
        hasScopeHud: !!document.querySelector('.hc-scope')
      }
    })()`)
    if (dom) break
    await sleep(400)
  }
  log('DOM1:', JSON.stringify(dom))

  // 像素采样函数(页面内执行):统计两块 2D canvas 非背景色与各通道色计数
  const SAMPLE = `(() => {
    const read = (cv) => {
      if (!cv) return null
      const c = cv.getContext('2d')
      const d = c.getImageData(0, 0, cv.width, cv.height).data
      const is = (i, r, g, b, t) => Math.abs(d[i] - r) < t && Math.abs(d[i + 1] - g) < t && Math.abs(d[i + 2] - b) < t
      let tot = 0, ink = 0, cyan = 0, cyanC = 0, green = 0, amber = 0, blue = 0, white = 0, purple = 0
      for (let i = 0; i < d.length; i += 16) {
        tot++
        if (is(i, 11, 22, 38, 10)) continue
        ink++
        if (is(i, 94, 234, 212, 42)) cyan++
        if (is(i, 34, 211, 238, 42)) cyanC++ // 相量 U_C 色 #22d3ee
        if (is(i, 125, 255, 168, 42)) green++
        if (is(i, 251, 191, 36, 48)) amber++
        if (is(i, 96, 165, 250, 48)) blue++
        if (is(i, 233, 239, 252, 28)) white++
        if (is(i, 183, 156, 255, 52)) purple++
      }
      return { ink, cyan, cyanC, green, amber, blue, white, purple }
    }
    return {
      ph: read(document.querySelector('.hc-ph-cv')),
      os: read(document.querySelector('.hc-os-cv'))
    }
  })()`
  const px1 = await ev(SAMPLE)
  log('PIX sweep1:', JSON.stringify(px1))
  const sld1 = await ev('document.querySelector(".hc-sld").value')
  await sleep(1400)
  const px2 = await ev(SAMPLE)
  const sld2 = await ev('document.querySelector(".hc-sld").value')
  log('PIX sweep2:', JSON.stringify(px2), 'sld', sld1, '->', sld2)
  const shot = async (name) => {
    const img = await cdp('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(process.cwd(), name), Buffer.from(img.data, 'base64'))
    log('saved', name)
  }
  await shot('.tmp-panel-1.png')

  // ---- 谐振定位:徽章/读数/波形重合 ----
  await ev('[...document.querySelectorAll(".hc-btn")].find((b) => b.textContent.includes("谐振")).click()')
  await sleep(600)
  const res = await ev(`(() => ({
    reads: [...document.querySelectorAll('.hc-rd b')].map((b) => b.textContent),
    st: document.querySelector('.hc-os-st')?.textContent || '',
    sld: document.querySelector('.hc-sld').value
  }))()`)
  log('STATE res:', JSON.stringify(res))
  const pxRes = await ev(SAMPLE)
  log('PIX resonance:', JSON.stringify(pxRes))

  // ---- 滑杆 0 → 容性区 ----
  await ev(`(() => { const s = document.querySelector('.hc-sld'); s.value = '0'; s.dispatchEvent(new Event('input')) })()`)
  await sleep(400)
  const cap = await ev(`(() => ({ reads: [...document.querySelectorAll('.hc-rd b')].map((b) => b.textContent), st: document.querySelector('.hc-os-st')?.textContent || '', zone: document.querySelector('.hc-zone')?.textContent || '' }))()`)
  log('STATE cap:', JSON.stringify(cap))
  const pxCap = await ev(SAMPLE)
  log('PIX cap:', JSON.stringify(pxCap))

  // ---- 滑杆 1000 → 感性区 ----
  await ev(`(() => { const s = document.querySelector('.hc-sld'); s.value = '1000'; s.dispatchEvent(new Event('input')) })()`)
  await sleep(400)
  const ind = await ev(`(() => ({ reads: [...document.querySelectorAll('.hc-rd b')].map((b) => b.textContent), st: document.querySelector('.hc-os-st')?.textContent || '', zone: document.querySelector('.hc-zone')?.textContent || '' }))()`)
  log('STATE ind:', JSON.stringify(ind))
  await shot('.tmp-panel-2.png')

  const errs = await ev('(window.__errs || []).join(" | ")')
  log('PAGE ERRORS:', errs)
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
