<template>
  <div>
    <!-- ============ RLC 阻尼振荡特性实验 · 顶部电路搭建(3D 直接拖拽) ============ -->
    <section class="card mb-4">
      <h2 class="sec-title">电路搭建(3D 直接拖拽)</h2>

      <!-- 三栏布局(桌面):左=3D 元件库 / 中=3D 实验台 / 右=元件参数与公差;窄屏退化为单列堆叠 -->
      <div class="mt-3 lg:grid lg:grid-cols-[150px_minmax(0,1fr)_240px] lg:gap-4">
        <!-- 左栏:3D 元件库(货架式,每项为同源 3D 商品图缩略图) -->
        <div class="flex gap-2 mb-3 flex-wrap justify-center lg:flex-col lg:flex-nowrap lg:justify-start lg:mb-0">
          <div
            v-for="comp in componentTypes"
            :key="comp.type"
            draggable="true"
            :class="[
              'component-item flex flex-col items-center justify-center gap-1 p-2 border border-gray-200 rounded-xl cursor-pointer text-xs text-gray-600 transition-all lg:flex-1',
              pendingPlaceType === comp.type ? 'bg-blue-50 ring-2 ring-[#3b82f6]' : 'bg-white hover:bg-gray-100 hover:border-gray-300',
            ]"
            @dragstart="handleDragStart($event, comp.type)"
            @click="selectPaletteComponent(comp.type)"
          >
            <img
              v-if="thumbs && thumbs[comp.type]"
              :src="thumbs[comp.type]"
              draggable="false"
              alt=""
              class="w-16 h-16 object-contain pointer-events-none select-none"
            />
            <span v-else class="w-16 h-16 flex items-center justify-center text-xl font-bold text-gray-300">{{ comp.type }}</span>
            <span class="font-medium">{{ comp.name }}</span>
          </div>
        </div>

        <!-- 中栏:3D 实验台(拖入放置 / 拖动移动 / 点端点接线 / 右键删除 / 双击定位) -->
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <p class="text-[11px] text-gray-400 flex-1 min-w-[180px] leading-4">
              🖱 空白拖拽旋转视角 · 滚轮缩放 | 拖入元件放置 · 拖动元件移动 · 点端点接线 · 右键删除 · 双击元件定位参数
            </p>
            <button
              class="px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-semibold shadow-sm transition-all"
              @click="onSimulate"
            >
              ⚡ 仿真
            </button>
            <button
              class="px-3 md:px-4 py-1.5 md:py-2 bg-gray-200 text-gray-600 rounded-lg text-xs md:text-sm hover:bg-gray-300 transition-all"
              @click="onReset"
            >
              🧹 清空
            </button>
          </div>
          <!-- 触摸端点选元件后,提示到台面上放置(桌面端以拖拽为主) -->
          <div v-if="pendingPlaceType" class="text-[11px] text-blue-600 bg-blue-50 rounded px-2 py-1 mb-2">
            📌 已选中「{{ typeName(pendingPlaceType) }}」:点击 3D 实验台空白处放置(再次点击库项取消)
          </div>
          <Circuit3DCanvas
            :components="store.components"
            :wires="store.wires"
            :junctions="store.junctions"
            interactive
            :pending-type="pendingPlaceType"
            empty-text="从左侧拖入元件,直接在 3D 实验台上搭建电路"
            @place="onPlace"
            @move="onMove"
            @wire="onWire"
            @delete-component="onDeleteComponent"
            @delete-wire="onDeleteWire"
            @focus-component="onFocusComponent"
          />
          <!-- 仿真状态条:校验失败给出原因,成功展示提取的等效参数与阻尼特征 -->
          <div
            v-if="simulation"
            :class="[
              'mt-3 border rounded-lg px-3 py-2 text-xs leading-relaxed',
              simulation.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-600',
            ]"
          >
            <div class="font-semibold">{{ simulation.success ? '✅' : '⚠️' }} {{ simulation.message }}</div>
            <div v-if="simulation.success" class="mt-1">
              等效参数:R = {{ fmt(simulation.params.R) }} Ω · L = {{ fmt(simulation.params.L) }} mH · C = {{ fmt(simulation.params.C, 3) }} μF
              · V = {{ fmt(simulation.params.V) }} V
              <span class="block mt-0.5">
                谐振频率 f₀ ≈ {{ fmt(simulation.fr, 1) }} Hz · 阻尼比 ζ ≈ {{ fmt(simulation.zeta, 3) }} →
                {{ dampingTypeLabel[simulation.dampingType] }}
              </span>
            </div>
          </div>
        </div>

        <!-- 右栏:元件参数编辑 + 公差设置(08 tab 独立一份) -->
        <div class="min-w-0">
          <!-- 元件参数编辑器(双击 3D 元件可定位到对应输入框) -->
          <div v-if="store.components.length > 0" class="mt-3 lg:mt-0">
            <div class="text-xs sm:text-sm font-semibold text-gray-700 mb-2">⚙️ 元件参数编辑</div>
            <div class="flex flex-col gap-2">
              <div
                v-for="(comp, idx) in store.components"
                :id="'damp-comp-' + idx"
                :key="idx"
                :class="[
                  'p-2 rounded-lg border-2 transition-all',
                  focusedCompIndex === idx ? 'border-blue-500 bg-blue-50' : 'border-transparent',
                ]"
              >
                <label class="text-xs text-gray-600">{{ getComponentLabel(comp.type) }} #{{ idx + 1 }}</label>
                <div class="flex gap-1 items-center mt-1">
                  <input
                    type="number"
                    step="any"
                    :value="getCompDisplay(idx)"
                    class="w-full min-w-0 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    @input="onCompInput(idx, $event)"
                    @blur="onCompBlur(idx)"
                  />
                  <span class="text-xs text-gray-500 whitespace-nowrap">{{ getComponentUnit(comp.type) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="mt-3 lg:mt-0 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 leading-5">
            拖入元件后,在此编辑元件参数;双击 3D 元件可快速定位
          </div>

          <!-- 元件公差设置(独立于 03 tab 电路搭建) -->
          <div class="mt-3 p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3 mb-2">
              <div class="text-xs sm:text-sm font-semibold text-gray-700">🎯 元件公差</div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="toleranceEnabled" class="sr-only peer" @change="onToleranceToggle" />
                <div
                  class="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"
                ></div>
              </label>
              <span class="text-xs text-gray-500">{{ toleranceEnabled ? '已开启' : '已关闭' }}</span>
            </div>
            <div v-if="toleranceEnabled" class="flex items-center gap-3">
              <span class="text-xs text-gray-600 whitespace-nowrap">公差范围：</span>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                v-model.number="tolerancePercent"
                class="flex-1 cursor-pointer"
                @input="onToleranceChange"
              />
              <span class="text-xs font-semibold text-blue-600 min-w-[40px] text-right">±{{ tolerancePercent.toFixed(1) }}%</span>
            </div>
            <div v-if="toleranceEnabled" class="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">
              💡 开启后每次仿真实物参数将在标称值的 ±{{ tolerancePercent.toFixed(1) }}% 范围内随机波动
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useDampingCircuitStore } from '../stores/dampingCircuit'
import Circuit3DCanvas from './Circuit3DCanvas.vue'
import { renderComponentThumbs } from '../utils/circuit3d'

// 08 tab 电路搭建:直接使用 03 tab 同款 3D 实体模型(共享 Circuit3DCanvas + circuit3d 建模模块),
// 无 2D 画布;数据为独立一份(本页 store),与 03 tab 的电路互不影响
const store = useDampingCircuitStore()

// 元件库(货架式:3D 缩略图 + 名称;拖入 3D 实验台,触摸端可点选后点台面放置)
const componentTypes = [
  { type: 'R', name: '电阻' },
  { type: 'RV', name: '变阻器' },
  { type: 'L', name: '电感' },
  { type: 'C', name: '电容' },
  { type: 'CV', name: '可调电容' },
  { type: 'V', name: '信号源' },
]
const typeNameMap = { R: '电阻', RV: '变阻器', L: '电感', C: '电容', CV: '可调电容', V: '信号源' }
function typeName(type) {
  return typeNameMap[type] || type
}

// 3D 缩略图(离屏一次性渲染,模块级缓存;失败时降级显示类型字样)
const thumbs = ref(null)
let thumbTimer = null

const pendingPlaceType = ref(null) // 触摸端:点选元件后等待点台面放置
const focusedCompIndex = ref(null) // 双击 3D 元件定位的参数项高亮
const compInputValues = ref({}) // 输入中间态(避免 parseFloat 吞掉 "0." 等小数输入过程)

// 公差(独立一份,直写本页 store)
const toleranceEnabled = ref(store.toleranceEnabled)
const tolerancePercent = ref(store.tolerancePercent)

const simulation = computed(() => store.simulation)
const dampingTypeLabel = { under: '欠阻尼(衰减振荡)', critical: '临界阻尼(不振荡)', over: '过阻尼(不振荡)' }

let focusTimer = null

onMounted(() => {
  // 推迟到首帧之后:避免与主 3D 场景初始化争抢 WebGL 上下文
  thumbTimer = setTimeout(() => {
    thumbs.value = renderComponentThumbs()
  }, 30)
})

onBeforeUnmount(() => {
  clearTimeout(thumbTimer)
  clearTimeout(focusTimer)
})

function fmt(v, d = 2) {
  return Number.isFinite(v) ? Number(v).toFixed(d) : '—'
}

// ===== 元件库:HTML5 拖拽 / 触摸点选 =====
function handleDragStart(event, type) {
  event.dataTransfer.setData('componentType', type)
}
function selectPaletteComponent(type) {
  pendingPlaceType.value = pendingPlaceType.value === type ? null : type
}

// ===== 3D 交互事件:语义事件落 store,props 回流触发场景重建 =====
function onPlace({ type, x, y }) {
  store.addComponent(type, x, y)
  pendingPlaceType.value = null
}
function onMove({ index, x, y }) {
  store.moveComponent(index, x, y)
}
function onWire({ a, b }) {
  store.connectEndpoints(a, b)
}
function onDeleteComponent(index) {
  store.removeComponent(index)
  // 参数面板索引重排同步:高亮索引修正,输入中间态作废
  if (focusedCompIndex.value === index) focusedCompIndex.value = null
  else if (focusedCompIndex.value > index) focusedCompIndex.value--
  compInputValues.value = {}
}
function onDeleteWire(index) {
  store.removeWire(index)
}

// 双击 3D 元件:滚动到参数面板对应输入框并聚焦,短暂高亮提示
async function onFocusComponent(index) {
  focusedCompIndex.value = index
  compInputValues.value = {}
  await nextTick()
  const el = document.getElementById('damp-comp-' + index)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    const input = el.querySelector('input')
    if (input) input.focus({ preventScroll: true })
  }
  clearTimeout(focusTimer)
  focusTimer = setTimeout(() => {
    focusedCompIndex.value = null
  }, 2000)
}

// ===== 仿真与清空 =====
function onSimulate() {
  store.simulate() // 结果写入 store.simulation,由状态条呈现
}
function onReset() {
  store.resetCircuit()
  pendingPlaceType.value = null
  focusedCompIndex.value = null
  compInputValues.value = {}
}

// ===== 参数输入(中间态保留,失焦时钳制并写回) =====
function getCompDisplay(idx) {
  if (idx in compInputValues.value) return compInputValues.value[idx]
  return store.components[idx]?.value ?? ''
}
function onCompInput(idx, event) {
  compInputValues.value[idx] = event.target.value
}
function onCompBlur(idx) {
  const raw = compInputValues.value[idx]
  if (raw !== undefined) {
    store.updateComponentValue(idx, raw)
    delete compInputValues.value[idx]
  }
}

// ===== 公差切换(与 03 tab 相同交互,数据独立) =====
function onToleranceToggle() {
  store.toleranceEnabled = toleranceEnabled.value
  if (toleranceEnabled.value) {
    store.tolerancePercent = tolerancePercent.value
  }
}
function onToleranceChange() {
  store.tolerancePercent = tolerancePercent.value
}

// ===== 元件文案(与 03 tab 一致) =====
function getComponentLabel(type) {
  const labels = { R: '电阻 R', RV: '变阻器 RV', L: '电感 L', C: '电容 C', CV: '可调电容 CV', V: '电压 V' }
  return labels[type] || type
}
function getComponentUnit(type) {
  const units = { R: 'Ω', RV: 'Ω', L: 'mH', C: 'μF', CV: 'μF', V: 'V' }
  return units[type] || ''
}
</script>
