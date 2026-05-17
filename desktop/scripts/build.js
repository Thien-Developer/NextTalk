/**
 * Full build script for NextTalk Desktop.
 * 1. Generate icons
 * 2. Build Next.js web app (static export)
 * 3. Compile Electron TypeScript
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '../..')
const WEB_DIR = path.join(ROOT, 'web')
const DESKTOP_DIR = path.join(ROOT, 'desktop')

function run(cmd, cwd = DESKTOP_DIR, env = {}) {
  console.log(`\n> ${cmd}  [${cwd}]`)
  const result = spawnSync(cmd, { shell: true, cwd, stdio: 'inherit', env: { ...process.env, ...env } })
  if (result.status !== 0) {
    console.error(`\nCommand failed with exit code ${result.status}: ${cmd}`)
    process.exit(1)
  }
}

// ── Step 1: Generate icons ──────────────────────────────────────────────────
console.log('\n[1/3] Generating icons...')
run('node scripts/generate-icons.js')

// ── Step 2: Build Next.js web app (static export) ─────────────────────────
console.log('\n[2/3] Building Next.js web app (static export for Electron)...')
run('pnpm build', WEB_DIR, { NEXT_BUILD_TARGET: 'electron' })

const outDir = path.join(WEB_DIR, 'out')
if (!fs.existsSync(outDir)) {
  console.error('Next.js out/ directory not found. Did next build succeed?')
  process.exit(1)
}
console.log(`Static output: ${outDir}`)

// ── Step 3: Compile Electron TypeScript ────────────────────────────────────
console.log('\n[3/3] Compiling Electron TypeScript...')
run('npx tsc')

console.log('\n✅ Build complete!')
console.log('  Windows: pnpm dist:win')
console.log('  Mac:     pnpm dist:mac (requires macOS)')
