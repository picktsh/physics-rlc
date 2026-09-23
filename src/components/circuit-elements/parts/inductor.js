import { GLYPHS } from '../glyphs/glyphs.js'
import { drawInductor } from '../canvas/drawSymbol.js'
import { addInductor } from '../three/circuit3d.js'

// 电感(工字线圈,存 H)
export const inductor = {
  type: 'L',
  meta: { name: '电感' },
  defaults: { value: 0.1 },
  glyph: GLYPHS.L,
  drawSymbol: drawInductor,
  build3d: addInductor,
}
