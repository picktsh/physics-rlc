// temp diagnostic: static view + realistic component colors
import { spawn } from 'node:child_process'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9339
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const edge = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + process.env.TEMP + '\\qoder-edge-tmp7',
  '--no-first-run',
  '--no-default-browser-check',
  '--no-proxy-server',
  '--disable-gpu-sandbox',
  '--disable-features=BlockInsecurePrivateNetworkRequests',
  '--window-size=1440,2200',
  'about:blank',
], { stdio: 'ignore' })

let wsUrl = null
for (let i = 0; i < 60; i++) {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
    const list = await res.json()
    const page = list.find((t) => t.type === 'page')
    if (page) { wsUrl = page.webSocketDebuggerUrl; break }
  } catch {}
  await sleep(300)
}
if (!wsUrl) { console.log('CDP unavailable'); edge.kill(); process.exit(1) }

const ws = new WebSocket(wsUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let msgId = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    console.log('PAGE-ERROR =>', m.params.args.map((a) => a.value || a.description || '').join(' '))
  }
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
}
function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++msgId
    pending.set(id, resolve)
    ws.send(JSON.stringify({ id, method, params }))
  })
}
async function evalJS(expression, awaitPromise = false) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
  if (r.result?.exceptionDetails) {
    console.log('EXC =>', r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)
  }
  return r.result?.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: 'http://127.0.0.1:5174/' })
// wait app mount, then unlock (lock screen has no nav items)
for (let i = 0; i < 25; i++) {
  if (await evalJS(`!!document.querySelector('#app')`)) break
  await sleep(1000)
}
await sleep(500)
console.log('unlock =>', await evalJS(`(() => {
  const pinia = document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia
  const store = pinia?._s.get('app')
  if (!store) return 'FAIL-no-store'
  store.otpPassed = true
  return 'OK'
})()`))
// wait nav shell after unlock
let ready = false
for (let i = 0; i < 20; i++) {
  await sleep(500)
  if (await evalJS(`!!document.querySelector('.snav-item')`)) { ready = true; break }
}
console.log('shell-ready =>', ready)
await evalJS(`document.querySelectorAll('.snav-item')[1].click()`)
await sleep(2500)

async function drop(type, fx, fy) {
  return evalJS(`(() => {
    const cv = [...document.querySelectorAll('canvas')].find((c) => c.className.includes('border-dashed'))
    const rect = cv.getBoundingClientRect()
    const dt = new DataTransfer()
    dt.setData('componentType', '${type}')
    const ev = new DragEvent('drop', {
      bubbles: true, cancelable: true,
      clientX: rect.left + rect.width * ${fx},
      clientY: rect.top + rect.height * ${fy},
      dataTransfer: dt,
    })
    cv.dispatchEvent(ev)
    return 'ok'
  })()`)
}
await drop('R', 0.3, 0.3); await sleep(500)
await drop('L', 0.5, 0.3); await sleep(500)
await drop('C', 0.7, 0.3); await sleep(500)
await drop('V', 0.5, 0.6); await sleep(2500)

console.log('components =>', await evalJS(`JSON.stringify([...document.querySelectorAll('label')].filter((l) => /^(电阻 R|电感 L|电容 C|电压 V) #/.test(l.textContent)).map((l) => l.textContent.trim()))`))

// two screenshots 900ms apart to verify static scene (no autorotate)
const shotA = (await send('Page.captureScreenshot', { format: 'png' })).result.data
await sleep(900)
const shotB = (await send('Page.captureScreenshot', { format: 'png' })).result.data

const probe = `(async () => {
  const decode = async (b64) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); return i }
  const cv = [...document.querySelectorAll('canvas')].find((c) => !c.className.includes('border-dashed'))
  const b = cv.getBoundingClientRect()
  const scale = 0.35
  const mk = () => { const o = document.createElement('canvas'); o.width = Math.max(1, Math.round(b.width * scale)); o.height = Math.max(1, Math.round(b.height * scale)); return o }
  const a = mk(), c2 = mk()
  const xa = a.getContext('2d'), xb = c2.getContext('2d')
  const ia = await decode('${shotA}')
  const ib = await decode('${shotB}')
  xa.drawImage(ia, b.left, b.top, b.width, b.height, 0, 0, a.width, a.height)
  xb.drawImage(ib, b.left, b.top, b.width, b.height, 0, 0, c2.width, c2.height)
  const da = xa.getImageData(0, 0, a.width, a.height).data
  const db = xb.getImageData(0, 0, c2.width, c2.height).data
  let diff = 0, total = 0
  let yellow = 0, green = 0, brown = 0, black = 0, dark = 0, wood = 0
  const W = a.width, H = a.height
  const idx = (x, y) => (y * W + x) * 4
  const classOf = (r, g, bl) => {
    if (r > 225 && g >= 155 && g <= 205 && bl < 120 && r - bl > 125) return 'yellow'   // film cap #e9c55c
    if (g > r * 1.08 && g > bl * 1.12 && g > 130 && bl > 80 && r > 140) return 'green'  // inductor #bfe0ae lit
    if (r >= 110 && r <= 175 && g >= 70 && g <= 125 && bl >= 20 && bl <= 70) return 'brown' // band #8a5a2b
    if (r < 80 && g < 90 && bl < 95) return 'dark'                                         // black band / screen
    return ''
  }
  const cnt = {}
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y)
      total++
      const r = da[i], g = da[i + 1], bl = da[i + 2]
      if (Math.abs(r - db[i]) + Math.abs(g - db[i + 1]) + Math.abs(bl - db[i + 2]) > 24) diff++
      const c = classOf(r, g, bl)
      if (c) cnt[c] = (cnt[c] || 0) + 1
      // inductor approx zone: x 35-65%, y 20-40%
      if (c === 'green') {
        if (x > W * 0.35 && x < W * 0.65 && y > H * 0.2 && y < H * 0.4) cnt.greenZone = (cnt.greenZone || 0) + 1
      }
      if (r > 120 && r > bl * 1.35 && g > bl * 0.9 && (r - bl) <= 125) wood++
    }
  }
  return JSON.stringify({
    diffRatio: ((diff / total) * 100).toFixed(3) + '%',
    yellow: (((cnt.yellow || 0) / total) * 100).toFixed(2) + '%',
    green: (((cnt.green || 0) / total) * 100).toFixed(2) + '%',
    greenZone: cnt.greenZone || 0,
    brown: (((cnt.brown || 0) / total) * 100).toFixed(2) + '%',
    dark: (((cnt.dark || 0) / total) * 100).toFixed(2) + '%',
  })
})()`
console.log('pixels =>', await evalJS(probe, true))

ws.close()
edge.kill()
process.exit(0)
