/* CDP 验证:公式台裁切修复 — 多视口宽度下检查所有公式台的 scrollWidth vs clientWidth */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9338
const APP = 'http://127.0.0.1:5199/'
const S = (...a) => console.log('[S]', ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitEdge() {
  for (let i = 0; i < 40; i++) {
    try {
      const v = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json())
      if (v.webSocketDebuggerUrl) return v
    } catch {}
    await sleep(250)
  }
  throw new Error('edge not ready')
}

S('S1 spawn edge')
const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${path.join(os.tmpdir(), 'fmfix-' + Date.now())}`,
  '--window-size=1600,1000', 'about:blank',
], { stdio: 'ignore' })

try {
  await waitEdge()
  S('S2 create page')
  const page = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(APP)}`, { method: 'PUT' }).then((r) => r.json())
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let mid = 0
  const pending = new Map()
  const errors = []
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
    else if (m.method === 'Runtime.exceptionThrown') errors.push('EXC: ' + (m.params.exceptionDetails?.exception?.description || ''))
    else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push('LOG: ' + m.params.entry.text)
  }
  const send = (method, params = {}) => new Promise((res) => { const id = ++mid; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })) })
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
    if (r.result?.exceptionDetails) throw new Error('eval exc: ' + JSON.stringify(r.result.exceptionDetails))
    return r.result?.result?.value
  }
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable')

  S('S3 navigate + unlock')
  for (let i = 0; i < 8; i++) {
    try { await send('Page.navigate', { url: APP }); await sleep(1200); break } catch { await sleep(600) }
  }
  const d = new Date()
  const code = String((((d.getMonth() + 1) * 10000 + d.getDate() * 100 + d.getHours()) * 2) + '').padStart(6, '0')
  await ev(`sessionStorage.setItem('otp-code','${code}'); true`)
  await send('Page.reload')
  await sleep(2000)
  for (let i = 0; i < 25; i++) {
    if (await ev(`document.querySelectorAll('.katex').length`) > 60) break
    await sleep(400)
  }
  S('  page loaded')

  // 检查"公式台"自身是否产生横向滚动/裁切(可见级)
  const auditExpr = `(() => {
    const bad = []
    const boxes = [...document.querySelectorAll('[class*="f6f8fb"]')]
      .filter(el => el.querySelector('.katex-display'))
    for (const b of boxes) {
      if (b.scrollWidth > b.clientWidth + 1) bad.push({
        client: b.clientWidth, scroll: b.scrollWidth,
        sec: b.closest('section')?.querySelector('.sec-title')?.textContent || '',
      })
    }
    const rows = [...document.querySelectorAll('[class*="xl:grid-cols-[1fr_auto]"]')].length
    const chain = [...document.querySelectorAll('[class*="xl:grid-cols-[1fr_auto_1fr_auto_1fr]"]')].length
    const pageOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth
    return { bad, rows, chain, pageOverflow, vw: window.innerWidth }
  })()`

  const setWidth = async (w) => {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 1000, deviceScaleFactor: 1, mobile: false })
    await sleep(700)
  }

  for (const w of [1600, 1440, 1280, 1100, 900, 768, 414]) {
    await setWidth(w)
    console.log('WIDTH', w, JSON.stringify(await ev(auditExpr)))
  }
  await send('Emulation.clearDeviceMetricsOverride')

  // 截图(1600 全宽)供像素佐证
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  if (shot.result?.data) { writeFileSync('.tmp-shot-fix.png', Buffer.from(shot.result.data, 'base64')); S('  shot saved') }

  await sleep(600)
  S('S4 errors =', errors.length); errors.slice(0, 6).forEach((e) => console.log('  ERR>', e))
  ws.close()
  S('S5 done')
} catch (e) {
  console.error('FAIL', e); process.exitCode = 1
} finally {
  edge.kill()
}
