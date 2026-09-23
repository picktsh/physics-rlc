<script setup>
// 2D 元件符号薄渲染器(§9.1:仅 ~20 行遍历数据渲染,不含逻辑/事件)。
// 换框架时只需按 glyphs/glyphs.js 重写此渲染器。默认色沿用原内联 SVG 的 #2563eb,可经 color prop 主题化。
import { computed } from 'vue'
import { GLYPHS, GLYPH_VIEWBOX } from './glyphs.js'
import { getPart } from '../parts/registry.js'

const props = defineProps({
  type: { type: String, required: true },
  color: { type: String, default: '#2563eb' },
})

// glyph 经 Part Registry 取(parts 为单一源);未知 type 回落信号源符号(与原模板 v-else 分支一致)
const spec = computed(() => getPart(props.type)?.glyph || GLYPHS.V)
</script>

<template>
  <svg
    :viewBox="GLYPH_VIEWBOX"
    class="w-14 h-10"
    fill="none"
    :stroke="color"
    stroke-width="2"
    stroke-linecap="round"
    :stroke-linejoin="spec.join ? 'round' : undefined"
  >
    <component :is="el.tag" v-for="(el, i) in spec.els" :key="i" v-bind="el.attrs" />
  </svg>
</template>
