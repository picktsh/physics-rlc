import { GLYPHS } from '../glyphs/glyphs.js'
import { drawRheostat } from '../canvas/drawSymbol.js'
import { addRheostat } from '../three/circuit3d.js'

// 变阻器(滑线变阻器,仿真语义同 R)
export const rheostat = {
  type: 'RV',
  meta: { name: '变阻器' },
  defaults: { value: 100 },
  glyph: GLYPHS.RV,
  drawSymbol: drawRheostat,
  build3d: addRheostat,
}
