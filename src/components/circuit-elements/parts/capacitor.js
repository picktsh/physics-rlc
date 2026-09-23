import { GLYPHS } from '../glyphs/glyphs.js'
import { drawCapacitor } from '../canvas/drawSymbol.js'
import { addFilmCap } from '../three/circuit3d.js'

// 电容(薄膜电容,存 μF)
export const capacitor = {
  type: 'C',
  meta: { name: '电容' },
  defaults: { value: 0.05 },
  glyph: GLYPHS.C,
  drawSymbol: drawCapacitor,
  build3d: addFilmCap,
}
