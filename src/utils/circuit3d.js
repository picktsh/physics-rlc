import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// ===== 3D 实体模型共享模块:Three.js 拟真元件建模(电路搭建页 2D 同步预览 / 阻尼实验页 3D 直接搭建共用) =====
// 说明:原 CircuitBoard.vue 内嵌的 3D 建模代码整体迁出为共享模块;
// 坐标映射 wx/wz(以内容中心为原点的平移)改为通过 ctx 参数注入,几何尺寸与材质逐字保留.
export const YWIRE = 3 // 导体层高度(板面 y=0)

const matCache = new Map()
export const cmat = (color, rough = 0.5, metal = 0.05) => {
  const k = color + '|' + rough + '|' + metal
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }))
  return matCache.get(k)
}
// 沿 x 轴的圆柱(横置元件主体/端帽/色环/接线柱通用)
const cylX = (r, len, color, rough, metal) => {
  const g = new THREE.CylinderGeometry(r, r, len, 24)
  g.rotateZ(Math.PI / 2)
  return new THREE.Mesh(g, cmat(color, rough, metal))
}
// 两点间圆柱段(p = [x, y, z]),长度≈0 时返回 null
const seg = (a, b, r, color, rough = 0.35, metal = 0.15) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]
  const len = Math.hypot(dx, dy, dz)
  if (len < 0.01) return null
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), cmat(color, rough, metal))
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize())
  return m
}
// 引脚:从元件端 (xs, ys, z) 竖落到导体层,再水平接到端点 (xe, ze)
const lead = (g, xs, ys, z, xe, ze, r, color) => {
  const a = seg([xs, ys, z], [xs, YWIRE, z], r, color)
  const b = seg([xs, YWIRE, z], [xe, YWIRE, ze], r, color)
  if (a) g.add(a)
  if (b) g.add(b)
}

// 轴向元件外观配置(贴实物:电阻米白碳膜体,棕黑棕金=100Ω,镀锡银端帽;体量较真实元件适当放大便于教学观察)
const CFG = {
  R: { r: 9, len: 50, body: '#e9dcc0', cap: 0xd0d4da, bands: [{ x: -7.8, w: 3, c: '#8a5a2b' }, { x: -3.9, w: 3, c: '#33373d' }, { x: 0, w: 3, c: '#8a5a2b' }, { x: 3.9, w: 3.6, c: '#dfb255' }] },
}
// 横置轴向元件(圆柱+圆头端盖+色环+镀锡引线,纯基础几何构建)
export function addAxial(g, comp, cfg, ctx) {
  const hx = ctx.wx(comp.x)
  const z0 = ctx.wz(comp.y)
  const r = cfg.r
  const bh = cfg.len / 2
  const midLen = Math.max(cfg.len - 2 * r, 2)
  const mBody = cmat(cfg.body, 0.6, 0.02)
  const mCap = cmat(cfg.cap, 0.32, 0.55)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, midLen, 24), mBody)
  body.rotation.z = Math.PI / 2
  body.position.set(hx, r, z0)
  g.add(body)
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 14), mCap)
    cap.position.set(hx + s * (midLen / 2), r, z0)
    g.add(cap)
  }
  for (const b of cfg.bands) {
    const band = cylX(r + 0.22, b.w, b.c, 0.78, 0.02)
    band.position.set(hx + b.x, r, z0)
    g.add(band)
  }
  for (const s of [-1, 1]) {
    const wire = cylX(1.6, 6, cfg.cap, 0.3, 0.5)
    wire.position.set(hx + s * (bh + 3), r, z0)
    g.add(wire)
  }
  for (const ep of comp.endpoints) {
    const xs = hx + Math.sign(ep.x - comp.x) * (bh + 6)
    lead(g, xs, r, z0, ctx.wx(ep.x), ctx.wz(ep.y), 1.4, cfg.cap)
  }
}
// 工字电感(铁氧体磁芯 + 漆包铜线单层密绕 + 两端盘状挡片,贴实物)
export function addInductor(g, comp, ctx) {
  const hx = ctx.wx(comp.x)
  const z0 = ctx.wz(comp.y)
  const rCore = 6.4, coreLen = 38, rFlange = 11.6, wFlange = 2.8
  const axY = rFlange // 卧放:轴心高 = 挡片半径(盘缘触台,中柱悬空)
  // 铁氧体磁芯(中柱)
  const core = cylX(rCore, coreLen, 0x4d5560, 0.6, 0.15)
  core.position.set(hx, axY, z0)
  g.add(core)
  // 两端盘状挡片
  for (const s of [-1, 1]) {
    const fl = cylX(rFlange, wFlange, 0x3f4650, 0.5, 0.2)
    fl.position.set(hx + s * (coreLen / 2 - wFlange / 2), axY, z0)
    g.add(fl)
    // 镀锡引线:挡片外侧水平引出
    const wire = cylX(1.6, 12, 0xd0d4da, 0.3, 0.5)
    wire.position.set(hx + s * (coreLen / 2 + wFlange / 2 + 4), axY, z0)
    g.add(wire)
  }
  // 漆包铜线单层密绕(环面逐匝紧排,匝间露磁芯)
  const rWire = 1.9
  const inner = coreLen / 2 - wFlange - 1.2
  const n = Math.max(3, Math.floor((inner * 2) / (rWire * 2)))
  for (let i = 0; i < n; i++) {
    const turn = new THREE.Mesh(new THREE.TorusGeometry(rCore + rWire, rWire, 12, 24), cmat(0xc98d3f, 0.38, 0.42))
    turn.position.set(hx - inner + i * rWire * 2 + rWire, axY, z0)
    turn.rotation.y = Math.PI / 2 // 环面环绕 x 轴(元件沿 x 卧放)
    g.add(turn)
  }
  // 端点焊盘引线(与轴向元件同一落台方式)
  for (const ep of comp.endpoints) {
    const xs = hx + Math.sign(ep.x - comp.x) * (coreLen / 2 + wFlange + 8)
    lead(g, xs, axY, z0, ctx.wx(ep.x), ctx.wz(ep.y), 1.4, 0xd0d4da)
  }
}
// 薄膜电容(黄色卧式方块,贴近 CBB 实物样式)
export function addFilmCap(g, comp, ctx) {
  const hx = ctx.wx(comp.x)
  const z0 = ctx.wz(comp.y)
  const bw = 42, bh = 17, bd = 26
  const mBody = cmat('#e9c55c', 0.45, 0.02) // 薄膜电容标志黄
  const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mBody)
  body.position.set(hx, bh / 2, z0)
  g.add(body)
  // 顶面浅色印字带
  const strip = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.66, 0.5, bd * 0.55), cmat('#f6e7ba', 0.55, 0))
  strip.position.set(hx, bh + 0.25, z0)
  g.add(strip)
  // 两端镀锡引脚:从盒端引出、下落贴台面后接到端点焊盘
  for (const ep of comp.endpoints) {
    const s = Math.sign(ep.x - comp.x)
    const xs = hx + s * (bw / 2 - 1)
    lead(g, xs, 8.5, z0, ctx.wx(ep.x), ctx.wz(ep.y), 1.5, 0xd0d4da)
  }
}
// 滑线变阻器(教学型:陶瓷管密绕电阻丝 + 镀铬滑杆 + 滑块触片,卧式悬架于两端板间)
// 滑块位置随有效阻值对数映射(滑向左侧=阻值小),左右接线柱分别对应绕线端与滑片端
export function addRheostat(g, comp, ctx) {
  const hx = ctx.wx(comp.x)
  const z0 = ctx.wz(comp.y)
  const v = Math.min(Math.max(comp.value || 100, 10), 1000)
  const k = Math.min(Math.max((Math.log(v) - Math.log(10)) / (Math.log(1000) - Math.log(10)), 0), 1)
  const sx = -15.6 + k * 31.2 // 滑块行程限在两端支架之间
  const mFrame = cmat('#3b434c', 0.5, 0.35) // 端板/支架深灰金属
  const mBody = cmat('#e9e1cd', 0.68, 0.02) // 陶瓷管米白
  const mWind = cmat('#c8924a', 0.32, 0.45) // 电阻丝金铜
  const mRod = cmat('#cfd6dd', 0.2, 0.75) // 镀铬滑杆
  const mSlider = cmat('#262c33', 0.6, 0.12) // 滑块胶木
  const mTerm = cmat('#d0d4da', 0.3, 0.5) // 镀锡接线柱/触片
  // 两端板(立式,底贴台面)
  for (const s of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2, 15, 11), mFrame)
    plate.position.set(hx + s * 22, 7.5, z0)
    g.add(plate)
  }
  // 陶瓷管(两端入端板悬架,管心略高于台面)
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 43, 20), mBody)
  tube.rotation.z = Math.PI / 2
  tube.position.set(hx, 9.5, z0)
  g.add(tube)
  // 密绕电阻丝(环面单层,外缘与端板顶平齐)
  for (let i = 0; i < 8; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.5, 10, 22), mWind)
    t.position.set(hx - 17 + i * 4.86, 9.5, z0)
    t.rotation.y = Math.PI / 2
    g.add(t)
  }
  // 滑杆支架(顶在端板上)
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4, 3), mFrame)
    post.position.set(hx + s * 20, 17, z0)
    g.add(post)
    // 端帽收口
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 3.6), mTerm)
    cap.position.set(hx + s * 20, 19, z0)
    g.add(cap)
  }
  // 镀铬滑杆(两端穿入支架)
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 42, 12), mRod)
  rod.rotation.z = Math.PI / 2
  rod.position.set(hx, 17.9, z0)
  g.add(rod)
  // 滑块(骑杆)与触片(压丝)—— 位置随阻值
  const slider = new THREE.Mesh(new THREE.BoxGeometry(7, 6, 5.5), mSlider)
  slider.position.set(hx + sx, 18.4, z0)
  g.add(slider)
  const wiper = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2, 2.6), mTerm)
  wiper.position.set(hx + sx, 14.4, z0)
  g.add(wiper)
  // 左右接线柱(竖于台面,贴端板外侧)与引线到端点焊盘
  for (const [s, ep] of [[-1, comp.endpoints[0]], [1, comp.endpoints[1]]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 4.6, 16), mTerm)
    post.position.set(hx + s * 25, 2.3, z0)
    g.add(post)
    lead(g, hx + s * 25, 4.6, z0, ctx.wx(ep.x), ctx.wz(ep.y), 1.4, mTerm)
  }
}

// 旋转可变电容(收音机同款:半圆动/定片同轴层叠 + 顶部旋钮)
// 动片组相对定片组绕竖轴错角随容量映射(近重叠=大容量,错开=小容量)
export function addVarCap(g, comp, ctx) {
  const hx = ctx.wx(comp.x)
  const z0 = ctx.wz(comp.y)
  const v = Math.min(Math.max(comp.value || 0.05, 0.005), 0.2)
  const k = (v - 0.005) / (0.2 - 0.005)
  const rotY = ((168 - 156 * k) * Math.PI) / 180 // 动片组错角
  const mBase = cmat('#3a332b', 0.72, 0.02) // 电木底座
  const mStator = cmat('#9aa4b0', 0.5, 0.5) // 定片哑光铝
  const mRotor = cmat('#e8edf2', 0.22, 0.7) // 动片亮铝
  const mAxis = cmat('#2e353c', 0.5, 0.2) // 轴/旋钮
  const mKnob = cmat('#f2f5f8', 0.35, 0.1) // 指示条
  const mTerm = cmat('#d0d4da', 0.3, 0.5)
  // 底座
  const base = new THREE.Mesh(new THREE.BoxGeometry(15, 2.4, 11), mBase)
  base.position.set(hx, 1.2, z0)
  g.add(base)
  const mkSemi = (r, th, mat) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, th, 20, 1, false, 0, Math.PI), mat)
  // 定片(固定层,叠于底座上方)
  for (const dy of [3.4, 5.4]) {
    const st = mkSemi(7, 0.4, mStator)
    st.position.set(hx, dy, z0)
    g.add(st)
  }
  // 动片组(与旋钮同轴旋转,层间夹于定片之间)
  const rotor = new THREE.Group()
  rotor.position.set(hx, 0, z0)
  for (const dy of [4.4, 6.4]) {
    const rt = mkSemi(7, 0.4, mRotor)
    rt.position.set(0, dy, 0)
    rotor.add(rt)
  }
  // 轴(穿过动片组中心)与顶部旋钮(带一字指示,随动片旋转)
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 13, 14), mAxis)
  axis.position.set(0, 8.6, 0)
  rotor.add(axis)
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 2.6, 22), mAxis)
  knob.position.set(0, 14.9, 0)
  rotor.add(knob)
  const idx = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 6.4), mKnob)
  idx.position.set(0, 16.55, 0)
  rotor.add(idx)
  rotor.rotation.y = rotY
  g.add(rotor)
  // 接线:左侧出线接定片(焊盘左端点),右侧出线接动片(焊盘右端点)
  for (const [s, ep] of [[-1, comp.endpoints[0]], [1, comp.endpoints[1]]]) {
    lead(g, hx + s * 8, 3.6, z0, ctx.wx(ep.x), ctx.wz(ep.y), 1.3, mTerm)
  }
}

// 信号源:圆角白面板+荧光波形屏+双旋钮+红黑输出端子(呼应页面卡片风)
let waveTex = null
function getWaveTex() {
  if (!waveTex) {
    const cv = document.createElement('canvas')
    cv.width = 256
    cv.height = 128
    const c = cv.getContext('2d')
    c.clearRect(0, 0, 256, 128)
    // 屏幕内框与刻度
    c.strokeStyle = 'rgba(255,255,255,0.16)'
    c.lineWidth = 1.5
    c.strokeRect(8, 8, 240, 112)
    c.setLineDash([6, 8])
    c.beginPath()
    c.moveTo(128, 8)
    c.lineTo(128, 120)
    c.stroke()
    c.setLineDash([])
    // 荧光青正弦波形
    c.strokeStyle = '#57e8c9'
    c.lineWidth = 3
    c.beginPath()
    for (let i = 8; i <= 248; i++) {
      const y = 64 - 40 * Math.sin(((i - 8) / 240) * Math.PI * 4)
      i === 8 ? c.moveTo(i, y) : c.lineTo(i, y)
    }
    c.stroke()
    waveTex = new THREE.CanvasTexture(cv)
    waveTex.colorSpace = THREE.SRGBColorSpace
  }
  return waveTex
}
export function addSource(g, comp, ctx) {
  const hx = ctx.wx(comp.x)
  const z0 = ctx.wz(comp.y)
  const body = new THREE.Mesh(new THREE.BoxGeometry(46, 18, 28), cmat('#f4f8f6', 0.6, 0.02))
  body.position.set(hx, 9, z0)
  g.add(body)
  // 荧光屏(深青底 + 波形亮层)
  const scr = new THREE.Mesh(new THREE.BoxGeometry(24, 1, 14), cmat('#12253f', 0.5, 0.05))
  scr.position.set(hx, 18.55, z0 - 1)
  g.add(scr)
  const wave = new THREE.Mesh(
    new THREE.BoxGeometry(22, 0.24, 12.4),
    new THREE.MeshBasicMaterial({ map: getWaveTex(), transparent: true })
  )
  wave.position.set(hx, 19.1, z0 - 1)
  g.add(wave)
  // 调节旋钮(顶面一排,带一字指示)
  for (const dx of [-11, -3.5, 4]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.4, 4.6, 22), cmat('#3a4349', 0.4, 0.25))
    knob.position.set(hx + dx, 21.3, z0 + 8)
    g.add(knob)
    const idx = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 4), cmat('#dfe6e3', 0.5, 0.1))
    idx.position.set(hx + dx, 23.8, z0 + 8)
    g.add(idx)
  }
  // 红/黑输出端子(左红右黑,底脚插入焊盘)
  for (const ep of comp.endpoints) {
    const s = Math.sign(ep.x - comp.x)
    const col = s < 0 ? 0xe0523f : 0x2f3940 // 呼应全站亮红
    const post = cylX(4, 8, col, 0.3, 0.45)
    post.position.set(hx + s * 27, 9, z0)
    g.add(post)
    lead(g, ctx.wx(ep.x), 9, z0, ctx.wx(ep.x), ctx.wz(ep.y), 1.6, col)
  }
}

// 板面导线(折线逐段);pickProxy=true 时附加透明粗圆柱拾取代理(userData.kind='wire',供 3D 右键删除命中)
export function addRoutes(g, wires, ctx, pickProxy = false) {
  for (let wi = 0; wi < wires.length; wi++) {
    const w = wires[wi]
    const pts = w.points && w.points.length > 0 ? w.points : [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }]
    for (let i = 0; i < pts.length - 1; i++) {
      const pa = [ctx.wx(pts[i].x), YWIRE, ctx.wz(pts[i].y)]
      const pb = [ctx.wx(pts[i + 1].x), YWIRE, ctx.wz(pts[i + 1].y)]
      const s = seg(pa, pb, 1.9, 0x2563eb, 0.45, 0.15)
      if (s) g.add(s)
      if (pickProxy) {
        const p = seg(pa, pb, 7, 0x2563eb, 0.45, 0.15)
        if (p) {
          p.material = pickProxyMat
          p.name = 'pick-proxy'
          p.castShadow = false
          p.userData = { kind: 'wire', wireIndex: wi }
          g.add(p)
        }
      }
    }
  }
}
// 导线中间节点(实心焊点)
export function addJunctions(g, junctions, ctx) {
  for (const j of junctions) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(2.9, 16, 12), cmat('#2563eb', 0.3, 0.3))
    d.position.set(ctx.wx(j.x), YWIRE, ctx.wz(j.y))
    g.add(d)
  }
}
// 端点焊盘(携带 userData {kind:'pad', compIndex, epIndex} 供交互拾取);返回焊盘数组便于高亮/命中管理
export function addPads(g, components, ctx, compIndexBase = 0) {
  const out = []
  for (let ci = 0; ci < components.length; ci++) {
    const c = components[ci]
    for (let ei = 0; ei < c.endpoints.length; ei++) {
      const ep = c.endpoints[ei]
      const p = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 1.3, 18), cmat('#c3cede', 0.4, 0.35))
      p.position.set(ctx.wx(ep.x), YWIRE, ctx.wz(ep.y))
      p.userData = { kind: 'pad', compIndex: compIndexBase + ci, epIndex: ei }
      g.add(p)
      out.push(p)
    }
  }
  return out
}
// 端点焊盘拾取代理材质:全透明不写深度,渲染不可见但可被 Raycaster 命中
const pickProxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
// 高级实验台:近黑炭灰台身 + 中央中灰蓝工作区(微凸 0.4 避免与台身共面闪烁)+ 周界金属收边
export function addBoard(g, boardR3) {
  const half = Math.max(boardR3 * 2, 340)
  const s = half * 2
  // 台身(近黑炭灰,轻微金属质感)
  const deskMat = cmat('#22262c', 0.52, 0.34)
  deskMat.side = THREE.DoubleSide
  const desk = new THREE.Mesh(new THREE.BoxGeometry(s, 46, s), deskMat)
  desk.name = 'static-bench'
  desk.position.y = -23
  g.add(desk)
  // 中央工作区(中灰蓝哑光,顶面高出台面 0.4 形成防静电垫厚度,四周留出台身收边)
  const ph = Math.min(Math.max(boardR3 * 0.85, 200), boardR3 * 1.05)
  const padMat = cmat('#646f7e', 0.78, 0.16)
  padMat.side = THREE.DoubleSide
  const pad = new THREE.Mesh(new THREE.BoxGeometry(ph * 2, 4, ph * 2), padMat)
  pad.name = 'static-bench'
  pad.position.y = -1.6
  g.add(pad)
  // 工作区周界金属亮条(细窄微凸,精致收边;底部嵌入工作区)
  const edgeMat = cmat(0xc0cad8, 0.18, 0.95)
  edgeMat.side = THREE.DoubleSide
  const mkEdge = (len) => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(len, 2, 2.4), edgeMat)
    e.name = 'static-bench'
    e.position.y = 1
    return e
  }
  const e1 = mkEdge(ph * 2)
  e1.position.set(0, 1, -ph)
  g.add(e1)
  const e2 = mkEdge(ph * 2)
  e2.position.set(0, 1, ph)
  g.add(e2)
  const e3 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, ph * 2), edgeMat)
  e3.position.set(-ph, 1, 0)
  g.add(e3)
  const e4 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, ph * 2), edgeMat)
  e4.position.set(ph, 1, 0)
  g.add(e4)
}

// 按元件类型派发建模(与 CircuitBoard 原 drawCircuit3D 的派发逻辑一致)
export function buildComponentModel(g, comp, ctx) {
  if (comp.type === 'V') addSource(g, comp, ctx)
  else if (comp.type === 'C') addFilmCap(g, comp, ctx)
  else if (comp.type === 'CV') addVarCap(g, comp, ctx)
  else if (comp.type === 'L') addInductor(g, comp, ctx)
  else if (comp.type === 'RV') addRheostat(g, comp, ctx)
  else addAxial(g, comp, CFG.R, ctx)
}

// ===== 元件库 3D 缩略图:离屏渲染每个元件的商品图(与台面模型同源同质感) =====
let thumbCache = null
const THUMB_SIZE = 128
// 缩略图示例元件默认参数(与台面默认值一致)
const THUMB_COMP = {
  R: { value: 100 },
  RV: { value: 100 },
  L: { value: 100 },
  C: { value: 0.05 },
  CV: { value: 0.05 },
  V: { value: 0.9 },
}
export function renderComponentThumbs() {
  if (thumbCache) return thumbCache
  let renderer = null
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  } catch (err) {
    console.error('[3D] 缩略图渲染器创建失败:', err)
    return null
  }
  try {
    renderer.setPixelRatio(2)
    renderer.setSize(THUMB_SIZE, THUMB_SIZE, false)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    const scene = new THREE.Scene()
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9db8e8, 1.05))
    const key = new THREE.DirectionalLight(0xffffff, 2.0)
    key.position.set(200, 420, 150)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xe4edfb, 0.7)
    fill.position.set(-220, 120, -190)
    scene.add(fill)
    try {
      const pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      scene.environmentIntensity = 0.42
      pmrem.dispose()
    } catch (err) {
      console.error('[3D] 缩略图环境反射生成失败(不影响主场景):', err)
    }
    const camera = new THREE.PerspectiveCamera(38, 1, 1, 6000)
    const ctx = { wx: (x) => x, wz: (y) => y }
    const out = {}
    for (const type of Object.keys(THUMB_COMP)) {
      const comp = {
        type,
        x: 0,
        y: 0,
        value: THUMB_COMP[type].value,
        endpoints: [
          { x: -30, y: 0 },
          { x: 30, y: 0 },
        ],
      }
      const group = new THREE.Group()
      buildComponentModel(group, comp, ctx)
      scene.add(group)
      // 相机对准包围球,沿与主场景一致的展示方向取景
      const sphere = new THREE.Box3().setFromObject(group).getBoundingSphere(new THREE.Sphere())
      const dir = new THREE.Vector3(0.66, 0.46, 0.84).normalize()
      const dist = Math.max(sphere.radius / Math.tan((camera.fov * Math.PI) / 360) * 1.18, 55)
      camera.position.copy(sphere.center).addScaledVector(dir, dist)
      camera.lookAt(sphere.center)
      renderer.render(scene, camera)
      out[type] = renderer.domElement.toDataURL('image/png')
      // 清理本元件几何(材质来自共享缓存,不随组释放)
      scene.remove(group)
      group.traverse((n) => n.geometry && n.geometry.dispose())
    }
    renderer.dispose()
    thumbCache = out
    return out
  } catch (err) {
    console.error('[3D] 缩略图渲染失败:', err)
    if (renderer) renderer.dispose()
    return null
  }
}
