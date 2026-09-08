/* 无头验证:三大频率特性新版式(曲线示意 + 公式台) */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const CDP_PORT = 9339
const URL = 'http://127.0.0.1:5199'

function cdp(wsUrl) {
  let id = 0
  const pending = new Map()
  const ws = new WebSocket(wsUrl)
  ws.onerror = (e) => console.log('WS ERROR', e.message || e.type)
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
  return {
    ready,
    send,
    close: () => ws.close(),
  }
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

const sleepMs = (ms) => sleep(ms)
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
  // 等待调试端口可用
  let list = null
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
      list = await r.json()
      if (list.length) break
    } catch {}
    await sleepMs(250)
  }
  if (!list || !list.length) throw new Error('CDP 未就绪')
  const wsUrl = list.find((t) => t.type === 'page').webSocketDebuggerUrl

  const conn = cdp(wsUrl)
  await conn.ready
  await conn.send('Page.enable')
  await conn.send('Runtime.enable')
  await conn.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })

  // 进入验证码门 + 设 otp
  await conn.send('Page.navigate', { url: URL })
  await sleepMs(2500)
  const needOtp = await evaluate(
    conn,
    `(() => { const t = document.body ? document.body.innerText : ''; return /验证码|lock|otp/i.test(location.pathname) || t.includes('验证码') })()`,
  )
  if (needOtp) {
    await evaluate(conn, `sessionStorage.setItem('otp-code', '${code}')`)
    await conn.send('Page.reload', { ignoreCache: true })
    await sleepMs(3000)
  }

  // 等待内容 + KaTeX 字体
  await evaluate(
    conn,
    `new Promise((res) => {
      const t0 = Date.now()
      const tick = () => {
        const c = document.querySelectorAll('.formula-k .katex').length
        const fonts = document.fonts && document.fonts.check('16px KaTeX_Main')
        if (c > 60 && fonts) return res(true)
        if (Date.now() - t0 > 15000) return res(false)
        setTimeout(tick, 150)
      }
      tick()
    })`,
  )

  const probe = await evaluate(conn, `(() => ({ url: location.href, path: location.pathname, title: document.title, head: (document.body ? document.body.innerText : '').slice(0, 120), sections: document.querySelectorAll('section').length }))()`)
  console.log('PAGE', JSON.stringify(probe))
  if (probe.path.endsWith('lock.html') || probe.head.includes('验证码')) {
    console.log('仍处于验证码页,尝试再次设置 otp')
    await evaluate(conn, `sessionStorage.setItem('otp-code', '${code}')`)
    await conn.send('Page.reload', { ignoreCache: true })
    await sleepMs(3000)
  }

  const report = await evaluate(conn, `(() => {
    const out = {}
    const sec = [...document.querySelectorAll('section')].find(s => s.textContent.includes('三大频率特性'))
    out.sectionFound = !!sec
    out.svgCount = sec ? sec.querySelectorAll('svg').length : 0
    out.curvePaths = sec
      ? [...sec.querySelectorAll('svg path')].map(p => ({ len: p.getAttribute('d').length, head: p.getAttribute('d').slice(0, 12) }))
      : []
    out.resoDots = sec ? [...sec.querySelectorAll('svg circle')].map(c => c.getAttribute('cy')) : []
    out.f0lines = sec ? [...sec.querySelectorAll('svg line')].filter(l => l.getAttribute('stroke-dasharray')).length : 0
    // 公式台裁切审计(台自身)
    out.formulaTrays = sec
      ? [...sec.querySelectorAll('[class*="f6f8fb"]')].map((b) => ({ sw: b.scrollWidth, cw: b.clientWidth }))
      : []
    // 每行网格列结构
    out.rows = sec
      ? [...sec.querySelectorAll('[class*="divide-y"] > div')].map((r) => {
          const left = r.children[0]
          const svgW = left.querySelector('svg') ? left.querySelector('svg').getBoundingClientRect().width : 0
          const head = left.children[0].textContent.trim().slice(0, 12)
          return { head, svgW, rowW: r.getBoundingClientRect().width }
        })
      : []
    out.bodyOverflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth
    return out
  })()`)

  console.log('REPORT@1440', JSON.stringify(report, null, 1))

  // 多档宽度审计:公式台裁切 + 行内列结构
  for (const w of [1280, 1100, 768]) {
    await conn.send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await sleepMs(400)
    const rr = await evaluate(conn, `(() => {
      const sec = [...document.querySelectorAll('section')].find(s => s.textContent.includes('三大频率特性'))
      const trays = sec
        ? [...sec.querySelectorAll('[class*="f6f8fb"]')].map((b) => b.scrollWidth - b.clientWidth)
        : []
      const rows = sec
        ? [...sec.querySelectorAll('[class*="divide-y"] > div')].map((r) => ({
            cols: r.children.length,
            gridCols: getComputedStyle(r).gridTemplateColumns,
            svgW: r.querySelector('svg') ? Math.round(r.querySelector('svg').getBoundingClientRect().width) : 0,
            h: Math.round(r.getBoundingClientRect().height),
          }))
        : []
      return {
        trayDiff: trays,
        rows,
        bodyOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    })()`)
    console.log('REPORT@' + w, JSON.stringify(rr))
  }

  // 截图
  await conn.send('Page.captureScreenshot', { format: 'png' }).then(async ({ data }) => {
    const { writeFileSync } = await import('node:fs')
    writeFileSync('D:/code/physics-rlc/.tmp-shot-curves.png', Buffer.from(data, 'base64'))
  })

  const errs = await evaluate(conn, `window.__errs || (window.__errs = [])`)
  const consoleLog = []
  conn.send('Runtime.consoleAPICalled').catch(() => {})
  console.log('consoleErrors(采样)', JSON.stringify(errs))

  conn.close()
} finally {
  chrome.kill()
}
console.log('DONE')
