<template>
  <div class="c3d">
    <!-- 视图工具栏:常驻画布顶部,操作按钮右对齐。常显确保首次拖入元件时画布尺寸不变(不引起布局偏移);
         整块工作区放大改由父级「板块全屏」统一处理,此处只保留 3D 视角操作 -->
    <div class="c3d-bar">
      <span v-if="headerTitle" class="c3d-bar-title">{{ headerTitle }}</span>
      <span v-if="headerTip" class="c3d-bar-tip">{{ headerTip }}</span>
      <div class="c3d-bar-actions">
        <!-- 供父页注入板块级操作按钮(如导入示例/全屏/仿真/清空),与 3D 视角按钮同处一行 flex-wrap -->
        <slot name="actions" />
        <NButton :type="autoRotate3D ? 'primary' : 'default'" @click="toggle3DRotate">
          <template #icon><NIcon :component="autoRotate3D ? Pause : Play" /></template>
          {{ autoRotate3D ? '停止旋转' : '自动旋转' }}
        </NButton>
        <NButton @click="reset3DView">
          <template #icon><NIcon :component="Location" /></template>
          复位视角
        </NButton>
      </div>
    </div>

    <!-- 画布舞台:尺寸变化由 ResizeObserver 自适应(父级全屏放大时自动重排,画布 DOM 不移动) -->
    <div class="c3d-stage-area">
      <canvas
        ref="canvas3dRef"
        class="c3d-stage"
        @dragover="onDragOver"
        @drop="onDrop"
        @dblclick="onDblClick"
        @contextmenu="onContextMenu"
        @pointerdown.capture="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
      />
      <div v-if="components.length === 0" class="c3d-empty">
        <span class="text-gray-300 text-3xl leading-none">🧊</span>
        <span class="text-xs text-gray-400">{{ emptyText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { NIcon, NButton } from 'naive-ui'
import { Pause, Play, Location } from '@vicons/carbon'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { YWIRE, cmat, addBoard, addRoutes, addJunctions, addPads, buildComponentModel } from '@/utils/circuit3d'
import { canvasTheme } from '@/utils/canvasTheme'

// 共享 3D 电路场景组件:
// - 只读模式(默认):与 03 tab「电路搭建」原 3D 预览行为一致,数据由父级 props 驱动,视角可旋转/缩放(整块工作区放大由父级板块全屏负责)
// - 交互模式(interactive):在 3D 场景中直接搭建——拖入放置 / 拖动移动 / 点端点接线 / 右键删除 / 双击定位参数
// 组件本身不改数据,全部操作以语义事件上抛,由父组件写 store 后经 props 回流重建
const props = defineProps({
  components: { type: Array, required: true },
  wires: { type: Array, required: true },
  junctions: { type: Array, default: () => [] },
  interactive: { type: Boolean, default: false },
  pendingType: { type: String, default: null },
  headerTitle: { type: String, default: '' },
  headerTip: { type: String, default: '' },
  emptyText: { type: String, default: '' },
})

const emit = defineEmits([
  'place',
  'move',
  'wire',
  'delete-component',
  'delete-wire',
  'focus-component',
  'wire-click',
])

const canvas3dRef = ref(null)
const autoRotate3D = ref(false)

let scene3d = null,
  renderer3d = null,
  camera3d = null,
  controls3d = null
let world3d = null,
  ro3d = null,
  raf3d = 0,
  ready3d = false
let midX3 = 0,
  midZ3 = 0,
  boardR3 = 300,
  lastBoardR3 = 0,
  lastEmpty3d = null
let compGroups = [] // 交互:元件组(userData.kind='comp'),拖动时整体位移
let padMeshes = [] // 交互:端点焊盘(屏幕投影拾取接线)

// === 相机取景:产品展示视角——斜向低角 + 视点抬高至元件群高度,保留台面纵深与顶部背景光晕 ===
// 注意:全部 3D 物件经 ctx.wx/wz 平移到世界原点居中,轨道目标必须固定为原点(不能跟随 midX3/midZ3)
function fitView3D() {
  if (!camera3d || !controls3d) return
  const dir = new THREE.Vector3(0.66, 0.46, 0.84).normalize()
  controls3d.target.set(0, 8, 0)
  const dist = Math.max((boardR3 * 1.0) / Math.tan((camera3d.fov * Math.PI) / 360), 160)
  camera3d.position.copy(controls3d.target).addScaledVector(dir, dist)
  controls3d.update()
}
function reset3DView() {
  fitView3D()
}
function toggle3DRotate() {
  autoRotate3D.value = !autoRotate3D.value
  if (controls3d) controls3d.autoRotate = autoRotate3D.value
}

// === 3D 视角控制:自动旋转 / 复位;整块工作区放大由父级「板块全屏」统一处理(此处不再自带 fixed 层) ===

// === 接线选中态:高亮第一个被点端点,点击第二个端点后上抛 wire 事件 ===
let wireSel = null // { compIndex, epIndex, mesh, origMat }
function clearWireSel() {
  if (!wireSel) return
  const { mesh, origMat } = wireSel
  if (mesh) {
    mesh.material = origMat
    mesh.scale.set(1, 1, 1)
  }
  wireSel = null
}
function handlePadTap(pad) {
  const { compIndex, epIndex } = pad.userData
  if (!wireSel) {
    wireSel = { compIndex, epIndex, mesh: pad, origMat: pad.material }
    pad.material = cmat(0x2563eb, 0.25, 0.35)
    pad.scale.set(1.7, 1.7, 1.7)
    return
  }
  if (wireSel.compIndex === compIndex && wireSel.epIndex === epIndex) {
    clearWireSel() // 再点同一端点=取消
    return
  }
  emit('wire', {
    a: { compIndex: wireSel.compIndex, epIndex: wireSel.epIndex },
    b: { compIndex, epIndex },
  })
  clearWireSel()
}

// === 交互拾取:焊盘用屏幕投影(命中域友好),元件用射线网格,导线用透明粗代理 ===
const raycaster = new THREE.Raycaster()
const pointerNDC = new THREE.Vector2()
const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _hitPoint = new THREE.Vector3()
const _v3 = new THREE.Vector3()

function updatePointerNDC(event) {
  const rect = canvas3dRef.value.getBoundingClientRect()
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}
// 与台面平面(y=0)求交,返回世界坐标交点(拖动/放置落点共用)
function intersectAt(event) {
  if (!camera3d) return null
  updatePointerNDC(event)
  raycaster.setFromCamera(pointerNDC, camera3d)
  // 注意:intersectPlane 是 Ray 的方法(Raycaster 无此方法,误用会抛 TypeError 导致交互中断)
  return raycaster.ray.intersectPlane(boardPlane, _hitPoint)
}
function pickPadScreen(event) {
  if (!camera3d || padMeshes.length === 0) return null
  const rect = canvas3dRef.value.getBoundingClientRect()
  const mx = event.clientX - rect.left
  const my = event.clientY - rect.top
  let best = null
  let bestD = 20 // 像素命中阈值(焊盘较小,适当放宽)
  for (const p of padMeshes) {
    p.getWorldPosition(_v3)
    _v3.project(camera3d)
    const sx = ((_v3.x + 1) / 2) * rect.width
    const sy = ((-_v3.y + 1) / 2) * rect.height
    const d = Math.hypot(sx - mx, sy - my)
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best
}
function pickComponent(event) {
  if (!camera3d || compGroups.length === 0) return null
  updatePointerNDC(event)
  raycaster.setFromCamera(pointerNDC, camera3d)
  const hits = raycaster.intersectObjects(compGroups, true)
  if (hits.length === 0) return null
  // 命中网格回溯到所属元件组
  let o = hits[0].object
  while (o && !(o.userData && o.userData.kind === 'comp')) o = o.parent
  return o
}
function pickWire(event) {
  if (!camera3d || !world3d) return null
  updatePointerNDC(event)
  raycaster.setFromCamera(pointerNDC, camera3d)
  const hits = raycaster.intersectObjects(world3d.children, true)
  for (const h of hits) {
    if (h.object.userData && h.object.userData.kind === 'wire') return h.object
  }
  return null
}

// === 指针交互(仅 interactive):拖动移动 / 点击接线 / 点击摆放 / 双击定位 / 右键删除 ===
let drag = null // { compIndex, group, startX, startZ, origPos, moved }
function onPointerDown(event) {
  if (!props.interactive || !ready3d) return
  if (event.button === 2) return // 右键交给 contextmenu 删除
  if (event.pointerType === 'mouse' && event.button !== 0) return // 鼠标仅左键参与
  // 1) 端点接线优先
  const pad = pickPadScreen(event)
  if (pad) {
    handlePadTap(pad)
    return
  }
  // 2) 元件拖动:命中即锁定视角(捕获阶段先于 OrbitControls 生效)
  const group = pickComponent(event)
  if (group) {
    clearWireSel()
    const hit = intersectAt(event)
    drag = {
      compIndex: group.userData.compIndex,
      group,
      startX: hit ? hit.x : 0,
      startZ: hit ? hit.z : 0,
      origPos: group.position.clone(),
      moved: false,
    }
    if (controls3d) controls3d.enabled = false
    try {
      canvas3dRef.value.setPointerCapture(event.pointerId)
    } catch (err) {
      /* 忽略不支持指针捕获的环境 */
    }
    return
  }
  // 3) 空白:有待放置类型则点击摆放;否则尝试拾取导线(上抛 wire-click);最后取消接线选中
  if (props.pendingType) {
    const hit = intersectAt(event)
    if (hit) emit('place', { type: props.pendingType, x: hit.x + midX3, y: hit.z + midZ3 })
    return
  }
  // 尝试拾取导线:点击导线展示阻尼/波形
  const hitWire = pickWire(event)
  if (hitWire) {
    emit('wire-click', hitWire.userData.wireIndex)
    return
  }
  clearWireSel()
}
function onPointerMove(event) {
  if (!drag) return
  const hit = intersectAt(event)
  if (!hit) return
  const dx = hit.x - drag.startX
  const dz = hit.z - drag.startZ
  if (!drag.moved && Math.hypot(dx, dz) > 2) drag.moved = true
  // 拖动中仅移动元件组(焊盘随组),导线暂留原位,松手后数据更新全量重建吸附
  drag.group.position.set(drag.origPos.x + dx, drag.origPos.y, drag.origPos.z + dz)
}
function onPointerUp() {
  if (!drag) return
  const d = drag
  drag = null
  if (controls3d) controls3d.enabled = true
  if (!d.moved) return
  const c = props.components[d.compIndex]
  if (!c) return
  // 世界位移 1:1 换算回电路坐标(与 ctx.wx/wz 的平移映射一致)
  const ndx = d.group.position.x - d.origPos.x
  const ndz = d.group.position.z - d.origPos.z
  emit('move', { index: d.compIndex, x: c.x + ndx, y: c.y + ndz })
}
function onDblClick(event) {
  if (!props.interactive || !ready3d) return
  const group = pickComponent(event)
  if (group) emit('focus-component', group.userData.compIndex)
}
function onContextMenu(event) {
  if (!props.interactive || !ready3d) return
  event.preventDefault()
  const group = pickComponent(event)
  if (group) {
    emit('delete-component', group.userData.compIndex)
    return
  }
  const wire = pickWire(event)
  if (wire) emit('delete-wire', wire.userData.wireIndex)
}
// HTML5 从元件库拖入:程序性放置(触摸端由父组件「点选后点台面」兜底)
function onDragOver(event) {
  if (!props.interactive) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}
function onDrop(event) {
  if (!props.interactive) return
  event.preventDefault()
  const type = event.dataTransfer.getData('componentType')
  if (!type) return
  const hit = intersectAt(event)
  if (!hit) return
  emit('place', { type, x: hit.x + midX3, y: hit.z + midZ3 })
}

// 整组重建:清理几何并移除旧组
function clearWorld() {
  if (!world3d) return
  world3d.traverse((n) => n.geometry && n.geometry.dispose())
  scene3d.remove(world3d)
  world3d = new THREE.Group()
  scene3d.add(world3d)
}
// 重建整个 3D 场景(与电路数据同步)
function drawCircuit3D() {
  if (!ready3d) return
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity
  const feed = (p) => {
    if (!p) return
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  for (const c of props.components) for (const ep of c.endpoints) feed(ep)
  for (const w of props.wires) {
    if (w.points && w.points.length > 0) for (const p of w.points) feed(p)
    else {
      feed({ x: w.x1, y: w.y1 })
      feed({ x: w.x2, y: w.y2 })
    }
  }
  for (const j of props.junctions) feed(j)
  const has = props.components.length > 0
  if (!has) {
    minX = -150
    maxX = 150
    minY = -100
    maxY = 100
  }
  const spanX = Math.max(maxX - minX, 60)
  const spanY = Math.max(maxY - minY, 60)
  midX3 = (minX + maxX) / 2
  midZ3 = (minY + maxY) / 2
  boardR3 = Math.hypot(spanX, spanY) / 2 + 100
  clearWireSel() // 重建后旧焊盘已释放,选中高亮随之清除
  clearWorld()
  addBoard(world3d, boardR3)
  compGroups = []
  padMeshes = []
  if (has) {
    const ctx = { wx: (x) => x - midX3, wz: (y) => y - midZ3 }
    addRoutes(world3d, props.wires, ctx, props.interactive)
    addJunctions(world3d, props.junctions, ctx)
    for (let ci = 0; ci < props.components.length; ci++) {
      const c = props.components[ci]
      const group = new THREE.Group()
      group.userData = { kind: 'comp', compIndex: ci }
      buildComponentModel(group, c, ctx)
      padMeshes.push(...addPads(group, [c], ctx, ci))
      world3d.add(group)
      compGroups.push(group)
    }
  }
  // 首次渲染 / 空态↔内容切换 / 视野扩张过大时,复位视角
  if (!lastBoardR3 || lastEmpty3d !== has || boardR3 > lastBoardR3 * 1.5) {
    fitView3D()
  }
  // 光照投影:仅活动元件投影(静态台面不参与 cast,避免转动时阴影边缘抖动/闪烁;拾取代理不投影)
  world3d.traverse((n) => {
    if (!n.isMesh) return
    if (n.name !== 'static-bench' && n.name !== 'pick-proxy') n.castShadow = true
    if (n.position.y <= 0) n.receiveShadow = true
  })
  lastBoardR3 = boardR3
  lastEmpty3d = has
  if (controls3d) controls3d.autoRotate = autoRotate3D.value && has
}

// === Three.js 场景初始化 / 自适应 / 动画循环 ===
function init3D() {
  const canvas = canvas3dRef.value
  if (!canvas || ready3d) return
  try {
    scene3d = new THREE.Scene()
    scene3d.add(new THREE.HemisphereLight(0xffffff, 0x9db8e8, 1.05))
    const key = new THREE.DirectionalLight(0xffffff, 2.0)
    key.position.set(200, 420, 150)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.near = 50
    key.shadow.camera.far = 4000
    key.shadow.bias = -0.0004
    // 正交阴影相机范围需盖住整块底板(底板随电路跨度动态伸缩)
    const sd = 1200
    key.shadow.camera.left = -sd
    key.shadow.camera.right = sd
    key.shadow.camera.top = sd
    key.shadow.camera.bottom = -sd
    scene3d.add(key)
    const fill = new THREE.DirectionalLight(0xe4edfb, 0.7)
    fill.position.set(-220, 120, -190)
    scene3d.add(fill)
    const rim = new THREE.DirectionalLight(0xffffff, 0.5)
    rim.position.set(60, 160, -320)
    scene3d.add(rim)
    renderer3d = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    // 程序化环境反射(RoomEnvironment):金属端帽/铜线/包边呈现真实高光;强度调低避免漫反射冲淡台面
    try {
      const pmrem = new THREE.PMREMGenerator(renderer3d)
      scene3d.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      scene3d.environmentIntensity = 0.42
      pmrem.dispose()
    } catch (err) {
      console.error('[3D] 环境反射生成失败(不影响主场景):', err)
    }
    // 背景透明由 CSS 渐变底色呈现(见模板 class),配合柔和阴影提升立体质感
    renderer3d.setClearColor(0x000000, 0)
    renderer3d.shadowMap.enabled = true
    renderer3d.shadowMap.type = THREE.PCFSoftShadowMap
    renderer3d.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer3d.toneMapping = THREE.ACESFilmicToneMapping
    renderer3d.toneMappingExposure = 1.1
    camera3d = new THREE.PerspectiveCamera(38, 1, 1, 6000)
    camera3d.position.set(500, 400, 650)
    controls3d = new OrbitControls(camera3d, canvas)
    controls3d.enableDamping = true
    controls3d.dampingFactor = 0.08
    controls3d.minDistance = 150
    controls3d.maxDistance = 3000
    // 禁止相机转到桌面以下(防止穿模导致桌面闪烁)
    controls3d.maxPolarAngle = Math.PI / 2 - 0.04
    controls3d.addEventListener('start', () => {
      if (controls3d.autoRotate) {
        autoRotate3D.value = false
        controls3d.autoRotate = false
      }
    })
    world3d = new THREE.Group()
    scene3d.add(world3d)
    ro3d = new ResizeObserver(() => resize3D())
    // 观察 3D 画布自身:放大/退出切换会改变画布 CSS 尺寸,需实时同步渲染缓冲
    ro3d.observe(canvas)
  } catch (err) {
    console.error('[3D] WebGL 初始化失败:', err)
    fallback3D()
    ready3d = false
    return
  }
  ready3d = true
  resize3D()
  try {
    drawCircuit3D()
  } catch (err) {
    console.error('[3D] 场景构建异常:', err)
  }
  const loop = () => {
    raf3d = requestAnimationFrame(loop)
    controls3d.update()
    try {
      renderer3d.render(scene3d, camera3d)
    } catch (err) {
      console.error('[3D] 渲染异常:', err)
    }
  }
  loop()
}
// WebGL 不可用时的降级画面(主题色网格 + 提示文字,保证 3D 区域不空白)
function fallback3D() {
  const canvas = canvas3dRef.value
  if (!canvas) return
  const ct = canvasTheme()
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)
  ctx.strokeStyle = ct.grid
  ctx.lineWidth = 1
  for (let x = 40; x < rect.width; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, rect.height)
    ctx.stroke()
  }
  for (let y = 40; y < rect.height; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(rect.width, y)
    ctx.stroke()
  }
  ctx.fillStyle = ct.label
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('当前环境不支持 WebGL,3D 实体预览不可用', rect.width / 2, rect.height / 2)
}
// 主题切换:WebGL 不可用的降级画面需按新配色重绘(WebGL 场景背景透明,由 CSS 渐变兜底)
function onThemeChange3D() {
  if (!ready3d) fallback3D()
}
function resize3D() {
  const el = canvas3dRef.value
  if (!el || !renderer3d) return
  const w = el.clientWidth
  const h = el.clientHeight
  if (!w || !h) return
  // updateStyle=false:canvas 的 CSS 尺寸完全交给样式类(常规 h-[...] / 放大 100% 切换),
  // 否则 setSize 写入的行内像素会覆盖放大退出后恢复的高度类,画布无法缩回
  renderer3d.setSize(w, h, false)
  camera3d.aspect = w / h
  camera3d.updateProjectionMatrix()
}
function dispose3D() {
  cancelAnimationFrame(raf3d)
  if (ro3d) ro3d.disconnect()
  if (controls3d) controls3d.dispose()
  if (scene3d) clearWorld()
  if (renderer3d) renderer3d.dispose()
  ready3d = false
}

onMounted(() => {
  init3D()
  window.addEventListener('themechange', onThemeChange3D)
})

onBeforeUnmount(() => {
  window.removeEventListener('themechange', onThemeChange3D)
  drag = null
  dispose3D()
})

watch([() => props.components, () => props.wires, () => props.junctions], () => {
  try {
    drawCircuit3D()
  } catch (err) {
    console.error('[3D] 重建失败:', err)
  }
})
</script>

<style scoped>
/* 整体竖向布局:工具栏在上、画布在下(板块全屏由父级容器负责,此处只负责自身画布与视图工具栏) */
.c3d {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ===== 工具栏(常驻)=====
   操作按钮右对齐;常显使首次拖入元件时画布尺寸不变(不因按钮出现而挤压) */
.c3d-bar {
  display: flex;
  align-items: center;
  gap: 6px 12px;
  flex-wrap: wrap;
}
.c3d-bar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.c3d-bar-tip {
  flex: 1 1 120px;
  min-width: 0;
  font-size: 11px;
  color: var(--faint);
}
.c3d-bar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ===== 画布舞台 ===== */
.c3d-stage-area {
  position: relative;
}
.c3d-stage {
  display: block;
  width: 100%;
  height: 300px;
  border-radius: 8px;
  touch-action: none;
  cursor: grab;
  background: linear-gradient(to bottom, #eef4fc, #e2ecf8 55%, #c0d4ee);
  box-shadow: 0 16px 36px -18px rgba(37, 99, 235, 0.45);
}
.c3d-stage:active {
  cursor: grabbing;
}
@media (min-width: 640px) {
  .c3d-stage {
    height: 400px;
  }
}
@media (min-width: 1024px) {
  .c3d-stage {
    height: 460px;
  }
}
@media (min-width: 1280px) {
  .c3d-stage {
    height: 540px;
  }
}
.c3d-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  pointer-events: none;
  user-select: none;
}
</style>
