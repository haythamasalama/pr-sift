import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const SIZES = [16, 32, 48, 128]
const SUPERSAMPLE = 4
const BLUE = [23, 23, 23]
const WHITE = [255, 255, 255]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  const rows = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const roundedRect = (x, y, radius) => {
  const dx = Math.max(Math.abs(x - 0.5) - (0.5 - radius), 0)
  const dy = Math.max(Math.abs(y - 0.5) - (0.5 - radius), 0)
  return Math.hypot(dx, dy) <= radius
}

const distanceToSegment = (px, py, ax, ay, bx, by) => {
  const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)))
  return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)))
}

const FUNNEL = [
  [0.22, 0.28],
  [0.78, 0.28],
  [0.57, 0.53],
  [0.57, 0.73],
  [0.43, 0.66],
  [0.43, 0.53],
]

function isGlyph(x, y) {
  return FUNNEL.some((from, i) => {
    const to = FUNNEL[(i + 1) % FUNNEL.length]
    return distanceToSegment(x, y, from[0], from[1], to[0], to[1]) <= 0.04
  })
}

function render(size) {
  const pixels = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let covered = 0
      let glyph = 0
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const x = (px + (sx + 0.5) / SUPERSAMPLE) / size
          const y = (py + (sy + 0.5) / SUPERSAMPLE) / size
          if (!roundedRect(x, y, 0.22)) continue
          covered++
          if (isGlyph(x, y)) glyph++
        }
      }
      const total = SUPERSAMPLE * SUPERSAMPLE
      const mix = covered ? glyph / covered : 0
      const offset = (py * size + px) * 4
      for (let c = 0; c < 3; c++) pixels[offset + c] = Math.round(BLUE[c] * (1 - mix) + WHITE[c] * mix)
      pixels[offset + 3] = Math.round((covered / total) * 255)
    }
  }
  return pixels
}

mkdirSync(new URL('../icons/', import.meta.url), { recursive: true })
for (const size of SIZES) {
  writeFileSync(new URL(`../icons/icon-${size}.png`, import.meta.url), encodePng(size, render(size)))
}
console.log(`Wrote ${SIZES.length} icons`)
