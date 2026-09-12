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
        <svg v-else-if="comp.type === 'RV'" viewBox="0 0 48 32" class="w-14 h-10" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="16" x2="10" y2="16" />
          <rect x="10" y="6" width="28" height="20" />
          <line x1="16" y1="22" x2="30.5" y2="11" />
          <path d="M26.2 8.9 L30.5 11 L27.5 15" />
          <line x1="38" y1="16" x2="44" y2="16" />
        </svg>
        <svg v-else-if="comp.type === 'CV'" viewBox="0 0 48 32" class="w-14 h-10" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round">
          <line x1="4" y1="16" x2="13" y2="16" />
          <line x1="13" y1="9" x2="13" y2="23" />
          <line x1="22" y1="9" x2="22" y2="23" />
          <line x1="22" y1="16" x2="44" y2="16" />
          <line x1="15" y1="21" x2="20.5" y2="10" />
          <path d="M17 8.8 L20.5 10 L18.6 13.9" />
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

    <div class="relative">
      <canvas
        ref="canvasRef"
        class="w-full h-[200px] sm:h-[240px] md:h-[280px] border-2 border-dashed border-gray-300 rounded-xl blueprint-grid cursor-crosshair touch-none"
        @drop="handleDrop"
        @dragover="allowDrop"
        @mousedown="handlePointerDown"
        @mousemove="handlePointerMove"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      />
      <!-- 空态引导:淡色居中提示,不抢画布焦点 -->
      <div
        v-if="components.length === 0"
        class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none select-none"
      >
        <svg viewBox="0 0 64 40" class="w-16 h-10 opacity-40">
          <!-- 画布空态淡线示意:R-L-C-V 串联链 + 虚线连接 -->
          <line x1="6" y1="20" x2="16" y2="20" stroke="#9db0c8" stroke-width="1.6" />
          <rect x="16" y="12" width="12" height="16" fill="none" stroke="#9db0c8" stroke-width="1.6" />
          <text x="22" y="25" text-anchor="middle" font-size="10" font-weight="700" fill="#9db0c8">R</text>
          <path d="M 31 20 Q 34.5 10 38 20 Q 41.5 10 45 20" fill="none" stroke="#9db0c8" stroke-width="1.6" />
          <text x="38" y="31" text-anchor="middle" font-size="10" font-weight="700" fill="#9db0c8">L</text>
          <line x1="47.5" y1="13" x2="47.5" y2="27" stroke="#9db0c8" stroke-width="2" />
          <line x1="52.5" y1="13" x2="52.5" y2="27" stroke="#9db0c8" stroke-width="2" />
          <text x="50" y="35" text-anchor="middle" font-size="10" font-weight="700" fill="#9db0c8">C</text>
          <circle cx="61" cy="20" r="2.5" fill="none" stroke="#9db0c8" stroke-width="1.6" />
        </svg>
        <span class="text-xs text-gray-400">从左侧拖入元件,在画布上搭建 RLC 串联电路</span>
      </div>
    </div>

    <div class="text-xs text-gray-500 text-center mt-2">
      拖拽元件到画布上搭建RLC电路 | 点击元件可编辑参数 | 接线模式: 点击端点→点击添加拐点→点击目标端点完成折线 | 💡 点击导线中间可创建节点实现并联 | 删除模式: 点击元件/导线删除
    </div>

    <!-- 3D 实体模型(共享 Circuit3DCanvas 组件,只读模式,与上方 2D 电路实时同步) -->
    <div class="mt-3">
      <Circuit3DCanvas
        :components="components"
        :wires="wires"
        :junctions="junctions"
        header-title="🧊 3D 实体模型"
        header-tip="🖱 拖拽旋转 · 滚轮缩放 · 自动同步上方 2D 布局"
        empty-text="先在 2D 画布拖入元件并接线,此处自动生成 3D 实体模型"
      />
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
import { ref, onMounted, watch } from 'vue'
import { useRLCCalculatorStore } from '../stores/rlcCalculator'
import Circuit3DCanvas from './Circuit3DCanvas.vue'

const calcStore = useRLCCalculatorStore()

// 元件默认值与可调量程(滑线变阻器/可调电容仿真语义同 R/C,带下限防呆避免除零/Q 发散)
const DEFAULT_VALUES = { R: 100, RV: 100, L: 100, C: 0.05, CV: 0.05, V: 0.9 }
const VALUE_RANGE = { RV: { min: 10, max: 1000 }, CV: { min: 0.005, max: 0.2 } }

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
      const range = VALUE_RANGE[newComponents[idx].type]
      newComponents[idx].value = range ? Math.min(Math.max(num, range.min), range.max) : num
      emit('update:components', newComponents)
    }
    delete compInputValues.value[idx]
  }
}

const componentTypes = [
  { type: 'R', name: '电阻' },
  { type: 'RV', name: '变阻器' },
  { type: 'L', name: '电感' },
  { type: 'C', name: '电容' },
  { type: 'CV', name: '可调电容' },
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
  const defaultValues = DEFAULT_VALUES
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

  const defaultValues = DEFAULT_VALUES
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

// 斜箭头头部(GB 可变符号):沿起点→终点方向在末端补出小三角
function arrowHead(ctx, x1, y1, x2, y2, size = 4) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux
  ctx.beginPath()
  ctx.moveTo(x2 - ux * size + px * size * 0.62, y2 - uy * size + py * size * 0.62)
  ctx.lineTo(x2, y2)
  ctx.lineTo(x2 - ux * size - px * size * 0.62, y2 - uy * size - py * size * 0.62)
  ctx.stroke()
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
    } else if (comp.type === 'RV') {
      // 滑线变阻器:两端引线 + 矩形 + 斜箭头(GB 可变电阻符号)
      ctx.beginPath()
      ctx.moveTo(-30, 0)
      ctx.lineTo(-18, 0)
      ctx.moveTo(18, 0)
      ctx.lineTo(30, 0)
      ctx.stroke()
      ctx.strokeRect(-18, -9, 36, 18)
      ctx.beginPath()
      ctx.moveTo(-8.5, 6.5)
      ctx.lineTo(8.5, -6.5)
      ctx.stroke()
      arrowHead(ctx, -8.5, 6.5, 8.5, -6.5, 3.4)
      ctx.fillStyle = '#1c2534'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('RV', 0, -16)
    } else if (comp.type === 'CV') {
      // 可调电容:两端引线 + 平行板 + 板间斜箭头(GB 可变电容符号)
      ctx.beginPath()
      ctx.moveTo(-30, 0)
      ctx.lineTo(-4, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-4, -11)
      ctx.lineTo(-4, 11)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(4, -11)
      ctx.lineTo(4, 11)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(4, 0)
      ctx.lineTo(30, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-3.2, 8.6)
      ctx.lineTo(3.2, -8.6)
      ctx.stroke()
      arrowHead(ctx, -3.2, 8.6, 3.2, -8.6, 3)
      ctx.fillStyle = '#1c2534'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('CV', 0, -19)
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

// ===== 3D 场景代码已抽取为共享模块:建模函数 → utils/circuit3d.js;场景渲染与交互 → Circuit3DCanvas.vue =====
// (原 YWIRE/cmat/cylX/seg/lead/wx/wz/CFG/addAxial/addInductor/addFilmCap/addRheostat/addVarCap/addSource/addRoutes 等实现已迁移)


function updateComponentValue(index, value) {
  const newComponents = [...props.components]
  newComponents[index].value = parseFloat(value) || 0
  emit('update:components', newComponents)
}

function getComponentLabel(type) {
  const labels = { R: '电阻 R', RV: '变阻器 RV', L: '电感 L', C: '电容 C', CV: '可调电容 CV', V: '电压 V' }
  return labels[type] || type
}

function getComponentUnit(type) {
  const units = { R: 'Ω', RV: 'Ω', L: 'mH', C: 'μF', CV: 'μF', V: 'V' }
  return units[type] || ''
}

onMounted(() => {
  drawCircuit()
})

watch(
  [() => props.components, () => props.wires, () => props.junctions],
  () => {
    drawCircuit()
  }
)
</script>
