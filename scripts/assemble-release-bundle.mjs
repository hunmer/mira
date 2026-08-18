#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, realpathSync, rmSync } from 'node:fs'
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

const extensions = platform === 'macos' ? ['.dmg'] : ['.exe', '.msi', '.zip']
for (const file of readdirSync(installerDir)) {
  if (extensions.some(extension => file.toLowerCase().endsWith(extension))) {
    cpSync(path.join(installerDir, file), path.join(bundleDir, 'installer', file))
  }
}

cpSync(serverDir, path.join(bundleDir, 'server', 'mira-app-server'), { recursive: true })

if (platform === 'macos') {
  for (const packageName of ['ffmpeg', 'imagemagick', 'exiftool']) {
    const prefix = execFileSync('brew', ['--prefix', packageName], { encoding: 'utf8' }).trim()
    cpSync(realpathSync(prefix), path.join(bundleDir, 'runtime-deps', packageName), { recursive: true, dereference: true })
  }
  for (const file of ['install-mira-macos.sh', 'uninstall-mira-macos.sh']) {
    const target = path.join(bundleDir, file)
    cpSync(path.resolve('scripts', file), target)
    chmodSync(target, 0o755)
  }
  execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', bundleDir, output], { stdio: 'inherit' })
} else {
  const chocolateyRoot = process.env.ChocolateyInstall || 'C:\\ProgramData\\chocolatey'
  const packages = ['ffmpeg', 'imagemagick', 'exiftool']
  for (const packageName of packages) {
    const toolsDir = path.join(chocolateyRoot, 'lib', packageName, 'tools')
    const targetDir = path.join(bundleDir, 'runtime-deps', packageName)
    if (packageName === 'imagemagick') {
      const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
      const installDir = readdirSync(programFiles, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && entry.name.toLowerCase().startsWith('imagemagick'))
        .map(entry => path.join(programFiles, entry.name))
        .sort()
        .pop()
      if (!installDir) throw new Error('ImageMagick installation directory not found')
      cpSync(installDir, targetDir, { recursive: true })
    } else if (existsSync(toolsDir)) {
      cpSync(toolsDir, targetDir, { recursive: true })
    } else {
      throw new Error(`Chocolatey tools directory not found: ${toolsDir}`)
    }
  }
  for (const file of ['install-mira-windows.ps1', 'uninstall-mira-windows.ps1']) {
    cpSync(path.resolve('scripts', file), path.join(bundleDir, file))
  }
  const command = `Compress-Archive -Path '${bundleDir.replaceAll("'", "''") }\\*' -DestinationPath '${output.replaceAll("'", "''")}' -CompressionLevel Optimal -Force`
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { stdio: 'inherit' })
}

console.log(`Release bundle created: ${output}`)
