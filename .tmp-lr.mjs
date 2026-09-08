/* 无头验证:§5 图左文右 —— xl 下 chart 在左、p 与 tray 在右且同左缘;窄屏回退纵向 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const CDP_PORT = 9346
const URL = 'http://127.0.0.1:5199'

function cdp(wsUrl) {
  let id = 0
  const pending = new Map()
  const ws = new WebSocket(wsUrl)
  ws.onerror = () => {}
  const api = new Promise((res, rej) => {
    ws.onopen = () => res(true)
    ws.onerror = rej
  })
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? reject(new Error(m.error.message)) : resolve(m.result)
    }
  }
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id
      pending.set(i, { resolve, reject })
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  const ready = api.then(() => send)
  return { ready, send, close: () => ws.close() }
}

async function evaluate(conn, expr) {
  const r = await conn.send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  })
  if (r.exceptionDetails) throw new Error('evaluate failed: ' + JSON.stringify(r.exceptionDetails))
  return r.result.value
}

const d = new Date()
const z = (d.getMonth() + 1) * 10000 + d.getDate() * 100 + d.getHours()
const code = String(z * 2).padStart(6, '0')

const chrome = spawn(
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,900',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

try {
  let list = null
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
      list = await r.json()
      if (list.length) break
    } catch {}
    await sleep(250)
  }
  if (!list || !list.length) throw new Error('CDP 未就绪')
  const conn = cdp(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await conn.ready
  await conn.send('Page.enable')
  await conn.send('Runtime.enable')
  await conn.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })

  await conn.send('Page.navigate', { url: URL })
  await sleep(2500)
  const needOtp = await evaluate(
    conn,
    `(() => { const t = document.body ? document.body.innerText : ''; return t.includes('验证码') || location.href.includes('lock') })()`,
  )
  if (needOtp) {
    await evaluate(conn, `sessionStorage.setItem('otp-code', '${code}')`)
    await conn.send('Page.reload', { ignoreCache: true })
    await sleep(2500)
  }
  await evaluate(
    conn,
    `new Promise((res) => {
      const t0 = Date.now()
      const tick = () => {
        const c = document.querySelectorAll('.formula-k .katex').length
        if (c > 60 && document.fonts && document.fonts.check('16px KaTeX_Main')) return res(true)
        if (Date.now() - t0 > 15000) return res(false)
        setTimeout(tick, 150)
      }
      tick()
    })`,
  )

  for (const w of [1440, 1280, 1100, 768]) {
    await conn.send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: 1100,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await sleep(350)
    const rr = await evaluate(conn, `(() => {
      const sec = [...document.querySelectorAll('section')].find(s => s.textContent.includes('三大频率特性'))
      const rows = [...sec.querySelectorAll('[class*="divide-y"] > div')].map((row) => {
        const rowRect = row.getBoundingClientRect()
        const chart = row.querySelector('[class*="f7f9fc"]')
        const p = row.querySelector('p')
        const tray = row.querySelector('[class*="f6f8fb"]')
        const cRect = chart.getBoundingClientRect()
        const pRect = p.getBoundingClientRect()
        const tRect = tray.getBoundingClientRect()
        return {
          title: row.children[0].textContent.trim().slice(0, 8),
          chartLeft: Math.round(cRect.left - rowRect.left),
          chartRight: Math.round(cRect.right - rowRect.left),
          pLeft: Math.round(pRect.left - rowRect.left),
          pTop: Math.round(pRect.top - rowRect.top),
          trayLeft: Math.round(tRect.left - rowRect.left),
          trayGapToP: Math.round(tRect.top - pRect.bottom),
          trayRight: Math.round(tRect.right - rowRect.left),
          pLines: Math.round(pRect.height / 28),
          rowH: Math.round(rowRect.height),
          colGap: Math.round(pRect.left - cRect.right),
        }
      })
      return { rows, bodyOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth }
    })()`)
    console.log('REPORT@' + w, JSON.stringify(rr))
  }

  conn.close()
} finally {
  chrome.kill()
}
console.log('DONE')
