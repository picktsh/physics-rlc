<script setup>
// 元器件演练场(隐藏路由 /playground,不进菜单):与教学业务无关的视觉资产预览 + 3D 搭建沙盒。
// 2D/3D 图形均直读 Part Registry(单一源),用于验收元件全家桶与排查视觉回归。
import { ref, onMounted } from 'vue'
import { NButton, NIcon, NDropdown } from 'naive-ui'
import { TrashCan, Catalog } from '@vicons/carbon'
import Circuit3DCanvas from '@/components/Circuit3DCanvas.vue'
import {
  ComponentGlyph,
  ComponentThumb3D,
  COMPONENT_TYPES,
  getComponentLabel,
} from '@/components/circuit-elements'
import { renderComponentThumbs } from '@/components/circuit-elements/three/circuit3d.js'
import { CIRCUIT_PRESET_OPTIONS, findPreset } from '@/utils/circuitPresets'
import { useCircuitEditor } from '@/composables/useCircuitEditor'

const {
  components,
  wires,
  junctions,
  addComponent,
  moveComponent,
  removeComponent,
  removeWire,
  connectEndpoints,
  updateComponentValue,
  reset,
} = useCircuitEditor()

// 导入示例:与电路/阻尼页共用 circuitPresets 单一数据源,经编辑器装载到沙盒
const presetOptions = CIRCUIT_PRESET_OPTIONS
function applyPreset(id) {
  const preset = findPreset(id)
  if (!preset) return
  reset()
  const idxs = preset.components.map((c) => {
    const idx = addComponent(c.type, c.x, c.y)
    if (c.value != null) updateComponentValue(idx, c.value)
    return idx
  })
  preset.connections.forEach(([a, ea, b, eb]) =>
    connectEndpoints({ compIndex: idxs[a], epIndex: ea }, { compIndex: idxs[b], epIndex: eb })
  )
}

// 3D 缩略图:离屏渲染一次(模块级缓存),WebGL 不可用时降级为 type 字样
const thumbs = ref(null)
onMounted(() => {
  thumbs.value = renderComponentThumbs()
})

// 沙盒:点选元件 → 点 3D 台面放置
const pendingType = ref(null)
function pickType(t) {
  pendingType.value = pendingType.value === t ? null : t
}
function onPlace({ type, x, y }) {
  addComponent(type, x, y)
  pendingType.value = null
}
function onMove({ index, x, y }) {
  moveComponent(index, x, y)
}
function onWire({ a, b }) {
  connectEndpoints(a, b)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)]">
      <h2
        class="text-base font-bold leading-normal tracking-[0.5px] text-[var(--app-text)] [font-family:var(--app-font-heading)] border-l-4 border-l-[var(--app-brand)] mb-2"
      >
        元器件演练场
      </h2>
      <p class="text-xs leading-4 text-[color:var(--app-text-faint)]">
        与教学业务无关的视觉资产预览与搭建沙盒 · 下列 2D / 3D 图形全部读自 Part Registry(单一源)。
      </p>
    </section>

    <!-- 元件全家桶画廊:每个元件 2D 符号 + 3D 缩略图 并列 -->
    <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)]">
      <h3 class="mb-3 text-sm font-semibold text-[color:var(--app-text)]">元件图库（2D 符号 · 3D 缩略图）</h3>
      <div class="flex flex-wrap gap-3">
        <div
          v-for="comp in COMPONENT_TYPES"
          :key="comp.type"
          class="flex flex-col items-center gap-2 rounded-lg border border-[color:var(--app-border)] bg-[var(--app-surface-sunken)] p-3"
        >
          <div class="text-xs font-medium text-[color:var(--app-text-muted)]">{{ getComponentLabel(comp.type) }}</div>
          <ComponentGlyph :type="comp.type" />
          <ComponentThumb3D :type="comp.type" :src="thumbs && thumbs[comp.type]" />
        </div>
      </div>
    </section>

    <!-- 3D 搭建沙盒:直接经 registry 建模,验证元件在真实画布/场景中的摆放与连线效果 -->
    <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)]">
      <div class="mb-3 flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-[color:var(--app-text)]">3D 搭建沙盒</h3>
        <div class="flex items-center gap-2">
          <NDropdown trigger="click" :options="presetOptions" @select="applyPreset">
            <NButton secondary>
              <template #icon><NIcon :component="Catalog" /></template>
              导入示例
            </NButton>
          </NDropdown>
          <NButton secondary type="error" @click="reset">
            <template #icon><NIcon :component="TrashCan" /></template>
            清空
          </NButton>
        </div>
      </div>
      <div class="palette mb-3 flex flex-wrap gap-2">
        <button
          v-for="comp in COMPONENT_TYPES"
          :key="comp.type"
          type="button"
          :class="[
            'flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-all',
            pendingType === comp.type
              ? 'border-[color:var(--app-primary)] bg-[var(--app-surface-brand)] text-[color:var(--app-brand-strong)]'
              : 'border-[color:var(--app-border-dark)] bg-[var(--app-surface-sunken)] text-[color:var(--app-text-muted)] hover:bg-[var(--app-surface-muted)]',
          ]"
          @click="pickType(comp.type)"
        >
          <ComponentGlyph :type="comp.type" />
          <span>{{ comp.name }}</span>
        </button>
      </div>
      <Circuit3DCanvas
        :components="components"
        :wires="wires"
        :junctions="junctions"
        interactive
        dropzone
        :pending-type="pendingType"
        empty-text="点上方元件,再点击台面放置;可自由搭建查看 2D/3D 效果"
        @place="onPlace"
        @move="onMove"
        @wire="onWire"
        @delete-component="removeComponent"
        @delete-wire="removeWire"
      />
    </section>
  </div>
</template>
