/**
 * Creates a directory-based package (no installer) for local testing.
 * Use this when electron-builder fails due to Windows symlink restrictions.
 * Output: release/NextTalk-win32-x64/
 */
const { packager } = require('@electron/packager')
const path = require('path')

const DESKTOP_DIR = path.join(__dirname, '..')

async function main() {
  console.log('Packaging NextTalk (directory output)...')

  const appPaths = await packager({
    dir: DESKTOP_DIR,
    name: 'NextTalk',
    platform: process.platform,
    arch: process.arch,
    out: path.join(DESKTOP_DIR, 'release'),
    overwrite: true,
    icon: path.join(DESKTOP_DIR, 'resources', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    appVersion: require('../package.json').version,
    asar: true,
    extraResource: [
      path.join(DESKTOP_DIR, '..', 'web', 'out'),
    ],
    ignore: [
      /node_modules/,
      /\.git/,
      /scripts/,
      /release/,
      /src/,
      /tsconfig\.json/,
      /electron-builder\.yml/,
      /\.map$/,
    ],
    appBundleId: 'com.nexttalk.desktop',
    win32metadata: {
      CompanyName: 'NextTalk',
      FileDescription: 'NextTalk Desktop — Zalo-like Messenger',
      ProductName: 'NextTalk',
    },
  })

  console.log('Packaged to:', appPaths)
}

main().catch((err) => { console.error(err); process.exit(1) })
