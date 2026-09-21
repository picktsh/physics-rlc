<template>
  <div :class="isFullscreen ? 'board-fs' : 'rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)]'">
    <!-- 三栏布局(桌面):左=2D 元件库(竖排) / 中=2D+3D 画布 / 右=元件参数与公差;窄屏自动退化为单列上下堆叠 -->
    <div class="board-grid lg:grid lg:grid-cols-[136px_minmax(0,1fr)_228px] lg:gap-4">
      <!-- 元件库(货架式);全屏时改为顶部横向滚动一排 -->
      <NScrollbar class="board-palette" :x-scrollable="isNarrow">
        <div
          class="palette components-palette flex gap-2 mb-3 flex-wrap justify-center lg:flex-col lg:flex-nowrap lg:justify-start lg:mb-0"
        >
          <div
            v-for="comp in componentTypes"
            :key="comp.type"
            draggable="true"
            @dragstart="handleDragStart($event, comp.type)"
            @click="selectPaletteComponent(comp.type)"
            :class="[
              'component-item flex flex-col items-center justify-center gap-2 p-2 border border-[color:var(--app-border)] rounded-lg cursor-pointer text-xs text-[color:var(--app-text-muted)] transition-all lg:flex-1',
              pendingPlaceType === comp.type
                ? 'bg-[var(--app-surface-brand)] ring-2 ring-[color:var(--app-primary)]'
                : 'bg-[var(--app-surface)] hover:bg-[var(--app-surface-muted)] hover:border-[color:var(--app-border-dark)]',
            ]"
          >
            <!-- 2D 平面元件符号(教科书电路图样式) -->
            <svg
              v-if="comp.type === 'R'"
              viewBox="0 0 48 32"
              class="w-14 h-10"
              fill="none"
              stroke="#2563eb"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="4" y1="16" x2="10" y2="16" />
              <rect x="10" y="6" width="28" height="20" />
              <line x1="38" y1="16" x2="44" y2="16" />
            </svg>
            <svg
              v-else-if="comp.type === 'L'"
              viewBox="0 0 48 32"
              class="w-14 h-10"
              fill="none"
              stroke="#2563eb"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="4" y1="16" x2="10" y2="16" />
              <path d="M10 16a4 4 0 0 1 8 0a4 4 0 0 1 8 0a4 4 0 0 1 8 0" />
              <line x1="34" y1="16" x2="44" y2="16" />
            </svg>
            <svg
              v-else-if="comp.type === 'C'"
              viewBox="0 0 48 32"
              class="w-14 h-10"
              fill="none"
              stroke="#2563eb"
              stroke-width="2"
              stroke-linecap="round"
            >
              <line x1="4" y1="16" x2="22" y2="16" />
              <line x1="22" y1="6" x2="22" y2="26" />
              <line x1="26" y1="6" x2="26" y2="26" />
              <line x1="26" y1="16" x2="44" y2="16" />
            </svg>
            <svg
              v-else-if="comp.type === 'RV'"
              viewBox="0 0 48 32"
              class="w-14 h-10"
              fill="none"
              stroke="#2563eb"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="4" y1="16" x2="10" y2="16" />
              <rect x="10" y="6" width="28" height="20" />
              <line x1="16" y1="22" x2="30.5" y2="11" />
              <path d="M26.2 8.9 L30.5 11 L27.5 15" />
              <line x1="38" y1="16" x2="44" y2="16" />
            </svg>
            <svg
              v-else-if="comp.type === 'CV'"
              viewBox="0 0 48 32"
              class="w-14 h-10"
              fill="none"
              stroke="#2563eb"
              stroke-width="2"
              stroke-linecap="round"
            >
              <line x1="4" y1="16" x2="13" y2="16" />
              <line x1="13" y1="9" x2="13" y2="23" />
              <line x1="22" y1="9" x2="22" y2="23" />
              <line x1="22" y1="16" x2="44" y2="16" />
              <line x1="15" y1="21" x2="20.5" y2="10" />
              <path d="M17 8.8 L20.5 10 L18.6 13.9" />
            </svg>
            <svg
              v-else
              viewBox="0 0 48 32"
              class="w-14 h-10"
              fill="none"
              stroke="#2563eb"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="4" y1="16" x2="12" y2="16" />
              <circle cx="24" cy="16" r="12" />
              <path d="M17 16q3.5-8 7 0t7 0" />
              <line x1="36" y1="16" x2="44" y2="16" />
            </svg>
            <span>{{ comp.name }}</span>
          </div>
        </div>
      </NScrollbar>

      <!-- 中栏:2D 画布 + 3D 实体模型 -->
      <div class="min-w-0">
        <div class="circuit-controls flex items-center gap-2 mb-2 flex-wrap">
          <NDropdown trigger="click" :options="presetOptions" @select="applyPreset">
            <NButton secondary>
              <template #icon><NIcon :component="Catalog" /></template>
              导入示例
            </NButton>
          </NDropdown>
          <NButton secondary :type="circuitMode === 'wire' ? 'primary' : 'default'" @click="setCircuitMode('wire')">
            <template #icon><NIcon :component="Link" /></template>
            接线
          </NButton>
          <NButton secondary :type="circuitMode === 'delete' ? 'error' : 'default'" @click="setCircuitMode('delete')">
            <template #icon><NIcon :component="TrashCan" /></template>
            删除
          </NButton>
          <NButton secondary :title="isFullscreen ? '退出全屏 (Esc)' : '全屏编辑,便于排列元件'" @click="toggle">
            <template #icon><NIcon :component="isFullscreen ? Minimize : Maximize" /></template>
            {{ isFullscreen ? '退出全屏' : '全屏' }}
          </NButton>
          <NButton class="ml-auto" secondary type="primary" @click="$emit('simulate')">
            <template #icon><NIcon :component="Rocket" /></template>
            仿真
          </NButton>
          <NButton secondary type="error" @click="$emit('reset')">
            <template #icon><NIcon :component="Reset" /></template>
            清空
          </NButton>
        </div>

        <div class="relative">
          <canvas
            ref="canvasRef"
            class="c2d-stage w-full h-[200px] sm:h-[240px] md:h-[280px] border-2 border-dashed border-[color:var(--app-border-dark)] rounded-lg blueprint-grid cursor-crosshair touch-none"
            @drop="handleDrop"
            @dragover="allowDrop"
            @mousedown="handlePointerDown"
            @mousemove="handlePointerMove"
            @touchstart.prevent="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
          />
          <!-- 空态引导:淡色居中提示,不抢画布焦点 -->
          <div
            v-if="components.length === 0"
            class="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none select-none"
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
            <span class="text-xs text-[color:var(--app-text-faint)]">从左侧拖入元件,在画布上搭建 RLC 串联电路</span>
          </div>
        </div>

        <!-- 3D 实体模型(共享 Circuit3DCanvas 组件,交互模式:与上方 2D 电路双向同步,2D/3D 均可搭建) -->
        <div class="mt-3">
          <Circuit3DCanvas
            :components="components"
            :wires="wires"
            :junctions="junctions"
            interactive
            :pending-type="pendingPlaceType"
            header-title="🧊 3D 实体模型"
            header-tip="🖱 拖拽旋转 · 滚轮缩放 · 与 2D 电路实时同步,也可直接在 3D 台面搭建"
            empty-text="从左侧拖入元件,在 2D 画布或 3D 台面均可搭建电路"
            @place="on3dPlace"
            @move="on3dMove"
            @wire="on3dWire"
            @delete-component="on3dDeleteComponent"
            @delete-wire="on3dDeleteWire"
            @focus-component="on3dFocusComponent"
          />
        </div>
      </div>

      <!-- 右栏:元件参数编辑 + 公差设置;全屏时隐藏(画布占满,参数编辑退出全屏再做) -->
      <div v-if="!isFullscreen" class="min-w-0">
        <!-- 元件参数编辑器 -->
        <div v-if="components.length > 0">
          <div>📝 元件参数编辑</div>
          <NForm label-placement="top" :show-feedback="false">
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-1 gap-2">
              <div
                v-for="(comp, idx) in components"
                :id="'cb-comp-' + idx"
                :key="idx"
                :class="[
                  'p-2 rounded-lg',
                  selectedComponentIndex === idx ? 'border-2 border-[color:var(--app-primary)]' : '',
                ]"
              >
                <NFormItem :label="`${getComponentLabel(comp.type)} #${idx + 1}`">
                  <NInputNumber
                    :value="comp.value"
                    :show-button="false"
                    :min="VALUE_RANGE[comp.type]?.min"
                    :max="VALUE_RANGE[comp.type]?.max"
                    @update:value="(v) => onCompValueChange(idx, v)"
                  >
                    <template #suffix>{{ getComponentUnit(comp.type) }}</template>
                  </NInputNumber>
                </NFormItem>
              </div>
            </div>
          </NForm>
        </div>

        <!-- 元件公差设置 -->
        <div class="mt-3 p-3 bg-[var(--app-surface-sunken)] rounded-lg">
          <div class="flex items-center gap-3 mb-2">
            <div class="text-xs font-semibold text-[color:var(--app-text)]">📐 元件公差</div>
            <NSwitch :value="toleranceEnabled" @update:value="onToleranceToggle" />
            <span class="text-xs text-[color:var(--app-text-muted)]">{{ toleranceEnabled ? '已开启' : '已关闭' }}</span>
          </div>
          <div v-if="toleranceEnabled" class="flex items-center gap-3">
            <span class="text-xs text-[color:var(--app-text-muted)] whitespace-nowrap">公差范围：</span>
            <NSlider
              v-model:value="tolerancePercent"
              :min="1"
              :max="20"
              :step="0.5"
              class="flex-1"
              @update:value="onToleranceChange"
            />
            <span class="text-xs font-semibold text-[color:var(--app-brand)] min-w-[40px] text-right"
              >±{{ tolerancePercent.toFixed(1) }}%</span
            >
          </div>
          <div
            v-if="toleranceEnabled"
            class="text-xs text-[color:var(--app-warning)] bg-[var(--app-warning-bg)] rounded px-2 py-1 mt-1"
          >
            💡 开启后每次仿真实物参数将在标称值的 ±{{ tolerancePercent.toFixed(1) }}% 范围内随机波动
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { NIcon, NButton, NScrollbar, NDropdown, NForm, NFormItem, NInputNumber, NSlider, NSwitch } from 'naive-ui'
import { Link, TrashCan, Rocket, Reset, Maximize, Minimize, Catalog } from '@vicons/carbon'
import { CIRCUIT_PRESET_OPTIONS, findPreset } from '@/utils/circuitPresets'
import { useRLCCalculatorStore } from '@/stores/rlcCalculator'
import { useFullscreenSection } from '@/composables/useFullscreenSection'
import { useMediaQuery } from '@vueuse/core'
import Circuit3DCanvas from '@/components/Circuit3DCanvas.vue'
import { canvasTheme } from '@/utils/canvasTheme'

const calcStore = useRLCCalculatorStore()

// 元件默认值与可调量程(滑线变阻器/可调电容仿真语义同 R/C,带下限防呆避免除零/Q 发散)
const DEFAULT_VALUES = { R: 100, RV: 100, L: 100, C: 0.05, CV: 0.05, V: 0.9 }
const VALUE_RANGE = { RV: { min: 10, max: 1000 }, CV: { min: 0.005, max: 0.2 } }

const toleranceEnabled = ref(calcStore.toleranceEnabled)
const tolerancePercent = ref(calcStore.tolerancePercent)

function onToleranceToggle(val) {
  toleranceEnabled.value = val
  calcStore.toleranceEnabled = val
  if (val) {
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

// 板块全屏:整块三栏工作区转 fixed 铺满视口,盖住页眉/侧栏,不受页面布局与菜单干扰(复用现有布局)
const { isFullscreen, toggle } = useFullscreenSection()
// 窄屏判定:与 lg 断点一致。<lg 时元件库本就退到顶部,全屏才改为横向滚动一排;≥lg(PC)保留左侧竖排
const isNarrow = useMediaQuery('(max-width: 1023.98px)')

// 导入示例:铺一套串联 RLC 布局(2D 画布坐标 + 端点连线),覆盖当前电路
const presetOptions = CIRCUIT_PRESET_OPTIONS
function applyPreset(id) {
  const preset = findPreset(id)
  if (!preset) return
  const comps = preset.components.map((c) => {
    const value = c.value ?? DEFAULT_VALUES[c.type] ?? 0
    return {
      type: c.type,
      x: c.x,
      y: c.y,
      id: Date.now() + Math.random(),
      value,
      endpoints: [
        { x: c.x - 30, y: c.y, id: Date.now() + Math.random(), side: 'left' },
        { x: c.x + 30, y: c.y, id: Date.now() + Math.random() + 1, side: 'right' },
      ],
    }
  })
  const wires = preset.connections.map(([a, ea, b, eb]) => {
    const p1 = { x: comps[a].endpoints[ea].x, y: comps[a].endpoints[ea].y }
    const p2 = { x: comps[b].endpoints[eb].x, y: comps[b].endpoints[eb].y }
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, points: [p1, p2], comp1: a, comp2: b, junc1: -1, junc2: -1 }
  })
  emit('update:components', comps)
  emit('update:wires', wires)
  emit('update:junctions', [])
  selectedEndpoint.value = null
  wireIntermediatePoints.value = []
  selectedComponentIndex.value = null
  pendingPlaceType.value = null
  nextTick(drawCircuit)
}

// 元件参数编辑:数值直接写回(量程钳制交由 NInputNumber 的 min/max)
function onCompValueChange(idx, num) {
  if (num === null || Number.isNaN(num)) return
  const newComponents = [...props.components]
  newComponents[idx] = { ...newComponents[idx], value: num }
  emit('update:components', newComponents)
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

function handleCanvasClick(event, isTouch = false) {
  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // 手指点击精度远低于鼠标，触摸时放大各命中半径
  const hitScale = isTouch ? 1.6 : 1

  if (circuitMode.value === 'wire') {
    // 检测端点点击
    let clickedEp = null
    for (let i = 0; i < props.components.length; i++) {
      for (let j = 0; j < props.components[i].endpoints.length; j++) {
        const ep = props.components[i].endpoints[j]
        if (Math.sqrt((x - ep.x) ** 2 + (y - ep.y) ** 2) < 15 * hitScale) {
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
        if (Math.sqrt((x - j.x) ** 2 + (y - j.y) ** 2) < 12 * hitScale) {
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
            x1: pt1.x,
            y1: pt1.y,
            x2: pt2.x,
            y2: pt2.y,
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
      const hitWire = findNearestWire(x, y, 10 * hitScale)
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
          {
            x1: wire.x1,
            y1: wire.y1,
            x2: projPt.x,
            y2: projPt.y,
            points: [getWireStart(wire), projPt],
            comp1: wire.comp1,
            comp2: -1,
            junc1: wire.junc1 ?? -1,
            junc2: jIdx,
          },
          {
            x1: projPt.x,
            y1: projPt.y,
            x2: wire.x2,
            y2: wire.y2,
            points: [projPt, getWireEnd(wire)],
            comp1: -1,
            comp2: wire.comp2,
            junc1: jIdx,
            junc2: wire.junc2 ?? -1,
          },
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
        const newWires = props.wires.filter((w) => w.comp1 !== i && w.comp2 !== i)
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
          const d = pointToLineDistance(
            x,
            y,
            wire.points[k].x,
            wire.points[k].y,
            wire.points[k + 1].x,
            wire.points[k + 1].y,
          )
          if (d < minDist) minDist = d
        }
      } else {
        minDist = pointToLineDistance(x, y, wire.x1, wire.y1, wire.x2, wire.y2)
      }
      if (minDist < 8 * hitScale) {
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
  // 移动端触摸已在 touchend 处理；touchstart.prevent 在部分浏览器仍会补发合成鼠标事件，这里一并屏蔽，避免点击被重复触发抵消
  if (Date.now() - lastTouchTime < 400) return
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
let touchStartX = 0
let touchStartY = 0
let lastTouchTime = 0

function handleTouchStart(event) {
  touchStartTime = Date.now()
  lastTouchTime = touchStartTime
  touchMoved = false
  const t = event.touches[0]
  touchStartX = t.clientX
  touchStartY = t.clientY
  // touchstart 已在模板上 .prevent：屏蔽合成鼠标事件；画布 touch-none 本身已禁止滚动
}

function handleTouchMove(event) {
  const t = event.touches[0]
  // 轻点时手指会有 1~2px 抖动，位移超阈值才算真移动，否则 touchend 的 tap 判定永远失败导致点击失效
  if (Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY) > 10) touchMoved = true
  if (circuitMode.value === 'wire' && selectedEndpoint.value !== null) {
    event.preventDefault() // 防止页面滚动
    handlePointerMove(event)
  }
}

function handleTouchEnd(event) {
  // 模拟 click：短按且未明显移动
  lastTouchTime = Date.now()
  const elapsed = lastTouchTime - touchStartTime
  if (elapsed < 500 && !touchMoved) {
    // 使用 changedTouches 获取最终坐标
    const rect = canvasRef.value.getBoundingClientRect()
    const touch = event.changedTouches[0]
    const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY }

    if (pendingPlaceType.value) {
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      placeComponentAt(x, y)
    } else {
      handleCanvasClick(fakeEvent, true)
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
  if (a.compIndex !== undefined && b.compIndex !== undefined)
    return a.compIndex === b.compIndex && a.epIndex === b.epIndex
  return false
}

function getEndpointPos(ep) {
  if (ep.junctionIndex !== undefined && ep.junctionIndex >= 0) {
    return props.junctions[ep.junctionIndex]
  }
  return props.components[ep.compIndex].endpoints[ep.epIndex]
}

function findNearestWire(x, y, threshold = 10) {
  let bestIdx = null,
    bestDist = threshold // 命中阈值由调用方按鼠标/触摸场景传入
  for (let i = 0; i < props.wires.length; i++) {
    const wire = props.wires[i]
    let minD = Infinity
    if (wire.points && wire.points.length > 1) {
      for (let k = 0; k < wire.points.length - 1; k++) {
        const d = pointToLineDistance(
          x,
          y,
          wire.points[k].x,
          wire.points[k].y,
          wire.points[k + 1].x,
          wire.points[k + 1].y,
        )
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
  let bestX,
    bestY,
    bestDist = Infinity
  const segments = []
  if (wire.points && wire.points.length > 1) {
    for (let k = 0; k < wire.points.length - 1; k++) {
      segments.push([wire.points[k], wire.points[k + 1]])
    }
  } else {
    segments.push([
      { x: wire.x1, y: wire.y1 },
      { x: wire.x2, y: wire.y2 },
    ])
  }
  for (const [p1, p2] of segments) {
    const A = px - p1.x,
      B = py - p1.y
    const C = p2.x - p1.x,
      D = p2.y - p1.y
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

  const ct = canvasTheme()
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, rect.width, rect.height)

  // 绘制导线(主题色细线,黑配色下自动转亮蓝)
  ctx.strokeStyle = ct.wire
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
    ctx.strokeStyle = ct.wire
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
      ctx.fillStyle = ct.ink
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
      ctx.fillStyle = ct.ink
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
      ctx.fillStyle = ct.ink
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
      ctx.fillStyle = ct.ink
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
      ctx.fillStyle = ct.ink
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('CV', 0, -19)
    } else if (comp.type === 'V') {
      // 交流电压源:两端引线 + 圆环内波形(随信号源波形参数动态切换)
      ctx.beginPath()
      ctx.moveTo(-30, 0)
      ctx.lineTo(-16, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, 16, 0, 2 * Math.PI)
      ctx.stroke()
      if (comp.signalWaveform === 'square') {
        // 方波符号
        ctx.beginPath()
        ctx.moveTo(-8, 4)
        ctx.lineTo(-8, -4)
        ctx.lineTo(0, -4)
        ctx.lineTo(0, 4)
        ctx.lineTo(8, 4)
        ctx.lineTo(8, -4)
        ctx.stroke()
      } else {
        // 正弦波符号(默认)
        ctx.beginPath()
        ctx.moveTo(-8, 0)
        ctx.quadraticCurveTo(-4, -8, 0, 0)
        ctx.quadraticCurveTo(4, 8, 8, 0)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.moveTo(16, 0)
      ctx.lineTo(30, 0)
      ctx.stroke()
      ctx.fillStyle = ct.ink
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('V', 0, -24)
    }

    ctx.restore()

    // 绘制端点(中空接线环)
    for (let j = 0; j < comp.endpoints.length; j++) {
      const ep = comp.endpoints[j]
      const isSelected =
        selectedEndpoint.value && selectedEndpoint.value.compIndex === i && selectedEndpoint.value.epIndex === j
      ctx.fillStyle = isSelected ? ct.wire : '#9fb2d1'
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
      ctx.fillStyle = ct.wire
      ctx.beginPath()
      ctx.arc(j.x, j.y, 4, 0, 2 * Math.PI)
      ctx.fill()
    }

    // 选中框
    if (i === selectedComponentIndex.value) {
      ctx.strokeStyle = ct.wire
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 4])
      ctx.strokeRect(comp.x - 34, comp.y - 24, 68, 48)
      ctx.setLineDash([])
    }
  }
}

// ===== 3D 场景代码已抽取为共享模块:建模函数 → utils/circuit3d.js;场景渲染与交互 → Circuit3DCanvas.vue =====
// (原 YWIRE/cmat/cylX/seg/lead/wx/wz/CFG/addAxial/addInductor/addFilmCap/addRheostat/addVarCap/addSource/addRoutes 等实现已迁移)

// ===== 3D 交互事件:与 2D 画布共用同一套数据结构(props 读取 + emit 回写),2D/3D 实时同步 =====
function on3dPlace({ type, x, y }) {
  const newComp = {
    type,
    x,
    y,
    id: Date.now() + Math.random(),
    value: DEFAULT_VALUES[type] || 0,
    endpoints: [
      { x: x - 30, y, id: Date.now() + Math.random(), side: 'left' },
      { x: x + 30, y, id: Date.now() + Math.random() + 1, side: 'right' },
    ],
  }
  emit('update:components', [...props.components, newComp])
  pendingPlaceType.value = null
  drawCircuit()
}

// 拖动移动:端点(±30)跟随,关联导线端点坐标同步吸附(仿真按坐标就近解析端点;折线中间拐点保留)
function on3dMove({ index, x, y }) {
  const old = props.components[index]
  if (!old) return
  const endpoints = [
    { x: x - 30, y, id: Date.now() + Math.random(), side: 'left' },
    { x: x + 30, y, id: Date.now() + Math.random() + 1, side: 'right' },
  ]
  const snapEp = (refX, refY) => {
    const d0 = Math.hypot(refX - old.endpoints[0].x, refY - old.endpoints[0].y)
    const d1 = Math.hypot(refX - old.endpoints[1].x, refY - old.endpoints[1].y)
    return endpoints[d0 <= d1 ? 0 : 1]
  }
  const newWires = props.wires.map((w) => {
    const touchA = w.comp1 === index
    const touchB = w.comp2 === index
    if (!touchA && !touchB) return w
    let { x1, y1, x2, y2 } = w
    if (touchA) {
      const ep = snapEp(w.x1, w.y1)
      x1 = ep.x
      y1 = ep.y
    }
    if (touchB) {
      const ep = snapEp(w.x2, w.y2)
      x2 = ep.x
      y2 = ep.y
    }
    const mid = w.points && w.points.length > 2 ? w.points.slice(1, -1) : []
    return { ...w, x1, y1, x2, y2, points: [{ x: x1, y: y1 }, ...mid, { x: x2, y: y2 }] }
  })
  emit(
    'update:components',
    props.components.map((c, i) => (i === index ? { ...c, x, y, endpoints } : c)),
  )
  emit('update:wires', newWires)
  drawCircuit()
}

// 端点接线:a/b = { compIndex, epIndex };拒绝同元件同端点自连,同对端点重复连线去重
function on3dWire({ a, b }) {
  const compA = props.components[a.compIndex]
  const compB = props.components[b.compIndex]
  if (!compA || !compB) return
  if (a.compIndex === b.compIndex && a.epIndex === b.epIndex) return
  const epA = compA.endpoints[a.epIndex]
  const epB = compB.endpoints[b.epIndex]
  if (!epA || !epB) return
  const near = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by) < 1
  const dup = props.wires.some(
    (w) =>
      (w.comp1 === a.compIndex &&
        w.comp2 === b.compIndex &&
        near(w.x1, w.y1, epA.x, epA.y) &&
        near(w.x2, w.y2, epB.x, epB.y)) ||
      (w.comp1 === b.compIndex &&
        w.comp2 === a.compIndex &&
        near(w.x1, w.y1, epB.x, epB.y) &&
        near(w.x2, w.y2, epA.x, epA.y)),
  )
  if (dup) return
  emit('update:wires', [
    ...props.wires,
    {
      x1: epA.x,
      y1: epA.y,
      x2: epB.x,
      y2: epB.y,
      points: [
        { x: epA.x, y: epA.y },
        { x: epB.x, y: epB.y },
      ],
      comp1: a.compIndex,
      comp2: b.compIndex,
      junc1: -1,
      junc2: -1,
    },
  ])
  drawCircuit()
}

// 右键删除元件:清理关联导线并前移后续索引引用,同步 2D 选中态
function on3dDeleteComponent(index) {
  emit(
    'update:components',
    props.components.filter((_, i) => i !== index),
  )
  emit(
    'update:wires',
    props.wires
      .filter((w) => w.comp1 !== index && w.comp2 !== index)
      .map((w) => ({
        ...w,
        comp1: w.comp1 > index ? w.comp1 - 1 : w.comp1,
        comp2: w.comp2 > index ? w.comp2 - 1 : w.comp2,
      })),
  )
  if (selectedComponentIndex.value === index) selectedComponentIndex.value = null
  else if (selectedComponentIndex.value > index) selectedComponentIndex.value--
  drawCircuit()
}

// 右键删除导线
function on3dDeleteWire(index) {
  emit(
    'update:wires',
    props.wires.filter((_, i) => i !== index),
  )
  drawCircuit()
}

// 双击 3D 元件:右栏参数面板滚动定位并聚焦,2D 画布同步选中框
function on3dFocusComponent(index) {
  selectedComponentIndex.value = index
  drawCircuit()
  nextTick(() => {
    const el = document.getElementById('cb-comp-' + index)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      const input = el.querySelector('input')
      if (input) input.focus({ preventScroll: true })
    }
  })
}

function updateComponentValue(index, value) {
  const newComponents = [...props.components]
  newComponents[index].value = parseFloat(value) || 0
  emit('update:components', newComponents)
}

function getComponentLabel(type) {
  const labels = { R: '电阻 R', RV: '变阻器 RV', L: '电感 L', C: '电容 C', CV: '可调电容 CV', V: '信号源 V' }
  return labels[type] || type
}

function getComponentUnit(type) {
  const units = { R: 'Ω', RV: 'Ω', L: 'mH', C: 'μF', CV: 'μF', V: 'V' }
  return units[type] || ''
}

// 2D 画布尺寸随板块全屏/窗口变化时重绘(drawCircuit 内部按 getBoundingClientRect 重算缓冲)
let c2dRo = null

onMounted(() => {
  drawCircuit()
  window.addEventListener('themechange', drawCircuit)
  if (canvasRef.value) {
    c2dRo = new ResizeObserver(() => drawCircuit())
    c2dRo.observe(canvasRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('themechange', drawCircuit)
  if (c2dRo) c2dRo.disconnect()
})

watch([() => props.components, () => props.wires, () => props.junctions], () => {
  drawCircuit()
})
</script>

<style scoped>
/* 板块全屏:整块工作区转 fixed 铺满视口(盖住页眉/侧栏等外部布局与菜单);复用自身三栏栅格不变 */
.board-fs {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  overflow-y: auto;
  padding: 16px;
  background: var(--app-bg);
  border-radius: 0;
}
/* 全屏时画布抬高以充分利用视口:2D 由 ResizeObserver 自动重绘,3D 由 Circuit3DCanvas 自身观察者自适应 */
.board-fs .c2d-stage {
  height: 46vh;
}
.board-fs :deep(.c3d-stage) {
  height: 60vh;
}
/* 全屏:参数栏隐藏后栅格收成两栏(元件库左 + 画布),避免右侧空列;PC 保持元件库在左 */
.board-fs .board-grid {
  grid-template-columns: 136px minmax(0, 1fr);
}
/* 窄屏(普通视图与全屏均适用):元件库退到顶部时统一改为横向滚动一排并缩小元件项 */
@media (max-width: 1023.98px) {
  .board-palette .palette {
    flex-wrap: nowrap;
    margin-bottom: 0;
  }
  .board-palette .component-item {
    flex: 0 0 auto;
  }
}
</style>
