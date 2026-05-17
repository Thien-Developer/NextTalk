/**
 * Generates NextTalk icons using pngjs (pure JS, no native deps).
 * Creates: resources/icon.png (1024), resources/tray-icon.png (32), resources/badge.png (20), resources/icon.ico
 */
const { PNG } = require('pngjs')
const fs = require('fs')
const path = require('path')

const resourcesDir = path.join(__dirname, '../resources')
fs.mkdirSync(resourcesDir, { recursive: true })

/**
 * Draws a gold circle with "N" letter as pixel data.
 * Uses simple anti-aliasing for smooth edges.
 */
function createNextTalkIcon(size) {
  const png = new PNG({ width: size, height: size, filterType: -1 })
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.46
  const innerR = size * 0.43

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      let r, g, b, a

      if (dist <= innerR) {
        // Gold fill: #FFD700 with slight radial gradient
        const t = dist / innerR
        r = Math.round(0xFF - 0x33 * t)   // 255 → 204
        g = Math.round(0xD7 - 0x44 * t)   // 215 → 143
        b = 0
        a = 255
      } else if (dist <= outerR) {
        // Anti-aliased edge
        const alpha = 1 - (dist - innerR) / (outerR - innerR)
        r = Math.round(0xCC * alpha + 0x0A * (1 - alpha))
        g = Math.round(0x99 * alpha + 0x0A * (1 - alpha))
        b = Math.round(0x0A * (1 - alpha))
        a = Math.round(alpha * 255)
      } else {
        // Transparent background
        r = 0x0A; g = 0x0A; b = 0x0A; a = 0
      }

      png.data[i] = r
      png.data[i + 1] = g
      png.data[i + 2] = b
      png.data[i + 3] = a
    }
  }

  // Draw "N" letter — simple pixel art approach
  const letterSize = size * 0.52
  const startX = cx - letterSize * 0.28
  const startY = cy - letterSize * 0.38
  const stroke = Math.max(2, Math.round(size * 0.07))

  // "N" = left vertical + diagonal + right vertical
  const pts = []
  // Left vertical bar
  for (let dy2 = 0; dy2 < letterSize; dy2++) {
    for (let dx2 = 0; dx2 < stroke; dx2++) {
      pts.push([Math.round(startX + dx2), Math.round(startY + dy2)])
    }
  }
  // Right vertical bar
  for (let dy2 = 0; dy2 < letterSize; dy2++) {
    for (let dx2 = 0; dx2 < stroke; dx2++) {
      pts.push([Math.round(startX + letterSize * 0.56 + dx2), Math.round(startY + dy2)])
    }
  }
  // Diagonal from top-left to bottom-right
  for (let t = 0; t <= 100; t++) {
    const px = startX + (letterSize * 0.56 * t) / 100
    const py = startY + (letterSize * t) / 100
    for (let sx = -Math.ceil(stroke / 2); sx <= Math.ceil(stroke / 2); sx++) {
      for (let sy = -Math.ceil(stroke / 2); sy <= Math.ceil(stroke / 2); sy++) {
        pts.push([Math.round(px + sx), Math.round(py + sy)])
      }
    }
  }

  for (const [px, py] of pts) {
    if (px < 0 || py < 0 || px >= size || py >= size) continue
    const dist2 = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
    if (dist2 > innerR * 0.96) continue
    const i = (py * size + px) * 4
    png.data[i] = 0x0A
    png.data[i + 1] = 0x0A
    png.data[i + 2] = 0x0A
    png.data[i + 3] = 255
  }

  return PNG.sync.write(png)
}

function createBadgeIcon(size) {
  const png = new PNG({ width: size, height: size, filterType: -1 })
  const cx = size / 2, cy = size / 2, r = size * 0.46

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (dist <= r) {
        png.data[i] = 0xEF; png.data[i + 1] = 0x44; png.data[i + 2] = 0x44; png.data[i + 3] = 255
      } else {
        png.data[i] = 0; png.data[i + 1] = 0; png.data[i + 2] = 0; png.data[i + 3] = 0
      }
    }
  }
  return PNG.sync.write(png)
}

// Generate icons
console.log('Generating icons...')

const icon1024 = createNextTalkIcon(1024)
fs.writeFileSync(path.join(resourcesDir, 'icon.png'), icon1024)
console.log('✓ icon.png (1024x1024)')

const icon32 = createNextTalkIcon(32)
fs.writeFileSync(path.join(resourcesDir, 'tray-icon.png'), icon32)
console.log('✓ tray-icon.png (32x32)')

const badge20 = createBadgeIcon(20)
fs.writeFileSync(path.join(resourcesDir, 'badge.png'), badge20)
console.log('✓ badge.png (20x20)')

// Generate .ico for Windows (multi-size ICO)
try {
  const pngToIco = require('png-to-ico')

  // Create multiple sizes for ICO
  const sizes = [16, 32, 48, 64, 128, 256]
  const pngBuffers = sizes.map((s) => createNextTalkIcon(s))

  pngToIco(pngBuffers).then((icoBuffer) => {
    fs.writeFileSync(path.join(resourcesDir, 'icon.ico'), icoBuffer)
    console.log('✓ icon.ico (multi-size: 16,32,48,64,128,256)')
  }).catch(console.error)
} catch {
  // Fallback: copy PNG as ICO placeholder
  fs.copyFileSync(path.join(resourcesDir, 'icon.png'), path.join(resourcesDir, 'icon.ico'))
  console.warn('⚠ png-to-ico not available, copied PNG as icon.ico placeholder')
}

// For macOS .icns: electron-builder handles conversion from icon.png automatically
// when building on macOS. On Windows, provide a manual note.
console.log('ℹ  icon.icns will be generated by electron-builder on macOS')
console.log('Icons generated successfully!')
