import { GLYPHS } from '../glyphs/glyphs.js'
import { drawSignalSource } from '../canvas/drawSymbol.js'
import { addSource } from '../three/circuit3d.js'

// 信号源(交流电压源,幅值存 V;波形/频率等编辑属编辑层,不入本定义)
export const signalSource = {
  type: 'V',
  meta: { name: '信号源' },
  defaults: { value: 0.9 },
  glyph: GLYPHS.V,
  drawSymbol: drawSignalSource,
  build3d: addSource,
}
