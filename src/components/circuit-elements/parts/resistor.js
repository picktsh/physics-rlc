import { GLYPHS } from '../glyphs/glyphs.js'
import { drawResistor } from '../canvas/drawSymbol.js'
import { addResistor } from '../three/circuit3d.js'

// 电阻（§5.2 Part Registry：一个元件一份自包含定义；单位/精度不在此，由 quantity.js 单一源）
export const resistor = {
  type: 'R',
  meta: { name: '电阻' },
  defaults: { value: 100 },
  glyph: GLYPHS.R, // 2D SVG 符号数据（palette）
  drawSymbol: drawResistor, // Canvas 2D（画布）
  build3d: addResistor, // Three.js 建模（已统一 3 参签名）
}
