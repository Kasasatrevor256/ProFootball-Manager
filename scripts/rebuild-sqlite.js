const { execSync } = require('child_process')
const path = require('path')
const electronVersion = require('../node_modules/electron/package.json').version
const standaloneDir = path.join(__dirname, '..', '.next', 'standalone')

try {
  execSync(
    `npx @electron/rebuild --version ${electronVersion} --module-dir "${standaloneDir}" --which-module better-sqlite3`,
    { stdio: 'inherit', cwd: path.join(__dirname, '..') }
  )
  console.log('Native module rebuilt for Electron successfully')
} catch (err) {
  console.warn('Native module rebuild failed (non-fatal if using sql.js):', err.message)
}
