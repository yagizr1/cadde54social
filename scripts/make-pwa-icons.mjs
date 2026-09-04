import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const payload = Buffer.concat([t, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(payload))
  return Buffer.concat([len, payload, crc])
}

function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixel(x, y)
      const i = row + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const glyphs = {
  5: ['01110', '10001', '10000', '01110', '00001', '10001', '01110'],
  4: ['00110', '01010', '10010', '11111', '00010', '00010', '00010'],
}

function drawIcon(size) {
  const bg = [7, 7, 11, 255]
  const fg = [34, 197, 94, 255]
  const scale = Math.max(1, Math.round(size / 18))
  const gap = scale
  const gw = 5 * scale
  const gh = 7 * scale
  const totalW = gw * 2 + gap
  const ox = Math.round((size - totalW) / 2)
  const oy = Math.round((size - gh) / 2)
  const cells = new Set()
  for (const [i, ch] of ['5', '4'].entries()) {
    const rows = glyphs[ch]
    const dx = ox + i * (gw + gap)
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        if (rows[y][x] !== '1') continue
        for (let py = 0; py < scale; py += 1) {
          for (let px = 0; px < scale; px += 1) {
            cells.add(`${dx + x * scale + px},${oy + y * scale + py}`)
          }
        }
      }
    }
  }
  return png(size, size, (x, y) => (cells.has(`${x},${y}`) ? fg : bg))
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
writeFileSync(join(dir, 'pwa-192.png'), drawIcon(192))
writeFileSync(join(dir, 'pwa-512.png'), drawIcon(512))
writeFileSync(join(dir, 'apple-touch-icon.png'), drawIcon(180))
console.log('wrote pwa icons')
