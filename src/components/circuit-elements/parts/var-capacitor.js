import { GLYPHS } from '../glyphs/glyphs.js'
import { drawVarCapacitor } from '../canvas/drawSymbol.js'
import { addVarCap } from '../three/circuit3d.js'

// 可调电容(介质可变电容器,存 μF,仿真语义同 C)
export const varCapacitor = {
  type: 'CV',
  meta: { name: '可调电容' },
  defaults: { value: 0.05 },
  glyph: GLYPHS.CV,
  drawSymbol: drawVarCapacitor,
  build3d: addVarCap,
}
