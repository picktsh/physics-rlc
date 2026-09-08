// 临时诊断脚本:验证电路搭建页三栏布局(元件库左/画布中/参数右)
import { spawn } from 'node:child_process'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9336
const URL = 'http://127.0.0.1:5173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const edge = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + process.env.TEMP + '\\qoder-edge-tmp4',
  '--no-first-run',
  '--no-default-browser-check',
  '--no-proxy-server',
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
if (!wsUrl) { console.log('CDP 不可用'); edge.kill(); process.exit(1) }

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
async function evalJS(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true })
  return r.result?.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: URL })
await sleep(4000)

console.log('unlock =>', await evalJS(`(() => {
  const appEl = document.querySelector('#app')
  const pinia = appEl?.__vue_app__?.config.globalProperties.$pinia
  const store = pinia?._s.get('app')
  if (!store) return 'FAIL'
  store.otpPassed = true
  return 'OK'
})()`))
await sleep(2500)

// 进入电路搭建 tab(下标 1)
await evalJS(`document.querySelectorAll('.snav-item')[1].click()`)
await sleep(2500)

// 布局坐标诊断:三栏位置关系
const layoutExpr = `(() => {
  const card = document.querySelector('.card .lg\\\\:grid')
  const palette = document.querySelector('.components-palette')
  const cv2d = [...document.querySelectorAll('canvas')].find(c => c.className.includes('border-dashed'))
  const cv3d = [...document.querySelectorAll('canvas')].find(c => c.className.includes('e9eef6') || c.className.includes('rounded-lg'))
  const r = (el) => { const b = el.getBoundingClientRect(); return Math.round(b.left) + '-' + Math.round(b.right) + ' w=' + Math.round(b.width) }
  return JSON.stringify({
    grid: r(card),
    palette: r(palette),
    canvas2d: r(cv2d),
    canvas3d: cv3d ? r(cv3d) : 'N/A',
    paletteDir: getComputedStyle(palette).flexDirection,
  })
})()`
console.log('布局 =>', await evalJS(layoutExpr))

// 拖入 R/L/C/V 四个元件(模拟用户拖放)
const dropExpr = `(() => {
  const cv = [...document.querySelectorAll('canvas')].find(c => c.className.includes('border-dashed'))
  const rect = cv.getBoundingClientRect()
  const types = ['R', 'L', 'C', 'V']
  types.forEach((t, i) => {
    const dt = new DataTransfer()
    dt.setData('componentType', t)
    const ev = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width * 0.25 + (i % 2) * rect.width * 0.4,
      clientY: rect.top + 60 + Math.floor(i / 2) * 90,
      dataTransfer: dt,
    })
    cv.dispatchEvent(ev)
  })
  return 'dropped'
})()`
console.log('放置元件 =>', await evalJS(dropExpr))
await sleep(1800)

// 放置后:参数编辑区是否出现在右侧第三栏 + 3D canvas 尺寸
const afterExpr = `(() => {
  const cv2d = [...document.querySelectorAll('canvas')].find(c => c.className.includes('border-dashed'))
  const cv3d = [...document.querySelectorAll('canvas')].find(c => !c.className.includes('border-dashed'))
  const labels = [...document.querySelectorAll('label')].filter(l => /^(电阻 R|电感 L|电容 C|电压 V) #/.test(l.textContent)).map(l => { const b = l.getBoundingClientRect(); return l.textContent.trim() + '@' + Math.round(b.left) })
  const tolCard = [...document.querySelectorAll('div')].find(d => d.textContent.includes('元件公差') && d.className.includes('bg-gray-50'))
  const r = (el) => { if (!el) return 'N/A'; const b = el.getBoundingClientRect(); return Math.round(b.left) + '-' + Math.round(b.right) }
  return JSON.stringify({
    canvas2d: r(cv2d) + ' h=' + Math.round(cv2d.getBoundingClientRect().height),
    canvas3d: r(cv3d) + ' buf=' + cv3d.width + 'x' + cv3d.height,
    compLabels: labels,
    tolCard: r(tolCard),
    canvas2dBuf: cv2d.width + 'x' + cv2d.height,
  })
})()`
console.log('放置后 =>', await evalJS(afterExpr))

ws.close()
edge.kill()
process.exit(0)
