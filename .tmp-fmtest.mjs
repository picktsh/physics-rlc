/* CDP 无头验证:公式原理页 KaTeX 渲染 / 字体 / 布局 / 交互切换 */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9337
const APP = 'http://127.0.0.1:5199/'
const S = (...a) => console.log('[S]', ...a)

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function httpGet(url) {
  const res = await fetch(url)
  return res.json()
}

async function waitEdge() {
  for (let i = 0; i < 40; i++) {
    try {
      const v = await httpGet(`http://127.0.0.1:${PORT}/json/version`)
      if (v.webSocketDebuggerUrl) return v
    } catch {}
    await sleep(250)
  }
  throw new Error('edge debug port not ready')
}

S('S1 spawn edge')
const profile = path.join(os.tmpdir(), 'fmtest-profile-' + Date.now())
const edge = spawn(
  EDGE,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,1000',
    '--hide-scrollbars',
    'about:blank',
  ],
  { stdio: 'ignore' }
)

try {
  const ver = await waitEdge()
  S('S2 edge ready, create page')
  const page = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(APP)}`, { method: 'PUT' }).then((r) => r.json())
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

  let mid = 0
  const pending = new Map()
  const errors = []
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m)
      pending.delete(m.id)
    } else if (m.method === 'Runtime.exceptionThrown') {
      errors.push('EXC: ' + JSON.stringify(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text))
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      errors.push('LOG: ' + m.params.entry.text)
    }
  }
  const send = (method, params = {}) =>
    new Promise((res) => { const id = ++mid; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })) })

  const nav = async (url) => {
    for (let i = 0; i < 10; i++) {
      try {
        await send('Page.navigate', { url })
        await sleep(1500)
        const st = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true })
        if (st.result?.result?.value === 'complete') return
      } catch {}
      S('  retry nav', i)
      await sleep(800)
    }
    throw new Error('navigate failed: ' + url)
  }
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
    if (r.result?.exceptionDetails) throw new Error('eval exc: ' + JSON.stringify(r.result.exceptionDetails))
    return r.result?.result?.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')

  S('S3 navigate app')
  await nav(APP)

  // 解锁(验证码=当天小时算法)
  const d = new Date()
  const code = String((((d.getMonth() + 1) * 10000 + d.getDate() * 100 + d.getHours()) * 2) + '').padStart(6, '0')
  S('  otp', code)
  await ev(`sessionStorage.setItem('otp-code','${code}'); true`)
  await send('Page.reload')
  await sleep(2000)

  S('S4 wait formula content')
  let katexN = 0
  for (let i = 0; i < 30; i++) {
    katexN = await ev(`document.querySelectorAll('.katex').length`)
    if (katexN > 40) break
    await sleep(400)
  }
  S('  .katex elements =', katexN)

  const stats = await ev(`(() => {
    const t = document.querySelectorAll('.sec-title')
    const err = document.querySelectorAll('.katex-error').length
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth
    const tables = document.querySelectorAll('table').length
    const formulaBoxes = document.querySelectorAll('.formula-k').length
    return {
      secTitles: [...t].map(e => e.textContent.trim()),
      katexError: err,
      formulaBoxes,
      tables,
      pageOverflowX: overflow,
      innerWidth: window.innerWidth,
      fontsStatus: document.fonts.status,
      katexFontReady: document.fonts.check('16px KaTeX_Math'),
      katexMainFontReady: document.fonts.check('16px KaTeX_Main'),
      mainBlue: [...document.querySelectorAll('*')].filter(e => {
        const s = getComputedStyle(e).color
        return s === 'rgb(37, 99, 235)'
      }).length,
      oldTealBg: [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).backgroundColor === 'rgb(233, 243, 241)').length,
    }
  })()`)
  console.log('STATS', JSON.stringify(stats, null, 1))

  // 全页截图
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  if (shot.result?.data) {
    writeFileSync('.tmp-shot-formula.png', Buffer.from(shot.result.data, 'base64'))
    S('  shot saved .tmp-shot-formula.png')
  }

  // 切到方法三 tab 再统计
  S('S5 click tab3 (理论参数法)')
  await ev(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('理论参数法'))
    if (b) { b.click(); return true }
    return false
  })()`)
  await sleep(600)
  const stats2 = await ev(`(() => ({
    katex: document.querySelectorAll('.katex').length,
    katexError: document.querySelectorAll('.katex-error').length,
    activeBtn: [...document.querySelectorAll('button')].find(x => x.textContent.includes('理论参数法'))?.className || '',
  }))()`)
  console.log('STATS2', JSON.stringify(stats2, null, 1))
  const shot2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  if (shot2.result?.data) {
    writeFileSync('.tmp-shot-formula-q3.png', Buffer.from(shot2.result.data, 'base64'))
    S('  shot saved .tmp-shot-formula-q3.png')
  }

  await sleep(1200)
  S('S6 errors collected =', errors.length)
  errors.slice(0, 10).forEach((e) => console.log('  ERR>', e))
  ws.close()
  S('S7 done')
} catch (e) {
  console.error('FAIL', e)
  process.exitCode = 1
} finally {
  edge.kill()
}
