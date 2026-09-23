<script setup>
// 3D 元件缩略图展示壳(纯展示:离屏渲染的 base64 PNG 有则显示,无则降级为 type 字样)。
// 缩略图的生成仍由 utils/circuit3d.js 的 renderComponentThumbs 负责(Phase 1 迁入 three/),此壳不碰渲染。
defineProps({
  type: { type: String, required: true },
  src: { type: String, default: null },
})
</script>

<template>
  <img
    v-if="src"
    :src="src"
    draggable="false"
    alt=""
    class="w-16 h-16 object-contain pointer-events-none select-none"
  />
  <span v-else class="w-16 h-16 flex items-center justify-center text-xl font-bold text-[color:var(--app-text-faint)]">
    {{ type }}
  </span>
</template>
