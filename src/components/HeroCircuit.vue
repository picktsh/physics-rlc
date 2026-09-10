<script setup>
// 落地页 3D 原理演示台:RLC 串联谐振的「台面全息演示」
// - 场景:实验台 + 铜导线闭合回路 + 四元件(R/L/C/V),电流光点沿回路流动
// - 演示:信号源频率 f 连续扫频(0.15f₀~6.3f₀),物理量按 RLC 串联理论实时计算:
//     Z=|R+j(ωL-1/ωC)|, I=V/Z, UR=I·R, UL=I·ωL, UC=I/(ωC)
//   1) 电流光点亮度/大小 ∝ I(f)—— 谐振时最亮,两侧渐暗(谐振电流最大)
//   2) R/L/C 台面三色电压光环:直径/亮度 ∝ 元件端电压 —— 谐振时 UL、UC 暴涨(过电压)
// - 参数跟随全局 Store(L/R/C/V),与页眉参数速览条同一来源
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { useRLCCalculatorStore } from '../stores/rlcCalculator'

const cvRef = ref(null)
const sldRef = ref(null)
const glFailed = ref(false)
const playing = ref(true) // 自动扫频开关
// 10fps 节流的读数(3D/物理状态放非响应式变量,避免每帧触发 Vue 渲染)
const ui = reactive({ f0: '—', f: '—', i: '—', phi: '—', zone: 'res', zoneText: '谐振' })
// ===== 坐标系:桌面顶 y=0;防静电垫顶 y=1.8;导线层 y=3 =====
const PAD_TOP = 1.8
const WIRE_Y = 3
// 回路俯视布局:顶行 z=-30 串联 R-L-C,底行 z=34 串联 V,左右竖边闭合
const TOP_Z = -30
const BOT_Z = 34
const R_CX = -57, R_BX = 21, R_Y = PAD_TOP + 5.5 // 轴向电阻(轴心高 5.5)
const L_CX = 0, L_BX = 12, L_Y = PAD_TOP + 8.5 // 工字电感(挡片半径 8.5 卧放)
const C_CX = 58, C_BX = 19, C_Y = PAD_TOP + 5.5 // 薄膜电容(盒高 11 半高 5.5)
const V_BX = 26, V_Y = PAD_TOP + 8 // 信号源(盒高 16 半高 8)
const matCache = new Map()
const cmat = (color, rough = 0.5, metal = 0.05) => {
  const k = color + '|' + rough + '|' + metal
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }))
  return matCache.get(k)
}
// 沿 x 轴圆柱(横置元件/端子/水平引线通用)
const cylX = (r, len, color, rough, metal) => {
  const g = new THREE.CylinderGeometry(r, r, len, 20)
  g.rotateZ(Math.PI / 2)
  return new THREE.Mesh(g, cmat(color, rough, metal))
}
// 两点间圆柱段;返回 null 表示零长度
const seg = (a, b, r, color, rough = 0.35, metal = 0.35) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]
  const len = Math.hypot(dx, dy, dz)
  if (len < 0.01) return null
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), cmat(color, rough, metal))
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize())
  return m
}
// 水平引线:从元件端 (bodyEnd) 水平伸到接线点 (bx),再竖直降落到导线层
const pin = (g, cx, bx, bodyEnd, y, z, r, color) => {
  const wire = cylX(r, Math.abs(bx - bodyEnd), color, 0.25, 0.5)
  wire.position.set(cx + (bx + bodyEnd) / 2, y, z)
  g.add(wire)
  const drop = seg([cx + bx, y, z], [cx + bx, WIRE_Y, z], r, color)
  if (drop) g.add(drop)
}

let scene, renderer, camera, controls, ro
let raf = 0, curDot = null, glowDot = null, ringR = null, ringL = null, ringC = null
let pathPts = [], pathLens = [], pathTotal = 0, flowT = 0

// ===== 演示物理状态(非响应式:每帧由 rAF 直接读写) =====
let OhmR = 100, HenL = 0.1, FarC = 5e-8, Volt = 0.9, fZero = 2252, Qfact = 14.1
let fHz = 300, sweepPos = 0, sweepDir = 1, tSec = 0, lastReadT = 0, lastT = 0
// 扫频对数坐标:f/f₀ ∈ 10^-0.82 … 10^+0.80 ≈ 0.15 … 6.3
const LOG_LO = -0.82, LOG_HI = 0.8, LOG_SPAN = LOG_HI - LOG_LO
const SWEEP_TIME = 8 // 单程全跨扫频秒数;接近 f₀ 时减速,让谐振状态驻留可辨

function initDemo() {
  const p = useRLCCalculatorStore().params
  const Rv = Number(p.R), Lv = Number(p.L), Cv = Number(p.C), Vv = Number(p.V)
  OhmR = isFinite(Rv) && Rv > 0 ? Rv : 100
  HenL = isFinite(Lv) && Lv > 0 ? Lv * 1e-3 : 0.1
  FarC = isFinite(Cv) && Cv > 0 ? Cv * 1e-6 : 5e-8
  Volt = isFinite(Vv) && Vv > 0 ? Vv : 0.9
  const w0 = 1 / Math.sqrt(HenL * FarC)
  fZero = w0 / (2 * Math.PI)
  Qfact = fZero > 0 ? (w0 * HenL) / OhmR : 1
  ui.f0 = fZero >= 1000 ? (fZero / 1000).toFixed(2) + ' kHz' : Math.round(fZero) + ' Hz'
  sweepPos = 0
  sweepDir = 1
  playing.value = true
  fHz = fZero * Math.pow(10, LOG_LO)
}
const pos2f = (p) => fZero * Math.pow(10, LOG_LO + p * LOG_SPAN)
const f2pos = (f) => Math.min(1, Math.max(0, (Math.log10(f / fZero) - LOG_LO) / LOG_SPAN))
// 当前频率下的串联谐振理论值
function physicsAt(f) {
  const w = 2 * Math.PI * f
  const xl = w * HenL
  const xc = FarC > 0 ? 1 / (w * FarC) : 0
  const x = xl - xc
  const z = Math.hypot(OhmR, x)
  const i = z > 0 ? Volt / z : 0
  const ur = i * OhmR, ul = i * xl, uc = i * xc
  return { xl, xc, x, z, i, ur, ul, uc, phiRad: Math.atan2(x, OhmR) }
}
function advanceSweep(dt) {
  const logd = Math.abs(Math.log10(fHz / fZero))
  // 高斯窗减速:距 f₀ 一个对数半宽(约 1/8Q)内速度降到 ~0.3,谐振现象可驻足观察
  const fac = 1 - 0.7 * Math.exp(-((logd / 0.045) ** 2))
  sweepPos += (dt * sweepDir * fac) / SWEEP_TIME
  if (sweepPos >= 1) { sweepPos = 1; sweepDir = -1 }
  if (sweepPos <= 0) { sweepPos = 0; sweepDir = 1 }
  fHz = pos2f(sweepPos)
}
// 光环:电压 → 桌面光环半径/透明度(RingGeometry 带宽固定,只变内外半径)
function makeRing(cx, cz, color) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 4.8, 56),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(cx, PAD_TOP + 0.25, cz)
  mesh.name = 'ring-vis'
  mesh.castShadow = false
  mesh.receiveShadow = false
  mesh.userData.rr = -1
  return mesh
}
function setRingVolt(mesh, volt) {
  const vq = Volt * Qfact // 谐振时 UL=UC=Q·V,作为满量程
  const ratio = vq > 0 ? Math.min(1, Math.pow(volt / vq, 0.5)) : 0
  const rr = 2.8 + 17 * ratio
  if (Math.abs(rr - mesh.userData.rr) > 0.12) {
    mesh.geometry.dispose()
    mesh.geometry = new THREE.RingGeometry(Math.max(0.5, rr - 0.8), rr + 0.8, 56)
    mesh.userData.rr = rr
  }
  mesh.material.opacity = 0.2 + 0.62 * Math.pow(vq > 0 ? Math.min(1, volt / vq) : 0, 0.32)
}

// ===== 元件(全部静态构建一次) =====
function addBoard(g) {
  const desk = new THREE.Mesh(new THREE.BoxGeometry(232, 18, 154), cmat('#22262c', 0.52, 0.34))
  desk.position.y = -9
  desk.name = 'static-bench'
  g.add(desk)
  const pad = new THREE.Mesh(new THREE.BoxGeometry(214, 2.2, 136), cmat('#646f7e', 0.78, 0.16))
  pad.position.y = 0.7
  pad.name = 'static-bench'
  g.add(pad)
  // 工作区周界金属亮条
  const mEdge = cmat(0xc0cad8, 0.18, 0.95)
  const mkEdge = (w, d) => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), mEdge)
    e.position.y = 2.1
    e.name = 'static-bench'
    return e
  }
  const ez = 136 / 2 - 0.8
  const ex = 214 / 2 - 0.8
  const e1 = mkEdge(214, 1.6); e1.position.set(0, 2.1, -ez); g.add(e1)
  const e2 = mkEdge(214, 1.6); e2.position.set(0, 2.1, ez); g.add(e2)
  const e3 = mkEdge(1.6, 136); e3.position.set(-ex, 2.1, 0); g.add(e3)
  const e4 = mkEdge(1.6, 136); e4.position.set(ex, 2.1, 0); g.add(e4)
}
// 轴向色环电阻
function addResistor(g) {
  const cx = R_CX, y = R_Y, z = TOP_Z
  const body = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 24, 24), cmat('#e9dcc0', 0.6, 0.02))
  body.rotation.z = Math.PI / 2
  body.position.set(cx, y, z)
  g.add(body)
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(5.5, 22, 14), cmat(0xd0d4da, 0.32, 0.55))
    cap.position.set(cx + s * 12, y, z)
    g.add(cap)
  }
  const bands = [
    { x: -5.5, c: '#8a5a2b' }, { x: 0, c: '#33373d' }, { x: 5.5, c: '#dfb255' },
  ]
  for (const b of bands) {
    const band = cylX(5.72, 2.6, b.c, 0.78, 0.02)
    band.position.set(cx + b.x, y, z)
    g.add(band)
  }
  pin(g, cx, R_BX, 17.5, y, z, 1.3, 0xd0d4da)
  pin(g, cx, -R_BX, -17.5, y, z, 1.3, 0xd0d4da)
}
// 工字电感(铁氧体磁芯 + 盘状挡片 + 漆包铜绕线)
function addInductor(g) {
  const cx = L_CX, y = L_Y, z = TOP_Z
  const core = cylX(5, 16, 0x4d5560, 0.6, 0.15)
  core.position.set(cx, y, z)
  g.add(core)
  for (const s of [-1, 1]) {
    const fl = cylX(8.5, 2.4, 0x3f4650, 0.5, 0.2)
    fl.position.set(cx + s * 6.8, y, z)
    g.add(fl)
  }
  for (let i = 0; i < 5; i++) {
    const turn = new THREE.Mesh(new THREE.TorusGeometry(6.4, 1.4, 10, 20), cmat(0xc98d3f, 0.38, 0.42))
    turn.position.set(cx - 5.6 + i * 2.8, y, z)
    turn.rotation.y = Math.PI / 2
    g.add(turn)
  }
  pin(g, cx, L_BX, 8, y, z, 1.3, 0xd0d4da)
  pin(g, cx, -L_BX, -8, y, z, 1.3, 0xd0d4da)
}
// 薄膜电容(黄色卧式方块)
function addFilmCap(g) {
  const cx = C_CX, y = C_Y, z = TOP_Z
  const body = new THREE.Mesh(new THREE.BoxGeometry(28, 11, 20), cmat('#e9c55c', 0.45, 0.02))
  body.position.set(cx, y, z)
  g.add(body)
  const strip = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 12), cmat('#f6e7ba', 0.55, 0))
  strip.position.set(cx, y + 5.75, z)
  g.add(strip)
  pin(g, cx, C_BX, 14, y, z, 1.4, 0xd0d4da)
  pin(g, cx, -C_BX, -14, y, z, 1.4, 0xd0d4da)
}
// 荧光波形屏纹理(信号源面板上的静态装饰波形,CanvasTexture 缓存一次)
let waveTex = null
function getWaveTex() {
  if (waveTex) return waveTex
  const cv = document.createElement('canvas')
  cv.width = 512
  cv.height = 256
  const c = cv.getContext('2d')
  c.fillStyle = '#0d2137'
  c.fillRect(0, 0, 512, 256)
  c.strokeStyle = 'rgba(140,200,255,0.35)'
  c.lineWidth = 1.5
  c.strokeRect(16, 16, 480, 224)
  c.strokeStyle = 'rgba(140,200,255,0.16)'
  c.setLineDash([10, 12])
  c.beginPath(); c.moveTo(256, 16); c.lineTo(256, 240); c.stroke()
  c.beginPath(); c.moveTo(16, 128); c.lineTo(496, 128); c.stroke()
  c.setLineDash([])
  c.strokeStyle = '#5eead4'
  c.lineWidth = 4
  c.beginPath()
  for (let i = 16; i <= 496; i++) {
    const v = 128 - 66 * Math.sin(((i - 16) / 480) * Math.PI * 6)
    i === 16 ? c.moveTo(i, v) : c.lineTo(i, v)
  }
  c.stroke()
  c.strokeStyle = '#7dffa8'
  c.lineWidth = 4
  c.beginPath()
  for (let i = 16; i <= 496; i++) {
    const v = 128 - 88 * Math.sin(((i - 16) / 480) * Math.PI * 6 + 0.6)
    i === 16 ? c.moveTo(i, v) : c.lineTo(i, v)
  }
  c.stroke()
  waveTex = new THREE.CanvasTexture(cv)
  waveTex.colorSpace = THREE.SRGBColorSpace
  return waveTex
}
// 信号源(卧式白面板 + 荧光屏 + 红黑端子),底行中央,端子并入回路
function addSource(g) {
  const cx = 0, z = BOT_Z
  const body = new THREE.Mesh(new THREE.BoxGeometry(40, 16, 26), cmat('#f4f8f6', 0.6, 0.02))
  body.position.set(cx, V_Y, z)
  g.add(body)
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(22, 11), new THREE.MeshBasicMaterial({ map: getWaveTex() }))
  scr.position.set(cx, V_Y, z + 13.05)
  g.add(scr)
  for (const dx of [-11, -2.5, 6]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 2.6, 18), cmat('#3a4349', 0.4, 0.25))
    knob.position.set(cx + dx, V_Y + 9.3, z - 4)
    g.add(knob)
  }
  for (const s of [-1, 1]) {
    const col = s < 0 ? 0xe0523f : 0x2f3940
    const post = cylX(2.4, V_BX - 20, col, 0.3, 0.45)
    post.position.set(cx + s * (20 + (V_BX - 20) / 2), V_Y, z)
    g.add(post)
    const drop = seg([cx + s * V_BX, V_Y, z], [cx + s * V_BX, WIRE_Y, z], 2.2, col)
    if (drop) g.add(drop)
  }
}
// 铜导线段(纯导线,不含元件内部):接线点 = 元件中心 ± 接线半径
const R_L = R_CX - R_BX // -78:电阻左接线点
const R_R = R_CX + R_BX // -36
const L_L = L_CX - L_BX // -12
const L_R = L_CX + L_BX //  12
const C_L = C_CX - C_BX //  39
const C_R = C_CX + C_BX //  77
const wireSegs = [
  [[-88, WIRE_Y, TOP_Z], [R_L, WIRE_Y, TOP_Z]], // 顶行左段 → R
  [[R_R, WIRE_Y, TOP_Z], [L_L, WIRE_Y, TOP_Z]], // R→L
  [[L_R, WIRE_Y, TOP_Z], [C_L, WIRE_Y, TOP_Z]], // L→C
  [[C_R, WIRE_Y, TOP_Z], [88, WIRE_Y, TOP_Z]], // C→右端
  [[88, WIRE_Y, TOP_Z], [88, WIRE_Y, BOT_Z]], // 右竖边
  [[88, WIRE_Y, BOT_Z], [V_BX, WIRE_Y, BOT_Z]], // 底边右半 → V 右端子
  [[-V_BX, WIRE_Y, BOT_Z], [-88, WIRE_Y, BOT_Z]], // V 左端子 → 底边左半
  [[-88, WIRE_Y, BOT_Z], [-88, WIRE_Y, TOP_Z]], // 左竖边闭合
]
const path3 = (x, y, z) => new THREE.Vector3(x, y, z)
function buildPath() {
  const p = []
  // 元件段:左接线点升到元件轴心 → 体内水平到右接线点 → 降回导线层
  const addComp = (cx, bx, y, z) => {
    const lx = cx - bx
    const rx = cx + bx
    p.push(path3(lx, WIRE_Y, z), path3(lx, y, z), path3(rx, y, z), path3(rx, WIRE_Y, z))
  }
  // 方向:顺时针(顶行向右 → 右竖向下 → 底行向左 → 左竖向上)
  p.push(path3(-88, WIRE_Y, TOP_Z), path3(R_L, WIRE_Y, TOP_Z))
  addComp(R_CX, R_BX, R_Y, TOP_Z)
  p.push(path3(L_L, WIRE_Y, TOP_Z))
  addComp(L_CX, L_BX, L_Y, TOP_Z)
  p.push(path3(C_L, WIRE_Y, TOP_Z))
  addComp(C_CX, C_BX, C_Y, TOP_Z)
  p.push(path3(88, WIRE_Y, TOP_Z), path3(88, WIRE_Y, BOT_Z))
  addComp(0, V_BX, V_Y, BOT_Z)
  p.push(path3(-88, WIRE_Y, BOT_Z), path3(-88, WIRE_Y, TOP_Z))
  return p
}

function init3D() {
  const canvas = cvRef.value
  if (!canvas) return
  scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9db8e8, 1.0))
  const key = new THREE.DirectionalLight(0xffffff, 2.0)
  key.position.set(180, 320, 140)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.near = 20
  key.shadow.camera.far = 1200
  const sd = 320
  key.shadow.camera.left = -sd
  key.shadow.camera.right = sd
  key.shadow.camera.top = sd
  key.shadow.camera.bottom = -sd
  key.shadow.bias = -0.0004
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xe4edfb, 0.7)
  fill.position.set(-200, 110, -170)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xffffff, 0.45)
  rim.position.set(40, 150, -260)
  scene.add(rim)
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  try {
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.42
    pmrem.dispose()
  } catch (err) {
    console.error('[Hero3D] 环境反射生成失败(不影响场景):', err)
  }
  renderer.setClearColor(0x000000, 0)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  camera = new THREE.PerspectiveCamera(34, 1, 1, 4000)
  controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 120
  controls.maxDistance = 900
  controls.maxPolarAngle = Math.PI / 2 - 0.05
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.55
  controls.addEventListener('start', () => {
    controls.autoRotate = false
  })
  const world = new THREE.Group()
  scene.add(world)
  addBoard(world)
  addResistor(world)
  addInductor(world)
  addFilmCap(world)
  addSource(world)
  for (const [a, b] of wireSegs) {
    const s = seg(a, b, 1.25, 0xc8903f, 0.32, 0.5)
    if (s) world.add(s)
  }
  for (const c of [[-88, TOP_Z], [88, TOP_Z], [88, BOT_Z], [-88, BOT_Z]]) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 10), cmat('#cfd8e4', 0.3, 0.6))
    dot.position.set(c[0], WIRE_Y, c[1])
    dot.name = 'static-bench'
    world.add(dot)
  }
  // 电流光点(实心亮核 + 发光精灵光晕),沿环路流动;亮度/大小随 I(f) 实时变化
  const dotGroup = new THREE.Group()
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), new THREE.MeshBasicMaterial({ color: 0x8ef7cf }))
  dotGroup.add(core)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTex(), color: 0x6ee7b7, transparent: true, opacity: 0.85, depthWrite: false,
  }))
  glow.scale.set(15, 15, 1)
  dotGroup.add(glow)
  curDot = core
  glowDot = glow
  world.add(dotGroup)
  // 三色电压光环:R 琥珀 / L 蓝 / C 青,平躺元件正下方台面
  ringR = makeRing(R_CX, TOP_Z, 0xfbbf24)
  ringL = makeRing(L_CX, TOP_Z, 0x60a5fa)
  ringC = makeRing(C_CX, TOP_Z, 0x22d3ee)
  world.add(ringR, ringL, ringC)
  // 路径线段与累计长度
  pathPts = buildPath()
  pathLens = []
  pathTotal = 0
  for (let i = 0; i < pathPts.length - 1; i++) {
    const len = pathPts[i].distanceTo(pathPts[i + 1])
    pathLens.push(len)
    pathTotal += len
  }
  // 台面投影设置:仅元件/导线投影,静态台面与光环不投影
  world.traverse((n) => {
    if (!n.isMesh) return
    if (n.name !== 'static-bench' && n.name !== 'ring-vis') n.castShadow = true
    n.receiveShadow = true
  })
  const fit = () => {
    // 固定 30° 俯角产品视角:相机距离≈385 时桌面外接圆(~140)张角略大于视场,
    // 自动旋转任意角度台面均铺满画面(与主场景 3D 取景规范一致)
    controls.target.set(0, 6, 0)
    camera.position.set(208, 196, 264)
    controls.update()
  }
  fit()
  ro = new ResizeObserver(() => {
    const el = canvas.parentElement
    if (!el) return
    const w = el.clientWidth
    const h = el.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  })
  ro.observe(canvas.parentElement)
  const el0 = canvas.parentElement
  if (el0 && el0.clientWidth > 0 && el0.clientHeight > 0) {
    renderer.setSize(el0.clientWidth, el0.clientHeight)
    camera.aspect = el0.clientWidth / el0.clientHeight
    camera.updateProjectionMatrix()
  }
  const tick = (now) => {
    raf = requestAnimationFrame(tick)
    const dt = Math.min(0.05, lastT ? (now - lastT) / 1000 : 0.016)
    lastT = now
    tSec += dt
    controls.update()
    if (playing.value) advanceSweep(dt)
    // 当前频率物理量 → 光点/光环/波形
    const pv = physicsAt(fHz)
    const ir = OhmR > 0 ? Math.min(1, pv.i / (Volt / OhmR)) : 0
    const kb = Math.pow(ir, 0.55)
    curDot.scale.setScalar(0.55 + 1.3 * kb)
    glowDot.scale.set(8 + 11 * kb, 8 + 11 * kb, 1)
    glowDot.material.opacity = 0.28 + 0.62 * kb
    setRingVolt(ringR, pv.ur)
    setRingVolt(ringL, pv.ul)
    setRingVolt(ringC, pv.uc)
    // 电流光点沿闭合路径流动(串联电流处处相同)
    flowT = (flowT + dt * 0.9) % 1
    let d = flowT * pathTotal
    for (let i = 0; i < pathLens.length; i++) {
      if (d <= pathLens[i] || i === pathLens.length - 1) {
        const t = pathLens[i] ? d / pathLens[i] : 0
        curDot.position.lerpVectors(pathPts[i], pathPts[i + 1], t)
        glowDot.position.copy(curDot.position)
        break
      }
      d -= pathLens[i]
    }
    // 滑杆随播放推进(直接写 DOM,不经 Vue)
    const sld = sldRef.value
    if (sld && playing.value) sld.value = String(Math.round(f2pos(fHz) * 1000))
    // 读数 10fps 节流
    if (tSec - lastReadT > 0.1) {
      lastReadT = tSec
      ui.f = fHz >= 1000 ? (fHz / 1000).toFixed(2) + ' kHz' : Math.round(fHz) + ' Hz'
      const mA = pv.i * 1000
      ui.i = mA >= 1 ? mA.toFixed(2) + ' mA' : (mA * 1000).toFixed(0) + ' µA'
      const pd = (pv.phiRad * 180) / Math.PI
      ui.phi = pd.toFixed(1) + '°'
      if (pd < -0.5) { ui.zone = 'cap'; ui.zoneText = '容性区' }
      else if (pd > 0.5) { ui.zone = 'ind'; ui.zoneText = '感性区' }
      else { ui.zone = 'res'; ui.zoneText = '谐振' }
    }
    renderer.render(scene, camera)
  }
  tick(performance.now())
}
function makeGlowTex() {
  const cv = document.createElement('canvas')
  cv.width = 128
  cv.height = 128
  const c = cv.getContext('2d')
  const grad = c.createRadialGradient(64, 64, 4, 64, 64, 62)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(0.35, 'rgba(140,255,215,0.4)')
  grad.addColorStop(1, 'rgba(140,255,215,0)')
  c.fillStyle = grad
  c.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
function dispose3D() {
  cancelAnimationFrame(raf)
  if (ro) ro.disconnect()
  if (controls) controls.dispose()
  scene?.traverse((n) => {
    if (n.geometry) n.geometry.dispose()
    if (n.material) {
      if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose())
      else n.material.dispose()
    }
  })
  renderer?.dispose()
}
function toggleSweep() {
  if (!playing.value) sweepPos = f2pos(fHz)
  playing.value = !playing.value
}
function goResonance() {
  playing.value = false
  fHz = fZero
  const sld = sldRef.value
  if (sld) sld.value = String(Math.round(f2pos(fHz) * 1000))
}
function onSld(e) {
  playing.value = false
  const p = (Number(e.target.value) || 0) / 1000
  fHz = pos2f(p)
}
onMounted(() => {
  try {
    initDemo()
    init3D()
  } catch (err) {
    console.error('[Hero3D] WebGL 初始化失败:', err)
    glFailed.value = true
  }
})
onBeforeUnmount(dispose3D)
</script>

<template>
  <div class="hc-root">
    <!-- 演示控制条:扫频 / 谐振定位 / 频率滑杆 / 实时读数 -->
    <div class="hc-ctl" aria-label="谐振原理演示控制">
      <button class="hc-btn hc-play" :class="{ on: playing }" @click="toggleSweep" :title="playing ? '暂停自动扫频' : '从当前频率继续自动扫频'">
        {{ playing ? '暂停扫频' : '自动扫频' }}
      </button>
      <button class="hc-btn" @click="goResonance" title="将信号源频率锁定在理论谐振频率 f₀">谐振定位</button>
      <span class="hc-f0" title="理论谐振频率(由当前 R/L/C 计算)">f₀ <b>{{ ui.f0 }}</b></span>
      <input
        ref="sldRef"
        class="hc-sld"
        type="range"
        min="0"
        max="1000"
        step="1"
        aria-label="信号源频率(对数刻度 0.15f₀~6.3f₀)"
        @input="onSld"
      />
      <div class="hc-reads">
        <span class="hc-rd" title="信号源频率">f <b>{{ ui.f }}</b></span>
        <span class="hc-rd" title="回路电流(有效值)">I <b>{{ ui.i }}</b></span>
        <span class="hc-rd" title="电流相对电压的相位差,谐振时 φ=0">φ <b>{{ ui.phi }}</b></span>
        <span class="hc-zone" :class="'z-' + ui.zone">{{ ui.zoneText }}</span>
      </div>
      <span class="hc-legend" title="台面三色光环 = 各元件两端电压幅值(谐振时 U_L、U_C 远大于信号源电压)">
        <span><i class="lg-r"></i>U_R</span><span><i class="lg-l"></i>U_L</span><span><i class="lg-c"></i>U_C</span>
      </span>
    </div>
    <div class="hero3d-wrap">
      <canvas ref="cvRef" v-if="!glFailed" class="hero3d-canvas" />
      <div v-else class="hero3d-fallback">
        当前环境不支持 WebGL,3D 实物示意不可用
      </div>
      <span v-if="!glFailed" class="hero3d-hint">拖拽旋转 · 滚轮缩放 · 光点亮度 ∝ 电流 I(f)</span>
    </div>
  </div>
</template>

<style scoped>
.hc-root {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
/* ---- 控制条 ---- */
.hc-ctl {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 7px 11px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 10px 26px -18px rgba(37, 99, 235, 0.35);
}
.hc-btn {
  border: 1px solid #d7e1f1;
  background: #f4f8ff;
  color: #2c3e63;
  border-radius: 8px;
  padding: 5px 13px;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
}
.hc-btn:hover {
  border-color: #b9c9e6;
  background: #edf3fd;
}
.hc-btn.on {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
  box-shadow: 0 6px 14px -8px rgba(37, 99, 235, 0.7);
}
.hc-f0 {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px dashed #c3d3ef;
  font-size: 12px;
  color: #5b6a85;
  white-space: nowrap;
}
.hc-f0 b {
  font-family: var(--font-head);
  color: var(--navy-deep);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.hc-sld {
  flex: 1 1 170px;
  min-width: 130px;
  accent-color: #2563eb;
  cursor: pointer;
}
.hc-reads {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}
.hc-rd {
  font-size: 12px;
  color: #6d7b93;
  background: #f4f7fc;
  border: 1px solid #e6ecf6;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.hc-rd b {
  color: #15233b;
  font-weight: 700;
  margin-left: 2px;
}
.hc-zone {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 11px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
  letter-spacing: 0.04em;
}
.hc-zone.z-cap {
  color: #1d4ed8;
  background: #eef4ff;
  border-color: #cdddfb;
}
.hc-zone.z-res {
  color: #1f7a43;
  background: #e9f8ef;
  border-color: #bfe8cd;
}
.hc-zone.z-ind {
  color: #b45309;
  background: #fdf4e7;
  border-color: #f3dfbd;
}
.hc-legend {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 11.5px;
  color: #7d8aa6;
  white-space: nowrap;
  letter-spacing: 0.03em;
}
.hc-legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.hc-legend i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.hc-legend .lg-r { background: #fbbf24; }
.hc-legend .lg-l { background: #60a5fa; }
.hc-legend .lg-c { background: #22d3ee; }
/* ---- 3D 演示区 ---- */
.hero3d-wrap {
  position: relative;
  height: 472px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: linear-gradient(180deg, #eef3fb, #e3ebf7);
}
.hero3d-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}
.hero3d-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 13px;
  color: #8a97ab;
}
.hero3d-hint {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(194, 207, 230, 0.8);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #7d8aa6;
  pointer-events: none;
  user-select: none;
}
@media (max-width: 1080px) {
  .hero3d-wrap {
    height: 420px;
  }
}
@media (max-width: 760px) {
  .hero3d-wrap {
    height: 350px;
  }
}
</style>
