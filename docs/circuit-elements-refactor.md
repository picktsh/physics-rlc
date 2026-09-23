# 元器件视觉资产与电路数据层架构演进规划

> 状态：**Phase 0 / 1a / 1b 均已完成（2026-09-23，`pnpm build` 绿 + 无 lint）；隐藏路由 `/playground` 演练场已上线；拖放 ghost 预览已同步三页（演练场/电路/阻尼）；`useCircuitEditor` builder 种子已落**。**未完成**：四主题视觉走查验收、Phase 2（数据层）、Phase 3（统一编辑器/自动排列）、§11 交互优化待办、Phase 4 发包（延后）。下次开工：先推 §11 交互优化（不依赖数据层、收益高），再进 Phase 2（需先对 ID/schema 口径 grill）。
> 创建：2026-09-19 · 末次更新：2026-09-23（**1b**：circuit3d.js 经 `git mv` 迁入 `three/circuit3d.js`，两个消费方（Circuit3DCanvas/damping）改路径；新增 `addResistor` 统一 R 的 CFG.R 特例；6 个 part 补齐 `build3d`，registry 新增 `buildModel3D`。**演练场**：`/playground` 隐藏路由（router 直注册、不进 nav）+ `views/playground/index.vue`（2D/3D 图库 + 3D 搭建沙盒）。**builder 种子**：`composables/useCircuitEditor.js` 纯结构编辑工厂，暂供演练场用，两页尚未并入）
> 背景任务：电路搭建页（/circuit）与阻尼实验页（/damping）左侧元件库重复代码抽离，
> 延伸为整个"元件视觉 + 电路数据 + 编辑器"的分层架构规划。

---

## 0. 速览（TL;DR）

| 项 | 结论 | 详见 |
| --- | --- | --- |
| 三方库用不用？ | ❌ 全部否决（含 @tscircuit/schematic-symbols：仅 2D、风格不匹配、无 3D），自研 | §4 |
| 抽离原则 | 展示层（circuit-elements，纯视觉无事件）/ 编辑层（views，事件状态）分离 | §3 |
| 核心组织模式 | Part Registry：一个元件一份自包含定义（元数据+2D+canvas+3D） | §5.2 |
| 数据要不要独立？ | 要。版本化 JSON schema + 稳定 ID 引用 + 导出/导入，分析/渲染只消费数据 | §5.4 |
| 依赖策略 | three = peerDependency；core 零 Vue（符号即数据）；ID 用原生 crypto.randomUUID；zod 仅候选需确认 | §9 |
| 下一步 | ~~Phase 0~~ **已完成**；下次开工 Phase 1（Part Registry：drawCircuit 拆 `canvas/drawSymbol.js`、circuit3d.js 迁入 `three/`、元数据并入 parts） | §6 |
| 发现的潜伏 bug | 删除元件时导线数组下标不 remap（circuit 页）；Phase 2 修 | §2.3 |
| 自动排列？ | 规划编辑层一键「整理布局」：仅改几何不改拓扑，分 P0 网格吸附 / P1 正交布线 / P2 拓扑布局 三档 | §5.5 |

---

## 1. 背景与目标

- 两页元件库（拖拽货架、元数据、交互逻辑、浮层 CSS）高度重复（~95% 一致），前期 AI 生成，缺乏统一抽象，可靠性存疑。
- 项目实际存在**三层元件视觉**散落在不同文件：2D SVG（palette）、2D Canvas（画布绘制）、3D Three.js（实体模型 + 缩略图）。
- 目标：
  1. 抽离共享的元器件视觉资产，理清「展示层 vs 编辑层」职责边界；
  2. 建立可导出/导入的版本化电路数据格式，让仿真分析、渲染、编辑各模块解耦；
  3. 远期视社区价值发布 npm 包（教育场景元件视觉全家桶）。

## 2. 现状分析

### 2.1 两页元件库对比（重复度）

| 维度 | CircuitBoard.vue (L5-116) | damping/index.vue (L14-45) | 结论 |
| --- | --- | --- | --- |
| 容器骨架 + palette-float | 一致（circuit 多一个无 CSS 定义的残留 class `components-palette`） | 同 | 可统一 |
| `componentTypes` 数组 | L360-367 | L555-563 | **逐字一致** |
| `handleDragStart` / `selectPaletteComponent` | L369-380 | L814-820 | 逻辑等价 |
| `getComponentLabel` / `getComponentUnit` | L1199-1207 | L919-927 | 数据一致，各抄一份 |
| 缩略图渲染 | 6 段内联 2D SVG（~90 行） | 3D base64 图 + 文字降级 | **唯一实质差异** |
| `.palette-float` scoped CSS | L1226-1252 | L1355-1381 | 仅 `width: 80px` vs `86px` 之差 |
| 公差设置块 | L242-271 | L212-241 | ~98% 一致（emoji 不同） |
| 元件参数编辑块 | 简单 value 输入 | 多信号源波形子表单 | 差异大，暂不抽 |

### 2.2 三层视觉资产盘点

| 层 | 当前位置 | 形态 |
| --- | --- | --- |
| 2D SVG 符号 | CircuitBoard.vue L25-113 | 内联模板（palette 用） |
| 2D Canvas 绘制 | CircuitBoard.vue `drawCircuit()` L870+ | Canvas 路径（画布上渲染元件） |
| 3D 模型 | utils/circuit3d.js L44-430 | Three.js parametric builders |
| 3D 缩略图 | utils/circuit3d.js `renderComponentThumbs()` L446-514 | 离屏 WebGL → base64 PNG（模块级缓存） |
| 元数据 | 两页各抄一份 | type/name/label/unit/default/range |

### 2.3 现有数据模型的三个隐患（审查发现）

1. **ID 生成**：`Date.now() + Math.random()` → 同毫秒碰撞风险、不可测试复现。应改用原生 `crypto.randomUUID()`（见 §9）。
2. **下标引用**：wires 以数组下标引用元件/节点（`comp1/comp2/junc1/junc2`），删除元件时
   CircuitBoard 只 filter 关联导线、**不 remap 其余下标** → 潜伏错位 bug（dampingCircuit store 的
   `removeComponent` 有 remap 逻辑，两边行为不一致）。应改稳定 ID 引用。
3. **无 schema 版本**：历史数据（IndexedDB 仿真记录）与未来导出文件没有迁移抓手。应加 `schemaVersion` + migrate。

## 3. 设计原则（本次确立）

- **展示层无状态**：`src/components/circuit-elements/` 只回答"长什么样"（纯 SVG/img/Three.js 几何），零事件、零业务。
- **编辑层归页面**：drag/click/pendingPlaceType/仿真校验等交互状态由 `src/views/` 组件编写。
- **单一数据源**：元件元数据全项目只定义一次，palette / canvas / 3D / 参数面板共同消费。
- **数据先行**：电路数据格式（schema）独立于渲染与分析，支持导出/导入，下游模块只消费数据。

## 4. 三方库调研结论（已否决，留档）

| 库 | 结论 | 原因 |
| --- | --- | --- |
| @vicons/carbon | ❌ | 通用 UI 图标体系，无 GB/IEC 电路原理图符号 |
| @tscircuit/schematic-symbols | ❌ | 仅 2D 线条（IEEE zigzag 风格≠国标矩形）；带 {REF}/{VAL}/端口标注需剥离；v0.x 不稳定；无 3D；坐标系归一化需适配；依赖链私有 |
| netlistsvg | ❌ | JSON 网表→整图渲染工具，不是元件图标库 |
| SchemDraw (Python) | ❌ | Python 生态，前端不能直接用（可作符号造型参考） |
| Inkscape Electric Symbols | ❌ | 桌面工具资产，提取 path 工程量大 |

**决策：自研维护。** 现有手写 SVG + Three.js 建模质量已达标，按 Part Registry 规范化即可；
教育级拟实物 3D（色环电阻/工字电感/滑线变阻器）市面无替代品，恰是未来自研包的差异化价值。

社区经验借鉴点（取其思想，不取其包）：
- **KiCad / Fritzing**：零件库组织——一个元件一份自包含定义（symbol + 3D + 元数据）→ 我们的 Part Registry。
- **tscircuit circuit-json**：数据格式单一真源、所有渲染器/分析器都消费同一 JSON → 我们的数据层。
- **Rule of Three**：同一逻辑出现第三次才抽包 → npm 发布延后到第二个消费项目出现。

## 5. 目标架构

### 5.1 分层蓝图

```
┌───────────────────────────────────────────────┐
│ analysis/  分析层：仿真计算/波形/误差（纯函数）│
├───────────────────────────────────────────────┤
│ builder/   编辑层：2D/3D 拖拽搭建交互（Vue）  │
├───────────────────────────────────────────────┤
│ data/      数据层：schema + 序列化 + 迁移校验  │ ← 全系统单一真源
├───────────────────────────────────────────────┤
│ elements/  视觉层：2D SVG / Canvas / 3D 建模   │
└───────────────────────────────────────────────┘
```

依赖方向：builder/analysis 依赖 data；elements 独立无依赖；任何层不反向依赖页面。

### 5.2 Part Registry（核心模式）

每个元件一份自包含定义，聚合全部视觉与元数据：

```js
// circuit-elements/parts/resistor.js
export const resistor = {
  type: 'R',
  meta: { name: '电阻', label: '电阻 R', unit: 'Ω' },
  defaults: { value: 100 },
  range: null, // 或 { min, max }，如 RV: {min:10,max:1000}
  ports: 2, // 端点数
  glyph: resistorGlyph, // 2D SVG（palette 用）
  drawSymbol: drawResistor, // Canvas 2D（画布用）
  build3d: addAxialResistor, // Three.js（3D 场景/缩略图用）
}
```

好处：新增元件只写一个文件；三层视觉永远同步演进；未来发包即按此结构。

### 5.3 目录规划（渐进落地，不一步到位）

```
src/components/circuit-elements/
├── index.js                  ← 统一导出
├── parts/                    ← Phase 1: Part Registry 各元件定义
│   ├── resistor.js / rheostat.js / inductor.js
│   ├── capacitor.js / var-capacitor.js / signal-source.js
│   └── registry.js           ← type → part 映射表
├── glyphs/
│   └── ComponentGlyph.vue    ← Phase 0: 按 type 渲染 2D SVG（纯展示）
├── canvas/
│   └── drawSymbol.js         ← Phase 1: 从 drawCircuit() 拆出的元件绘制器
├── three/
│   └── (circuit3d.js 迁入重组) ← Phase 1: builders + renderThumbs
└── metadata/
    └── componentTypes.js     ← Phase 0: 过渡期元数据单一源（Phase 1 并入 parts）

src/utils/circuit-data/       ← Phase 2: 数据层（框架无关）
├── schema.js                 ← 电路 JSON schema + 校验（zod 或手写 validator，见 §9）
├── serialize.js              ← 导出/导入（含 schemaVersion 迁移）
└── ids.js                    ← crypto.randomUUID 封装（零依赖）
```

### 5.4 数据格式 v2（Phase 2 目标）

```jsonc
{
  "schemaVersion": 2,
  "meta": { "createdAt": "...", "author": "...", "source": "physics-rlc" },
  "components": [
    { "id": "a1B2c3", "type": "R", "x": 100, "y": 80, "value": 100,
      "ports": { "p1": { "x": 70, "y": 80 }, "p2": { "x": 130, "y": 80 } } }
  ],
  "junctions": [ { "id": "d4E5f6", "x": 200, "y": 120 } ],
  "wires": [
    // 端点引用改为稳定 ID：{ kind: "port"|"junction", ref: "<id>", port?: "p1"|"p2" }
    { "id": "g7H8i9", "from": { "kind": "port", "ref": "a1B2c3", "port": "p2" },
      "to": { "kind": "junction", "ref": "d4E5f6" }, "vertices": [] }
  ]
}
```

- v1（现状）→ v2 迁移函数放 `serialize.js`，读取历史 IndexedDB 记录时自动升级；
- 导出即 `JSON.stringify`，导入走 schema 校验（zod 或手写 validator，见 §9）+ 迁移；文件扩展名建议 `.rlccircuit.json`。

### 5.5 自动排列 / 整理布局（Auto-Arrange，编辑层能力）

**问题**：拖拽手摆元件费时，易出现重叠、间距不均、导线斜穿交叉；教学演示要求电路图「摆得正、连得清」。

**目标**：一键把当前电路重排到规范位置——网格对齐、间距一致、导线正交——同时**绝不改变电气连接关系**。

**第一不变量（硬约束）：拓扑守恒**。自动排列只改几何字段（component.x/y、port 坐标、wire.vertices），
不改连接语义（wire.from/to 引用的 port/junction ID 一律不动）。排完可用 netlist（§8 预留导出）比对，
连线关系必须逐条相等。这也是 §5.4 把「几何」与「连通」分开存储的最大受益点——数据格式天生支持"只重排不改线"。

**分档实现（复杂度 / 收益权衡，渐进落地）**：

| 档 | 能力 | 算法 | 归入 | 依赖 |
| --- | --- | --- | --- | --- |
| **P0** | 网格吸附 + 选中对齐 / 等间距 | 纯几何取整，无图算法 | Phase 3 | 无 |
| **P1** | 正交布线（曼哈顿路由）+ 避障 | L/Z 形优先，退化走栅格 A*；导线绕开元件 body | Phase 3 后期 | 需元件包围盒 |
| **P2** | 拓扑感知整图自动布局 | 按网表分层（源→负载，左到右/上到下），类 dagre 思路 | 单独排期 | 需从数据层构图 |

**P0 细则（先做这个，性价比最高）**：
- 统一**网格螺距** `GRID_PITCH`（建议电路坐标 20，见下）；吸附 = `round(x/PITCH)*PITCH`。
- 元件按两端口连线方向归正：水平或垂直放置，端口间距取 `k*PITCH`（k 整数），使所有端口落在网格点上。
- 选中多元件提供「左/顶对齐 · 水平/垂直等间距」，仅平移不旋转。

**为什么先严端口吸附**：端口全部落网格点后，P1 的曼哈顿布线才能沿网格线走直线/直角，交叉与斜线大幅减少——
这是 P0→P1 顺滑衔接的关键，故 P0 必须把端口吸附做到位。

**栅格与布局参数入数据层**：`GRID_PITCH`、最小元件间距、导线最小间距等属「口径常量」，
随 §5.3 `circuit-data/` 一起维护（建议新增 `layout.js`），编辑层 / 渲染层共同消费，避免两处各写各的。

**触发时机（按体验取舍）**：
- 手动「整理布局」按钮（主，可控，契合教学「边摆边讲」）；
- 拖放落点即时吸附（P0 即开，低成本高收益）；
- 整图自动布局（P2）仅在导入外部网表 / 新建示例时用，不做实时（实时重排会让用户失去位置心智）。

**风险与坑**：
1. 元件朝向改变后，其 2D/3D 绘制与 `ports` 局部坐标必须同步旋转，否则端口错位 → 排完校验每个 port 世界坐标 = 元件位姿 × 局部端口。
2. P1 避障改线后 junction 可能悬空或重叠，布线完顺带清理冗余 junction。
3. 自动排列属**编辑层（builder）**功能，**不进 elements 视觉层、不进 data schema**——data 只存最终几何结果与口径常量，不存「怎么排的」过程。

## 6. 分轮执行计划

| 轮次 | 内容 | 规模 | 验收 |
| --- | --- | --- | --- |
| **Phase 0 ✅** | `metadata/componentTypes.js` + `glyphs/ComponentGlyph.vue`；两页 palette 改为引用；damping 3D 图抽 `ComponentThumb3D.vue`（纯展示）——**已完成** | ~半天 | 两页视觉零回归；palette 内联 SVG 清空 |
| Phase 1 ✅ | **1a。已完成**：`drawCircuit()` 元件段拆 `canvas/drawSymbol.js`；`parts/` 6 元件定义 + `parts/registry.js` 单一源（派生 COMPONENT_TYPES/DEFAULT_VALUES/drawComponentSymbol）；metadata 并入。**1b。已完成**：`circuit3d.js` 经 git mv 迁入 `three/`；6 part 补 `build3d`；registry 加 `buildModel3D` | 1b ~半天 | 三层视觉同源于 parts/；仿真行为不变 |
| Phase 2 | 数据层：schema + ID 引用改造 + 导出/导入 + v1→v2 迁移 | ~2-3 天 | 导出文件可回读；历史记录兼容；删除元件无下标漂移 |
| Phase 3 | 统一编辑器：palette 容器 + Circuit3DCanvas 交互收敛为 builder 模块，两页共用一份；并入 §5.5 自动排列 P0（网格吸附 + 对齐） | 单独排期 | 两页电路编辑行为一致，页面只留业务差异；一键整理布局不改变拓扑 |
| Phase 4 | npm 包（如 `@picktsh/circuit-elements`）：core 框架无关 + vue-adapter；Storybook + 文档 | **触发条件：出现第二个消费项目** | — |

## 7. 注意事项与坑（务必带上）

1. **palette-float 宽度**：circuit 80px vs damping 86px，统一前跟设计确认预期值（大概率取 86，3D 图更大）。
2. **`renderComponentThumbs` 模块级 `thumbCache`**：迁目录后注意 Vite HMR 缓存不失效问题（可挂 `import.meta.hot`）。
3. **Canvas 状态**：`drawCircuit()` 中元件绘制与导线绘制共享 ctx 状态（translate/save/restore），拆 drawSymbol 时保持 save/restore 边界。
4. **信号源波形编辑是编辑层功能**（damping 独有），不要误抽进 elements。
5. **历史数据兼容**：`historyDB` 已存的仿真记录、两 store 的持久化结构在 Phase 2 改 ID 引用时必须提供迁移，不能假设数据可丢。
6. **新依赖需确认**（团队契约）：ID 生成用原生 `crypto.randomUUID()`，零依赖；Phase 2 若选 zod 做 schema 校验，届时先提方案（含手写 validator 备选）说明理由再装，详见 §9 依赖分析。
7. **3D 与 2D 坐标空间**：电路坐标经 `ctx.wx/wz` 映射进 3D 世界，数据层存**电路坐标**，永不存屏幕/世界坐标。
8. **下标→ID 改造顺序**：先 store 内部双写（index + id），页面切读 id，最后删 index 字段，避免一次大爆改。

## 8. 做大做强：开源规划（远期）

- **定位**：中文物理教学场景的元件视觉全家桶——2D symbol + Canvas 绘制器 + 教育级拟实物 3D 模型 + 电路数据 schema，一体化且 GB 国标风格，市面空白。
- **差异化**：tscircuit 面向真实 EDA（IEEE 风格/PCB 制造），我们面向教学演示（拟实物、可交互、中英术语对照）。
- **包结构预案**：
  - `core`：parts registry（框架无关：SVG path 数据 + Canvas 绘制函数 + Three.js builder）
  - `data`：schema + serialize（框架无关）
  - `vue`：ComponentGlyph / ComponentThumb3D / palette 适配组件
  - 后续可加 `react` 适配层
- **发布前置**：Phase 0-2 内部稳定 → 补单测（symbol 快照 / 数据 roundtrip）→ Storybook 展示台 → 文档。
- **生态钩子**：数据格式设计时预留 `netlist` 导出接口（→SPICE 文本），可与 Falstad/LTspice 教学生态互通，提升包的社区吸引力。

## 9. 依赖分析（关键决策：能否脱离 Vue）

### 9.1 结论

**core 必须零 Vue 依赖，可以做到。** 手法是「符号即数据」：
2D 符号不写成 `.vue` 组件，而是存为纯 JS 数据（viewBox + primitives 数组），
`ComponentGlyph.vue` 只是一个遍历数据渲染 `<svg>` 的 ~20 行通用渲染器。
换框架只需重写这 20 行渲染器（React/Svelte/vanilla 皆可）。
Canvas 绘制器与 Three.js builder 本身就是纯函数，天然框架无关。
（tscircuit 的 schematic-symbols 正是这个思路：primitives JSON → getSvg()，我们借思路、用自研数据。）

### 9.2 依赖矩阵

| 依赖 | 用途 | 形态 | 理由 |
| --- | --- | --- | --- |
| **three** | 3D builder + 缩略图渲染 | `three/` 子模块的 **peerDependency** | 版本由宿主应用掌控，避免包内/应用双实例（WebGL 上下文与材质缓存会炸）；不用 3D 子模块的消费者完全不加载它（subpath exports + tree-shaking） |
| **vue** | 仅适配层薄壳组件（ComponentGlyph / ComponentThumb3D / palette） | `vue/` 子模块的 peerDependency | core 与 data 零 vue；这是发布 npm 包时的核心卖点 |
| **zod** | Phase 2 数据 schema 校验 | 候选，**引入前按团队契约单独确认** | 备选：手写 ~50 行 validator（电路 schema 小而稳定，手写成本可控，符合「优先不引依赖」自律条款） |
| **ID 生成** | Phase 2 稳定 ID | **零依赖：`crypto.randomUUID()`** | 原生 API，现代浏览器全支持（含 iOS Safari 15.4+），不引入 nanoid |
| naive-ui / @vicons | 无 | ❌ 不依赖 | elements 层不用任何 UI 框架组件与图标 |

### 9.3 未来发包的导出结构（subpath exports）

```
@picktsh/circuit-elements
├── ./core   → parts registry（元数据 + SVG 数据 + canvas 绘制函数）  零依赖
├── ./three  → 3D builders + renderThumbs                            peer: three
├── ./data   → schema + serialize + 迁移                              零依赖
└── ./vue    → Glyph/Thumb/palette 适配组件                           peer: vue
```

内部目录（§5.3）从 Phase 0 起就按此边界组织（core 文件里不 import vue），发包时只是挪仓库拆 subpath，零重构。

### 9.4 当前项目内的现实约束

- three 已是现有依赖（`package.json`），无新增成本；
- 项目内消费方全是 Vue3，短期「脱离 Vue」不产生直接收益——它的收益在 Phase 4 发包与跨项目复用时兑现；
- 唯一要求：**Phase 0/1 写代码时守住边界**（数据文件不混入组件、builder 不引用 DOM/Vue ref），违反成本是将来大重构。

## 10. 参考资料（本次调研留档）

- @tscircuit/schematic-symbols：https://github.com/tscircuit/schematic-symbols （在线图库可对比风格）
- circuit-json（tscircuit 数据格式思想来源）：https://github.com/tscircuit/circuit-json
- netlistsvg：https://github.com/nturley/netlistsvg
- SchemDraw（Python，符号造型参考）：https://bitbucket.org/cdelker/schemdraw
- Inkscape Electric Symbols：https://github.com/piksel/Inkscape_electric_Symbols
- 本项目关键文件：`src/views/circuit/components/CircuitBoard.vue`、`src/views/damping/index.vue`、`src/utils/circuit3d.js`、`src/stores/rlcCalculator.js`、`src/stores/dampingCircuit.js`

## 11. 交互优化待办（下次继续，需逐条审核）

> 目标：把电路编辑的交互从「顶部模式按钮 + 盲操作」升级为「就地、有反馈、移动可用」。
> 归属：编辑层（builder / Phase 3 收敛后统一落到 `useCircuitEditor` + Circuit3DCanvas/CircuitBoard），**不进 elements 视觉层、不进 data schema**。
> 硬约束：**每条都要同时给 PC 与移动端方案**；触屏无 hover，一切“悬停反馈”在移动端都要有“点选/长按”等价物（参 memory：触屏用 `@media (hover: none)` 而非宽度断点）。

### 11.1 用户已明确记录的两条
1. **就地上下文菜单取代顶部 [连线]/[删除] 模式按钮**：在画布里点元件/端点/连线 → 在命中位置弹出该对象的操作菜单（连线 / 改值 / 删除 / 加节点…），不再先去顶部切模式再点。
   - PC：右键或左键命中即弹 `NPopover`/`NDropdown`（锚在命中点）；ESC 关闭。
   - 移动端：单击命中即弹**底部动作条**（`NDrawer` 底部或 `NPopover` 锚在对象上），拇指可达；避免依赖右键。
2. **可操作对象的悬停 UI 反馈**：鼠标移入元件/连接点/连线时给描边/高亮/光标变化，明确“可点”。
   - PC：2D canvas 命中测试重绘高亮（描边/加粗/端点放大）+ `cursor:pointer`；3D 用 Raycaster hover 改 `emissive`/描边。
   - 移动端：无 hover → 改为“点选=选中并常驻高亮 + 显示操作手柄/浮层”，命中半径沿用现有 `hitScale≈1.6` 放大。

### 11.2 建议追加的交互优化（供审核，按需勾选）
1. **接线橡皮筋预览**：从端点拖出/点选端点后，跟随指针画一条预览线到候选终点，可吸附的邻近端点高亮；再点落点成线、ESC/点空白取消（替代现在“点两端、中间无反馈”）。
2. **选中态可视化统一**：选中元件/连线有持续高亮（3D 目前无选中框，2D 有虚线框）；为多选/框选打基础（服务 §5.5 自动排列 P0）。
3. **破坏性操作可撤销**：删除元件/清空改用 undo 轻提示（naive notification 带“撤销”），替代确认弹窗，降误触。
4. **放置合法性反馈**：拖放 ghost 落点重叠/越界/未吸附时变红，合法时变主色（现有 ghost 只做位置预览，未判合法性）。
5. **仿真失败定位**：校验不通过时把问题元件红描边 + 点击滚动定位（现仅文字提示）。
6. **参数面板联动**：选中/双击元件时右栏参数项自动滚动并高亮（damping 已有 focus 定位，circuit 对齐补上）。
7. **手势一致性**：移动端 3D 台面“单指旋转视角 / 双指缩放”与“点选放置/拖动元件”的手势分区要清晰，避免旋转误触成移动元件。

### 11.3 落地建议
- 优先做 11.1-1（就地菜单）+ 11.1-2（悬停/选中反馈）：收益最直接，且是 Phase 3 编辑器合并的前置体验基线。
- 上下文菜单与反馈的“命中判定”应沉到 builder 层统一实现（2D/3D 共用一套 hit-test 语义），避免两页各写一份。

### 11.4 本轮新增需求（2026-09-23 记录，待办未实现）
1. **3D 搭建支持自动排列布局**：在 3D 台面一键「整理布局」。
   - 沿用 §5.5 自动排列 P0/P1/P2 分档与**拓扑守恒铁律**（只改几何、不改连接）；需把以 2D 电路坐标为主的排列结果经 `ctx.wx/wz` 映射回 3D 台面落位（网格吸附、间距均分、去重叠）。
   - PC：工具栏按钮 + 可框选部分元件对齐；移动端：同一键，重排用动画过渡便于理解位置变化。
2. **接线在可交互连线上自动生成节点**：拖新线端点落到另一条导线上时，自动在该处生成 junction 并连通（拆原线为两段），无需单独的“加节点”手势。
   - 对标 Fritzing/KiCad/draw.io 连线自动插点；可复用 2D CircuitBoard 已有的 `projectPointOnWire` + 拆线逻辑，3D 侧在 `addRoutes`/拾取上实现同等。
   - ⚠ **强依赖 Phase 2 稳定 ID 引用**：index 模型下自动插点易致下标漂移；建议随 Phase 2 一并做，或先完成 ID 改造。
   - 移动端：落点吸附阈值放大；自动生成后给可撤销提示。
