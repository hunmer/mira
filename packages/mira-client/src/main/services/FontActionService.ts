import { app } from 'electron'
import { execFile, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { promisify } from 'node:util'

const fontkit: any = require('fontkit')
const execFileAsync = promisify(execFile)
const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.ttc'])
const MAX_FONT_SIZE = 128 * 1024 * 1024

export type AdobeAppType = 'photoshop' | 'illustrator' | 'indesign'

export interface FontActionResult {
  success: boolean
  message: string
  font?: {
    familyName: string
    subfamilyName: string
    postscriptName: string
    fullName: string
  }
  activatedPath?: string
}

const ADOBE_APPS: Record<AdobeAppType, { displayName: string; executable: string; bundleId: string }> = {
  photoshop: { displayName: 'Photoshop', executable: 'Photoshop.exe', bundleId: 'com.adobe.Photoshop' },
  illustrator: { displayName: 'Illustrator', executable: 'Illustrator.exe', bundleId: 'com.adobe.Illustrator' },
  indesign: { displayName: 'InDesign', executable: 'InDesign.exe', bundleId: 'com.adobe.InDesign' },
}

function firstFont(opened: any): any {
  const font = Array.isArray(opened?.fonts) ? opened.fonts[0] : opened
  if (!font) throw new Error('无法读取字体信息')
  return font
}

function jsxString(value: string): string {
  return JSON.stringify(value).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

export class FontActionService {
  async activate(fontPath: string): Promise<FontActionResult> {
    const source = await this.validateFontPath(fontPath)
    const font = this.readFont(source)
    const activatedPath = await this.copyToUserFonts(source)

    if (process.platform === 'win32') await this.registerWindowsFont(activatedPath, font.fullName)
    else if (process.platform === 'darwin') await this.registerMacFont(activatedPath)
    else if (process.platform === 'linux') await this.refreshLinuxFonts()
    else throw new Error(`暂不支持当前平台：${process.platform}`)

    return { success: true, message: '字体已激活', font, activatedPath }
  }

  async applyToAdobe(fontPath: string, appType: AdobeAppType): Promise<FontActionResult> {
    if (!Object.prototype.hasOwnProperty.call(ADOBE_APPS, appType)) throw new Error('不支持的目标应用')
    if (process.platform !== 'win32' && process.platform !== 'darwin') {
      throw new Error('Adobe 字体切换当前仅支持 Windows 和 macOS')
    }
    const activation = await this.activate(fontPath)
    const font = activation.font!
    if (!font.postscriptName) throw new Error('字体缺少 PostScript 名称，无法发送到 Adobe')

    const target = ADOBE_APPS[appType]
    const resultPath = path.join(app.getPath('temp'), `mira-font-${appType}-${Date.now()}.txt`)
    const scriptPath = path.join(app.getPath('temp'), `mira-font-${appType}-${Date.now()}.jsx`)
    await fs.writeFile(scriptPath, this.createAdobeScript(appType, font, resultPath), 'utf8')

    try {
      if (process.platform === 'darwin') await this.runAdobeScriptOnMac(target.bundleId, appType, scriptPath)
      else if (process.platform === 'win32') await this.runAdobeScriptOnWindows(target, scriptPath)
      const output = await this.waitForResult(resultPath)
      if (output !== 'SUCCESS') throw new Error(this.describeAdobeError(output))
      return { ...activation, message: `字体已应用到 ${target.displayName}` }
    } finally {
      await Promise.allSettled([fs.rm(scriptPath, { force: true }), fs.rm(resultPath, { force: true })])
    }
  }

  private async validateFontPath(input: string): Promise<string> {
    if (typeof input !== 'string' || !path.isAbsolute(input)) throw new Error('请选择本地字体文件')
    const resolved = path.resolve(input)
    if (!FONT_EXTENSIONS.has(path.extname(resolved).toLowerCase())) throw new Error('不支持的字体格式')
    const stat = await fs.stat(resolved)
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_FONT_SIZE) throw new Error('字体文件无效或超过 128MB')
    return resolved
  }

  private readFont(fontPath: string): NonNullable<FontActionResult['font']> {
    const font = firstFont(fontkit.openSync(fontPath))
    return {
      familyName: String(font.familyName || ''),
      subfamilyName: String(font.subfamilyName || 'Regular'),
      postscriptName: String(font.postscriptName || ''),
      fullName: String(font.fullName || font.familyName || path.basename(fontPath, path.extname(fontPath))),
    }
  }

  private getUserFontsDir(): string {
    if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || os.homedir(), 'Microsoft', 'Windows', 'Fonts')
    if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Fonts')
    return path.join(os.homedir(), '.local', 'share', 'fonts')
  }

  private async copyToUserFonts(source: string): Promise<string> {
    const fontsDir = this.getUserFontsDir()
    await fs.mkdir(fontsDir, { recursive: true })
    let destination = path.join(fontsDir, path.basename(source))
    const existing = await fs.readFile(destination).catch(() => null)
    const sourceData = await fs.readFile(source)
    if (existing && !existing.equals(sourceData)) {
      const hash = createHash('sha256').update(sourceData).digest('hex').slice(0, 8)
      destination = path.join(fontsDir, `${path.basename(source, path.extname(source))}-${hash}${path.extname(source)}`)
    }
    if (path.resolve(source) !== path.resolve(destination)) await fs.writeFile(destination, sourceData)
    return destination
  }

  private async registerWindowsFont(fontPath: string, fullName: string): Promise<void> {
    const registryName = `${fullName} (${path.extname(fontPath).toLowerCase() === '.otf' ? 'OpenType' : 'TrueType'})`
    await execFileAsync('reg.exe', [
      'add', 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',
      '/v', registryName, '/t', 'REG_SZ', '/d', fontPath, '/f',
    ], { windowsHide: true })
    const escaped = fontPath.replace(/'/g, "''")
    const script = `$signature = @'\nusing System;\nusing System.Runtime.InteropServices;\npublic static class MiraFontNative {\n  [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern int AddFontResourceEx(string path, uint flags, IntPtr reserved);\n  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);\n}\n'@; Add-Type $signature; [MiraFontNative]::AddFontResourceEx('${escaped}', 0, [IntPtr]::Zero) | Out-Null; $result = [IntPtr]::Zero; [MiraFontNative]::SendMessageTimeout([IntPtr]0xffff, 0x001d, [IntPtr]::Zero, [IntPtr]::Zero, 2, 3000, [ref]$result) | Out-Null`
    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 15000 })
  }

  private async registerMacFont(fontPath: string): Promise<void> {
    const swiftPath = JSON.stringify(fontPath)
    const script = `import Foundation\nimport CoreText\nlet url = URL(fileURLWithPath: ${swiftPath})\nvar error: Unmanaged<CFError>?\nif !CTFontManagerRegisterFontsForURL(url as CFURL, .user, &error) {\n  let text = error.map { String(describing: $0.takeRetainedValue()) } ?? "unknown error"\n  if !text.lowercased().contains("already") { fputs(text, stderr); exit(1) }\n}`
    await execFileAsync('swift', ['-e', script], { timeout: 30000 })
  }

  private async refreshLinuxFonts(): Promise<void> {
    await execFileAsync('fc-cache', ['-f'], { timeout: 30000 })
  }

  private createAdobeScript(appType: AdobeAppType, font: NonNullable<FontActionResult['font']>, resultPath: string): string {
    const result = jsxString(resultPath.replace(/\\/g, '/'))
    const postscript = jsxString(font.postscriptName)
    const familyStyle = jsxString(`${font.familyName}\t${font.subfamilyName}`)
    const body = appType === 'photoshop'
      ? `if (!app.documents.length) fail("NO_DOCUMENT");\nvar layer = app.activeDocument.activeLayer;\nif (!layer || layer.kind !== LayerKind.TEXT) fail("NOT_TEXT_LAYER");\nlayer.textItem.font = ${postscript};`
      : appType === 'illustrator'
        ? `if (!app.documents.length) fail("NO_DOCUMENT");\nvar doc = app.activeDocument;\nvar ranges = [];\nif (doc.textSelection && doc.textSelection.length) { for (var i = 0; i < doc.textSelection.length; i++) ranges.push(doc.textSelection[i]); }\nelse if (doc.selection && doc.selection.length) { for (var j = 0; j < doc.selection.length; j++) if (doc.selection[j].typename === "TextFrame") ranges.push(doc.selection[j].textRange); }\nif (!ranges.length) fail("NO_TEXT_SELECTION");\nvar target = app.textFonts.getByName(${postscript});\nfor (var k = 0; k < ranges.length; k++) ranges[k].characterAttributes.textFont = target;\napp.redraw();`
        : `if (!app.documents.length) fail("NO_DOCUMENT");\nvar selection = app.activeDocument.selection;\nif (!selection || !selection.length) fail("NO_TEXT_SELECTION");\nfor (var i = 0; i < selection.length; i++) { if (selection[i].hasOwnProperty("appliedFont")) selection[i].appliedFont = ${familyStyle}; else if (selection[i].texts && selection[i].texts.length) selection[i].texts[0].appliedFont = ${familyStyle}; }`

    return `#target ${appType}\nvar outputFile = new File(${result});\nfunction output(value) { outputFile.encoding = "UTF-8"; outputFile.open("w"); outputFile.write(value); outputFile.close(); }\nfunction fail(code) { output("ERROR:" + code); throw new Error(code); }\ntry {\n${body}\noutput("SUCCESS");\n} catch (error) { if (!outputFile.exists) output("ERROR:" + (error.message || "UNKNOWN")); }\n`
  }

  private async runAdobeScriptOnMac(bundleId: string, appType: AdobeAppType, scriptPath: string): Promise<void> {
    const command = appType === 'indesign' ? 'do script jsxText language javascript' : 'do javascript jsxText'
    const appleScript = `set scriptFile to POSIX file ${JSON.stringify(scriptPath)} as alias\nset jsxText to read scriptFile as «class utf8»\ntell application id ${JSON.stringify(bundleId)} to ${command}`
    await execFileAsync('osascript', ['-e', appleScript], { timeout: 30000 })
  }

  private async runAdobeScriptOnWindows(target: typeof ADOBE_APPS[AdobeAppType], scriptPath: string): Promise<void> {
    const executable = await this.findAdobeExecutable(target.executable)
    if (!executable) throw new Error(`未找到 Adobe ${target.displayName}`)
    const child = spawn(executable, [scriptPath], { detached: true, stdio: 'ignore', windowsHide: true })
    child.unref()
  }

  private async findAdobeExecutable(executable: string): Promise<string | null> {
    const processName = path.basename(executable, '.exe')
    const runningPath = await execFileAsync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `(Get-Process -Name '${processName}' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Path)`,
    ], { windowsHide: true, timeout: 5000 }).then(({ stdout }) => stdout.trim()).catch(() => '')
    if (runningPath && path.basename(runningPath).toLowerCase() === executable.toLowerCase()) {
      const exists = await fs.stat(runningPath).then((stat) => stat.isFile()).catch(() => false)
      if (exists) return runningPath
    }

    const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean) as string[]
    for (const root of roots) {
      const adobeRoot = path.join(root, 'Adobe')
      const directories = await fs.readdir(adobeRoot, { withFileTypes: true }).catch(() => [])
      const candidates = directories.filter((entry) => entry.isDirectory()).sort((a, b) => b.name.localeCompare(a.name))
      for (const entry of candidates) {
        const base = path.join(adobeRoot, entry.name)
        for (const candidate of [path.join(base, executable), path.join(base, 'Support Files', 'Contents', 'Windows', executable)]) {
          if (await fs.stat(candidate).then((stat) => stat.isFile()).catch(() => false)) return candidate
        }
      }
    }
    return null
  }

  private async waitForResult(resultPath: string): Promise<string> {
    const deadline = Date.now() + 12000
    while (Date.now() < deadline) {
      const result = await fs.readFile(resultPath, 'utf8').catch(() => '')
      if (result.trim()) return result.trim()
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    throw new Error('目标应用未在限定时间内返回结果')
  }

  private describeAdobeError(output: string): string {
    const code = output.replace(/^ERROR:/, '').trim()
    const messages: Record<string, string> = {
      NO_DOCUMENT: '目标应用没有打开文档',
      NOT_TEXT_LAYER: 'Photoshop 当前图层不是文字图层',
      NO_TEXT_SELECTION: '请先在目标应用中选择文字或文本框',
      FONT_NOT_FOUND: '目标应用尚未识别该字体，请稍后重试',
    }
    return messages[code] || `目标应用操作失败：${code}`
  }
}
