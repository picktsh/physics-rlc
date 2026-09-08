// 快速诊断:加载状态 / 锁屏 / 运行时错误
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const userData = mkdtempSync(path.join(tmpdir(), 'edge-dbg-'))
const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9334', `--user-data-dir=${userData}`, '--window-size=1600,1100', '--force-device-scale-factor=1', 'http://localhost:5174/'], { stdio: 'ignore' })
let ws
try {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9334/json')).json()
      const page = list.find((t) => t.type === 'page' && t.url.startsWith('http'))
      if (page) { ws = page.webSocketDebuggerUrl; break }
    } catch (e) { /* retry */ }
    await sleep(300)
  }
  const wsc = new WebSocket(ws)
  await new Promise((r) => (wsc.onopen = r))
  let id = 0
  const send = (method, params = {}) => new Promise((res) => {
    const mid = ++id
    const h = (m) => { const d = JSON.parse(m.data); if (d.id === mid) { wsc.removeEventListener('message', h); res(d.result) } }
    wsc.addEventListener('message', h)
    wsc.send(JSON.stringify({ id: mid, method, params }))
  })
  const errs = []
  wsc.addEventListener('message', (m) => {
    const d = JSON.parse(m.data)
    if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails?.text + ':' + d.params.exceptionDetails?.exception?.description)
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('console:' + JSON.stringify(d.params.args?.map((a) => a.value)))
  })
  await send('Runtime.enable')
  await sleep(2500)
  const ev = (expr) => send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }).then((r) => r.result?.value)
  console.log('URL:', await ev('location.href'))
  console.log('body 前300字:', (await ev('document.body ? document.body.innerText.slice(0,300) : "(无body)"')).replace(/\s+/g, ' '))
  console.log('锁屏存在:', await ev('!!document.querySelector(".n-input-otp") || !![...document.querySelectorAll("div")].some(d=>d.textContent.trim()==="请输入验证码")'))
  console.log('app-shell 存在:', await ev('!!document.querySelector(".side-rail")'))
  console.log('hero canvas:', await ev('!!document.querySelector(".hero3d-canvas")'))
  await sleep(500)
  console.log('异常:', errs.length ? errs.slice(0, 5) : '无')
} catch (e) {
  console.log('DIAG ERR', e.message)
} finally {
  edge.kill()
  await sleep(400)
  try { rmSync(userData, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 }) } catch (e) { /* ignore */ }
}
