#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const platform = process.env.BUNDLE_PLATFORM
const serverDir = process.env.SERVER_DIR
const installerDir = process.env.INSTALLER_DIR
const output = process.env.RELEASE_ARCHIVE

if (!['macos', 'windows'].includes(platform)) throw new Error('BUNDLE_PLATFORM must be macos or windows')
if (!serverDir || !installerDir || !output) throw new Error('SERVER_DIR, INSTALLER_DIR and RELEASE_ARCHIVE are required')
if (!existsSync(serverDir)) throw new Error(`Server directory not found: ${serverDir}`)
if (!existsSync(installerDir)) throw new Error(`Installer directory not found: ${installerDir}`)

const bundleDir = path.join(path.dirname(output), `mira-release-${platform}`)
rmSync(bundleDir, { recursive: true, force: true })
mkdirSync(path.join(bundleDir, 'installer'), { recursive: true })
mkdirSync(path.join(bundleDir, 'server'), { recursive: true })
mkdirSync(path.join(bundleDir, 'runtime-deps'), { recursive: true })

const extensions = platform === 'macos' ? ['.dmg', '.zip'] : ['.exe', '.msi', '.zip']
for (const file of readdirSync(installerDir)) {
  if (extensions.some(extension => file.toLowerCase().endsWith(extension))) {
    cpSync(path.join(installerDir, file), path.join(bundleDir, 'installer', file))
  }
}

cpSync(serverDir, path.join(bundleDir, 'server', 'mira-app-server'), { recursive: true })

if (platform === 'macos') {
  for (const packageName of ['ffmpeg', 'imagemagick', 'exiftool']) {
    const prefix = execFileSync('brew', ['--prefix', packageName], { encoding: 'utf8' }).trim()
    cpSync(prefix, path.join(bundleDir, 'runtime-deps', packageName), { recursive: true, dereference: false })
  }
  execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', bundleDir, output], { stdio: 'inherit' })
} else {
  const chocolateyRoot = process.env.ChocolateyInstall || 'C:\\ProgramData\\chocolatey'
  const packages = ['ffmpeg', 'imagemagick', 'exiftool']
  for (const packageName of packages) {
    const toolsDir = path.join(chocolateyRoot, 'lib', packageName, 'tools')
    const targetDir = path.join(bundleDir, 'runtime-deps', packageName)
    if (existsSync(toolsDir)) {
      cpSync(toolsDir, targetDir, { recursive: true })
    } else {
      throw new Error(`Chocolatey tools directory not found: ${toolsDir}`)
    }
  }
  const command = `Compress-Archive -Path '${bundleDir.replaceAll("'", "''") }\\*' -DestinationPath '${output.replaceAll("'", "''")}' -CompressionLevel Optimal -Force`
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { stdio: 'inherit' })
}

console.log(`Release bundle created: ${output}`)
