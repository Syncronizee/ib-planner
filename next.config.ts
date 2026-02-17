import type { NextConfig } from 'next'

const isElectronBuild = process.env.ELECTRON_BUILD === 'true'

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    unoptimized: isElectronBuild,
  },
  ...(isElectronBuild
    ? {
        output: 'standalone',
      }
    : {}),
}

export default nextConfig
