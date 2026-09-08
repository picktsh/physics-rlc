// 定向采样:每 300ms 记录 reads/zone/sld,中途点击谐振定位,观察 12 帧演化
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const userData = mkdtempSync(path.join(tmpdir(), 'edge-samp-'))
const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9337', `--user-data-dir=${userData}`, '--window-size=1600,1100', '--force-device-scale-factor=1', 'http://localhost:5174/'], { stdio: 'ignore' })
try {
  let ws
  for (let i = 0; i < 60; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:9337/json')).json()
      const t = l.find((x) => x.type === 'page' && x.url.startsWith('http'))
      if (t) { ws = t.webSocketDebuggerUrl; break }
    } catch (e) { /* retry */ }
    await sleep(300)
  }
  const w = new WebSocket(ws)
  await new Promise((r) => (w.onopen = r))
  let id = 0
  const send = (m, pr = {}) => new Promise((res) => {
    const mid = ++id
    const h = (x) => { const d = JSON.parse(x.data); if (d.id === mid) { w.removeEventListener('message', h); res(d.result) } }
    w.addEventListener('message', h)
    w.send(JSON.stringify({ id: mid, method: m, params: pr }))
  })
  const ev = (e) => send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }).then((r) => r.result?.value)
  await send('Runtime.enable')
  await sleep(2000)
  await ev(`(()=>{const d=new Date();sessionStorage.setItem('otp-code',String(((d.getMonth()+1)*10000+d.getDate()*100+d.getHours())*2).padStart(6,'0'));sessionStorage.setItem('activeTab','formula');return 1})()`)
  await send('Page.reload', { ignoreCache: true })
  for (let i = 0; i < 40; i++) {
    await sleep(500)
    if (await ev(`!!document.querySelector('.hc-ctl')`)) break
  }
  const snap = () => ev(`(()=>({
    reads:[...document.querySelectorAll('.hc-rd')].map(s=>s.textContent.trim()),
    zone:document.querySelector('.hc-zone')?.textContent?.trim()||'?',
    sld:+document.querySelector('.hc-sld')?.value,
    playOn:!!document.querySelector('.hc-play.on'),
    t:new Date().getTime()%100000
  }))()`)
  const clickTxt = (t) => ev(`(()=>{const b=[...document.querySelectorAll('.hc-ctl button')].find(x=>x.textContent.trim()===${JSON.stringify(t)});if(!b)return 0;b.click();return 1})()`)
  for (let i = 0; i < 14; i++) {
    if (i === 5) await clickTxt('谐振定位')
    console.log(i, JSON.stringify(await snap()))
    await sleep(300)
  }
  console.log('hero canvas exists:', await ev(`!!document.querySelector('.hero3d-canvas')`))
  console.log('canvas visible:', await ev(`(()=>{const c=document.querySelector('.hero3d-canvas');return c?c.clientWidth+'x'+c.clientHeight+' display='+getComputedStyle(c).display:'none'})()`))
} catch (e) {
  console.log('SAMP ERR', e.message)
} finally {
  edge.kill()
  await sleep(400)
  try { rmSync(userData, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 }) } catch (e) { /* ignore */ }
}
