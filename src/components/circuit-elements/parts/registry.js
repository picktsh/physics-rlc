// Part Registry:type → part 映射 + 由 parts 派生的单一数据源视图。
// 零 Vue(§9.1 core 边界),可被 store / 页面 / 未来发包共同消费。
import { resistor } from './resistor.js'
import { rheostat } from './rheostat.js'
import { inductor } from './inductor.js'
import { capacitor } from './capacitor.js'
import { varCapacitor } from './var-capacitor.js'
import { signalSource } from './signal-source.js'

// 货架顺序:左栏元件库排列即以此为准(勿随意重排,会影响两页视觉)
export const PART_LIST = [resistor, rheostat, inductor, capacitor, varCapacitor, signalSource]
export const PART_REGISTRY = Object.fromEntries(PART_LIST.map((p) => [p.type, p]))
export const getPart = (type) => PART_REGISTRY[type]

// 画布 2D 分派:调用方负责 save/translate/restore 与 strokeStyle/lineWidth 预设
export function drawComponentSymbol(ctx, comp, ct) {
  PART_REGISTRY[comp.type]?.drawSymbol(ctx, comp, ct)
}

// 3D 建模分派:统一经 parts.build3d(与 circuit3d.buildComponentModel 同源;供工具链/演练场消费)
export function buildModel3D(g, comp, ctx) {
  PART_REGISTRY[comp.type]?.build3d?.(g, comp, ctx)
}

// —— 以下元数据视图由 parts 派生(原 metadata/componentTypes.js 已并入 parts,保持对外同名) ——
export const COMPONENT_TYPES = PART_LIST.map((p) => ({ type: p.type, name: p.meta.name }))
const BY_TYPE = Object.fromEntries(COMPONENT_TYPES.map((c) => [c.type, c]))
export const getComponentName = (type) => BY_TYPE[type]?.name || type
export const getComponentLabel = (type) => (BY_TYPE[type] ? `${BY_TYPE[type].name} ${type}` : type)
export const DEFAULT_VALUES = Object.fromEntries(PART_LIST.map((p) => [p.type, p.defaults.value]))
