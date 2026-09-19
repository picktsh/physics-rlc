/**
 * 电路搭建「导入示例」预置数据 —— 03 电路页与 08 阻尼页共用同一套串联 RLC 布局。
 *
 * 为什么共享:两页元件数据形状一致({type,x,y,value,endpoints}),端点固定为 (x±30, y);
 * 拓扑同为「信号源 V → R → L → C → 回 V」单回路,仅 R 取值不同以覆盖欠/临界/过阻尼三种工况,
 * 免去每次手动拖放+接线。connections 用 [元件下标, 端点下标(0左/1右), 元件下标, 端点下标] 描述连线对。
 *
 * 坐标口径:矩形回路,画布坐标 x∈[60,280] y∈[60,140],适配 2D 画布;3D 场景经 ctx 自动居中缩放,不受绝对值影响。
 * 阻尼量级(L=100mH=0.1H、C=0.1μF=1e-7F):ω₀=1/√(LC)=1e4 rad/s,临界 R=2√(L/C)=2000Ω。
 */
export const CIRCUIT_PRESETS = [
  {
    id: 'under',
    name: '示例1 · 欠阻尼（衰减振荡）',
    components: [
      { type: 'V', x: 90, y: 140 },
      { type: 'R', x: 250, y: 140, value: 50 },
      { type: 'L', x: 250, y: 60 },
      { type: 'C', x: 90, y: 60, value: 0.1 },
    ],
    connections: [
      [0, 1, 1, 0], // V右 → R左（下边）
      [1, 1, 2, 1], // R右 → L右（右边·竖）
      [2, 0, 3, 1], // L左 → C右（上边）
      [3, 0, 0, 0], // C左 → V左（左边·竖，闭合）
    ],
  },
  {
    id: 'critical',
    name: '示例2 · 临界阻尼（不振荡）',
    components: [
      { type: 'V', x: 90, y: 140 },
      { type: 'R', x: 250, y: 140, value: 2000 },
      { type: 'L', x: 250, y: 60 },
      { type: 'C', x: 90, y: 60, value: 0.1 },
    ],
    connections: [
      [0, 1, 1, 0],
      [1, 1, 2, 1],
      [2, 0, 3, 1],
      [3, 0, 0, 0],
    ],
  },
  {
    id: 'over',
    name: '示例3 · 过阻尼（缓慢衰减）',
    components: [
      { type: 'V', x: 90, y: 140 },
      { type: 'R', x: 250, y: 140, value: 5000 },
      { type: 'L', x: 250, y: 60 },
      { type: 'C', x: 90, y: 60, value: 0.1 },
    ],
    connections: [
      [0, 1, 1, 0],
      [1, 1, 2, 1],
      [2, 0, 3, 1],
      [3, 0, 0, 0],
    ],
  },
]

// NDropdown 选项(以 id 为 key,供两页共用)
export const CIRCUIT_PRESET_OPTIONS = CIRCUIT_PRESETS.map((p) => ({ label: p.name, key: p.id }))

export function findPreset(id) {
  return CIRCUIT_PRESETS.find((p) => p.id === id) || null
}
