/**
 * CEP 宿主桥接:CSInterface evalScript + 素材下载置入。
 * 拖出面板的兜底路径:XHR 下载 → 临时目录(--mixed-context 下用 node,缺省走 cep.fs+base64)
 * → evalScript 调 host.jsx 的 miraPlaceFile 置入 PS。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyWindow = any
const w = window as AnyWindow

export function getCSInterface() {
  return w.CSInterface ? new w.CSInterface() : null
}

export function evalHost(script: string): Promise<string> {
  return new Promise(resolve => {
    const cs = getCSInterface()
    if (!cs) return resolve('ERR:CSInterface 不可用')
    cs.evalScript(script, r => resolve(String(r)))
  })
}

function xhrArrayBuffer(url: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'arraybuffer'
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300
      ? resolve(xhr.response as ArrayBuffer)
      : reject(new Error(`HTTP ${xhr.status}`)))
    xhr.onerror = () => reject(new Error('网络错误(检查服务器地址/服务是否在线)'))
    xhr.send()
  })
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[])
  }
  return btoa(binary)
}

function sanitize(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

async function downloadToTemp(url: string, name: string): Promise<string> {
  const buffer = await xhrArrayBuffer(url)
  const file = `${Date.now()}-${sanitize(name)}`
  const req: any = w.require
  if (typeof req === 'function') {
    const path = req('path'), fs = req('fs'), os = req('os')
    const dir = path.join(os.tmpdir(), 'mira-cep')
    fs.mkdirSync(dir, { recursive: true })
    const full = path.join(dir, file)
    fs.writeFileSync(full, req('buffer').Buffer.from(buffer))
    return full
  }
  const cs = getCSInterface()
  const cep = w.cep
  if (!cs || !cep) throw new Error('无可用文件写入方式(缺少 node / cep.fs)')
  const dir = cs.getSystemPath(w.SystemPath.EXTENSION) + '/tmp'
  cep.fs.makedir(dir)
  const full = `${dir}/${file}`
  const result = cep.fs.writeFile(full, arrayBufferToBase64(buffer), w.cep.encoding.Base64)
  if (result.err !== 0) throw new Error(`cep.fs 写入失败(${result.err})`)
  return full
}

/** 下载素材并置入/打开到 PS,进度经 notify 回显到面板 */
export async function placeFromUrl(url: string, name: string, notify: (msg: string) => void) {
  try {
    notify(`下载 ${name} …`)
    const local = await downloadToTemp(url, name)
    notify(`置入 ${name} …`)
    const escaped = local.replace(/\\/g, '/').replace(/"/g, '\\"')
    const result = await evalHost(`miraPlaceFile("${escaped}")`)
    notify(result.startsWith('ERR') ? `${name} ${result}` : `${result === 'opened' ? '已打开' : '已置入'} ${name}`)
  } catch (error: any) {
    notify(`置入失败: ${error?.message || error}`)
  }
}

export function mimeOf(name: string): string {
  const ext = (name.split('.').pop() || '').toLowerCase()
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
    svg: 'image/svg+xml', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff', psd: 'image/vnd.adobe.photoshop',
    mp4: 'video/mp4', mov: 'video/quicktime', mp3: 'audio/mpeg', wav: 'audio/wav', pdf: 'application/pdf',
  }
  return map[ext] || 'application/octet-stream'
}
