import fs from 'node:fs/promises'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { config as loadEnv } from 'dotenv'

const root = process.cwd()
const sourceDir = path.join(root, 'electron', 'database')
const targetDir = path.join(root, 'dist-electron', 'database')
const desktopEnvPath = path.join(root, 'dist-electron', 'electron.env')

const envCandidates = [path.join(root, '.env.local'), path.join(root, '.env')]
for (const candidate of envCandidates) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate, override: false })
  }
}

await fs.mkdir(targetDir, { recursive: true })
await fs.copyFile(path.join(sourceDir, 'schema.sql'), path.join(targetDir, 'schema.sql'))
await fs.mkdir(path.join(targetDir, 'migrations'), { recursive: true })
await fs.cp(path.join(sourceDir, 'migrations'), path.join(targetDir, 'migrations'), { recursive: true })

const envLines = [
  `NEXT_PUBLIC_SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
]

await fs.writeFile(desktopEnvPath, `${envLines.join('\n')}\n`, 'utf8')
