import path from 'path'

export const EXTENSION_ICON_MAP = new Map<string, string>([
  // 图片文件
  ['.jpg', 'JPG.png'],
  ['.jpeg', 'JPG.png'],
  ['.png', 'PNG.png'],
  ['.gif', 'GIFF.png'],
  ['.bmp', 'BMP.png'],
  ['.tiff', 'TIFF.png'],
  ['.tif', 'TIFF.png'],
  ['.svg', 'SVG.png'],
  ['.raw', 'RAW.png'],
  ['.webp', 'PNG.png'],

  // 视频文件
  ['.mp4', 'MP4.png'],
  ['.avi', 'AVI.png'],
  ['.mov', 'MOV.png'],
  ['.mpeg', 'MPEG.png'],
  ['.mpg', 'MPEG.png'],
  ['.flv', 'FLV.png'],
  ['.wmv', 'MP4.png'],
  ['.mkv', 'MP4.png'],

  // 音频文件
  ['.mp3', 'MP3.png'],
  ['.wav', 'WAV.png'],
  ['.wma', 'WMA.png'],
  ['.mid', 'MID.png'],
  ['.midi', 'MID.png'],
  ['.flac', 'WAV.png'],
  ['.aac', 'MP3.png'],

  // 文档文件
  ['.pdf', 'PDF.png'],
  ['.doc', 'DOC.png'],
  ['.docx', 'DOCX.png'],
  ['.txt', 'TXT.png'],
  ['.rtf', 'TXT.png'],
  ['.ppt', 'PPT.png'],
  ['.pptx', 'PPT.png'],
  ['.xls', 'CSV.png'],
  ['.xlsx', 'CSV.png'],
  ['.csv', 'CSV.png'],

  // 网页和标记语言文件
  ['.html', 'HTML.png'],
  ['.htm', 'HTML.png'],
  ['.xml', 'XML.png'],
  ['.xsl', 'XSL.png'],
  ['.rss', 'RSS.png'],

  // 设计文件
  ['.psd', 'PSD.png'],
  ['.ai', 'AI.png'],
  ['.eps', 'EPS.png'],
  ['.dwg', 'DWG.png'],

  // 压缩文件
  ['.zip', 'ZIP.png'],
  ['.rar', 'RAR.png'],
  ['.7z', 'ZIP.png'],
  ['.tar', 'ZIP.png'],
  ['.gz', 'ZIP.png'],

  // 程序和系统文件
  ['.exe', 'EXE.png'],
  ['.dll', 'DLL.png'],
  ['.java', 'JAVA.png'],
  ['.js', 'HTML.png'],
  ['.css', 'HTML.png'],

  // 数据库文件
  ['.mdb', 'MDB.png'],
  ['.db', 'MDB.png'],

  // 光盘镜像文件
  ['.iso', 'ISO.png'],

  // 其他文件
  ['.pub', 'PUB.png'],
  ['.ps', 'PS.png'],
  ['.crd', 'CRD.png']
])

export function getExtIconFileName(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return EXTENSION_ICON_MAP.get(ext) || 'FILE.png'
}
