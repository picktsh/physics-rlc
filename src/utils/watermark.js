// 导出水印：单一来源生成平铺旋转文字水印，供 png（canvas 叠加）/ doc / 打印 三处复用。
// 移植自 physics-newton-ring 文档中心；我们屏幕层无全局水印，此处仅服务「导出物」署名。

export const WATERMARK_TEXT = 'RLC 串联谐振虚仿平台'

function buildSvg({
  text = WATERMARK_TEXT,
  color = 'rgba(128,128,128,0.16)',
  font = 22,
  w = 260,
  h = 180,
  rotate = -22,
}) {
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
    `<text x='${w / 2}' y='${h / 2}' transform='rotate(${rotate} ${w / 2} ${h / 2})' ` +
    `text-anchor='middle' dominant-baseline='middle' ` +
    `font-family='-apple-system,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif' ` +
    `font-size='${font}' fill='${color}'>${text}</text></svg>`
  )
}

// data URI（供 canvas Image 加载）
export function watermarkUri(opts = {}) {
  return 'data:image/svg+xml,' + encodeURIComponent(buildSvg(opts))
}

// CSS url() 值（供 doc / 打印的 background-image）
export function watermarkCss(opts = {}) {
  return `url("${watermarkUri(opts)}")`
}

// 把平铺水印画到已有 canvas 上（html2canvas 产出后调用）
export function applyWatermarkToCanvas(canvas, opts = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')
      const pattern = ctx.createPattern(img, 'repeat')
      ctx.fillStyle = pattern
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      resolve(canvas)
    }
    img.onerror = () => reject(new Error('水印图层加载失败'))
    img.src = watermarkUri(opts)
  })
}
