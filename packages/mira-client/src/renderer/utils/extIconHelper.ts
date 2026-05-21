const EXT_ICON_MAP: Record<string, string> = {
  '.jpg': 'JPG', '.jpeg': 'JPG', '.png': 'PNG', '.gif': 'GIFF',
  '.bmp': 'BMP', '.tiff': 'TIFF', '.tif': 'TIFF', '.svg': 'SVG',
  '.raw': 'RAW', '.webp': 'PNG',
  '.mp4': 'MP4', '.avi': 'AVI', '.mov': 'MOV', '.mpeg': 'MPEG',
  '.mpg': 'MPEG', '.flv': 'FLV', '.wmv': 'MP4', '.mkv': 'MP4',
  '.mp3': 'MP3', '.wav': 'WAV', '.wma': 'WMA', '.mid': 'MID',
  '.midi': 'MID', '.flac': 'WAV', '.aac': 'MP3',
  '.pdf': 'PDF', '.doc': 'DOC', '.docx': 'DOCX', '.txt': 'TXT',
  '.rtf': 'TXT', '.ppt': 'PPT', '.pptx': 'PPT', '.xls': 'CSV',
  '.xlsx': 'CSV', '.csv': 'CSV',
  '.html': 'HTML', '.htm': 'HTML', '.xml': 'XML', '.xsl': 'XSL',
  '.psd': 'PSD', '.ai': 'AI', '.eps': 'EPS', '.dwg': 'DWG',
  '.zip': 'ZIP', '.rar': 'RAR', '.7z': 'ZIP', '.tar': 'ZIP', '.gz': 'ZIP',
  '.exe': 'EXE', '.dll': 'DLL', '.iso': 'ISO',
}

const iconModules = import.meta.glob<{ default: string }>(
  '../../../../assets/ext_icons/*.png',
  { eager: true, query: '?url', import: 'default' }
)

const iconCache = new Map<string, string>()

function resolveIconUrl(iconName: string): string {
  if (iconCache.has(iconName)) return iconCache.get(iconName)!
  for (const [path, url] of Object.entries(iconModules)) {
    if (path.endsWith(`/${iconName}.png`)) {
      iconCache.set(iconName, url)
      return url
    }
  }
  return ''
}

export function getExtIconUrl(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  const ext = dotIndex > 0 ? filename.slice(dotIndex).toLowerCase() : ''
  const iconName = EXT_ICON_MAP[ext] || 'FILE'
  return resolveIconUrl(iconName)
}
