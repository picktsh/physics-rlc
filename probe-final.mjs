// final: feature-pixel stats on the 3D canvas
import { spawn } from 'node:child_process'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9343
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const edge = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + process.env.TEMP + '\\qoder-edge-tmpB',
  '--no-first-run', '--no-default-browser-check', '--no-proxy-server',
  '--disable-gpu-sandbox', '--disable-features=BlockInsecurePrivateNetworkRequests',
  '--window-size=1440,2200', 'about:blank',
], { stdio: 'ignore' })

let wsUrl = null
for (let i = 0; i < 60; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
    const page = list.find((t) => t.type === 'page')
    if (page) { wsUrl = page.webSocketDebuggerUrl; break }
  } catch {}
  await sleep(300)
}
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
  if (r.result?.exceptionDetails) console.log('EXC =>', r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)
  return r.result?.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: 'http://127.0.0.1:5174/' })
for (let i = 0; i < 40; i++) {
  if (await evalJS(`!!document.querySelector('#app')?.__vue_app__`)) break
  await sleep(1000)
}
await evalJS(`(() => {
  const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
  pinia._s.get('app').otpPassed = true
  return 'OK'
})()`)
for (let i = 0; i < 20; i++) {
  await sleep(500)
  if (await evalJS(`!!document.querySelector('.snav-item')`)) break
}
await evalJS(`document.querySelectorAll('.snav-item')[1].click()`)
await sleep(2500)
async function drop(type, fx, fy) {
  return evalJS(`(() => {
    const cv = [...document.querySelectorAll('canvas')].find((c) => c.className.includes('border-dashed'))
    const rect = cv.getBoundingClientRect()
    const dt = new DataTransfer()
    dt.setData('componentType', '${type}')
    cv.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: rect.left + rect.width * ${fx}, clientY: rect.top + rect.height * ${fy}, dataTransfer: dt }))
    return 'ok'
  })()`)
}
await drop('R', 0.3, 0.3); await sleep(500)
await drop('L', 0.5, 0.3); await sleep(500)
await drop('C', 0.7, 0.3); await sleep(500)
await drop('V', 0.5, 0.62); await sleep(2500)

const rect = JSON.parse(await evalJS(`(() => {
  const cv = [...document.querySelectorAll('canvas')].find((c) => !c.className.includes('border-dashed'))
  const r = cv.getBoundingClientRect()
  return JSON.stringify({ x: r.left, y: r.top, w: r.width, h: r.height })
})()`))
const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: 1 } })
const b64 = shot.result.data
const stats = await evalJS(`(async () => {
  const i = new Image()
  i.src = 'data:image/png;base64,${b64}'
  await i.decode()
  const W = 279, H = 270
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const x = c.getContext('2d')
  x.drawImage(i, 0, 0, W, H)
  const d = x.getImageData(0, 0, W, H).data
  const cnt = {}
  let total = 0
  const hit = (k) => { cnt[k] = (cnt[k] || 0) + 1 }
  for (let p = 0; p < d.length; p += 4) {
    total++
    const r = d[p], g = d[p + 1], b = d[p + 2]
    if (r > 225 && g >= 155 && g <= 205 && b < 125 && r - b > 125) hit('capYellow')
    if (r > 215 && g >= 140 && g <= 235 && b >= 70 && b <= 165 && r - b > 85 && g > b) hit('warmYellow')
    if (r > 200 && g > 185 && b > 150 && r - b < 90) hit('resCream')
    if (r > 150 && g >= 95 && g <= 175 && b < 115 && r - g > 45) hit('copper')
    if (g > 190 && r < 150 && b < 170 && g > r * 1.5) hit('fluoroGreen')
    if (r < 55 && g < 65 && b < 75 && b > r) hit('screenDark')
    if (r > 175 && g > 180 && b > 190 && r - b < 30) hit('metalTrim')
    if (b > r * 1.45 && b > 130) hit('wireBlue')
  }
  const out = {}
  for (const k of Object.keys(cnt)) out[k] = ((cnt[k] / total) * 100).toFixed(3) + '%'
  return JSON.stringify(out)
})()`, true)
console.log('features =>', stats)
ws.close()
edge.kill()
process.exit(0)
