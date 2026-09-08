import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PROFILE = os.tmpdir() + '\\rlc-edge-prof'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9336', `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check', '--no-proxy-server', '--enable-unsafe-swiftshader', '--disable-backgrounding-occluded-windows', '--window-size=1600,2400', 'about:blank'], { stdio: 'ignore' })
process.on('exit', () => { try { edge.kill() } catch {} })
let target
for (let i = 0; i < 60; i++) {
  try { const r = await fetch('http://127.0.0.1:9336/json/list'); const t = (await r.json()).find((x) => x.type === 'page'); if (t) { target = t; break } } catch {}
  await sleep(300)
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let msgId = 0
const pend = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id) } }
const send = (method, params = {}) => new Promise((res) => { const id = ++msgId; pend.set(id, res); ws.send(JSON.stringify({ id, method, params })) })
const evalJS = async (expr) => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value } catch { return null } }
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://127.0.0.1:5199/' }); await sleep(6000)
const d = new Date()
const code = String(((d.getMonth() + 1) * 10000 + d.getDate() * 100 + d.getHours()) * 2).padStart(6, '0')
try { await evalJS(`sessionStorage.setItem('otp-code','${code}');true`) } catch {}
for (let i = 0; i < 8; i++) {
  await send('Page.navigate', { url: 'http://127.0.0.1:5199/' }); await sleep(2500)
  if (await evalJS(`location.href.startsWith('http://127.0.0.1:5199') && !document.body.innerText.includes('验证')`)) break
}
// 公式页整页截图(滚动拼合难,截可视区顶部即可采样大色块)
const shot1 = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync('D:\\code\\physics-rlc\\.tmp-shot-formula.png', Buffer.from(shot1.data, 'base64'))
// 切到电路页并放元件、滚到 3D 区截图
await evalJS(`sessionStorage.setItem('activeTab','circuit');location.reload();true`)
await sleep(6000)
await evalJS(`document.querySelectorAll('.component-item')[0]?.click();true`)
await sleep(300)
await evalJS(`(() => { const cv = document.querySelector('canvas'); if (!cv) return; const r = cv.getBoundingClientRect(); cv.dispatchEvent(new MouseEvent('mousedown', { clientX: r.left + r.width * 0.4, clientY: r.top + r.height * 0.5, bubbles: true })) })()`)
await sleep(1200)
const shot2 = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync('D:\\code\\physics-rlc\\.tmp-shot-circuit.png', Buffer.from(shot2.data, 'base64'))
const ANALYZE = `(async () => {
  const cnt = async (b64) => {
    const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = b64 })
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0)
    const dd = cx.getImageData(0, 0, cv.width, cv.height).data
    let blue = 0, oldTeal = 0
    for (let i = 0; i < dd.length; i += 4) {
      const r = dd[i], g = dd[i + 1], b = dd[i + 2]
      if (Math.abs(r - 37) < 35 && Math.abs(g - 99) < 35 && Math.abs(b - 235) < 35) blue++
      if (Math.abs(r - 14) < 35 && Math.abs(g - 141) < 35 && Math.abs(b - 156) < 35) oldTeal++
    }
    return { blue, oldTeal }
  }
  return JSON.stringify({ formula: await cnt(window.__b1), circuit: await cnt(window.__b2) })
})()`
await evalJS(`window.__b1 = '${shot1.data}'; 'ok'`)
await evalJS(`window.__b2 = '${shot2.data}'; 'ok'`)
console.log('PIXELS:', await evalJS(ANALYZE))
ws.close(); edge.kill(); process.exit(0)
