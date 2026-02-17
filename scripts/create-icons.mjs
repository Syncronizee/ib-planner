#!/usr/bin/env node

/**
 * Generates placeholder desktop icons for electron-builder.
 * Replace these with branded assets before a production release.
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const buildDir = path.join(projectRoot, 'build')
const iconsDir = path.join(buildDir, 'icons')
const sourceCandidates = [
  path.join(buildDir, 'source-icon.png'),
  path.join(projectRoot, 'public', 'icon.png'),
  path.join(projectRoot, 'src', 'app', 'favicon.ico'),
]

const iconSizes = [16, 32, 48, 64, 128, 256, 512, 1024]
const transparentPixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2uoAAAAASUVORK5CYII=',
  'base64'
)

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function findSourceIcon() {
  for (const candidate of sourceCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

function writeFallbackIcons() {
  ensureDir(iconsDir)

  for (const size of iconSizes) {
    fs.writeFileSync(path.join(iconsDir, `${size}x${size}.png`), transparentPixelPng)
  }

  fs.writeFileSync(path.join(buildDir, 'icon.png'), transparentPixelPng)
  fs.writeFileSync(path.join(buildDir, 'icon.icns'), transparentPixelPng)
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), transparentPixelPng)
}

function runSips(args) {
  execFileSync('sips', args, { stdio: 'ignore' })
}

function buildWithSips(sourcePath) {
  ensureDir(buildDir)
  ensureDir(iconsDir)

  const tempPngPath = path.join(buildDir, '.icon-source.png')
  const sourceExtension = path.extname(sourcePath).toLowerCase()

  if (sourceExtension === '.png') {
    fs.copyFileSync(sourcePath, tempPngPath)
  } else {
    runSips(['-s', 'format', 'png', sourcePath, '--out', tempPngPath])
  }

  for (const size of iconSizes) {
    const outputPath = path.join(iconsDir, `${size}x${size}.png`)
    runSips([tempPngPath, '-z', String(size), String(size), '--out', outputPath])
  }

  const appIconPng = path.join(buildDir, 'icon.png')
  runSips([tempPngPath, '-z', '1024', '1024', '--out', appIconPng])

  // sips is more reliable for icns conversion from <=512 px source images.
  const icon512Path = path.join(iconsDir, '512x512.png')
  const icon256Path = path.join(iconsDir, '256x256.png')
  runSips(['-s', 'format', 'icns', icon512Path, '--out', path.join(buildDir, 'icon.icns')])
  runSips(['-s', 'format', 'ico', icon256Path, '--out', path.join(buildDir, 'icon.ico')])

  fs.rmSync(tempPngPath, { force: true })
}

function main() {
  const sourceIcon = findSourceIcon()
  if (!sourceIcon) {
    writeFallbackIcons()
    console.log('No source icon found. Wrote transparent placeholders in build/.')
    return
  }

  try {
    buildWithSips(sourceIcon)
    console.log(`Generated placeholder icons from ${path.relative(projectRoot, sourceIcon)}.`)
  } catch (error) {
    writeFallbackIcons()
    console.warn('sips is unavailable; wrote transparent placeholders instead.')
    if (error instanceof Error) {
      console.warn(error.message)
    }
  }
}

main()
