/* 本地 PNG 像素统计:截图是否含内容、主蓝出现、无青绿残留 */
import { readFileSync } from 'node:fs'
import zlib from 'node:zlib'

function decodePng(file) {
  const buf = readFileSync(file)
  let pos = 8
  let w = 0, h = 0, colorType = 0, bitDepth = 0
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0)
      h = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') break
    pos += 12 + len
  }
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : 1
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const out = Buffer.alloc(h * stride)
  const paeth = (a, b, c) => {
    const p = a + b - c
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
  }
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const prev = out.subarray((y - 1) * stride, y * stride)
    const cur = out.subarray(y * stride, (y + 1) * stride)
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0
      const b = y > 0 ? prev[x] : 0
      const c = x >= ch && y > 0 ? prev[x - ch] : 0
      let v = row[x]
      if (f === 1) v += a
      else if (f === 2) v += b
      else if (f === 3) v += (a + b) >> 1
      else if (f === 4) v += paeth(a, b, c)
      cur[x] = v & 0xff
    }
  }
  return { w, h, ch, data: out }
}

function countColors(file) {
  const { w, h, ch, data } = decodePng(file)
  const near = (r, g, b) => Math.abs(r) + Math.abs(g) + Math.abs(b) <= 6
  let blue = 0, teal = 0
  for (let i = 0; i < w * h; i++) {
    const o = i * ch
    const r = data[o], g = data[o + 1], b = data[o + 2]
    if (near(r - 37, g - 99, b - 235)) blue++
    if (near(r - 14, g - 125, b - 140)) teal++ // 旧青 #0e8d9c 类
    if (near(r - 233, g - 243, b - 241)) teal++ // 旧青浅底 #e9f3f1
    if (near(r - 14, g - 127, b - 145)) teal++ // 旧青 #0e7f91
    if (near(r - 31, g - 168, b - 186)) teal++ // 旧青 #1ea8ba
    if (near(r - 22, g - 120, b - 130)) teal++ // 旧青 #16697a
  }
  return { w, h, px: w * h, blue, teal }
}

for (const f of process.argv.slice(2)) {
  console.log(f, JSON.stringify(countColors(f)))
}
