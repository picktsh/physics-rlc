// 画布主题色:各 canvas 绘制组件在绘制前调用,从 <html> 读取当前配色的 --canvas-* 变量,
// 使图表网格/坐标轴/标注文字随主题(白/黑/马卡龙)联动(黑配色下自动转为深底浅绘)
export function canvasTheme() {
  const s = getComputedStyle(document.documentElement)
  const v = (name, fallback) => s.getPropertyValue(name).trim() || fallback
  return {
    bg: v('--canvas-bg', '#fafcff'), // 自绘浅底画布背景(幅频图等)
    grid: v('--canvas-grid', '#e6ecf4'), // 网格线
    axis: v('--canvas-axis', '#c9d3e2'), // 坐标轴/参考线
    label: v('--canvas-label', '#8a97ab'), // 标注文字
    labelDim: v('--canvas-label-dim', '#b3c1d4'), // 次要文字
    ink: v('--canvas-ink', '#1c2534'), // 深色文字(元件标签等)
    wire: v('--canvas-wire', '#2563eb'), // 电路导线/选中框
    accent: v('--app-primary', '#2563eb'), // 主题强调色(曲线)
  }
}
