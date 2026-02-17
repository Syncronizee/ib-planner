#!/usr/bin/env node

/**
 * Desktop release build pipeline:
 * 1) Generate placeholder icons.
 * 2) Build Next.js standalone bundle for Electron.
 * 3) Compile Electron main/preload code.
 * 4) Package installers with electron-builder.
 */

import { execSync } from 'node:child_process'

function run(command) {
  console.log(`\n> ${command}`)
  execSync(command, { stdio: 'inherit' })
}

function main() {
  run('pnpm icons:generate')
  run('pnpm build:web:electron')
  run('pnpm repair:electron:standalone')
  run('pnpm build:electron:main')
  run('pnpm exec electron-builder')
}

main()
