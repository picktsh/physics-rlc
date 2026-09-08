// 临时诊断脚本 v3:验证 ①扫频中途切走再切回(后台继续+图正常) ②measure 页往返后 canvas 正常
import { spawn } from 'node:child_process'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9335
const URL = 'http://127.0.0.1:5173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const edge = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + process.env.TEMP + '\\qoder-edge-tmp3',
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

async function clickTab(i) {
  return evalJS(`(() => {
    const b = document.querySelectorAll('.snav-item')[${i}]
    if (!b) return 'NO_BTN'
    b.click()
    return 'ok'
  })()`)
}

const measureExpr = `(() => {
  const out = []
  for (const c of document.querySelectorAll('canvas')) {
    try {
      const { width: bw, height: bh } = c
      const img = c.getContext('2d').getImageData(0, 0, bw, bh).data
      let opaque = 0
      for (let i = 3; i < img.length; i += 40) if (img[i] > 0) opaque++
      const total = Math.ceil(img.length / 40)
      out.push(bw + 'x' + bh + ':' + Math.round(opaque / total * 100) + '%')
    } catch (e) { out.push('ERR:' + e.message.slice(0, 40)) }
  }
  return out.join(' | ')
})()`

// ===== 场景 1:LCV 自动扫频中途切走 =====
console.log('== [场景1] 进入 LCV 并点击 自动扫频 ==')
await clickTab(4)
await sleep(2000)
const clickScan = await evalJS(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('自动扫频'))
  if (!b) return 'NO_BTN'
  b.click()
  return 'started'
})()`)
console.log('自动扫频 =>', clickScan)
await sleep(2500)
console.log('扫频 2.5s 后 canvases:', await evalJS(measureExpr))
const rows1 = await evalJS(`document.querySelectorAll('#lcTableBody tr').length`)
console.log('已采集数据行数:', rows1)

console.log('== 切到 仿真分析(扫频后台继续) ==')
await clickTab(2)
await sleep(4000)

console.log('== 切回 LCV ==')
await clickTab(4)
await sleep(2500)
console.log('切回后 canvases:', await evalJS(measureExpr))
const rows2 = await evalJS(`document.querySelectorAll('#lcTableBody tr').length`)
const btnState = await evalJS(`[...document.querySelectorAll('button')].find(x => x.textContent.includes('⏹') || x.textContent.includes('自动扫频'))?.textContent.trim() || '?'`)
console.log('已采集数据行数:', rows2, '(切走前', rows1 + ')', '| 按钮状态:', btnState)
// 停止扫频
await evalJS(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('⏹'))
  if (b) b.click()
  return 'stopped'
})()`)

// ===== 场景 2:measure 页往返 =====
console.log('== [场景2] 进入 相位差判别法 ==')
await clickTab(3)
await sleep(2500)
console.log('首访 canvases:', await evalJS(measureExpr))
console.log('== 切到 RLC工程应用 再切回 ==')
await clickTab(5)
await sleep(1500)
await clickTab(3)
await sleep(2500)
console.log('往返后 canvases:', await evalJS(measureExpr))

ws.close()
edge.kill()
process.exit(0)
