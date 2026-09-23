// 2D 画布元件绘制器(Phase 1a,§9.1 core 边界:纯 Canvas 2D 函数,零 Vue/DOM ref)。
// 迁移自 CircuitBoard.vue drawCircuit() 元件段,逐条保持坐标/样式一致(视觉零回归)。
// 约定:调用方已 ctx.save() + translate(comp.x, comp.y) 且设好 strokeStyle/lineWidth(=ct.wire,2);
// 本模块只画「以原点为中心的元件本体」,端点/选中框/junction 仍由调用方负责。

// 斜箭头头部(GB 可变符号):沿起点→终点方向在末端补出小三角
export function arrowHead(ctx, x1, y1, x2, y2, size = 4) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux
  ctx.beginPath()
  ctx.moveTo(x2 - ux * size + px * size * 0.62, y2 - uy * size + py * size * 0.62)
  ctx.lineTo(x2, y2)
  ctx.lineTo(x2 - ux * size - px * size * 0.62, y2 - uy * size - py * size * 0.62)
  ctx.stroke()
}

const LABEL_FONT = 'bold 11px sans-serif'
// 元件位号标签(墨色居中),统一各元件重复的 fillStyle/font/textAlign 设定
function label(ctx, ct, text, x, y) {
  ctx.fillStyle = ct.ink
  ctx.font = LABEL_FONT
  ctx.textAlign = 'center'
  ctx.fillText(text, x, y)
}

// 电阻:两端引线 + 平面矩形
export function drawResistor(ctx, comp, ct) {
  ctx.beginPath()
  ctx.moveTo(-30, 0)
  ctx.lineTo(-18, 0)
  ctx.moveTo(18, 0)
  ctx.lineTo(30, 0)
  ctx.stroke()
  ctx.strokeRect(-18, -9, 36, 18)
  label(ctx, ct, 'R', 0, 4)
}

// 电感:两端引线 + 拱形线圈
export function drawInductor(ctx, comp, ct) {
  ctx.beginPath()
  ctx.moveTo(-30, 0)
  ctx.lineTo(-16, 0)
  for (let b = 0; b < 4; b++) {
    const bx = -16 + b * 8
    ctx.arc(bx, 0, 4, Math.PI, 0, false)
  }
  ctx.lineTo(30, 0)
  ctx.stroke()
  label(ctx, ct, 'L', 0, -10)
}

// 电容:两端引线 + 平行板
export function drawCapacitor(ctx, comp, ct) {
  ctx.beginPath()
  ctx.moveTo(-30, 0)
  ctx.lineTo(-4, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-4, -12)
  ctx.lineTo(-4, 12)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(4, -12)
  ctx.lineTo(4, 12)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(4, 0)
  ctx.lineTo(30, 0)
  ctx.stroke()
  label(ctx, ct, 'C', 0, -19)
}

// 滑线变阻器:两端引线 + 矩形 + 斜箭头(GB 可变电阻符号)
export function drawRheostat(ctx, comp, ct) {
  ctx.beginPath()
  ctx.moveTo(-30, 0)
  ctx.lineTo(-18, 0)
  ctx.moveTo(18, 0)
  ctx.lineTo(30, 0)
  ctx.stroke()
  ctx.strokeRect(-18, -9, 36, 18)
  ctx.beginPath()
  ctx.moveTo(-8.5, 6.5)
  ctx.lineTo(8.5, -6.5)
  ctx.stroke()
  arrowHead(ctx, -8.5, 6.5, 8.5, -6.5, 3.4)
  label(ctx, ct, 'RV', 0, -16)
}

// 可调电容:两端引线 + 平行板 + 板间斜箭头(GB 可变电容符号)
export function drawVarCapacitor(ctx, comp, ct) {
  ctx.beginPath()
  ctx.moveTo(-30, 0)
  ctx.lineTo(-4, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-4, -11)
  ctx.lineTo(-4, 11)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(4, -11)
  ctx.lineTo(4, 11)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(4, 0)
  ctx.lineTo(30, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-3.2, 8.6)
  ctx.lineTo(3.2, -8.6)
  ctx.stroke()
  arrowHead(ctx, -3.2, 8.6, 3.2, -8.6, 3)
  label(ctx, ct, 'CV', 0, -19)
}

// 交流电压源:两端引线 + 圆环内波形(随信号源波形参数动态切换)
export function drawSignalSource(ctx, comp, ct) {
  ctx.beginPath()
  ctx.moveTo(-30, 0)
  ctx.lineTo(-16, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, 16, 0, 2 * Math.PI)
  ctx.stroke()
  if (comp.signalWaveform === 'square') {
    // 方波符号
    ctx.beginPath()
    ctx.moveTo(-8, 4)
    ctx.lineTo(-8, -4)
    ctx.lineTo(0, -4)
    ctx.lineTo(0, 4)
    ctx.lineTo(8, 4)
    ctx.lineTo(8, -4)
    ctx.stroke()
  } else {
    // 正弦波符号(默认)
    ctx.beginPath()
    ctx.moveTo(-8, 0)
    ctx.quadraticCurveTo(-4, -8, 0, 0)
    ctx.quadraticCurveTo(4, 8, 8, 0)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(16, 0)
  ctx.lineTo(30, 0)
  ctx.stroke()
  label(ctx, ct, 'V', 0, -24)
}
