// 截图侧栏激活状态到本地,供 System.Drawing 像素采样
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9351
const prof = mkdtempSync(join(tmpdir(), 'pxck3-'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1200,1000', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, 'about:blank'
], { stdio: 'ignore' })

let ws, msgQ = [], wsReady
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
const mainTimer = setTimeout(() => { console.error('GLOBAL TIMEOUT'); process.exit(2) }, 80000)

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
    const i = msgQ.findIndex((x) => x.id === m.id)
    if (i < 0) return
    const [q] = msgQ.splice(i, 1)
    m.error ? q.reject(new Error(m.error.message)) : q.resolve(m.result)
  })
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Page.navigate', { url: 'http://localhost:5173/' })
  await sleep(2400)
  const now = new Date()
  const code = String(((now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours()) * 2)
  for (let i = 0; i < 20; i++) {
    const s = await ev('document.querySelector(".snav-item") ? "ok" : "wait"')
    if (s === 'ok') break
    await ev(`sessionStorage.setItem('otp-code', '${code}'); location.reload();`)
    await sleep(700)
  }
  await sleep(700)
  const r = await ev(`(() => { const q = document.querySelectorAll('.snav-item')[2].getBoundingClientRect(); return { x: Math.round(q.left + q.width / 2), y: Math.round(q.top + q.height / 2) } })()`)
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 })
  await sleep(1200)
  const rects = await ev(`(() => {
    const pick = (el) => { const q = el.getBoundingClientRect(); return { l: Math.round(q.left), t: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height) } }
    const items = [...document.querySelectorAll('.snav-item')]
    const act = items.find((x) => x.classList.contains('active'))
    return { active: pick(act), inactive: pick(items.find((x) => !x.classList.contains('active'))) }
  })()`)
  const shot = await cdp('Page.captureScreenshot', { format: 'png' })
  writeFileSync('.tmp-side-shot.png', Buffer.from(shot.data, 'base64'))
  console.log('rects:', JSON.stringify(rects))
}

main().then(async () => {
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
