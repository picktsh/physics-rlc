// temp diagnostic: verify palette distribution + 3D shadow rendering
import { spawn } from 'node:child_process'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9337
const URL = 'http://127.0.0.1:5174/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const edge = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + process.env.TEMP + '\\qoder-edge-tmp5',
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
await send('Page.navigate', { url: URL })
await sleep(4000)

console.log('unlock =>', await evalJS(`(() => {
  const pinia = document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia
  const store = pinia?._s.get('app')
  if (!store) return 'FAIL'
  store.otpPassed = true
  return 'OK'
})()`))
await sleep(2000)

await evalJS(`document.querySelectorAll('.snav-item')[1].click()`)
await sleep(2000)

const itemsExpr = `(() => {
  const items = [...document.querySelectorAll('.component-item')]
  const info = items.map((el) => {
    const b = el.getBoundingClientRect()
    return Math.round(b.top) + '-' + Math.round(b.bottom) + ' h=' + Math.round(b.height)
  })
  const cv3d = [...document.querySelectorAll('canvas')].find((c) => !c.className.includes('border-dashed'))
  const cb = cv3d.getBoundingClientRect()
  return JSON.stringify({
    paletteItems: info,
    canvas3d: Math.round(cb.top) + '-' + Math.round(cb.bottom) + ' w=' + Math.round(cb.width) + ' h=' + Math.round(cb.height) + ' buf=' + cv3d.width + 'x' + cv3d.height,
  })
})()`
console.log('layout =>', await evalJS(itemsExpr))

// count placed components (labels in right column)
console.log('components =>', await evalJS(`(() => {
  const labels = [...document.querySelectorAll('label')].filter((l) => /^(电阻 R|电感 L|电容 C|电压 V) #/.test(l.textContent)).map((l) => l.textContent.trim())
  return JSON.stringify(labels)
})()`))

// capture console errors (e.g. [3D] init failures)
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    console.log('PAGE-ERROR =>', m.params.args.map((a) => a.value || a.description || '').join(' '))
  }
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
}

await evalJS(`(() => {
  const cv = [...document.querySelectorAll('canvas')].find((c) => c.className.includes('border-dashed'))
  const rect = cv.getBoundingClientRect()
  const types = ['R', 'L', 'C']
  types.forEach((t, i) => {
    const dt = new DataTransfer()
    dt.setData('componentType', t)
    const ev = new DragEvent('drop', {
      bubbles: true, cancelable: true,
      clientX: rect.left + rect.width * 0.3 + (i % 3) * rect.width * 0.2,
      clientY: rect.top + 60 + Math.floor(i / 3) * 80,
      dataTransfer: dt,
    })
    cv.dispatchEvent(ev)
  })
  return 'ok'
})()`)
await sleep(1500)

// wait a bit more for 3D rebuild, then read back component count
console.log('components-after =>', await evalJS(`(() => {
  const labels = [...document.querySelectorAll('label')].filter((l) => /^(电阻 R|电感 L|电容 C|电压 V) #/.test(l.textContent)).map((l) => l.textContent.trim())
  return JSON.stringify(labels)
})()`))

const shot = await send('Page.captureScreenshot', { format: 'png' })
const base64 = shot.result.data

const probe = `(async () => {
  const img = new Image()
  img.src = 'data:image/png;base64,${base64}'
  await img.decode()
  const cv = [...document.querySelectorAll('canvas')].find((c) => !c.className.includes('border-dashed'))
  const b = cv.getBoundingClientRect()
  const scale = 0.3
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(b.width * scale))
  out.height = Math.max(1, Math.round(b.height * scale))
  const ctx = out.getContext('2d')
  ctx.drawImage(img, b.left, b.top, b.width, b.height, 0, 0, out.width, out.height)
  const d = ctx.getImageData(0, 0, out.width, out.height)
  const px = d.data
  const stat = { total: 0, dark: 0, leftDark: 0, leftTotal: 0, rightDark: 0, rightTotal: 0, topDark: 0, topTotal: 0, bottomDark: 0, bottomTotal: 0 }
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const i = (y * out.width + x) * 4
      const lum = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
      stat.total++
      if (x < out.width / 2) { stat.leftTotal++; if (lum < 160) stat.leftDark++ }
      else { stat.rightTotal++; if (lum < 160) stat.rightDark++ }
      if (y < out.height / 2) { stat.topTotal++; if (lum < 160) stat.topDark++ }
      else { stat.bottomTotal++; if (lum < 160) stat.bottomDark++ }
      if (lum < 160) stat.dark++
    }
  }
  return JSON.stringify({
    region: out.width + 'x' + out.height,
    darkRatio: ((stat.dark / stat.total) * 100).toFixed(2) + '%',
    leftDark: ((stat.leftDark / stat.leftTotal) * 100).toFixed(2) + '%',
    rightDark: ((stat.rightDark / stat.rightTotal) * 100).toFixed(2) + '%',
    topDark: ((stat.topDark / stat.topTotal) * 100).toFixed(2) + '%',
    bottomDark: ((stat.bottomDark / stat.bottomTotal) * 100).toFixed(2) + '%',
  })
})()`
console.log('3d pixels =>', await evalJS(probe, true))

ws.close()
edge.kill()
process.exit(0)
