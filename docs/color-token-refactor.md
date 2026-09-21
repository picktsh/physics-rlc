# 全站颜色 Token 系统性重构规划

> 状态：**已完成待验收**。阶段 0–4（颜色 Token 全量重构 + 删适配层）、阶段 3b（原生表单→naive 组件，12 文件）、阶段 5（删表单兑底层 + 文档锁点）均已落地；余下阶段 6 验收（build + grep 断言 + 清脚本）与四主题视觉走查。强转 naive 会造回归的原生控件列入「有意例外清单」（详 §12）。
> 创建：2026-09-20 · 末次更新：2026-09-21（阶段 0 复核 + 范围扩围：并入「原生表单控件 → naive 组件」替换）
> 起因：审查 `src/App.vue` 与 `src/assets/styles/theme.css` 的颜色定义，发现"主色双份定义已漂移 + 270 行事后映射适配层"两处乱源，决定系统性重构。
> 批准版 Plan 原文：`~/.qoder-cn/.../plans/color-token-refactor_*.md`（本文件是其工程化落地增强版，含采集数据与新发现的扩围）。

---

## 0. 速览（TL;DR）

| 项 | 结论 | 详见 |
| --- | --- | --- |
| 最大乱源 | theme.css L286-555 约 270 行"把硬编码 hex/标准色类反向映射回变量"的适配层，又长又脆（漏登记即不跟主题） | §1 |
| 北极星 | 迁移动作全部内联进组件 + 改名 → **整段删除适配层** → naive 主色读 CSS 变量 → 单一数据源 | §2 |
| ⚠️ 关键扩围 | 适配层不只拦截 286 处硬编码 hex，**还拦截 ~765 处标准 UnoCSS 色类**（`bg-white`/`text-gray-500`…）。真实迁移面 ≈ **1000+ 处**，非 286 | §3 |
| 命名 | 前缀 `--app-` + 扁平化（去中间类别词）+ 积极合并；状态色对齐 naive-ui（`primary/info/success/warning/error`，`danger`→`error`） | §4 |
| naive 主色源 | 删 `PRIMARY_BY_THEME`，`themeOverrides` 用 `getComputedStyle` 运行时读 `--app-primary*`（同 `canvasTheme()` 思路） | §4 |
| 低风险抓手 | 适配层本身就是权威的 hex/类→语义映射表，迁移按它 1:1 复用，不重新调色 | §3.4 |
| 分几轮 | 6 阶段，每阶段末 `pnpm build` 自证 + 四主题走查；建议至少拆 2 次提交 | §5 |

---

## 1. 背景与根因

现有颜色定义有两处结构性问题：

1. **主色双份定义且已漂移**：`App.vue` 的 `PRIMARY_BY_THEME`（naive-ui 用）与 `theme.css` 的 `--accent-solid/--navy`（CSS 用）各存一份。
   - light：naive `#1f4e79`（藏青）vs CSS `#2563eb`（亮蓝）——**同屏两套主色**；
   - dark：naive `#5b8ef7` vs CSS `--navy #6d9bf7` / `--accent-solid #2f66d0`——三值互不相同；
   - `App.vue` L11 注释仍写"白=学术藏青"，与 CSS 早已改成 `#2563eb` 脱节。
2. **"事后映射"适配层**（`theme.css` L286-555）：组件里大量直接写 `text-[#1c2534]`、`bg-white`、`text-gray-500` 这类**本身不跟主题**的类，靠这段全局 hack 用转义选择器（`html .text-\[\#1c2534\]{color:var(--ink)}`）把它们"事后"映射回变量。

第 2 点是最大乱源：它靠**提高特异性（`html` 前缀）压过 UnoCSS 单类选择器**生效，新增一个未登记的色值就静默不跟主题，维护成本极高。

---

## 2. 目标与验收标准

- **消灭适配层**：`theme.css` L286-555 整段删除，全仓不再有"硬编码色→变量"的反向映射。
- **单一数据源**：naive-ui 主色、canvas 强调色、CSS 变量三者同源于 `--app-*` 一套 token。
- **命名对齐主流库**：`--{ns}-{role}` 约定，`--app-` 前缀，扁平 + 合并。
- **验收**：
  - `pnpm build` 通过；
  - grep 断言：适配层残留 0；旧 token 名（`--navy`/`--ink`/`--accent-solid`/`--danger-ink`/`--card-bg`/`--soft-bg`/`--panel-bg`/`--line*`/`--paper`/`--chip-*`/`--tab-*` 等）引用 0；
  - 非允许清单的硬编码色类 0；
  - 四套主题（白/黑/马卡龙/绿）逐一视觉走查：文本对比度、按钮/hover、图表/画布、naive 组件（NModal/NInput focus/分页）主色一致。

---

## 3. ⚠️ 范围扩大发现（本可下班前未料，务必下次带着眼光开工）

原 Plan 假设"只需迁移 286 处硬编码 hex"。**实测：适配层同时拦截两类颜色写法**：

### 3.1 硬编码任意值 hex 类（原计划已知）

采集时间 2026-09-20，共约 **353 处 / 34 种色值**，集中在 `formula/index.vue`、`engineering/TunerExperiment.vue`：

```
82 text-[#1c2534]   53 text-[#8a97ab]   32 border-[#e6eaf2]  32 bg-[#f6f8fb]
30 text-[#56647a]   19 text-[#7d8aab]   12 border-[#e2e7f0]  10 text-[#2563eb]
10 bg-[#2563eb]      9 border-[#c9d3e2]  6 text-[#d14a3f]    6 bg-[#0d0d1a]★
 5 divide-[#e2e7f0]  5 bg-[#c3cede]      4 border-[#e6ebf3]   4 bg-[#f7f9fc]
 4 bg-[#d14a3f]      3 border-[#e2e8f0]  ... (长尾见 §6)
```
★ = 固定深色 UI，不参与主题（见 §3.3）。

### 3.2 标准 UnoCSS 颜色类（适配层也在偷偷改！新增，易漏）

**共约 765 处**。这些是 `presetUno` 原生产出的标准色类，适配层把它们重新指向了主题变量。一旦删适配层而不迁移，它们会退回字面 Tailwind 灰/蓝/红，**直接破坏黑/马卡龙/绿三套主题**。Top：

```
100 border-gray-200   76 text-gray-500   47 bg-white    44 text-gray-600
 37 bg-gray-50        34 text-gray-800   31 text-gray-700  30 text-gray-400
 29 text-blue-600     26 border-gray-300  24 text-white(★见下)  17 border-gray-100
 17 bg-blue-600       11 to-gray-100      11 hover:bg-gray-300   11 from-gray-50
 11 bg-gray-200       10 text-red-600      9 border-blue-100     8 hover:bg-blue-700
 ... 完整清单见 §6
```
注意：`text-white`（24 处）多为深色底上的白字（按钮/标签），**大概率是刻意白色、不该跟主题转**，迁移前逐个甄别，别盲目映射。

### 3.3 不参与主题的"固定深色 UI"允许清单（保留原样，勿动）

- `damping/index.vue` 终端风输入：`bg-[#0d0d1a]` + `text-green-400` + `border-gray-600/700`；
- 示波器/画布固定底：`bg-[#1a1a2e]`；
- `index.html` 内联 loading 色：防闪白必须在 CSS 加载前内联，属**故意重复**，仅加注释锚点提示"与 theme.css 同步"；
- `ThemeSwitcher.vue` 圆点预览渐变（`.ts-* .ts-ball`）：代表色，不跟主题。

### 3.4 降风险抓手：适配层 = 现成的迁移字典

`theme.css` L286-555 里每一条"某类→某变量"，正是当前**期望的语义归属**。迁移时直接把它翻译成"某类→某 `--app` token"，逐条 1:1 落地即可，无需重新判断配色，视觉回归风险最小。§6 已按适配层整理好映射草案。

---

## 4. 最终 Token 设计（已与你确认）

命名规则：`--app-{role}[-{variant}]`，扁平化（不写 `--app-color-`/`--app-text-color-` 这类冗长中间词）；状态色词表对齐 naive-ui。

### 4.1 核心颜色（重命名 + 合并）

| 新 token | 含义 | ← 合并/改名自 |
| --- | --- | --- |
| `--app-primary` / `-hover` / `-pressed` | 按钮/实色主强调（naive 主色读此项） | `--accent-solid`(-hover) / `--navy-mid` |
| `--app-brand` / `--app-brand-strong` | 链接/图标可读主色 | `--navy` / `--navy-deep` |
| `--app-info` / `--app-success` / `--app-warning` / `--app-error` | 状态色文字 | `--success-ink` / `--warn-ink` / `--danger-ink` |
| `--app-{status}-bg` / `--app-{status}-border` | 状态浅底/描边（仅留用到的） | `--danger-bg/border`、`--success-bg/border`、`--warn-bg` |
| `--app-text` / `--app-text-muted` / `--app-text-faint` | 三级正文 | `--ink` / `--muted` / `--faint` |
| `--app-bg` | 页面底 | `--paper` |
| `--app-surface` | 卡片主面 | `--card-bg` |
| `--app-surface-sunken` | 内凹/浅底 | `--card-inner-bg` + `--soft-bg`（合并） |
| `--app-surface-muted` | 分组面板 | `--panel-bg` |
| `--app-surface-brand` / `--app-surface-brand-strong` | 品牌浅底 | `--soft-blue` / `--soft-blue-strong` |
| `--app-border` / `--app-border-light` / `--app-border-dark` | 三级描边 | `--line` / `--line-soft` / `--line-strong` |
| `--app-radius` | 8px（对齐团队圆角规范，naive `borderRadius` 也读它） | 散落 `rounded-*` 的 8px 口径 |
| `--app-shadow` / `--app-shadow-sm` | 卡片/内层阴影 | `--card-shadow` / `--card-inner-shadow` |
| `--app-font` / `--app-font-heading` | 字体族（naive `fontFamily` 对齐，消除当前 naive 衬线 vs 全站无衬线割裂） | `--font-body` / `--font-head` |
| `--app-selection` / `--app-selection-text` | 选区 | `--sel-bg` / `--sel-ink` |

### 4.2 保留不动（低重复或功能必需，按约定不硬凑）

- `--z-*`（团队既有分档令牌）、`--app-header-h` / `--app-sidebar-w` / `--app-rail-icon-center`（已是 `--app-` 前缀的布局尺寸）。
- `--canvas-*` 全套（`canvasTheme.js` 运行时依赖，功能必需；**顺手补全 macaron 缺失的 grid/axis/label/label-dim/ink/wire**，现 macaron 只设了 `--canvas-bg`，导致图表连线回落蓝色）。
- `--scroll-thumb`/`-hover`、`--blueprint-*`、`--ambient-*`（仅内部引用、低重复）。

### 4.3 删除 / 派生

- 删 `--chip-*`、`--tab-*`（并入 `--app-surface*` / `--app-surface-brand`）。
- 删 `--card-bg-95/90/80`，改用 `color-mix(in srgb, var(--app-surface), transparent N%)` 派生（需现代浏览器；若发现旧机型兼容需求则回退保留显式 token）。

### 4.4 naive 主色运行时化

删 `App.vue` 的 `PRIMARY_BY_THEME`；`themeOverrides` computed 以 `theme.value` 为依赖，`getComputedStyle(document.documentElement)` 读 `--app-primary/-hover/-pressed` 与 `--app-info/success/warning/error`（含 fallback）填入 `common`。`naiveTheme`（dark）开关逻辑不变。

---

## 5. 分阶段执行计划（每阶段末 `pnpm build` 自证）

> 建议提交切分：阶段 1-2（地基，主题块重写 + naive）一次；阶段 3（海量迁移，最大）一次或按页拆；阶段 4-5（删适配层 + 改名收尾）一次；阶段 6 验收。

- **阶段 0 · 建映射字典**：跑 §7 的采集命令刷新计数（本文件数据会过时）；把 §6 草案核对为最终 `旧写法 → 新 --app token` 表；标出允许清单（§3.3）。脚本放 `.tmp/`，结束清理。
- **阶段 1 · 重写 theme.css 四块变量**：`:root` + `dark/macaron/green` 按 §4 改名+合并；补 macaron `--canvas-*`；更新 `::selection`/scrollbar/canvas 兜底引用的变量名。**暂不删适配层**（避免迁移中途样式裸奔）。
- **阶段 2 · App.vue naive 主色运行时化**：见 §4.4；顺带统一 macaron/green 的 hover 方向（现 naive hover 变亮 vs CSS `-hover` 变暗，取一致"变深"）。
- **阶段 3 · 组件迁移（重头）**：用 `.tmp/` codemod 对 `src/**/*.vue` 按字典批量替换**两类**写法（§3.1 硬编码 + §3.2 标准色类），跳过允许清单。
  - 重点文件：`formula/index.vue`、`engineering/TunerExperiment.vue`、`damping/index.vue`、`VideoCard.vue`、`HeartRateMonitor.vue`、`ChartPanel.vue`、`video/index.vue`、`lc-voltage/index.vue`、`home/lock.vue`。
  - **务必人工抽查**：渐变（`from-/to-`）、状态标签、`text-white`（甄别是否刻意白）、图表标注色。
  - ⚠️ UnoCSS 消歧（见 memory）：`bg-[var(--app-x)]` 可直接用；`text-/border-/fill-/stroke-/divide-/ring-` 用变量时**加 `color:` 前缀**，如 `text-[color:var(--app-text)]`、`border-[color:var(--app-border)]`，否则类型歧义不生效。
- **阶段 4 · 删适配层 + 收敛 canvasTheme**：确认全仓 0 处需适配色类后，**整段删 `theme.css` L286-555**；`canvasTheme.js` 的 `accent` 改读 `--app-primary`（原 `--accent-solid`），更新 fallback；`--canvas-*` 组键名不变。
- **阶段 5 · 全局改名收尾**：codemod 第二遍改剩余 `var(--旧名)` 引用（`base.css`/`components.css`/`ThemeSwitcher.vue`/各 .vue 语义类/`--card-bg-95`→`color-mix`）；更新 `index.html` 注释锚点、`CHANGELOG.md`、`AGENTS.local.md`（新增"颜色 token 命名规范" + "适配层已移除"）。
- **阶段 6 · 自证与验收**：见 §2 验收标准。

---

## 6. 迁移映射草案（源自适配层，逐条核对后采用）

### 6.1 硬编码 hex → 新 token

| 旧类（示例） | → 新 |
| --- | --- |
| `text-[#1c2534]` / `[#334155]` / `[#33415e]` | `text-[color:var(--app-text)]` |
| `text-[#56647a]` / `[#475569]` / `[#7d8aab]` / `[#7d8dab]` / `[#64748b]` | `text-[color:var(--app-text-muted)]` |
| `text-[#8a97ab]` / `[#94a3b8]` / `[#9db0c8]` / `[#c3cede]` | `text-[color:var(--app-text-faint)]` |
| `text-[#2563eb]` / `bg-[#2563eb]` | `--app-brand`（文字）/ `--app-primary`（实色底），按语义分流 |
| `text-[#1d4ed8]` / `[#1e40af]` | `text-[color:var(--app-brand-strong)]` |
| `text-[#d14a3f]` / `[#d03050]` / `[#e0523f]` / `bg-[#d14a3f]` | `--app-error` |
| `text-[#0e9f6e]` / `bg-[#0e9f6e]` | `--app-success` |
| `text-[#d97706]` / `bg-[#d97706]` | `--app-warning` |
| `bg-[#f6f8fb]` / `[#f7f9fc]` / `[#f2f5fa]` / `[#f8fafc]` / `[#f1f5f9]` | `bg-[var(--app-surface-sunken)]` |
| `bg-[#f3f5f9]` | `bg-[var(--app-bg)]` |
| `bg-[#e9eef5]` / `[#eef1f7]` | `bg-[var(--app-surface-muted)]` |
| `bg-[#dbeafe]` / `[#e3edfd]` / `[#e8f0fe]` / `[#bfdbfe]` / `bg-[#c3cede]` | `bg-[var(--app-surface-brand-strong)]`（末项按上下文或 `--app-text-faint`） |
| `border-[#e6eaf2]` / `[#e2e7f0]` / `[#e6ebf3]` / `[#e2e8f0]` | `border-[color:var(--app-border)]` |
| `border-[#eef1f7]` | `border-[color:var(--app-border-light)]` |
| `border-[#c9d3e2]` / `[#c9d6ec]` | `border-[color:var(--app-border-dark)]` |
| `ring-[#3b82f6]` / `accent-[#2563eb]` / `border-[#2563eb]` | `--app-primary` |
| `divide-[#e2e7f0]` / `divide-[#eef1f7]` | `divide-[color:var(--app-border)]` / `-border-light` |

### 6.2 标准色类 → 新 token（易漏！适配层当前正在拦截它们）

| 旧类 | → 新 |
| --- | --- |
| `text-gray-800` / `700` | `text-[color:var(--app-text)]` |
| `text-gray-600` / `500` | `text-[color:var(--app-text-muted)]` |
| `text-gray-400` / `300` | `text-[color:var(--app-text-faint)]` |
| `text-blue-600` / `bg-blue-600`/`500` | `--app-brand`（文）/ `--app-primary`（底） |
| `text-blue-800` / `text-blue-700` | `text-[color:var(--app-brand-strong)]` |
| `text-red-*` / `bg-red-50`/`100` | `--app-error` / `--app-error-bg` |
| `text-green-600`/`700` / `text-emerald-700`/`800` | `--app-success` |
| `text-amber-*` / `text-orange-600` / `text-yellow-600` | `--app-warning` |
| `bg-white` | `bg-[var(--app-surface)]`；`bg-white/95`/`90`/`80` → `color-mix` |
| `bg-gray-50` | `bg-[var(--app-surface-sunken)]`；`bg-gray-100`/`200` → `--app-surface-muted` |
| `bg-blue-50` / `bg-blue-100` | `--app-surface-brand` / `--app-surface-brand-strong` |
| `bg-green-50` / `bg-emerald-50` | `--app-success-bg`；`bg-amber-50` → `--app-warning-bg` |
| `border-gray-100`/`200`/`300`/`400` | `--app-border-light`/`-border`/`-border-dark`（按适配层原分组核对） |
| `border-blue-100`/`500`/`600` | `--app-surface-brand-strong` / `--app-primary` |
| `border-red-100`/`200` | `--app-error-border`；`border-emerald-200` → `--app-success-border` |
| `hover:bg-blue-700` | `hover:bg-[var(--app-primary-hover)]`；`hover:bg-gray-100`→`-surface-sunken`、`200`→`-surface-muted`、`300`→`-border-dark` |
| `hover:bg-red-100` / `hover:bg-white` / `hover:border-gray-300` | `--app-error-bg` / `--app-surface` / `--app-border-dark` |
| 渐变 `from-gray-50 to-gray-100` | 绑 `--app-surface-sunken`→`--app-surface-muted`；`from-blue-50 to-indigo-50`→`--app-surface-brand`→`-brand-strong`；`from-emerald-50 to-teal-50`→`--app-success-bg` |

> `text-white`（24）、damping 的 `border-gray-600/700`、`text-green-400`（终端风）属允许清单，**不套用上表**，人工判定。

---

## 7. 采集/复核命令（下次开工先跑，刷新本文已过时的计数）

```bash
# 硬编码 hex 类完整清单
grep -rEoh '(bg|text|border|from|to|via|fill|stroke|outline|ring|decoration|divide|accent)-\[#?[0-9a-fA-F]{3,8}(/?[0-9]+)?\]' --include='*.vue' src | sort | uniq -c | sort -rn
# 标准色类(适配层拦截)清单
grep -rEoh '(bg|text|border|from|to|via|ring|divide)-(white|gray|slate|zinc|blue|indigo|red|green|emerald|teal|amber|yellow|orange)(-[0-9]+)?(/\[?[0-9]+\]?)?' --include='*.vue' src | sort | uniq -c | sort -rn
# 各文件硬编码分布(找重灾区)
grep -rEoh '(bg|text|border|from|to|via|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]' --include='*.vue' src | sed 's/:.*//' | sort | uniq -c | sort -rn
# 验收断言(阶段 6):旧 token 引用应为 0、非允许硬编码应为 0
grep -rn -- '--navy\b\|--ink\b\|--accent-solid\|--danger-ink\|--card-bg\|--soft-bg\|--panel-bg\|--paper\b' src index.html
```

---

## 8. 涉及文件清单

- 核心：`src/assets/styles/theme.css`（重写四块变量 + 删 L286-555 适配层）、`src/App.vue`（naive 主色运行时化）。
- 连带：`src/utils/canvasTheme.js`（accent 改读 `--app-primary`）、`src/composables/useTheme.js`（可选导出读色 helper）。
- 迁移主体（§3 计数）：`views/formula/index.vue`、`views/engineering/components/TunerExperiment.vue`、`views/damping/index.vue`、`views/video/components/VideoCard.vue`、`views/engineering/components/HeartRateMonitor.vue`、`views/analysis/components/ChartPanel.vue`、`views/video/index.vue`、`views/lc-voltage/index.vue`、`views/home/lock.vue`，及含 `var(--旧名)`/标准色类的其余组件（`base.css`、`components.css`、`ThemeSwitcher.vue` 等）。
- 文档：`CHANGELOG.md`、`AGENTS.local.md`、`index.html`（注释锚点）。

---

## 9. 风险与坑

1. **最大坑＝漏迁移标准色类**：只盯着硬编码 hex，删了适配层 → `bg-white`/`text-gray-500` 全塌回字面色，黑/马卡龙/绿三主题大面积翻车。§3.2/§6.2 必须一并处理。
2. **`text-white` 误映射**：深色底上的刻意白字不能跟主题转 `--app-text`，逐个甄别。
3. **UnoCSS 变量歧义**：非 bg 属性用 `var()` 必须 `color:` 前缀（见 memory 2973ac5e）。
4. **codemod 正则边界**：批量替换注意引号后首词、`/` 透明度后缀（见 memory 正则负向后顾坑）。
5. **naive 读时机**：`getComputedStyle` 必须在 `data-theme` 属性设置之后同步读取（`setTheme` 内同步设属性，computed 依赖 `theme.value` 触发重算，含 fallback 兜底）。
6. **`color-mix` 兼容性**：面向现代浏览器；如有旧机型顾虑回退保留 `--app-surface` 显式 alpha token。
7. **naive 字体割裂**（既有 bug 级不一致）：naive 现用衬线 Georgia/Songti、全站用无衬线 DigitsUI；本次统一读 `--app-font`，确认预期。

---

## 10. 决策留档（本次 grill 确认）

- 范围：全量迁移 + 删适配层（非"仅修一致性"）。
- 命名：`--app-` 前缀、扁平化（去中间类别词）、积极合并；**不**给 header/sidebar/chart 造过多 token（功能/布局 token 保留）。
- 状态色词表：对齐 naive-ui，用 `error` 取代 `danger`。
- naive 主色源：运行时读 CSS 变量（唯一源），而非 JS 映射表为源。

---

## 11. 开工决策增补（2026-09-21 grill 确认）

### 11.1 阶段 0 采集复核（刷新 §3 数字）

- 硬编码 hex 类：**359 处 / 45 色值**（重灾区 `formula` 234、`TunerExperiment` 91）。
- 标准 UnoCSS 色类：**753 处**。合计 ≈ **1112 处**。
- 允许清单已核实：damping 终端风、`bg-[#1a1a2e]` 示波器底、`text-white`（24 处均在彩/深底按钮上）。

### 11.2 新发现的字典盲区（§6 草案未点透）

适配层只拦截了**一部分**标准色类；下列当前一直是**字面色、未被拦截**（删适配层不影响，但残留字面色）：
`bg-red-500/600`、`bg-green-600/700`、`bg-amber-500/600`、`bg-blue-400`、`bg-gray-600/700`、`border-green-100/200/500`、`border-gray-500`、`border-red-600`、`border-blue-200`、`text-blue-700`、`text-green-800`、`text-amber-500`、`text-[#d9962b]`。
另有 `border-amber-200` 在适配层是硬编码 `#f3dfbd`/`#5a4620`（非变量）→ 迁移需**新增 `--app-warning-border`**。

### 11.3 本轮确认的决策（覆盖前文冲突项）

1. **盲区字面状态类**：一并纳入 token，让它们跟主题（Q1）。
2. **⚠️ 范围扩围**：本轮**同时**把全站**全部原生表单控件**（44 `<button>` / 41 `<input>`（含 `type=range` 滑块）/ select / textarea / checkbox / radio）替换为 naive-ui 组件；实心状态色按钮改用 `NButton type` 区分，不再堆 `-solid` token。**合并进本轮一起做**（用户明示，允许适当视觉变动）。→ 新增**阶段 3b**。
   - 3b 子决策（2026-09-21 确认）：9 个 `type=range` 仿真滑块 → **全部改 `NSlider`**；4 个 `type=file`（选件导入/导出）→ **全部改 `NUpload`**。用户接受逐个回归验证交互/精度的成本，取最大规范化。
3. **`--app-info` 取消**：不造独立 info、不做多余派生；naive `infoColor` 直接读 `--app-primary`（与 primary 同色）。状态 token 仅 `primary/success/warning/error`。
4. **实心状态底**：优先落到 naive 组件（type）；未组件化的残留色用 `--app-error/success/warning/primary` 强色，hover 用 `color-mix` 加深派生，不新增 `-solid`。

### 11.4 修订后的阶段（§5 补充 3b）

- **3b · 原生表单控件 → naive 组件**：`<button>`→`NButton`、`<input type=text/number>`→`NInput/NInputNumber`、`type=range`→`NSlider`、`checkbox/radio`→`NCheckbox/NRadio`、`<select>`→`NSelect`、`<textarea>`→`NInput type=textarea`、`type=file`→`NUpload`。连带删除 theme.css 「表单控件深色兑底层」（naive 自带主题后不再需要）。重点文件：`damping`、`MeasuredDataInput`、`ChartPanel`、`lc-voltage`、`TunerExperiment`、`LissajousScope`、`CircuitBoard`、`ErrorAnalysis`、`SimulationHistory`、`HeartRateMonitor`。

---

## 12. 进度日志

### 已完成（2026-09-21，均 `pnpm build` 绿）
- **阶段 0**：采集复核 359 hex / 753 标准类；字典定稿（含适配层未拦盲区）。
- **阶段 1**：theme.css 四块变量重写为 `--app-*`（合并 navy-mid/soft-bg/card-inner-bg；新增 `--app-warning-border`/`--app-rail-bg`；补全 macaron `--canvas-*`）+ 全局 `var(--旧名)`→`var(--app-*)` 改名（31 文件）。
- **阶段 2**：App.vue 删 `PRIMARY_BY_THEME`，naive 主色/状态色/字体运行时读 `--app-*`。
- **阶段 3**：颜色迁移 codemod（~970 处 hex+标准类）+ 渐变/半透白/`bg-[#f1f5f9]` 盲区手工处理。
- **阶段 4**：删除颜色类适配层（theme.css 528→285 行），保留功能性兑底（canvas 垫底/黑舞台）。
- **阶段 3b（完成）**：全站原生表单控件→naive 组件（NButton/NInput/NInputNumber/NSlider/NSwitch/NSelect/NCheckbox/NUpload），实心状态色按钮改由 `type` 表达。已转 12 文件：`analysis/`（MeasuredDataInput、ChartPanel、SimulationHistory、ErrorAnalysis、ResultCards）、`lc-voltage/`、`LissajousScope`、`HeartRateMonitor`、`CircuitBoard`、`TunerExperiment`、`damping/`（终端风输入除外）、`formula/`（qTabs）、`AttachmentPreview`（`bg-red-500` 实心徽标→`NButton circle type=error`）。
- **阶段 5（完成）**：删 theme.css 「表单控件深色兑底层」；文档锁点——`AGENTS.local.md`「主题与配色」章节重写（固化 `--app-*` 命名/naive 组件规范/允许清单）、`CHANGELOG.md` 加 `[Unreleased]` 条、`index.html` 内联 loading 色同步锚点注释强化。

### 有意例外清单（保留原生控件，均为固定/语义/动画耦合，强转 naive 会造回归）
1. **`AppSidebar` / `AppHeader` 导航按钮**：受「页眉↔侧栏折叠共轴、图标零位移」布局约束保护，转 NButton 会破坏零位移对齐。
2. **`engineering/` 二级 tab（`role=tablist`）**：语义 ARIA tablist、已 token 着色；**`HeroCircuit` 控制条（hc-btn/hc-sld）**：`sldRef` 命令式逐帧动画同步 + bespoke 多态 pill，转 NSlider/NButton 会破坏。
3. **`VideoCard` 展开图标按钮**：绝对定位、hover-reveal 角标，转 NButton 与自定义 opacity/边框动画相冲。
4. **`ChatInputArea` / `docs` 隐藏 `<input type=file>`**：class=hidden，绑 base64 附件/文档导入流水线且由程序 `.click()` 触发（naive NUpload 内部同为隐藏 input，换组件无收益需重接跨文件契约）；**可见部分已 NButton**。
5. **`ThemeSwitcher` 预览圆点（`role=radio`）**：每点代表对应主题色，必须为固定字面渐变（不参与主题）。
6. **允许清单固定深色**：damping 终端风输入（6）、示波器/画布固定底（`bg-[#1a1a2e]`）、`index.html` 内联 loading、深色底刻意白字 `text-white`、视频黑边 letterbox。

### 待验收
- 阶段 6：`pnpm build` 自证绿 + grep 断言（旧 token 引用 0 / 非允许硬编码色类 0 / 原生表单仅剩例外清单）+ 清理仓库根一次性脚本 `.tmp-rename-tokens.mjs`/`.tmp-migrate-colors.mjs`/`.tmp-strip-adapter.mjs`。四主题视觉走查由用户统一验收。
