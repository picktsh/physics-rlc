// temp diagnostic: verify bench desk + bigger components rendering
import { spawn } from 'node:child_process'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9338
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const edge = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + process.env.TEMP + '\\qoder-edge-tmp6',
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
// wait until app shell renders
let ready = false
for (let i = 0; i < 20; i++) {
  await sleep(1000)
  if (await evalJS(`!!document.querySelector('.snav-item')`)) { ready = true; break }
}
console.log('shell-ready =>', ready)
console.log('unlock =>', await evalJS(`(() => {
  const pinia = document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia
  const store = pinia?._s.get('app')
  if (!store) return 'FAIL-no-store'
  store.otpPassed = true
  return 'OK'
})()`))
await sleep(1200)
await evalJS(`document.querySelectorAll('.snav-item')[1].click()`)
await sleep(2000)

// drop 3 components (last one wins, like real drag) - repeat trick: dispatch only C drop first, then all three via separate frames
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
await drop('R', 0.3, 0.35)
await sleep(400)
await drop('L', 0.5, 0.35)
await sleep(400)
await drop('C', 0.7, 0.35)
await sleep(400)
await drop('V', 0.5, 0.62)
await sleep(2500)

console.log('components =>', await evalJS(`JSON.stringify([...document.querySelectorAll('label')].filter((l) => /^(电阻 R|电感 L|电容 C|电压 V) #/.test(l.textContent)).map((l) => l.textContent.trim()))`))

const shot = await send('Page.captureScreenshot', { format: 'png' })
const base64 = shot.result.data

const probe = `(async () => {
  const img = new Image()
  img.src = 'data:image/png;base64,${base64}'
  await img.decode()
  const cv = [...document.querySelectorAll('canvas')].find((c) => !c.className.includes('border-dashed'))
  const b = cv.getBoundingClientRect()
  const scale = 0.35
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(b.width * scale))
  out.height = Math.max(1, Math.round(b.height * scale))
  const ctx = out.getContext('2d')
  ctx.drawImage(img, b.left, b.top, b.width, b.height, 0, 0, out.width, out.height)
  const d = ctx.getImageData(0, 0, out.width, out.height)
  const px = d.data
  let wood = 0, dark = 0, colored = 0, total = 0
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], bl = px[i + 2]
    const lum = r * 0.299 + g * 0.587 + bl * 0.114
    total++
    if (r > 120 && r > bl * 1.35 && g > bl * 0.9 && lum > 100) wood++   // warm wood tone
    if (lum < 150) dark++                                              // component bodies / shadows
    if (bl > r * 1.25 && bl > 90) colored++                            // blue wires / pads
  }
  return JSON.stringify({
    region: out.width + 'x' + out.height,
    woodRatio: ((wood / total) * 100).toFixed(1) + '%',
    darkRatio: ((dark / total) * 100).toFixed(1) + '%',
    blueRatio: ((colored / total) * 100).toFixed(1) + '%',
  })
})()`
console.log('pixels =>', await evalJS(probe, true))

ws.close()
edge.kill()
process.exit(0)
