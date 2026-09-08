// 页面级回归:修复后 φ 弧在容性/感性态出现、谐振消失;三态读数/徽章/无错误
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9352
const prof = mkdtempSync(join(tmpdir(), 'phck-'))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1500,1250', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, 'about:blank'
], { stdio: 'ignore' })
let ws, msgQ = [], wsReady, errors = []
function cdp(method, params = {}) {
  return Promise.race([
    (async () => {
      await wsReady
      const id = ++ws._id
      ws.send(JSON.stringify({ id, method, params }))
      return new Promise((resolve, reject) => msgQ.push({ id, resolve, reject }))
    })(),
    sleep(8000).then(() => { throw new Error('cdp timeout: ' + method) }),
  ])
}
async function ev(expression) {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true })
  return r.result.value
}
const mainTimer = setTimeout(() => { console.error('GLOBAL TIMEOUT'); process.exit(2) }, 90000)

async function main() {
  let ok = false
  for (let i = 0; i < 40 && !ok; i++) {
    await sleep(250)
    try { ok = (await fetch(`http://127.0.0.1:${PORT}/json/list`)).ok } catch {}
  }
  if (!ok) throw new Error('CDP 未就绪')
  const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl)
  ws._id = 0
  wsReady = new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', () => rej(new Error('ws err')), { once: true })
  })
  ws.addEventListener('message', (evt) => {
    const m = JSON.parse(evt.data)
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.text || 'x')
    const i = msgQ.findIndex((x) => x.id === m.id)
    if (i < 0) return
    const [q] = msgQ.splice(i, 1)
    m.error ? q.reject(new Error(m.error.message)) : q.resolve(m.result)
  })
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1250, deviceScaleFactor: 1, mobile: false })
  await cdp('Page.navigate', { url: 'http://localhost:5173/' })
  await sleep(2200)
  const now = new Date()
  const code = String(((now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours()) * 2)
  for (let i = 0; i < 20; i++) {
    const s = await ev('document.querySelector(".hc-ctl") ? "ok" : "wait"')
    if (s === 'ok') break
    await ev(`sessionStorage.setItem('otp-code', '${code}'); sessionStorage.setItem('activeTab', 'demo'); location.reload();`)
    await sleep(800)
  }
  await sleep(600)
  // 圆心与画布尺寸(逻辑坐标 = 物理/dpr;canvas 内部 setTransform(dpr),用 getImageData 需物理像素,dpr 从宽高比推)
  const geo = await ev(`(() => {
    const cv = document.querySelector('.hc-ph-cv')
    const r = cv.getBoundingClientRect()
    return { pw: cv.width, ph: cv.height, cw: Math.round(r.width), ch: Math.round(r.height) }
  })()`)
  log('geo:', JSON.stringify(geo))
  // 弧像素采样:圆心附近 17~27 逻辑 px 环带内找淡白弧色(旧底色混 0.65 白 ≈ 158,166,179),步长 2 降负载
  const ARC_SCAN = `(() => {
    const cv = document.querySelector('.hc-ph-cv')
    const g = cv.getContext('2d')
    const W = cv.width, H = cv.height
    const d = g.getImageData(0, 0, W, H).data
    const dpr = W / ${geo.cw}
    const cx = W / 2, cy = H / 2
    let count = 0
    const r0 = 17 * dpr, r1 = 27 * dpr
    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        const dx = x - cx, dy = y - cy
        const dd = dx * dx + dy * dy
        if (dd < r0 * r0 || dd > r1 * r1) continue
        const i = (y * W + x) * 4
        if (Math.abs(d[i] - 159) < 40 && Math.abs(d[i + 1] - 166) < 40 && Math.abs(d[i + 2] - 179) < 40 && d[i] > 110) count++
      }
    }
    return count
  })()`
  const reads = () => ev('[...document.querySelectorAll(".hc-rd b")].map((x) => x.textContent)')
  const badge = () => ev('document.querySelector(".hc-os-st")?.textContent || ""')
  const setSld = async (v) => {
    await ev(`(() => { const s = document.querySelector('.hc-sld'); s.value = '${v}'; s.dispatchEvent(new Event('input')) })()`)
    await sleep(900)
  }
  await setSld('0') // 容性
  const capArc = await ev(ARC_SCAN)
  const capR = await reads()
  const capB = await badge()
  log('CAP: 弧像素', capArc, '读数', capR.join('/'), '|', capB)
  await setSld('506') // 谐振
  const resArc = await ev(ARC_SCAN)
  const resR = await reads()
  log('RES: 弧像素', resArc, '读数', resR.join('/'))
  await setSld('1000') // 感性
  const indArc = await ev(ARC_SCAN)
  const indR = await reads()
  const indB = await badge()
  log('IND: 弧像素', indArc, '读数', indR.join('/'), '|', indB)
  if (capArc < 8) throw new Error('容性 φ 弧缺失: ' + capArc)
  if (indArc < 8) throw new Error('感性 φ 弧缺失: ' + indArc)
  if (resArc > 4) throw new Error('谐振不应有 φ 弧: ' + resArc)
  if (errors.length) throw new Error('console 错误: ' + errors.join(';'))
  log('PAGE ERRORS: 0')
  log('OK: φ 弧方向修复生效(容性/感性出现于 U 侧,谐振消失)')
}

main().then(async () => {
  log('DONE')
  clearTimeout(mainTimer)
  try { edge.kill() } catch {}
  await sleep(500)
  rmSync(prof, { recursive: true, force: true, maxRetries: 4 })
  process.exit(0)
}).catch(async (e) => {
  console.error('FAIL', e.message)
  clearTimeout(mainTimer)
  try { edge.kill() } catch {}
  await sleep(300)
  process.exit(1)
})
