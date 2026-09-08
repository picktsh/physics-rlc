/* 无头验证:§5 三行重构后 —— 公式台不贴边且居中、图区宽、无裁切、多档位 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const CDP_PORT = 9341
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

  const probe = await evaluate(conn, `(() => ({ url: location.href, head: (document.body ? document.body.innerText : '').slice(0, 90).replace(/\\n/g, '|'), secs: document.querySelectorAll('section').length }))()`)
  console.log('PAGE', JSON.stringify(probe))
  if (!probe.secs) {
    console.log('仍无内容,再设一次 otp 并 reload')
    await evaluate(conn, `sessionStorage.setItem('otp-code', '${code}')`)
    await conn.send('Page.reload', { ignoreCache: true })
    await sleep(3000)
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
  const probe2 = await evaluate(conn, `(() => ({ head: (document.body ? document.body.innerText : '').slice(0, 60).replace(/\\n/g, '|'), secs: document.querySelectorAll('section').length }))()`)
  console.log('PAGE2', JSON.stringify(probe2))

  for (const w of [1440, 1280, 1100, 768]) {
    await conn.send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await sleep(350)
    const rr = await evaluate(conn, `(() => {
      const sec = [...document.querySelectorAll('section')].find(s => s.textContent.includes('三大频率特性'))
      const rows = [...sec.querySelectorAll('[class*="divide-y"] > div')].map((row) => {
        const t = row.querySelector('[class*="f6f8fb"]')
        const svg = row.querySelector('svg')
        const p = row.querySelector('p')
        const rowRect = row.getBoundingClientRect()
        const tRect = t ? t.getBoundingClientRect() : null
        const svgRect = svg ? svg.getBoundingClientRect() : null
        return {
          title: row.children[0].textContent.trim().slice(0, 6),
          // 公式台:距行左右缘的距离(贴边感)、是否水平居中
          trayLeftGap: tRect ? Math.round(tRect.left - rowRect.left) : -1,
          trayRightGap: tRect ? Math.round(rowRect.right - tRect.right) : -1,
          trayCenterOff: tRect ? Math.round((tRect.left + tRect.right) / 2 - (rowRect.left + rowRect.right) / 2) : -1,
          trayOverflow: t ? t.scrollWidth - t.clientWidth : -1,
          svgW: svgRect ? Math.round(svgRect.width) : -1,
          svgH: svgRect ? Math.round(svgRect.height) : -1,
          rowH: Math.round(rowRect.height),
        }
      })
      return {
        rows,
        bodyOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    })()`)
    console.log('REPORT@' + w, JSON.stringify(rr))
  }

  conn.close()
} finally {
  chrome.kill()
}
console.log('DONE')
