// 验证码解锁失败诊断:逐步核对注入值 / reload 后值 / genCode 计算
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const userData = mkdtempSync(path.join(tmpdir(), 'edge-dbg2-'))
const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9335', `--user-data-dir=${userData}`, '--window-size=1400,900', '--force-device-scale-factor=1', 'http://localhost:5174/'], { stdio: 'ignore' })
try {
  let ws
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9335/json')).json()
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
  const ev = (expr) => send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }).then((r) => r.result?.value)
  const errs = []
  wsc.addEventListener('message', (m) => {
    const d = JSON.parse(m.data)
    if (d.method === 'Runtime.exceptionThrown') errs.push((d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text || '').slice(0, 300))
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('console:' + (d.params.args?.map((a) => a.value || a.description).join(' ') || '').slice(0, 300))
  })
  await send('Runtime.enable')
  await sleep(2200)
  console.log('URL:', await ev('location.href'))
  console.log('注入前 otp-code:', await ev('sessionStorage.getItem("otp-code")'))
  console.log('注入前 genCode:', await ev(`(()=>{const d=new Date();return String(((d.getMonth()+1)*10000+d.getDate()*100+d.getHours())*2).padStart(6,'0')})()`))
  console.log('锁屏:', await ev(`document.body.innerText.includes('请输入验证码')`))
  console.log('注入结果:', await ev(`(()=>{const d=new Date();const v=String(((d.getMonth()+1)*10000+d.getDate()*100+d.getHours())*2).padStart(6,'0');sessionStorage.setItem('otp-code',v);return v})()`))
  console.log('注入后读回:', await ev(`sessionStorage.getItem('otp-code')`))
  await send('Page.reload', { ignoreCache: true })
  await sleep(3500)
  console.log('--- reload 后 ---')
  console.log('otp-code:', await ev(`sessionStorage.getItem('otp-code')`))
  console.log('genCode:', await ev(`(()=>{const d=new Date();return String(((d.getMonth()+1)*10000+d.getDate()*100+d.getHours())*2).padStart(6,'0')})()`))
  console.log('锁屏:', await ev(`document.body.innerText.includes('请输入验证码')`))
  console.log('app shell:', await ev(`!!document.querySelector('.side-rail')`))
  console.log('hc-ctl:', await ev(`!!document.querySelector('.hc-ctl')`))
  await sleep(6000)
  console.log('--- 再等 6s ---')
  console.log('app shell:', await ev(`!!document.querySelector('.side-rail')`))
  console.log('hc-ctl:', await ev(`!!document.querySelector('.hc-ctl')`))
  console.log('body:', (await ev(`document.body.innerText.replace(/\s+/g,' ').slice(0,220)`)) || '(empty)')
  console.log('html has vite-overlay:', await ev(`!!document.querySelector('vite-error-overlay')`))
  console.log('overlay text:', (await ev(`(()=>{const o=document.querySelector('vite-error-overlay');if(!o)return 'none';const r=o.shadowRoot||o;return (r.textContent||'').replace(/\s+/g,' ').slice(0,600)})()`)))
  console.log('异常:', errs.length ? errs.slice(0, 6) : '无')
} catch (e) {
  console.log('DIAG ERR', e.message)
} finally {
  edge.kill()
  await sleep(400)
  try { rmSync(userData, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 }) } catch (e) { /* ignore */ }
}
