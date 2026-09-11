// 验证:RLC工程应用 二级 tab(心率检测默认 / 收音机),选中态 sessionStorage 记忆
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const URL = 'http://localhost:5173/'
const PORT = 9341
const prof = mkdtempSync(join(tmpdir(), 'hrtab-'))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const withTimeout = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => { throw new Error('timeout: ' + tag) })])

const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--window-size=1500,1100', '--force-device-scale-factor=1',
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

async function waitFor(expr, tries = 20) {
  for (let i = 0; i < tries; i++) {
    if (await ev(expr)) return true
    await sleep(300)
  }
  return false
}

async function main() {
  log('spawn')
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
      if (!d.url || d.url.includes('localhost:5173')) errors.push(d.text || 'exception')
    }
    const i = msgQ.findIndex((x) => x.id === m.id)
    if (i < 0) return
    const [q] = msgQ.splice(i, 1)
    m.error ? q.reject(new Error(m.error.message)) : q.resolve(m.result)
  })
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1100, deviceScaleFactor: 1, mobile: false })
  await cdp('Page.navigate', { url: URL })
  await sleep(2200)
  const now = new Date()
  const code = String(((now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours()) * 2).padStart(6, '0')
  for (let i = 0; i < 24; i++) {
    const s = await ev('document.querySelector(".snav-item") ? "ok" : "wait"')
    if (s === 'ok') break
    await ev(`sessionStorage.setItem('otp-code', '${code}'); location.reload();`)
    await sleep(800)
  }

  const snap = () => ev(`({
    h1: document.querySelector('h1')?.textContent || '',
    subTabs: [...document.querySelectorAll('.sub-tab')].map((b) => b.textContent.trim()),
    activeSub: document.querySelector('.sub-tab.active')?.textContent.trim() || '',
    hasHr: !!document.querySelector('.hr-title'),
    hasRadio: !!document.querySelector('.tuner-title'),
    stored: sessionStorage.getItem('tunerSubTab'),
    tabStored: sessionStorage.getItem('activeTab')
  })`)

  // 1) 进入 RLC工程应用(侧栏第 7 项):默认心率检测,且此前无记录
  await ev('[...document.querySelectorAll(".snav-item")][6].click()')
  await waitFor(`!!document.querySelector('.sub-tab')`)
  await sleep(400)
  const s1 = await snap()
  log('initial:', JSON.stringify(s1))
  if (s1.h1 !== 'RLC工程应用') throw new Error('h1 异常: ' + s1.h1)
  if (JSON.stringify(s1.subTabs) !== JSON.stringify(['心率检测', '收音机'])) throw new Error('二级 tab 异常: ' + JSON.stringify(s1.subTabs))
  if (s1.activeSub !== '心率检测') throw new Error('默认应选中心率检测: ' + s1.activeSub)
  if (!s1.hasHr || s1.hasRadio) throw new Error('默认应渲染心率检测页,且不渲染收音机页')
  if (s1.tabStored !== 'tuner') throw new Error('一级 tab 应记忆 tuner: ' + s1.tabStored)

  // 2) 切到收音机
  await ev(`[...document.querySelectorAll('.sub-tab')].find((b) => b.textContent.trim() === '收音机').click()`)
  await sleep(700)
  const s2 = await snap()
  log('radio:', JSON.stringify(s2))
  if (s2.activeSub !== '收音机' || !s2.hasRadio || s2.hasHr) throw new Error('切换收音机失败')
  if (s2.stored !== 'radio') throw new Error('sessionStorage 应记录 radio: ' + s2.stored)

  // 2.5) 选中态样式:选中项淡蓝底 #dbe7ff,未选中项透明底
  const styles = await ev(`(() => {
    const btns = [...document.querySelectorAll('.sub-tab')]
    const pick = (b) => { const cs = getComputedStyle(b); return cs.backgroundColor + '|' + cs.color + '|' + cs.fontWeight }
    return { active: pick(btns[1]), inactive: pick(btns[0]) }
  })()`)
  log('styles:', JSON.stringify(styles))
  if (styles.active !== 'rgb(219, 231, 255)|rgb(29, 78, 216)|700') throw new Error('选中态样式异常: ' + styles.active)
  if (!styles.inactive.startsWith('rgba(0, 0, 0, 0)')) throw new Error('未选中态应为透明底: ' + styles.inactive)
  const shot1 = await cdp('Page.captureScreenshot', { format: 'png' })
  writeFileSync('.tmp-hrtab-radio.png', Buffer.from(shot1.data, 'base64'))

  // 3) 刷新:一级/二级均保持
  await cdp('Page.reload')
  await waitFor(`document.querySelector('.tuner-title') ? 'ok' : ''`)
  await sleep(300)
  const s3 = await snap()
  log('after reload:', JSON.stringify(s3))
  if (s3.h1 !== 'RLC工程应用') throw new Error('刷新后一级 tab 未恢复: ' + s3.h1)
  if (s3.activeSub !== '收音机' || !s3.hasRadio) throw new Error('刷新后二级 tab 未恢复: ' + JSON.stringify(s3))

  // 4) 切回心率检测并刷新,验证反向记忆
  await ev(`[...document.querySelectorAll('.sub-tab')].find((b) => b.textContent.trim() === '心率检测').click()`)
  await sleep(400)
  const s4 = await snap()
  log('back to hr:', JSON.stringify(s4))
  if (s4.activeSub !== '心率检测' || !s4.hasHr || s4.hasRadio) throw new Error('切回心率检测失败')
  if (s4.stored !== 'heartrate') throw new Error('sessionStorage 应记录 heartrate: ' + s4.stored)
  const shot2 = await cdp('Page.captureScreenshot', { format: 'png' })
  writeFileSync('.tmp-hrtab-heart.png', Buffer.from(shot2.data, 'base64'))

  // 5) 非法值回落默认
  await ev(`sessionStorage.setItem('tunerSubTab', 'bogus')`)
  await cdp('Page.reload')
  await waitFor(`document.querySelector('.hr-title') ? 'ok' : ''`)
  await sleep(300)
  const s5 = await snap()
  log('bogus fallback:', JSON.stringify(s5))
  if (s5.activeSub !== '心率检测' || !s5.hasHr) throw new Error('非法值应回落默认心率检测: ' + JSON.stringify(s5))

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
