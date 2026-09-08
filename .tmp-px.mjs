// 本地 PNG 像素统计:主蓝 vs 旧青(零依赖解码 RGBA PNG)
import fs from 'node:fs'
import zlib from 'node:zlib'

function decodePNG(file) {
  const buf = fs.readFileSync(file)
  let off = 8, w = 0, h = 0, ch = 4, idat = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); if (data[8] !== 8 || (data[9] !== 6 && data[9] !== 2)) throw new Error('仅支持 8bit RGB/RGBA: ' + data[9]); ch = data[9] === 6 ? 4 : 3 }
    if (type === 'IDAT') idat.push(data)
    off += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const out = Buffer.alloc(h * stride)
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]
    const row = y * stride
    const prev = row - stride
    for (let x = 0; x < stride; x++) {
      const i = y * (stride + 1) + 1 + x
      const a = x >= ch ? out[row + x - ch] : 0
      const b = y > 0 ? out[prev + x] : 0
      const c = x >= ch && y > 0 ? out[prev + x - ch] : 0
      if (f === 0) out[row + x] = raw[i]
      else if (f === 1) out[row + x] = (raw[i] + a) & 255
      else if (f === 2) out[row + x] = (raw[i] + b) & 255
      else if (f === 3) out[row + x] = (raw[i] + ((a + b) >> 1)) & 255
      else out[row + x] = (raw[i] + paeth(a, b, c)) & 255
    }
  }
  return { w, h, out }
}

for (const [name, target] of [['formula', { r: 37, g: 99, b: 235 }], ['circuit', { r: 37, g: 99, b: 235 }]]) {
  const { w, h, out } = decodePNG(`.tmp-shot-${name}.png`)
  let blue = 0, oldTeal = 0
  for (let i = 0; i < out.length; i += 3) {
    const r = out[i], g = out[i + 1], b = out[i + 2]
    if (Math.abs(r - 37) < 40 && Math.abs(g - 99) < 40 && Math.abs(b - 235) < 40) blue++
    if (Math.abs(r - 14) < 40 && Math.abs(g - 141) < 40 && Math.abs(b - 156) < 40) oldTeal++
  }
  console.log(name, w + 'x' + h, '主蓝像素:', blue, '| 旧青像素:', oldTeal)
}
