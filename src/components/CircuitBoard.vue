<template>
  <div class="card">
    <div class="components-palette flex gap-2 mb-3 flex-wrap justify-center">
      <div
        v-for="comp in componentTypes"
        :key="comp.type"
        draggable="true"
        @dragstart="handleDragStart($event, comp.type)"
        class="component-item flex flex-col items-center p-2 bg-gray-100 rounded-lg cursor-grab text-xs text-gray-600 hover:bg-gray-200 transition-all"
      >
        <div :class="['comp-icon w-10 h-10 rounded-full flex items-center justify-center font-bold text-white', comp.colorClass]">
          {{ comp.label }}
        </div>
        <span>{{ comp.name }}</span>
      </div>
    </div>

    <div class="circuit-controls flex gap-2 mb-2 flex-wrap">
      <button
        :class="['px-3 py-2 border-2 border-gray-300 rounded-lg text-sm cursor-pointer transition-all', circuitMode === 'wire' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white']"
        @click="setCircuitMode('wire')"
      >
        🔗 接线模式
      </button>
      <button
        :class="['px-3 py-2 border-2 border-gray-300 rounded-lg text-sm cursor-pointer transition-all', circuitMode === 'delete' ? 'bg-red-500 text-white border-red-500' : 'bg-white']"
        @click="setCircuitMode('delete')"
      >
        🗑️ 删除模式
      </button>
      <button class="ml-auto px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all" @click="$emit('simulate')">
        🚀 开始仿真
      </button>
      <button class="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-300 transition-all" @click="$emit('reset')">
        🔄 清空电路
      </button>
    </div>

    <canvas
      ref="canvasRef"
      class="w-full h-[280px] border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 cursor-crosshair"
      @drop="handleDrop"
      @dragover="allowDrop"
      @click="handleCanvasClick"
      @mousemove="handleMouseMove"
    />

    <div class="text-xs text-gray-500 text-center mt-2">
      拖拽元件到画布上搭建RLC电路 | 点击元件可编辑参数 | 接线模式: 点击端点→点击添加拐点→点击目标端点完成折线 | 删除模式: 点击元件/导线删除
    </div>

    <!-- 元件参数编辑器 -->
    <div v-if="components.length > 0" class="mt-3">
      <div class="text-sm font-semibold text-gray-700 mb-2">📝 元件参数编辑</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div v-for="(comp, idx) in components" :key="idx" :class="['p-2 rounded-lg', selectedComponentIndex === idx ? 'border-2 border-indigo-500' : '']">
          <label class="text-xs text-gray-600">{{ getComponentLabel(comp.type) }} #{{ idx + 1 }}</label>
          <div class="flex gap-1 items-center mt-1">
            <input
              type="number"
              step="any"
              :value="getCompDisplay(idx)"
              @input="onCompInput(idx, $event)"
              @blur="onCompBlur(idx)"
              class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <span class="text-xs text-gray-500 whitespace-nowrap">{{ getComponentUnit(comp.type) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  components: {
    type: Array,
    required: true,
  },
  wires: {
    type: Array,
    required: true,
  },
  mode: {
    type: String,
    default: 'wire',
  },
})

const emit = defineEmits(['update:components', 'update:wires', 'update:mode', 'simulate', 'reset'])

const canvasRef = ref(null)
const circuitMode = ref(props.mode)
const selectedEndpoint = ref(null)
const wireIntermediatePoints = ref([])
const selectedComponentIndex = ref(null)

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
  { type: 'R', label: 'R', name: '电阻', colorClass: 'bg-green-500' },
  { type: 'L', label: 'L', name: '电感', colorClass: 'bg-orange-500' },
  { type: 'C', label: 'C', name: '电容', colorClass: 'bg-blue-500' },
  { type: 'V', label: 'V', name: '信号源', colorClass: 'bg-purple-500' },
]

function handleDragStart(event, type) {
  event.dataTransfer.setData('componentType', type)
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

    if (clickedEp) {
      if (selectedEndpoint.value === null) {
        selectedEndpoint.value = clickedEp
        wireIntermediatePoints.value = []
      } else if (selectedEndpoint.value.compIndex !== clickedEp.compIndex || selectedEndpoint.value.epIndex !== clickedEp.epIndex) {
        const ep1 = props.components[selectedEndpoint.value.compIndex].endpoints[selectedEndpoint.value.epIndex]
        const ep2 = props.components[clickedEp.compIndex].endpoints[clickedEp.epIndex]
        const pts = [ep1, ...wireIntermediatePoints.value, ep2]
        const newWires = [
          ...props.wires,
          { x1: ep1.x, y1: ep1.y, x2: ep2.x, y2: ep2.y, points: pts, comp1: selectedEndpoint.value.compIndex, comp2: clickedEp.compIndex },
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

function handleMouseMove(event) {
  if (circuitMode.value === 'wire' && selectedEndpoint.value !== null) {
    drawCircuit()
    const ctx = canvasRef.value.getContext('2d')
    const rect = canvasRef.value.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const ep = props.components[selectedEndpoint.value.compIndex].endpoints[selectedEndpoint.value.epIndex]

    ctx.strokeStyle = 'rgba(102, 126, 234, 0.5)'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(ep.x, ep.y)
    for (const pt of wireIntermediatePoints.value) ctx.lineTo(pt.x, pt.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.setLineDash([])

    for (const pt of wireIntermediatePoints.value) {
      ctx.fillStyle = 'rgba(102, 126, 234, 0.6)'
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI)
      ctx.fill()
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

  // 绘制导线
  ctx.strokeStyle = '#4a90d9'
  ctx.lineWidth = 3
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

  // 绘制元件
  for (let i = 0; i < props.components.length; i++) {
    const comp = props.components[i]
    ctx.save()
    ctx.translate(comp.x, comp.y)

    if (comp.type === 'R') {
      ctx.strokeStyle = '#4caf50'
      ctx.lineWidth = 2.5
      ctx.strokeRect(-18, -8, 36, 16)
      ctx.fillStyle = '#4caf50'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('R', 0, 4)
    } else if (comp.type === 'L') {
      ctx.strokeStyle = '#ff9800'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(-20, 0)
      ctx.lineTo(-16, 0)
      for (let b = 0; b < 4; b++) {
        const bx = -16 + b * 8
        ctx.arc(bx, 0, 4, Math.PI, 0, false)
      }
      ctx.lineTo(20, 0)
      ctx.stroke()
      ctx.fillStyle = '#ff9800'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('L', 0, -8)
    } else if (comp.type === 'C') {
      ctx.strokeStyle = '#2196f3'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(-4, -14)
      ctx.lineTo(-4, 14)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(4, -14)
      ctx.lineTo(4, 14)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-20, 0)
      ctx.lineTo(-4, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(4, 0)
      ctx.lineTo(20, 0)
      ctx.stroke()
      ctx.fillStyle = '#2196f3'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('C', 0, -18)
    } else if (comp.type === 'V') {
      ctx.strokeStyle = '#9c27b0'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, 16, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(-10, -7)
      ctx.lineTo(10, -7)
      ctx.stroke()
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(-6, 7)
      ctx.lineTo(6, 7)
      ctx.stroke()
      ctx.fillStyle = '#9c27b0'
      ctx.font = 'bold 8px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('+', 0, -11)
      ctx.fillText('−', 0, 15)
    }

    ctx.restore()

    // 绘制端点
    for (let j = 0; j < comp.endpoints.length; j++) {
      const ep = comp.endpoints[j]
      const isSelected = selectedEndpoint.value && selectedEndpoint.value.compIndex === i && selectedEndpoint.value.epIndex === j
      ctx.fillStyle = isSelected ? '#28a745' : '#ff9800'
      ctx.beginPath()
      ctx.arc(ep.x, ep.y, 8, 0, 2 * Math.PI)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(ep.x, ep.y, 4, 0, 2 * Math.PI)
      ctx.fill()
    }

    // 选中框
    if (i === selectedComponentIndex.value) {
      ctx.strokeStyle = '#dc3545'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      ctx.strokeRect(comp.x - 35, comp.y - 22, 70, 44)
      ctx.setLineDash([])
    }
  }
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
})

watch([() => props.components, () => props.wires], () => {
  drawCircuit()
})
</script>
