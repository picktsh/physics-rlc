// 探针:视频资源页实测 —— 4 类 × 5 条、1500px 下三列布局、初始无 iframe、点击封面后才挂载 B 站播放器(跨类别两张独立加载);截整页 + 播放态截图
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const URL = 'http://localhost:5173/'
const PORT = 9341
const prof = mkdtempSync(join(tmpdir(), 'vchk-'))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const withTimeout = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => { throw new Error('timeout: ' + tag) })])

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1500,1250', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, 'about:blank'
], { stdio: 'ignore' })
let ws, msgQ = [], wsReady, errors = []
function cdp(method, params = {}) {
  return withTimeout((async () => {
    await wsReady
    const id = ++ws._id
    ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => msgQ.push({ id, resolve, reject }))
  })(), 8000, method)
}
async function ev(expr) {
  const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true })
  return r.result.value
}

async function main() {
  let ok = false
  for (let i = 0; i < 40 && !ok; i++) {
    await sleep(250)
    try { ok = (await withTimeout(fetch(`http://127.0.0.1:${PORT}/json/list`), 1500, 'cdp')).ok } catch {}
  }
  if (!ok) throw new Error('CDP 未就绪')
  const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl)
  ws._id = 0
  wsReady = new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', rej, { once: true })
  })
  ws.addEventListener('message', (evt) => {
    let m
    try { m = JSON.parse(evt.data) } catch { return }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails || {}
      // 只统计主文档(localhost)异常;B 站嵌入播放器子框架的第三方脚本异常不计入
      if (!d.url || d.url.includes('localhost:5173')) errors.push(d.text || 'exception')
    }
    const i = msgQ.findIndex((x) => x.id === m.id)
    if (i < 0) return
    const [q] = msgQ.splice(i, 1)
    m.error ? q.reject(new Error(m.error.message)) : q.resolve(m.result)
  })
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1250, deviceScaleFactor: 1, mobile: false })
  await cdp('Page.navigate', { url: URL })
  await sleep(2200)
  const now = new Date()
  const code = String(((now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours()) * 2)
  for (let i = 0; i < 24; i++) {
    const s = await ev('document.querySelector(".snav-item") ? "ok" : "wait"')
    if (s === 'ok') break
    await ev(`sessionStorage.setItem('otp-code', '${code}'); location.reload();`)
    await sleep(800)
  }
  // 1) 进入视频资源页,核对结构与三列布局
  await ev('[...document.querySelectorAll(".snav-item")][1].click()')
  await sleep(800)
  const state = await ev(`({
    h1: document.querySelector('h1')?.textContent,
    cats: document.querySelectorAll('[data-vr="cat"]').length,
    catTitles: [...document.querySelectorAll('[data-vr="cat"] .sec-title')].map((x) => x.textContent),
    perCat: [...document.querySelectorAll('[data-vr="cat"]')].map((c) => c.querySelectorAll('[data-vr="card"]').length),
    cols: [...document.querySelectorAll('[data-vr="grid"]')].map((g) => getComputedStyle(g).gridTemplateColumns.split(' ').length),
    facades: document.querySelectorAll('[data-vr="facade"]').length,
    frames: document.querySelectorAll('[data-vr="frame"]').length,
    titles: document.querySelectorAll('[data-vr="title"]').length,
    catTopsAsc: (() => { const t = [...document.querySelectorAll('[data-vr="cat"]')].map((c) => c.getBoundingClientRect().top + scrollY); return t.every((v, i) => i === 0 || v > t[i - 1]) })()
  })`)
  log('video page:', JSON.stringify(state))
  if (state.h1 !== '视频资源') throw new Error('h1 异常: ' + state.h1)
  if (state.cats !== 4) throw new Error('应有 4 个类别: ' + state.cats)
  if (state.perCat.some((n) => n !== 5)) throw new Error('每类应为 5 条: ' + JSON.stringify(state.perCat))
  if (state.cols.some((n) => n !== 3)) throw new Error('1500px 下应为三列: ' + JSON.stringify(state.cols))
  if (state.frames !== 0) throw new Error('初始不应挂载 iframe: ' + state.frames)
  if (state.titles !== 20 || state.facades !== 20) throw new Error('应 20 封面/标题: ' + state.facades + '/' + state.titles)
  if (!state.catTopsAsc) throw new Error('类别未按垂直顺序排列')

  // 2) 封面态整页截图
  const pageH = await ev('document.documentElement.scrollHeight')
  log('page height:', pageH)
  const full = await cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1500, height: Math.min(pageH, 3200), scale: 1 }, captureBeyondViewport: true })
  writeFileSync('.tmp-video-full.png', Buffer.from(full.data, 'base64'))
  log('shot: .tmp-video-full.png')

  // 3) 点击两个不同类别的封面 → 两个播放器独立挂载
  await ev(`document.querySelectorAll('[data-vr="facade"]')[0].click()`)
  await sleep(300)
  await ev(`document.querySelectorAll('[data-vr="cat"]')[1].querySelector('[data-vr="facade"]').click()`)
  await sleep(1500)
  const after = await ev(`({
    frames: document.querySelectorAll('[data-vr="frame"]').length,
    srcs: [...document.querySelectorAll('[data-vr="frame"]')].map((f) => f.getAttribute('src'))
  })`)
  log('after clicks:', JSON.stringify(after))
  if (after.frames !== 2) throw new Error('两张封面应挂载 2 个播放器: ' + after.frames)
  for (const s of after.srcs) {
    if (!s.includes('player.bilibili.com/player.html') || !s.includes('bvid=')) throw new Error('播放器 src 异常: ' + s)
  }
  await ev('window.scrollTo(0, 0)')
  await sleep(500)
  const play = await cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1500, height: 1150, scale: 1 }, captureBeyondViewport: false })
  writeFileSync('.tmp-video-play.png', Buffer.from(play.data, 'base64'))
  log('shot: .tmp-video-play.png')

  if (errors.length) throw new Error('console 错误: ' + errors.join('; '))
  log('PAGE ERRORS: 0')
  log('OK')
}

main().then(async () => {
  log('DONE')
  try { edge.kill() } catch {}
  await sleep(600)
  rmSync(prof, { recursive: true, force: true, maxRetries: 4 })
  process.exit(0)
}).catch(async (e) => {
  console.error('FAIL', e.message)
  try { edge.kill() } catch {}
  await sleep(400)
  process.exit(1)
})
