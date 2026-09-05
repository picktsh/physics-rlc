<template>
  <div class="card">
    <!-- 三栏布局(桌面):左=2D 元件库(竖排) / 中=2D+3D 画布 / 右=元件参数与公差;窄屏自动退化为单列上下堆叠 -->
    <div class="lg:grid lg:grid-cols-[136px_minmax(0,1fr)_228px] lg:gap-4">
    <div class="components-palette flex gap-2 mb-3 flex-wrap justify-center lg:flex-col lg:flex-nowrap lg:justify-start lg:mb-0">
      <div
        v-for="comp in componentTypes"
        :key="comp.type"
        draggable="true"
        @dragstart="handleDragStart($event, comp.type)"
        @click="selectPaletteComponent(comp.type)"
        :class="['component-item flex flex-col items-center justify-center gap-1.5 p-2 border border-gray-200 rounded-xl cursor-pointer text-xs text-gray-600 transition-all lg:flex-1', pendingPlaceType === comp.type ? 'bg-blue-50 ring-2 ring-[#3b82f6]' : 'bg-white hover:bg-gray-100 hover:border-gray-300']"
      >
        <!-- 2D 平面元件符号(教科书电路图样式) -->
        <svg v-if="comp.type === 'R'" viewBox="0 0 48 32" class="w-14 h-10" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="16" x2="10" y2="16" />
          <rect x="10" y="6" width="28" height="20" />
          <line x1="38" y1="16" x2="44" y2="16" />
        </svg>
        <svg v-else-if="comp.type === 'L'" viewBox="0 0 48 32" class="w-14 h-10" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="16" x2="10" y2="16" />
          <path d="M10 16a4 4 0 0 1 8 0a4 4 0 0 1 8 0a4 4 0 0 1 8 0" />
          <line x1="34" y1="16" x2="44" y2="16" />
        </svg>
        <svg v-else-if="comp.type === 'C'" viewBox="0 0 48 32" class="w-14 h-10" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round">
          <line x1="4" y1="16" x2="22" y2="16" />
          <line x1="22" y1="6" x2="22" y2="26" />
          <line x1="26" y1="6" x2="26" y2="26" />
          <line x1="26" y1="16" x2="44" y2="16" />
        </svg>
        <svg v-else viewBox="0 0 48 32" class="w-14 h-10" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="16" x2="12" y2="16" />
          <circle cx="24" cy="16" r="12" />
          <path d="M17 16q3.5-8 7 0t7 0" />
          <line x1="36" y1="16" x2="44" y2="16" />
        </svg>
        <span>{{ comp.name }}</span>
      </div>
    </div>

    <!-- 中栏:2D 画布 + 3D 实体模型 -->
    <div class="min-w-0">
    <div class="circuit-controls flex gap-2 mb-2 flex-wrap">
      <button
        :class="['px-2.5 md:px-3 py-1.5 md:py-2 border-2 border-gray-300 rounded-lg text-xs md:text-sm cursor-pointer transition-all', circuitMode === 'wire' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white']"
        @click="setCircuitMode('wire')"
      >
        🔗 接线
      </button>
      <button
        :class="['px-2.5 md:px-3 py-1.5 md:py-2 border-2 border-gray-300 rounded-lg text-xs md:text-sm cursor-pointer transition-all', circuitMode === 'delete' ? 'bg-red-500 text-white border-red-500' : 'bg-white']"
        @click="setCircuitMode('delete')"
      >
        🗑️ 删除
      </button>
      <button class="ml-auto px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-semibold shadow-sm transition-all" @click="$emit('simulate')">
        🚀 仿真
      </button>
      <button class="px-3 md:px-4 py-1.5 md:py-2 bg-gray-200 text-gray-600 rounded-lg text-xs md:text-sm hover:bg-gray-300 transition-all" @click="$emit('reset')">
        🔄 清空
      </button>
    </div>

    <canvas
      ref="canvasRef"
      class="w-full h-[200px] sm:h-[240px] md:h-[280px] border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 cursor-crosshair touch-none"
      @drop="handleDrop"
      @dragover="allowDrop"
      @mousedown="handlePointerDown"
      @mousemove="handlePointerMove"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    />

    <div class="text-xs text-gray-500 text-center mt-2">
      拖拽元件到画布上搭建RLC电路 | 点击元件可编辑参数 | 接线模式: 点击端点→点击添加拐点→点击目标端点完成折线 | 💡 点击导线中间可创建节点实现并联 | 删除模式: 点击元件/导线删除
    </div>

    <!-- 3D 实体模型(Three.js 真 3D,与上方 2D 电路实时同步) -->
    <div class="mt-3">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs sm:text-sm font-semibold text-gray-700">🧊 3D 实体模型</span>
        <span class="text-[11px] text-gray-400">🖱 拖拽旋转 · 滚轮缩放 · 自动同步上方 2D 布局</span>
      </div>
      <div class="relative">
        <canvas
          ref="canvas3dRef"
          class="w-full h-[300px] sm:h-[400px] lg:h-[460px] xl:h-[540px] rounded-xl bg-gradient-to-b from-[#eef4fc] via-[#e2ecf8] to-[#c0d4ee] touch-none cursor-grab active:cursor-grabbing shadow-[0_16px_36px_-18px_rgba(37,99,235,0.45)]"
        />
        <div
          v-if="components.length > 0"
          class="absolute right-2 bottom-2 flex gap-1.5 z-10"
        >
          <button
            class="px-2 py-1 bg-white/90 hover:bg-white text-[11px] text-[#1d4ed8] rounded-md border border-[#c7d8f5] shadow-sm transition-colors"
            @click="reset3DView"
          >
            🎯 复位视角
          </button>
          <button
            class="px-2 py-1 bg-white/90 hover:bg-white text-[11px] text-[#1d4ed8] rounded-md border border-[#c7d8f5] shadow-sm transition-colors"
            @click="toggle3DRotate"
          >
            {{ autoRotate3D ? '⏸ 停止旋转' : '▶ 自动旋转' }}
          </button>
        </div>
        <div
          v-if="components.length === 0"
          class="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none select-none"
        >
          <span class="text-gray-300 text-3xl leading-none">🧊</span>
          <span class="text-xs text-gray-400">先在 2D 画布拖入元件并接线,此处自动生成 3D 实体模型</span>
        </div>
      </div>
    </div>
    </div>

    <!-- 右栏:元件参数编辑 + 公差设置 -->
    <div class="min-w-0">
    <!-- 元件参数编辑器 -->
    <div v-if="components.length > 0" class="mt-3">
      <div class="text-xs sm:text-sm font-semibold text-gray-700 mb-2">📝 元件参数编辑</div>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-1 gap-2">
        <div v-for="(comp, idx) in components" :key="idx" :class="['p-2 rounded-lg', selectedComponentIndex === idx ? 'border-2 border-blue-500' : '']">
          <label class="text-xs text-gray-600">{{ getComponentLabel(comp.type) }} #{{ idx + 1 }}</label>
          <div class="flex gap-1 items-center mt-1">
            <input
              type="number"
              step="any"
              :value="getCompDisplay(idx)"
              @input="onCompInput(idx, $event)"
              @blur="onCompBlur(idx)"
              class="w-full min-w-0 px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
            <span class="text-xs text-gray-500 whitespace-nowrap">{{ getComponentUnit(comp.type) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 元件公差设置 -->
    <div class="mt-3 p-3 bg-gray-50 rounded-lg">
      <div class="flex items-center gap-3 mb-2">
        <div class="text-xs sm:text-sm font-semibold text-gray-700">📐 元件公差</div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" v-model="toleranceEnabled" class="sr-only peer" @change="onToleranceToggle" />
          <div class="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
        </label>
        <span class="text-xs text-gray-500">{{ toleranceEnabled ? '已开启' : '已关闭' }}</span>
      </div>
      <div v-if="toleranceEnabled" class="flex items-center gap-3">
        <span class="text-xs text-gray-600 whitespace-nowrap">公差范围：</span>
        <input type="range" min="1" max="20" step="0.5" v-model.number="tolerancePercent" class="flex-1 cursor-pointer" @input="onToleranceChange" />
        <span class="text-xs font-semibold text-blue-600 min-w-[40px] text-right">±{{ tolerancePercent.toFixed(1) }}%</span>
      </div>
      <div v-if="toleranceEnabled" class="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">
        💡 开启后每次仿真实物参数将在标称值的 ±{{ tolerancePercent.toFixed(1) }}% 范围内随机波动
      </div>
    </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { useRLCCalculatorStore } from '../stores/rlcCalculator'

const calcStore = useRLCCalculatorStore()

const toleranceEnabled = ref(calcStore.toleranceEnabled)
const tolerancePercent = ref(calcStore.tolerancePercent)

function onToleranceToggle() {
  calcStore.toleranceEnabled = toleranceEnabled.value
  if (toleranceEnabled.value) {
    calcStore.tolerancePercent = tolerancePercent.value
  }
}

function onToleranceChange() {
  calcStore.tolerancePercent = tolerancePercent.value
}

const props = defineProps({
  components: {
    type: Array,
    required: true,
  },
  wires: {
    type: Array,
    required: true,
  },
  junctions: {
    type: Array,
    default: () => [],
  },
  mode: {
    type: String,
    default: 'wire',
  },
})

const emit = defineEmits(['update:components', 'update:wires', 'update:junctions', 'update:mode', 'simulate', 'reset'])

const canvasRef = ref(null)
const canvas3dRef = ref(null)
const autoRotate3D = ref(false)
const circuitMode = ref(props.mode)
const selectedEndpoint = ref(null) // { compIndex, epIndex } or { junctionIndex }
const wireIntermediatePoints = ref([])
const selectedComponentIndex = ref(null)
const pendingPlaceType = ref(null) // 移动端：点击元件面板后等待放置的类型

// 元件输入编辑状态（解决输入小数时 parseFloat 吞掉中间状态的问题）
const compInputValues = ref({})

function getCompDisplay(idx) {
  if (idx in compInputValues.value) return compInputValues.value[idx]
  return props.components[idx]?.value ?? ''
}

function onCompInput(idx, event) {
  compInputValues.value[idx] = event.target.value
}

function onCompBlur(idx) {
  const raw = compInputValues.value[idx]
  if (raw !== undefined) {
    const num = parseFloat(raw)
    if (!isNaN(num)) {
      const newComponents = [...props.components]
      newComponents[idx].value = num
      emit('update:components', newComponents)
    }
    delete compInputValues.value[idx]
  }
}

const componentTypes = [
  { type: 'R', name: '电阻' },
  { type: 'L', name: '电感' },
  { type: 'C', name: '电容' },
  { type: 'V', name: '信号源' },
]

function handleDragStart(event, type) {
  event.dataTransfer.setData('componentType', type)
}

// 移动端：点击元件面板选中，再点击画布放置
function selectPaletteComponent(type) {
  if (pendingPlaceType.value === type) {
    pendingPlaceType.value = null // 取消选中
  } else {
    pendingPlaceType.value = type
  }
}

function placeComponentAt(x, y) {
  const type = pendingPlaceType.value
  if (!type) return false
  const defaultValues = { R: 100, L: 100, C: 0.05, V: 0.9 }
  const newComp = {
    type,
    x,
    y,
    id: Date.now() + Math.random(),
    value: defaultValues[type] || 0,
    endpoints: [
      { x: x - 30, y, id: Date.now() + Math.random(), side: 'left' },
      { x: x + 30, y, id: Date.now() + Math.random() + 1, side: 'right' },
    ],
  }
  emit('update:components', [...props.components, newComp])
  pendingPlaceType.value = null
  drawCircuit()
  return true
}

function allowDrop(event) {
  event.preventDefault()
}

function handleDrop(event) {
  event.preventDefault()
  const type = event.dataTransfer.getData('componentType')
  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const defaultValues = { R: 100, L: 100, C: 0.05, V: 0.9 }
  const newComp = {
    type,
    x,
    y,
    id: Date.now() + Math.random(),
    value: defaultValues[type] || 0,
    endpoints: [
      { x: x - 30, y, id: Date.now() + Math.random(), side: 'left' },
      { x: x + 30, y, id: Date.now() + Math.random() + 1, side: 'right' },
    ],
  }

  const newComponents = [...props.components, newComp]
  emit('update:components', newComponents)
  drawCircuit()
}

function setCircuitMode(mode) {
  circuitMode.value = mode
  emit('update:mode', mode)
  selectedEndpoint.value = null
  wireIntermediatePoints.value = []
  drawCircuit()
}

function handleCanvasClick(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  if (circuitMode.value === 'wire') {
    // 检测端点点击
    let clickedEp = null
    for (let i = 0; i < props.components.length; i++) {
      for (let j = 0; j < props.components[i].endpoints.length; j++) {
        const ep = props.components[i].endpoints[j]
        if (Math.sqrt((x - ep.x) ** 2 + (y - ep.y) ** 2) < 15) {
          clickedEp = { compIndex: i, epIndex: j }
          break
        }
      }
      if (clickedEp) break
    }

    // 检测junction节点点击
    let clickedJunction = null
    if (!clickedEp) {
      for (let ji = 0; ji < props.junctions.length; ji++) {
        const j = props.junctions[ji]
        if (Math.sqrt((x - j.x) ** 2 + (y - j.y) ** 2) < 12) {
          clickedJunction = { junctionIndex: ji }
          break
        }
      }
    }

    if (clickedEp || clickedJunction) {
      const clicked = clickedEp || clickedJunction
      if (selectedEndpoint.value === null) {
        selectedEndpoint.value = clicked
        wireIntermediatePoints.value = []
      } else if (!isSameEndpoint(selectedEndpoint.value, clicked)) {
        // 创建导线
        const pt1 = getEndpointPos(selectedEndpoint.value)
        const pt2 = getEndpointPos(clicked)
        const pts = [pt1, ...wireIntermediatePoints.value, pt2]
        const newWires = [
          ...props.wires,
          {
            x1: pt1.x, y1: pt1.y, x2: pt2.x, y2: pt2.y,
            points: pts,
            comp1: selectedEndpoint.value.compIndex ?? -1,
            comp2: clicked.compIndex ?? -1,
            junc1: selectedEndpoint.value.junctionIndex ?? -1,
            junc2: clicked.junctionIndex ?? -1,
          },
        ]
        emit('update:wires', newWires)
        selectedEndpoint.value = null
        wireIntermediatePoints.value = []
      } else {
        selectedEndpoint.value = null
        wireIntermediatePoints.value = []
      }
      drawCircuit()
      return
    }

    // 检测点击导线中间 → 创建junction节点
    if (selectedEndpoint.value === null) {
      const hitWire = findNearestWire(x, y)
      if (hitWire !== null) {
        // 在点击位置创建junction
        const projPt = projectPointOnWire(x, y, hitWire)
        const newJunction = { x: projPt.x, y: projPt.y, id: Date.now() + Math.random() }
        const newJunctions = [...props.junctions, newJunction]
        emit('update:junctions', newJunctions)

        // 拆分原导线为两段：原起点→junction, junction→原终点
        const wire = props.wires[hitWire]
        const newWires = props.wires.filter((_, idx) => idx !== hitWire)
        const jIdx = newJunctions.length - 1
        newWires.push(
          { x1: wire.x1, y1: wire.y1, x2: projPt.x, y2: projPt.y, points: [getWireStart(wire), projPt], comp1: wire.comp1, comp2: -1, junc1: wire.junc1 ?? -1, junc2: jIdx },
          { x1: projPt.x, y1: projPt.y, x2: wire.x2, y2: wire.y2, points: [projPt, getWireEnd(wire)], comp1: -1, comp2: wire.comp2, junc1: jIdx, junc2: wire.junc2 ?? -1 },
        )
        emit('update:wires', newWires)
        drawCircuit()
        return
      }
    }

    // 添加折线拐点
    if (selectedEndpoint.value !== null) {
      wireIntermediatePoints.value.push({ x, y })
      drawCircuit()
      return
    }

    // 检测元件点击
    for (let i = 0; i < props.components.length; i++) {
      if (Math.sqrt((x - props.components[i].x) ** 2 + (y - props.components[i].y) ** 2) < 30) {
        selectedComponentIndex.value = i
        drawCircuit()
        return
      }
    }

    selectedComponentIndex.value = null
    selectedEndpoint.value = null
    wireIntermediatePoints.value = []
    drawCircuit()
  } else {
    // 删除模式
    for (let i = props.components.length - 1; i >= 0; i--) {
      const comp = props.components[i]
      if (Math.sqrt((x - comp.x) ** 2 + (y - comp.y) ** 2) < 40) {
        const newComponents = props.components.filter((_, idx) => idx !== i)
        const newWires = props.wires.filter(w => w.comp1 !== i && w.comp2 !== i)
        emit('update:components', newComponents)
        emit('update:wires', newWires)
        if (selectedComponentIndex.value === i) selectedComponentIndex.value = null
        else if (selectedComponentIndex.value > i) selectedComponentIndex.value--
        drawCircuit()
        return
      }
    }

    // 删除导线
    for (let i = props.wires.length - 1; i >= 0; i--) {
      const wire = props.wires[i]
      let minDist = Infinity
      if (wire.points && wire.points.length > 2) {
        for (let k = 0; k < wire.points.length - 1; k++) {
          const d = pointToLineDistance(x, y, wire.points[k].x, wire.points[k].y, wire.points[k + 1].x, wire.points[k + 1].y)
          if (d < minDist) minDist = d
        }
      } else {
        minDist = pointToLineDistance(x, y, wire.x1, wire.y1, wire.x2, wire.y2)
      }
      if (minDist < 8) {
        const newWires = props.wires.filter((_, idx) => idx !== i)
        emit('update:wires', newWires)
        drawCircuit()
        return
      }
    }
  }
}

// === 统一指针事件处理（兼容 PC 鼠标和移动端触摸）===
function getCanvasCoords(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  const clientX = event.touches ? event.touches[0].clientX : event.clientX
  const clientY = event.touches ? event.touches[0].clientY : event.clientY
  return { x: clientX - rect.left, y: clientY - rect.top }
}

function handlePointerDown(event) {
  // PC端：如果有待放置的元件，先放置
  if (pendingPlaceType.value) {
    const { x, y } = getCanvasCoords(event)
    if (placeComponentAt(x, y)) return
  }
  handleCanvasClick(event)
}

function handlePointerMove(event) {
  if (circuitMode.value === 'wire' && selectedEndpoint.value !== null) {
    drawCircuit()
    const ctx = canvasRef.value.getContext('2d')
    const { x, y } = getCanvasCoords(event)
    const ep = getEndpointPos(selectedEndpoint.value)

    ctx.strokeStyle = 'rgba(14, 141, 156, 0.45)'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(ep.x, ep.y)
    for (const pt of wireIntermediatePoints.value) ctx.lineTo(pt.x, pt.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.setLineDash([])

    for (const pt of wireIntermediatePoints.value) {
      ctx.fillStyle = 'rgba(14, 141, 156, 0.55)'
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI)
      ctx.fill()
    }
  }
}

// === 触摸事件桥接 ===
let touchStartTime = 0
let touchMoved = false

function handleTouchStart(event) {
  touchStartTime = Date.now()
  touchMoved = false
  // 如果有待放置元件，在 touchend 时处理
  if (pendingPlaceType.value) return
  // 接线模式下预览线跟随手指
  if (circuitMode.value === 'wire' && selectedEndpoint.value !== null) {
    event.preventDefault()
  }
}

function handleTouchMove(event) {
  touchMoved = true
  if (circuitMode.value === 'wire' && selectedEndpoint.value !== null) {
    event.preventDefault() // 防止页面滚动
    handlePointerMove(event)
  }
}

function handleTouchEnd(event) {
  // 模拟 click：短按且未移动
  const elapsed = Date.now() - touchStartTime
  if (elapsed < 300 && !touchMoved) {
    // 使用 changedTouches 获取最终坐标
    const rect = canvasRef.value.getBoundingClientRect()
    const touch = event.changedTouches[0]
    const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY }

    if (pendingPlaceType.value) {
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      placeComponentAt(x, y)
    } else {
      handleCanvasClick(fakeEvent)
    }
  }
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1
  const dot = A * C + B * D
  const len_sq = C * C + D * D
  let param = -1
  if (len_sq !== 0) param = dot / len_sq
  let xx, yy
  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }
  return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2)
}

// === Junction 辅助函数 ===
function isSameEndpoint(a, b) {
  if (a.junctionIndex !== undefined && b.junctionIndex !== undefined) return a.junctionIndex === b.junctionIndex
  if (a.compIndex !== undefined && b.compIndex !== undefined) return a.compIndex === b.compIndex && a.epIndex === b.epIndex
  return false
}

function getEndpointPos(ep) {
  if (ep.junctionIndex !== undefined && ep.junctionIndex >= 0) {
    return props.junctions[ep.junctionIndex]
  }
  return props.components[ep.compIndex].endpoints[ep.epIndex]
}

function findNearestWire(x, y) {
  let bestIdx = null, bestDist = 10 // 10px threshold
  for (let i = 0; i < props.wires.length; i++) {
    const wire = props.wires[i]
    let minD = Infinity
    if (wire.points && wire.points.length > 1) {
      for (let k = 0; k < wire.points.length - 1; k++) {
        const d = pointToLineDistance(x, y, wire.points[k].x, wire.points[k].y, wire.points[k + 1].x, wire.points[k + 1].y)
        if (d < minD) minD = d
      }
    } else {
      minD = pointToLineDistance(x, y, wire.x1, wire.y1, wire.x2, wire.y2)
    }
    if (minD < bestDist) {
      bestDist = minD
      bestIdx = i
    }
  }
  return bestIdx
}

function projectPointOnWire(px, py, wireIdx) {
  const wire = props.wires[wireIdx]
  let bestX, bestY, bestDist = Infinity
  const segments = []
  if (wire.points && wire.points.length > 1) {
    for (let k = 0; k < wire.points.length - 1; k++) {
      segments.push([wire.points[k], wire.points[k + 1]])
    }
  } else {
    segments.push([{ x: wire.x1, y: wire.y1 }, { x: wire.x2, y: wire.y2 }])
  }
  for (const [p1, p2] of segments) {
    const A = px - p1.x, B = py - p1.y
    const C = p2.x - p1.x, D = p2.y - p1.y
    const dot = A * C + B * D
    const len_sq = C * C + D * D
    let param = len_sq !== 0 ? dot / len_sq : 0
    param = Math.max(0, Math.min(1, param))
    const xx = p1.x + param * C
    const yy = p1.y + param * D
    const d = Math.sqrt((px - xx) ** 2 + (py - yy) ** 2)
    if (d < bestDist) {
      bestDist = d
      bestX = xx
      bestY = yy
    }
  }
  return { x: bestX, y: bestY }
}

function getWireStart(wire) {
  if (wire.points && wire.points.length > 0) return wire.points[0]
  return { x: wire.x1, y: wire.y1 }
}

function getWireEnd(wire) {
  if (wire.points && wire.points.length > 0) return wire.points[wire.points.length - 1]
  return { x: wire.x2, y: wire.y2 }
}

function drawCircuit() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, rect.width, rect.height)

  // 绘制导线(墨色细线)
  ctx.strokeStyle = '#2563eb'
  ctx.lineWidth = 2
  for (const wire of props.wires) {
    ctx.beginPath()
    if (wire.points && wire.points.length > 2) {
      ctx.moveTo(wire.points[0].x, wire.points[0].y)
      for (let k = 1; k < wire.points.length; k++) ctx.lineTo(wire.points[k].x, wire.points[k].y)
    } else {
      ctx.moveTo(wire.x1, wire.y1)
      ctx.lineTo(wire.x2, wire.y2)
    }
    ctx.stroke()
  }

  // 绘制元件(教科书 2D 平面符号:墨色细线)
  for (let i = 0; i < props.components.length; i++) {
    const comp = props.components[i]
    ctx.save()
    ctx.translate(comp.x, comp.y)
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2

    if (comp.type === 'R') {
      // 电阻:两端引线 + 平面矩形
      ctx.beginPath()
      ctx.moveTo(-30, 0)
      ctx.lineTo(-18, 0)
      ctx.moveTo(18, 0)
      ctx.lineTo(30, 0)
      ctx.stroke()
      ctx.strokeRect(-18, -9, 36, 18)
      ctx.fillStyle = '#1c2534'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('R', 0, 4)
    } else if (comp.type === 'L') {
      // 电感:两端引线 + 拱形线圈
      ctx.beginPath()
      ctx.moveTo(-30, 0)
      ctx.lineTo(-16, 0)
      for (let b = 0; b < 4; b++) {
        const bx = -16 + b * 8
        ctx.arc(bx, 0, 4, Math.PI, 0, false)
      }
      ctx.lineTo(30, 0)
      ctx.stroke()
      ctx.fillStyle = '#1c2534'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('L', 0, -10)
    } else if (comp.type === 'C') {
      // 电容:两端引线 + 平行板
      ctx.beginPath()
      ctx.moveTo(-30, 0)
      ctx.lineTo(-4, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-4, -12)
      ctx.lineTo(-4, 12)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(4, -12)
      ctx.lineTo(4, 12)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(4, 0)
      ctx.lineTo(30, 0)
      ctx.stroke()
      ctx.fillStyle = '#1c2534'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('C', 0, -19)
    } else if (comp.type === 'V') {
      // 交流电压源:两端引线 + 圆环内正弦波
      ctx.beginPath()
      ctx.moveTo(-30, 0)
      ctx.lineTo(-16, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, 16, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-8, 0)
      ctx.quadraticCurveTo(-4, -8, 0, 0)
      ctx.quadraticCurveTo(4, 8, 8, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(16, 0)
      ctx.lineTo(30, 0)
      ctx.stroke()
      ctx.fillStyle = '#1c2534'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('V', 0, -24)
    }

    ctx.restore()

    // 绘制端点(中空接线环)
    for (let j = 0; j < comp.endpoints.length; j++) {
      const ep = comp.endpoints[j]
      const isSelected = selectedEndpoint.value && selectedEndpoint.value.compIndex === i && selectedEndpoint.value.epIndex === j
      ctx.fillStyle = isSelected ? '#2563eb' : '#9fb2d1'
      ctx.beginPath()
      ctx.arc(ep.x, ep.y, 6.5, 0, 2 * Math.PI)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(ep.x, ep.y, 3, 0, 2 * Math.PI)
      ctx.fill()
    }

    // 绘制junction节点(实心连接点)
    for (let ji = 0; ji < props.junctions.length; ji++) {
      const j = props.junctions[ji]
      const isSelected = selectedEndpoint.value && selectedEndpoint.value.junctionIndex === ji
      ctx.fillStyle = isSelected ? '#2563eb' : '#2563eb'
      ctx.beginPath()
      ctx.arc(j.x, j.y, 4, 0, 2 * Math.PI)
      ctx.fill()
    }

    // 选中框
    if (i === selectedComponentIndex.value) {
      ctx.strokeStyle = '#2563eb'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 4])
      ctx.strokeRect(comp.x - 34, comp.y - 24, 68, 48)
      ctx.setLineDash([])
    }
  }
}

// ===== 3D 实体模型:Three.js 场景(拟真元件·导线·焊盘,随 2D 电路实时重建) =====
const YWIRE = 3 // 导体层高度(板面 y=0)
let scene3d = null, renderer3d = null, camera3d = null, controls3d = null
let world3d = null, ro3d = null, raf3d = 0, ready3d = false
let midX3 = 0, midZ3 = 0, boardR3 = 300, lastBoardR3 = 0, lastEmpty3d = null
const matCache = new Map()
const cmat = (color, rough = 0.5, metal = 0.05) => {
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
// 电路坐标 → 世界坐标(以内容中心为原点)
const wx = (x) => x - midX3
const wz = (y) => y - midZ3

// 轴向元件外观配置(贴实物:电阻米白碳膜体,棕黑棕金=100Ω,镀锡银端帽;体量较真实元件适当放大便于教学观察)
const CFG = {
  R: { r: 9, len: 50, body: '#e9dcc0', cap: 0xd0d4da, bands: [{ x: -7.8, w: 3, c: '#8a5a2b' }, { x: -3.9, w: 3, c: '#33373d' }, { x: 0, w: 3, c: '#8a5a2b' }, { x: 3.9, w: 3.6, c: '#dfb255' }] },
}
// 横置轴向元件(圆柱+圆头端盖+色环+镀锡引线,纯基础几何构建)
function addAxial(g, comp, cfg) {
  const hx = wx(comp.x)
  const z0 = wz(comp.y)
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
    lead(g, xs, r, z0, wx(ep.x), wz(ep.y), 1.4, cfg.cap)
  }
}
// 工字电感(铁氧体磁芯 + 漆包铜线单层密绕 + 两端盘状挡片,贴实物)
function addInductor(g, comp) {
  const hx = wx(comp.x)
  const z0 = wz(comp.y)
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
    lead(g, xs, axY, z0, wx(ep.x), wz(ep.y), 1.4, 0xd0d4da)
  }
}
// 薄膜电容(黄色卧式方块,贴近 CBB 实物样式)
function addFilmCap(g, comp) {
  const hx = wx(comp.x)
  const z0 = wz(comp.y)
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
    lead(g, xs, 8.5, z0, wx(ep.x), wz(ep.y), 1.5, 0xd0d4da)
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
function addSource(g, comp) {
  const hx = wx(comp.x)
  const z0 = wz(comp.y)
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
    lead(g, wx(ep.x), 9, z0, wx(ep.x), wz(ep.y), 1.6, col)
  }
}

// 板面导线(折线逐段)/ 节点焊点 / 端点焊盘
function addRoutes(g) {
  for (const w of props.wires) {
    const pts = w.points && w.points.length > 0 ? w.points : [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }]
    for (let i = 0; i < pts.length - 1; i++) {
      const s = seg([wx(pts[i].x), YWIRE, wz(pts[i].y)], [wx(pts[i + 1].x), YWIRE, wz(pts[i + 1].y)], 1.9, 0x2563eb, 0.45, 0.15)
      if (s) g.add(s)
    }
  }
  for (const j of props.junctions) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(2.9, 16, 12), cmat('#2563eb', 0.3, 0.3))
    d.position.set(wx(j.x), YWIRE, wz(j.y))
    g.add(d)
  }
  for (const c of props.components) {
    for (const ep of c.endpoints) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 1.3, 18), cmat('#c3cede', 0.4, 0.35))
      p.position.set(wx(ep.x), YWIRE, wz(ep.y))
      g.add(p)
    }
  }
}
// 高级实验台:近黑炭灰台身 + 中央中灰蓝工作区(微凸 0.4 避免与台身共面闪烁)+ 周界金属收边
function addBoard(g) {
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
// 整组重建:清理几何并移除旧组
function clearWorld() {
  if (!world3d) return
  world3d.traverse((n) => n.geometry && n.geometry.dispose())
  scene3d.remove(world3d)
  world3d = new THREE.Group()
  scene3d.add(world3d)
}
// 相机取景:产品展示视角——斜向低角 + 视点抬高至元件群高度,保留台面纵深与顶部背景光晕
// 注意:全部 3D 物件经 wx()/wz() 平移到世界原点居中,轨道目标必须固定为原点(不能跟随 midX3/midZ3)
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

// 重建整个 3D 场景(与 2D 电路数据同步)
function drawCircuit3D() {
  if (!ready3d) return
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
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
  clearWorld()
  addBoard(world3d, spanX, spanY)
  if (has) {
    addRoutes(world3d)
    for (const c of props.components) {
      if (c.type === 'V') addSource(world3d, c)
      else if (c.type === 'C') addFilmCap(world3d, c)
      else if (c.type === 'L') addInductor(world3d, c)
      else addAxial(world3d, c, CFG.R)
    }
  }
  // 首次渲染 / 空态↔内容切换 / 视野扩张过大时,复位视角
  if (!lastBoardR3 || lastEmpty3d !== has || boardR3 > lastBoardR3 * 1.5) {
    fitView3D()
  }
  // 光照投影:仅活动元件投影(静态台面不参与 cast,避免转动时阴影边缘抖动/闪烁)
  world3d.traverse((n) => {
    if (!n.isMesh) return
    if (n.name !== 'static-bench') n.castShadow = true
    if (n.position.y <= 0) n.receiveShadow = true
  })
  lastBoardR3 = boardR3
  lastEmpty3d = has
  if (controls3d) controls3d.autoRotate = autoRotate3D.value && has
}

// === Three.js 场景初始化 / 自适应 / 动画循环 ===
// 注意:3D 初始化与重建均与 2D 画布完全隔离,任何异常都不影响 2D 搭建交互
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
    ro3d.observe(canvas.parentElement)
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
// WebGL 不可用时的降级画面(淡青网格 + 提示文字,保证 3D 区域不空白)
function fallback3D() {
  const canvas = canvas3dRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)
  ctx.strokeStyle = '#dde4ee'
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
  ctx.fillStyle = '#94a7c6'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('当前环境不支持 WebGL,3D 实体预览不可用(2D 搭建不受影响)', rect.width / 2, rect.height / 2)
}
function resize3D() {
  const el = canvas3dRef.value?.parentElement
  if (!el || !renderer3d) return
  const w = el.clientWidth
  const h = el.clientHeight
  if (!w || !h) return
  renderer3d.setSize(w, h)
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

function updateComponentValue(index, value) {
  const newComponents = [...props.components]
  newComponents[index].value = parseFloat(value) || 0
  emit('update:components', newComponents)
}

function getComponentLabel(type) {
  const labels = { R: '电阻 R', L: '电感 L', C: '电容 C', V: '电压 V' }
  return labels[type] || type
}

function getComponentUnit(type) {
  const units = { R: 'Ω', L: 'mH', C: 'μF', V: 'V' }
  return units[type] || ''
}

onMounted(() => {
  drawCircuit()
  init3D()
})

onBeforeUnmount(dispose3D)

watch(
  [() => props.components, () => props.wires, () => props.junctions],
  () => {
    drawCircuit()
    try {
      drawCircuit3D()
    } catch (err) {
      console.error('[3D] 重建失败(2D 不受影响):', err)
    }
  }
)
</script>
