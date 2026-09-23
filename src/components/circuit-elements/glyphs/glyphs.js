// 2D 元件符号「符号即数据」(§9.1 core 边界:纯数据,零 Vue/DOM)。
// 每个 type 一份原语数组,供 glyphs/ComponentGlyph.vue 遍历渲染;未来换框架只需重写渲染器。
// 迁移自 CircuitBoard.vue 内联 SVG,造型/坐标系保持逐字一致(视觉零回归)。
export const GLYPH_VIEWBOX = '0 0 48 32'

// join=true 对应原 stroke-linejoin="round"(rect/带拐角 path 需圆角接头)。
export const GLYPHS = {
  R: {
    join: true,
    els: [
      { tag: 'line', attrs: { x1: 4, y1: 16, x2: 10, y2: 16 } },
      { tag: 'rect', attrs: { x: 10, y: 6, width: 28, height: 20 } },
      { tag: 'line', attrs: { x1: 38, y1: 16, x2: 44, y2: 16 } },
    ],
  },
  L: {
    join: true,
    els: [
      { tag: 'line', attrs: { x1: 4, y1: 16, x2: 10, y2: 16 } },
      { tag: 'path', attrs: { d: 'M10 16a4 4 0 0 1 8 0a4 4 0 0 1 8 0a4 4 0 0 1 8 0' } },
      { tag: 'line', attrs: { x1: 34, y1: 16, x2: 44, y2: 16 } },
    ],
  },
  C: {
    join: false,
    els: [
      { tag: 'line', attrs: { x1: 4, y1: 16, x2: 22, y2: 16 } },
      { tag: 'line', attrs: { x1: 22, y1: 6, x2: 22, y2: 26 } },
      { tag: 'line', attrs: { x1: 26, y1: 6, x2: 26, y2: 26 } },
      { tag: 'line', attrs: { x1: 26, y1: 16, x2: 44, y2: 16 } },
    ],
  },
  RV: {
    join: true,
    els: [
      { tag: 'line', attrs: { x1: 4, y1: 16, x2: 10, y2: 16 } },
      { tag: 'rect', attrs: { x: 10, y: 6, width: 28, height: 20 } },
      { tag: 'line', attrs: { x1: 16, y1: 22, x2: 30.5, y2: 11 } },
      { tag: 'path', attrs: { d: 'M26.2 8.9 L30.5 11 L27.5 15' } },
      { tag: 'line', attrs: { x1: 38, y1: 16, x2: 44, y2: 16 } },
    ],
  },
  CV: {
    join: false,
    els: [
      { tag: 'line', attrs: { x1: 4, y1: 16, x2: 13, y2: 16 } },
      { tag: 'line', attrs: { x1: 13, y1: 9, x2: 13, y2: 23 } },
      { tag: 'line', attrs: { x1: 22, y1: 9, x2: 22, y2: 23 } },
      { tag: 'line', attrs: { x1: 22, y1: 16, x2: 44, y2: 16 } },
      { tag: 'line', attrs: { x1: 15, y1: 21, x2: 20.5, y2: 10 } },
      { tag: 'path', attrs: { d: 'M17 8.8 L20.5 10 L18.6 13.9' } },
    ],
  },
  V: {
    join: true,
    els: [
      { tag: 'line', attrs: { x1: 4, y1: 16, x2: 12, y2: 16 } },
      { tag: 'circle', attrs: { cx: 24, cy: 16, r: 12 } },
      { tag: 'path', attrs: { d: 'M17 16q3.5-8 7 0t7 0' } },
      { tag: 'line', attrs: { x1: 36, y1: 16, x2: 44, y2: 16 } },
    ],
  },
}
