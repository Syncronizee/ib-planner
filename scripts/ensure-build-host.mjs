#!/usr/bin/env node

const [, , targetPlatform] = process.argv

const platformNames = {
  win32: 'Windows',
  darwin: 'macOS',
  linux: 'Linux',
}

if (!targetPlatform) {
  console.error('Missing target platform. Usage: node scripts/ensure-build-host.mjs <platform>')
  process.exit(1)
}

if (process.platform !== targetPlatform) {
  const currentName = platformNames[process.platform] || process.platform
  const targetName = platformNames[targetPlatform] || targetPlatform

  console.error(
    `Cannot build ${targetName} native Electron packages on ${currentName}. ` +
      `Native modules like better-sqlite3 must be rebuilt on ${targetName} first.`
  )
  process.exit(1)
}
