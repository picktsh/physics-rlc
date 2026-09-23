// 元器件视觉资产统一出口。core 数据(.js 零 Vue)与 vue 薄组件按此边界导出。
// 元数据/默认值/画布绘制分派均来自 parts/registry(单一源);store 等非组件消费方请直接 import parts/registry.js,避免经此拉入 .vue。
export * from './parts/registry.js'
export { GLYPHS, GLYPH_VIEWBOX } from './glyphs/glyphs.js'
export { default as ComponentGlyph } from './glyphs/ComponentGlyph.vue'
export { default as ComponentThumb3D } from './three/ComponentThumb3D.vue'
