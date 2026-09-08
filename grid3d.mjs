// grid color sampling of the 3D canvas region
import { spawn } from 'node:child_process'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9342
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const edge = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + process.env.TEMP + '\\qoder-edge-tmpA',
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
const grid = await evalJS(`(async () => {
  const i = new Image()
  i.src = 'data:image/png;base64,${b64}'
  await i.decode()
  const W = 96, H = 93
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const x = c.getContext('2d')
  x.drawImage(i, 0, 0, W, H)
  const d = x.getImageData(0, 0, W, H).data
  const GX = 8, GY = 6
  const out = []
  for (let gy = 0; gy < GY; gy++) {
    const row = []
    for (let gx = 0; gx < GX; gx++) {
      let r = 0, g = 0, b = 0, n = 0
      for (let py = Math.floor(gy * H / GY); py < Math.floor((gy + 1) * H / GY); py++) {
        for (let px = Math.floor(gx * W / GX); px < Math.floor((gx + 1) * W / GX); px++) {
          const o = (py * W + px) * 4
          r += d[o]; g += d[o + 1]; b += d[o + 2]; n++
        }
      }
      row.push(Math.round(r / n) + ',' + Math.round(g / n) + ',' + Math.round(b / n))
    }
    out.push(row)
  }
  return JSON.stringify(out)
})()`, true)
console.log('grid(8x6 avg rgb, rows top->bottom):')
for (const row of JSON.parse(grid)) console.log(row.map((v) => v.padEnd(13)).join(''))
ws.close()
edge.kill()
process.exit(0)
