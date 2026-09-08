// 临时无头浏览器测试:Edge headless + CDP,验证 2D 放置与 3D 渲染(用后即删)
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PROFILE = os.tmpdir() + '\\rlc-edge-prof'
const DPORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const edge = spawn(
  EDGE,
  [
    '--headless=new',
    `--remote-debugging-port=${DPORT}`,
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--no-proxy-server',
    '--enable-unsafe-swiftshader',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--window-size=1680,1100',
    'about:blank',
  ],
  { stdio: 'ignore' }
)
process.on('exit', () => {
  try { edge.kill() } catch {}
})

async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${DPORT}/json/list`)
      const list = await r.json()
      const t = list.find((x) => x.type === 'page')
      if (t) return t
    } catch {}
    await sleep(300)
  }
  throw new Error('devtools target not ready')
}

const target = await getTarget()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

let msgId = 0
const pend = new Map()
const errLogs = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) {
    pend.get(m.id).res(m.result)
    pend.delete(m.id)
  } else if (m.method === 'Runtime.exceptionThrown') {
    errLogs.push('[EXC] ' + JSON.stringify(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text))
  } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errLogs.push('[CONSOLE] ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  } else if (m.method === 'Runtime.consoleAPICalled') {
    errLogs.push('[LOG:' + m.params.type + '] ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  } else if (m.method === 'Network.loadingFailed') {
    errLogs.push('[NETFAIL] ' + (m.params.errorText || '') + ' ' + (m.params.blockedReason || ''))
  }
}
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++msgId
    pend.set(id, { res, rej })
    ws.send(JSON.stringify({ id, method, params }))
  })
const evtWait = (method, timeout = 20000) =>
  new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('wait ' + method + ' timeout')), timeout)
    const onMsg = (e) => {
      const m = JSON.parse(e.data)
      if (m.method === method) {
        clearTimeout(t)
        ws.removeEventListener('message', onMsg)
        res(m.params)
      }
    }
    ws.addEventListener('message', onMsg)
  })
const evalJS = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text))
  return r.result?.value
}

await send('Runtime.enable')
await send('Page.enable')
await send('Network.enable')

// 1) 打开首页(带重试:headless 网络服务偶发未就绪)
let navOk = false
for (let attempt = 0; attempt < 10 && !navOk; attempt++) {
  await send('Page.navigate', { url: 'http://127.0.0.1:5199/' })
  await sleep(4000)
  navOk = await evalJS(`location.href.startsWith('http://127.0.0.1:5199')`)
  if (!navOk) console.log('nav1 retry', attempt)
}
console.log('loc after nav:', await evalJS('location.href'))
console.log('vis:', await evalJS('document.visibilityState'))
console.log('text0:', JSON.stringify((await evalJS('document.body.innerText')).slice(0, 80)))

// 2) 绕过动态验证码 + 直达电路搭建 tab(与 app.js genCode 相同算法)
const d = new Date()
const w = d.getMonth() + 1
const day = d.getDate()
const hr = d.getHours()
const code = String((w * 10000 + day * 100 + hr) * 2).padStart(6, '0')
await evalJS(
  `sessionStorage.setItem('otp-code','${code}');sessionStorage.setItem('activeTab','circuit');true`
)
// CDP 导航(带重试,规避 headless 偶发连接拒绝)
for (let attempt = 0; attempt < 5; attempt++) {
  await send('Page.navigate', { url: 'http://127.0.0.1:5199/' })
  await sleep(3000)
  const ok = await evalJS(`location.href.startsWith('http://127.0.0.1:5199') && document.body.innerText.includes('请输入验证码') === false`)
  if (ok) break
  console.log('nav retry', attempt)
}
await sleep(6000)

// 2.5) 页面状态诊断
const pageDiag = await evalJS(`JSON.stringify({
  ready: document.readyState,
  appKids: document.querySelector('#app')?.children.length ?? -1,
  text: (document.body.innerText || '').slice(0, 160),
  bodyLen: (document.body.innerHTML || '').length
})`)
console.log('diag:', pageDiag)

// 3) 若仍在锁屏则输出提示并结束

// 3) 依次选中并放置 R/L/C/V 四种元件(不同位置,验证多彩渲染)
const palCount = await evalJS(`document.querySelectorAll('.component-item').length`)
const boardCount = await evalJS(`document.querySelectorAll('canvas').length`)
const placeAt = async (idx, fx, fy) => {
  await evalJS(`document.querySelectorAll('.component-item')[${idx}]?.click(); true`)
  await sleep(150)
  return evalJS(`(() => {
    const cv = document.querySelector('canvas')
    const rect = cv.getBoundingClientRect()
    cv.dispatchEvent(new MouseEvent('mousedown', { clientX: rect.left + rect.width * ${fx}, clientY: rect.top + rect.height * ${fy}, bubbles: true }))
    return true
  })()`)
}
await placeAt(0, 0.3, 0.5) // R
await sleep(250)
await placeAt(1, 0.7, 0.5) // L
await sleep(250)
await placeAt(2, 0.5, 0.3) // C
await sleep(250)
await placeAt(3, 0.5, 0.7) // V
await sleep(1800)

// 5) 检查放置是否成功(元件参数编辑器出现)与 3D 区是否显示按钮
const state = await evalJS(`JSON.stringify({
  hasEdit: document.body.innerText.includes('元件参数编辑'),
  has3DReset: Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('复位视角')),
  canvas3dSize: (() => { const cs = document.querySelectorAll('canvas'); return cs.length > 1 ? (cs[1].getBoundingClientRect().width + 'x' + cs[1].getBoundingClientRect().height) : 'none' })(),
  f3d: window.__f3d ?? -1
})`)
await sleep(1000)
const f3d2 = await evalJS(`window.__f3d ?? -1`)
console.log('frameDelta:', f3d2 - (JSON.parse(state).f3d))

// 6) 全页截图 + 3D 区域像素分析
const shot = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync('D:\\code\\physics-rlc\\.tmp-shot.png', Buffer.from(shot.data, 'base64'))
const shotClip = await evalJS(`(() => {
  const cs = document.querySelectorAll('canvas')
  if (cs.length < 2) return null
  cs[1].scrollIntoView({ block: 'center' })
  const r = cs[1].getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height }
})()`)
await sleep(500)
let pixelDiag = 'no-clip'
if (shotClip) {
  const clipShot = await send('Page.captureScreenshot', { format: 'png', clip: { ...shotClip, scale: 1 } })
  pixelDiag = await evalJS(`(async () => {
    const b64 = '${clipShot.data}'
    const img = new Image()
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64 })
    const cv = document.createElement('canvas')
    cv.width = img.width; cv.height = img.height
    const cx = cv.getContext('2d')
    cx.drawImage(img, 0, 0)
    const d = cx.getImageData(0, 0, cv.width, cv.height).data
    const colors = new Map()
    let bg = 0, total = 0, dark = 0, redish = 0, bandbrown = 0
    for (let i = 0; i < d.length; i += 16) {
      const r = d[i], g = d[i + 1], b = d[i + 2]
      total++
      if (Math.abs(r - 0xea) < 8 && Math.abs(g - 0xf1) < 8 && Math.abs(b - 0xee) < 8) bg++
      if (r < 60 && g < 70 && b < 80) dark++ // 深青荧光屏底
      if (r > 195 && r < 245 && g < 110 && b < 130) redish++ // 亮红端子
      if (r > 130 && r < 190 && g > 80 && g < 140 && b < 110) bandbrown++ // 电阻色环棕
      const k = r + ',' + g + ',' + b
      colors.set(k, (colors.get(k) || 0) + 1)
    }
    const top = [...colors.entries()].sort((a, b2) => b2[1] - a[1]).slice(0, 12).map((e) => e[0] + ':' + e[1])
    return JSON.stringify({ w: img.width, h: img.height, bgPct: Math.round((bg / total) * 100), dark, redish, bandbrown, top })
  })()`)
}
console.log('pixels:', pixelDiag)

console.log('=== RESULT ===')
console.log('palette:', palCount, 'canvas:', boardCount)
console.log('state:', state)
console.log('--- runtime errors (' + errLogs.length + ') ---')
for (const l of errLogs) console.log(l)
ws.close()
edge.kill()
process.exit(0)
