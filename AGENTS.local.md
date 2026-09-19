# AGENTS.local —— physics-rlc 项目专属约定

> 补充根 `AGENTS.md`。改动 `src/components/VideoResources/` 前必读，均为踩过的坑。

## 第三方视频嵌入
- **抖音 iframe 布局盒恒为 1280×720**：抖音无小尺寸模式，盒缩小即退回手机版竖屏被裁切。只能固定尺寸 + `transform: scale()` 视觉缩放，比值用 contain（`min(w/1280, h/720)`）。
- **居中用外层 flex，禁 `margin:auto`**：盒大于容器时过约束会贴左跑偏。
- **B 站参数**：`high_quality=1&danmaku=0&autoplay=0`；`noFullScreenButton=1` 实测移动端无效，别再试。

## 移动端全屏 / 横屏
- 用 VueUse `useFullscreen` + `useScreenOrientation`，别手写。
- **iOS Safari 不支持非 `<video>` 元素全屏、无 `orientation.lock`**：故 `enterFullscreen()` 失败返回 false → 回退 NModal。**NModal 是 iPhone 唯一放大路径，必须保留。**
- `requestFullscreen` 须在点击手势同步栈内发起；锁横屏 best-effort、失败静默，**不用 CSS rotate 伪装横屏**。

## 触屏适配
- 用能力检测 `@media (hover:none)` / `useMediaQuery('(hover:hover)')`，不用宽度断点；`NTooltip` 按 hover 能力 `:disabled`。

## naive-ui 弹窗
- 全局直角主题，弹窗圆角单独 `:deep(.n-card)` 恢复。
- 遮罩色是硬编码非主题变量：用 `NModal to="#video-modal-host"` + 宿主作用域 `:deep(.n-modal-mask)` 覆盖，避免污染其他弹窗。
- 标题单行省略需 `min-width:0`（flex 子项省略号前提）。

## 结构原则
- 抽离仅在 ≥2 真实消费者时进行；单消费者内联回组件。
- 注释只写「不看会踩坑的约束/口径来源」，不写选型答辩（那些进本文件）。
