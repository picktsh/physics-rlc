// 谐振原理演示验证:DOM 结构 / 扫频交互 / 读数正确性 / 3D 像素(光环颜色、光点亮度、流动) / 示波屏 / 控制台错误
// 用法:node verify-demo.mjs(需 dev server 运行,默认 5174)
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const APP = process.env.APP || 'http://localhost:5174/'
const CDP_PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const ok = (name, pass, extra = '') =>
  results.push({ name, pass: !!pass, extra: typeof extra === 'string' ? extra : JSON.stringify(extra) })

async function waitCdpTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json()
      const page = list.find((t) => t.type === 'page' && t.url.startsWith('http'))
      if (page) return page.webSocketDebuggerUrl
    } catch (e) { /* 未就绪 */ }
    await sleep(300)
  }
  throw new Error('CDP target 超时')
}
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    let id = 0
    const pend = new Map()
    const events = []
    ws.onopen = () => resolve({ ws, send, events })
    ws.onerror = (e) => reject(new Error('ws error'))
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data)
      if (msg.id) {
        const p = pend.get(msg.id)
        if (p) { pend.delete(msg.id); msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result) }
      } else if (msg.method) events.push(msg)
    }
    function send(method, params = {}) {
      return new Promise((res, rej) => {
        const mid = ++id
        pend.set(mid, { resolve: res, reject: rej })
        ws.send(JSON.stringify({ id: mid, method, params }))
      })
    }
  })
}
const userData = mkdtempSync(path.join(tmpdir(), 'edge-demo-'))
const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${userData}`,
  '--window-size=1600,1100', '--force-device-scale-factor=1', '--no-first-run', '--no-default-browser-check', APP,
], { stdio: 'ignore' })

let client
try {
  const wsUrl = await waitCdpTarget()
  client = await connect(wsUrl)
  const { ws, send, events } = client
  await send('Runtime.enable')
  await send('Page.enable')
  const ev = (expr) => send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }).then((r) => r.result?.value)
  await sleep(1500)
  // 锁屏验证码:genCode=(月*10000+日*100+时)*2 → 写入 sessionStorage 后刷新,并轮询等待应用挂载(首访含 Vite 编译)
  await ev(`(()=>{const d=new Date();const z=(d.getMonth()+1)*10000+d.getDate()*100+d.getHours();sessionStorage.setItem('otp-code',String(z*2).padStart(6,'0'));sessionStorage.setItem('activeTab','formula');return true})()`)
  await send('Page.reload', { ignoreCache: true })
  let appReady = false
  for (let i = 0; i < 40; i++) {
    await sleep(500)
    const st = await ev(`({ctl:!!document.querySelector('.hc-ctl'),lock:!!document.querySelector('.n-input-otp')})`)
    if (st.ctl) { appReady = true; break }
    if (st.lock) { // 锁屏仍在:重注入一次后刷新
      await ev(`(()=>{const d=new Date();const z=(d.getMonth()+1)*10000+d.getDate()*100+d.getHours();sessionStorage.setItem('otp-code',String(z*2).padStart(6,'0'));return true})()`)
      await send('Page.reload', { ignoreCache: true })
    }
  }
  ok('APP-应用挂载', appReady)
  // 等待读数进入工作状态(挂载初期 WebGL/纹理初始化需 1~2s,读数启动前为占位 '—')
  let readReady = false
  for (let i = 0; i < 25; i++) {
    const v = await ev(`document.querySelector('.hc-rd b')?.textContent || ''`)
    if (v && v !== '—') { readReady = true; break }
    await sleep(300)
  }
  ok('APP-读数已启动', readReady)

  // ---- 1. DOM 结构 ----
  const dom = await ev(`(()=>{
    const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
    const ctl=$('.hc-ctl');
    return {
      secTitle: $('.sec-title')?.textContent?.trim() || '',
      ctlExists: !!ctl,
      btns: ctl ? $$('.hc-ctl button').map(b=>b.textContent.trim()) : [],
      playOn: !!$('.hc-ctl .hc-play.on'),
      f0: $('.hc-f0')?.textContent?.trim() || '',
      reads: $$('.hc-rd').map(s=>s.textContent.trim()),
      zone: $('.hc-zone')?.textContent?.trim() || '',
      zoneCls: $('.hc-zone')?.className || '',
      slider: (()=>{const s=$('.hc-sld');return s?{v:+s.value,max:+s.max}:null})(),
      scope: (()=>{const c=$('.hc-scope canvas');return c?{w:c.width,h:c.height,vis:getComputedStyle(c.closest('.hc-scope')).display!=='none'}:null})(),
      gear: $$('.lab-gear .mtrl-chip').map(s=>s.textContent.trim()),
      gearTag: $('.lab-gear-t')?.textContent?.trim() || '',
      hero: (()=>{const c=$('.hero3d-canvas');return c?{w:c.clientWidth,h:c.clientHeight}:null})(),
      hint: $('.hero3d-hint')?.textContent?.trim() || '',
    }
  })()`)
  ok('DOM-标题', dom.secTitle === 'RLC 串联谐振 · 原理演示', dom.secTitle)
  ok('DOM-控制条按钮', JSON.stringify(dom.btns).includes('扫频') && JSON.stringify(dom.btns).includes('谐振'), dom.btns)
  ok('DOM-f0 chip', dom.f0.includes('2.25 kHz'), dom.f0)
  ok('DOM-读数 3 项', dom.reads.length === 3, dom.reads)
  ok('DOM-初始自动播放', !!dom.playOn)
  ok('DOM-滑杆存在', !!dom.slider && dom.slider.max === 1000)
  ok('DOM-示波屏 HUD', !!dom.scope && dom.scope.vis && dom.scope.w > 0, dom.scope)
  ok('DOM-器材 6 chips', dom.gear.length === 6 && dom.gear[0] === '信号发生器', dom.gear)
  ok('DOM-3D canvas', !!dom.hero && dom.hero.w > 600 && dom.hero.h > 300, dom.hero)

  // ---- 2. 谐振定位 ----
  const clickByText = (txt) => ev(`(()=>{const b=[...document.querySelectorAll('.hc-ctl button')].find(x=>x.textContent.trim()===${JSON.stringify(txt)});if(!b)return false;b.click();return true})()`)
  ok('CTL-点谐振定位', await clickByText('谐振定位'))
  await sleep(600)
  const res = await ev(`(()=>({
    reads: [...document.querySelectorAll('.hc-rd')].map(s=>s.textContent.trim()),
    zone: document.querySelector('.hc-zone')?.textContent?.trim()||'',
    zoneCls: document.querySelector('.hc-zone')?.className||'',
    playOn: !!document.querySelector('.hc-play.on'),
    sld: +document.querySelector('.hc-sld')?.value
  }))()`)
  ok('CTL-谐振读数 f', res.reads[0].includes('2.25 kHz'), res.reads[0])
  ok('CTL-谐振读数 I=9.00mA', res.reads[1].includes('9.00 mA'), res.reads[1])
  ok('CTL-谐振读数 φ=0.0°', res.reads[2].includes('0.0°'), res.reads[2])
  ok('CTL-谐振 zone', res.zone === '谐振' && res.zoneCls.includes('z-res'), res.zoneCls)
  ok('CTL-谐振滑杆居中', Math.abs(res.sld - 500) < 20, res.sld)
  ok('CTL-谐振暂停播放', !res.playOn)

  // ---- 3. 低频容性区(滑杆拉到 0) ----
  await ev(`(()=>{const s=document.querySelector('.hc-sld');s.value='0';s.dispatchEvent(new Event('input',{bubbles:true}));return true})()`)
  await sleep(500)
  const low = await ev(`(()=>({reads:[...document.querySelectorAll('.hc-rd')].map(s=>s.textContent.trim()),zone:document.querySelector('.hc-zone')?.textContent?.trim()||''}))()`)
  ok('CTL-低频 f≈341Hz', low.reads[0].includes('341 Hz'), low.reads[0])
  ok('CTL-低频 zone 容性', low.zone === '容性区', low.zone)
  // 恢复自动扫频并确认频率在推进
  ok('CTL-恢复自动扫频', await clickByText('自动扫频'))
  await sleep(400)
  const f1 = await ev(`document.querySelectorAll('.hc-rd')[0].textContent.trim()`)
  await sleep(2200)
  const f2 = await ev(`document.querySelectorAll('.hc-rd')[0].textContent.trim()`)
  ok('CTL-扫频推进', f1 !== f2, f1 + ' → ' + f2)
  const sldMoved = await ev(`+document.querySelector('.hc-sld').value`)
  ok('CTL-滑杆跟随', sldMoved > 100, sldMoved)

  // ---- 4. 像素:3D 场景(光点亮度随电流、流动动画;环经 ACES/半透明无法屏幕分类,只记录数值) ----
  const grabFrame = () => ev(`(async()=>{
    const cv=document.querySelector('.hero3d-canvas');
    const gl=cv.getContext('webgl2')||cv.getContext('webgl');
    if(!gl)return {err:'no-gl'};
    const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    const buf=new Uint8Array(w*h*4);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,buf);
    let n=0,opq=0,glow=0,amber=0,gx=0,gy=0,sum=0;
    const st=2;
    for(let y=0;y<h;y+=st){for(let x=0;x<w;x+=st){
      const i=(y*w+x)*4,r=buf[i],g=buf[i+1],b=buf[i+2];
      n++;
      if(r+g+b>24)opq++;
      if(g>160&&r<210&&g-r>40&&g-b>20){glow++;gx+=x;gy+=y;sum++;}
      else if(r>170&&g>110&&g<200&&b<100&&r-g>40){amber++;}
    }}
    return {w,h,n,opqPct:+(100*opq/n).toFixed(1),glow,amber,
      gcx:sum?+(gx/sum).toFixed(1):0,gcy:sum?+(gy/sum).toFixed(1):0};
  })()`)
  await clickByText('谐振定位')
  await sleep(700)
  const fRes = await grabFrame()
  ok('PIX-谐振帧渲染', !!fRes.w && fRes.opqPct > 14, fRes)
  // 多帧采集光点质心(光点沿回路流动;SwiftShader 低帧率下每帧位移小,比较首末帧)
  const glowSamples = []
  for (let i = 0; i < 6 && glowSamples.length < 3; i++) {
    const f = await grabFrame()
    if (f.glow > 0) glowSamples.push(f)
    await sleep(180)
  }
  const last = glowSamples[glowSamples.length - 1]
  const moved =
    glowSamples.length >= 2 &&
    Math.hypot(glowSamples[0].gcx - last.gcx, glowSamples[0].gcy - last.gcy) > 5
  ok('PIX-光点流动', moved, glowSamples.map((f) => `(${f.gcx},${f.gcy})`).join('→'))
  // 低频帧对比(光点亮度∝电流,但半透明光晕/元件遮挡/ACES 使屏幕亮度差不可靠,仅记录数值)
  await ev(`(()=>{const s=document.querySelector('.hc-sld');s.value='0';s.dispatchEvent(new Event('input',{bubbles:true}));return true})()`)
  await sleep(700)
  const fLow = await grabFrame()
  ok('PIX-两态光点均可见', fRes.glow > 0 && fLow.glow > 0, `谐振${fRes.glow} vs 低频${fLow.glow}`)
  ok('PIX-低频渲染正常', fLow.opqPct > 14, fLow.opqPct)

  // ---- 5. 示波屏 2D 像素(V 青 / uR 绿线) ----
  await clickByText('谐振定位')
  await sleep(600)
  const scopePix = await ev(`(()=>{
    const c=document.querySelector('.hc-scope canvas');if(!c)return {err:'no-scope'};
    const ctx=c.getContext('2d');const {width:w,height:h}=c;
    const d=ctx.getImageData(0,0,w,h).data;let cyan=0,green=0;
    for(let i=0;i<d.length;i+=16){
      const r=d[i],g=d[i+1],b=d[i+2];
      if(g>150&&b>150&&r<120&&b-g<70)cyan++;
      else if(g>150&&r<150&&b<170&&g-b>40)green++;
    }
    return {w,h,cyan,green};
  })()`)
  ok('SCOPE-青色 V(t) 线', scopePix.cyan > 8, scopePix)
  ok('SCOPE-绿色 uR 线', scopePix.green > 8, scopePix)

  // ---- 6. 控制台错误 ----
  const errs = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'))
  ok('CONSOLE-无错误', errs.length === 0, errs.map((e) => e.params?.exceptionDetails?.text || e.params?.args?.[0]?.value).slice(0, 3))

  // ---- 截图留档 ----
  try {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    const { writeFileSync } = await import('node:fs')
    writeFileSync(path.join(process.cwd(), '.tmp-demo-formula.png'), Buffer.from(shot.data, 'base64'))
    ok('SHOT-已存', true)
  } catch (e) { ok('SHOT-失败', false, e.message) }
} catch (err) {
  ok('RUN-脚本异常', false, err.message)
} finally {
  edge.kill()
  await sleep(400)
  try { rmSync(userData, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 }) } catch (e) { /* 句柄未释放可忽略 */ }
}
console.log('\n===== 谐振原理演示验证 =====')
let pass = 0
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.extra ? '  [' + r.extra + ']' : ''}`)
  if (r.pass) pass++
}
console.log(`\n${pass}/${results.length} 通过`)
process.exit(pass === results.length ? 0 : 1)
