import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const fontkit: any = require('fontkit')

const PLUGIN_NAME = 'mira_font_format'
const EXTENSIONS = ['ttf', 'otf', 'woff', 'woff2', 'ttc']
const MIME_TYPES = [
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/font-sfnt',
  'application/vnd.ms-opentype',
  'application/x-font-ttf',
  'application/x-font-otf',
]

interface FontFormatManager {
  registerFileFormat(pluginName: string, handler: {
    id: string
    extensions: string[]
    mimeTypes: string[]
    thumbnailExtensions: string[]
    process: (filePath: string) => Promise<Record<string, unknown>>
    thumbnail: (srcPath: string, destPath: string) => Promise<void>
    viewers: Array<{
      viewerId: string
      title: string
      icon: string
      entry: string
      priority: number
      getQuery: (context: any) => Record<string, unknown>
    }>
  }): () => void
}

function firstFont(opened: any): any {
  const font = Array.isArray(opened?.fonts) ? opened.fonts[0] : opened
  if (!font?.layout || !font?.unitsPerEm) throw new Error('字体文件中没有可预览的字型')
  return font
}

function openFont(filePath: string): any {
  return firstFont(fontkit.openSync(filePath))
}

function chooseSample(font: any): string {
  const preferred = ['Aa', '字体', '12', '!?']
  for (const candidate of preferred) {
    const available = Array.from(candidate).filter((char) => font.hasGlyphForCodePoint(char.codePointAt(0)))
    if (available.length) return available.join('')
  }
  const codePoints = (font.characterSet || []).filter((value: number) => value >= 33 && value <= 0x10ffff).slice(0, 2)
  if (!codePoints.length) throw new Error('字体没有可显示的字符')
  return String.fromCodePoint(...codePoints)
}

function renderGlyphs(font: any): string {
  const run = font.layout(chooseSample(font))
  const advance = run.positions.reduce((sum: number, position: any) => sum + (position.xAdvance || 0), 0) || font.unitsPerEm
  const verticalUnits = Math.max(font.unitsPerEm, (font.ascent || font.unitsPerEm) - (font.descent || 0))
  const scale = Math.min(380 / advance, 220 / verticalUnits)
  const startX = (512 - advance * scale) / 2
  const baseline = 310
  let cursor = 0

  return run.glyphs.map((glyph: any, index: number) => {
    const position = run.positions[index] || {}
    const x = startX + (cursor + (position.xOffset || 0)) * scale
    const y = baseline - (position.yOffset || 0) * scale
    cursor += position.xAdvance || 0
    return `<g transform="translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${scale.toFixed(6)} ${(-scale).toFixed(6)})">${glyph.path.toSVG()}</g>`
  }).join('')
}

class MiraFontFormatPlugin {
  private unregister?: () => void

  constructor(inst: any) {
    const pluginManager = inst.pluginManager as FontFormatManager
    this.unregister = pluginManager.registerFileFormat(PLUGIN_NAME, {
      id: PLUGIN_NAME,
      extensions: EXTENSIONS,
      mimeTypes: MIME_TYPES,
      thumbnailExtensions: EXTENSIONS,
      process: (filePath) => this.process(filePath),
      thumbnail: (srcPath, destPath) => this.thumbnail(srcPath, destPath),
      viewers: [{
        viewerId: 'mira-font-preview',
        title: '字体预览',
        icon: 'text_fields',
        entry: 'viewer.html',
        priority: 20,
        getQuery: ({ file, fileId, fileUrl }: any) => ({
          fileId,
          fileName: file?.name || 'Font',
          format: String(file?.extension || path.extname(file?.name || '')).replace(/^\./, '').toUpperCase(),
          fileUrl,
        }),
      }],
    })
    console.log(`[${PLUGIN_NAME}] registered ${EXTENSIONS.map((extension) => `.${extension}`).join(', ')} preview and thumbnail support`)
  }

  private async process(filePath: string): Promise<Record<string, unknown>> {
    const font = openFont(filePath)
    const stat = await fs.promises.stat(filePath)
    return {
      format: path.extname(filePath).slice(1).toLowerCase(),
      size: stat.size,
      familyName: font.familyName || '',
      subfamilyName: font.subfamilyName || '',
      postscriptName: font.postscriptName || '',
      fullName: font.fullName || '',
      glyphCount: Number(font.numGlyphs) || 0,
      unitsPerEm: Number(font.unitsPerEm) || 0,
      variationAxes: font.variationAxes || {},
    }
  }

  private async thumbnail(srcPath: string, destPath: string): Promise<void> {
    const font = openFont(srcPath)
    const label = String(font.familyName || path.basename(srcPath, path.extname(srcPath)))
      .replace(/[&<>"']/g, (char: string) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char] as string))
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" fill="#f5f5f4"/>
      <rect x="28" y="28" width="456" height="456" rx="6" fill="#ffffff" stroke="#d6d3d1" stroke-width="2"/>
      <g fill="#18181b">${renderGlyphs(font)}</g>
      <text x="256" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#52525b">${label}</text>
    </svg>`)
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true })
    await sharp(svg).png().toFile(destPath)
  }

  cleanup(): void {
    this.unregister?.()
    this.unregister = undefined
  }
}

export function init(inst: any) {
  return new MiraFontFormatPlugin(inst)
}
