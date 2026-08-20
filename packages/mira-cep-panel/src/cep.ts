/**
 * CEP 宿主桥接:素材预下载到本地临时目录 + 拖拽置入。
 *
 * 拖出面板走 CEP 原生机制:dragstart 设置 Adobe 专用拖拽类型
 * `com.adobe.cep.dnd.file.0` = 本地文件路径(Windows 反斜杠按文档需双写),
 * PS 端原生处理(拖到画布=置入图层,拖到空白区=新文档)。
 * mousedown 即开始预下载,保证 drop 时文件已就绪;拖拽未被接收时经
 * evalScript 调 host.jsx 的 miraPlaceFile 兜底置入。
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

/** 宿主脚本(ExtendScript):置入/打开本地文件;内联避免依赖 ScriptPath 的加载时机 */
const HOST_JSX = `
function miraPlaceFile(path) {
  try {
    var f = new File(path);
    if (!f.exists) return 'ERR:文件不存在 ' + path;
    if (app.documents.length === 0) {
      try { open(f); } catch (e1) { /* 同名文档可能已打开 */ }
      return app.documents.length ? 'opened|' + app.activeDocument.name : 'ERR:open 后无文档';
    }
    var before = app.activeDocument.layers.length;
    var desc = new ActionDescriptor();
    desc.putPath(charIDToTypeID('null'), f);
    executeAction(stringIDToTypeID('placeEvent'), desc, DialogModes.NO);
    var after = app.activeDocument.layers.length;
    return 'placed|' + app.activeDocument.name + '|图层 ' + before + '->' + after;
  } catch (e) {
    return 'ERR:' + e.toString();
  }
}`

/** 置入本地文件:每次连同函数定义一起 evalScript,返回带诊断信息(文档名/图层变化) */
export function placeFileViaHost(localPath: string): Promise<string> {
  const escaped = localPath.replace(/\\/g, '/').replace(/"/g, '\\"')
  return evalHost(`(function(){${HOST_JSX} return miraPlaceFile("${escaped}");})()`)
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

function sanitize(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

const isWindows = /win/i.test(String(w.navigator?.platform || ''))

function nodeRequire(): any | null {
  const req: any = w.require
  return typeof req === 'function' ? req : null
}

/** 素材的本地缓存路径 + Adobe 拖拽类型用的路径(确定性命名,重复拖拽覆盖刷新) */
export function tempPathFor(lib: string, id: string, name: string): { path: string; dndPath: string } | null {
  const file = `${lib}-${id}-${sanitize(name)}`
  const req = nodeRequire()
  let path: string
  if (req) {
    path = req('path').join(req('os').tmpdir(), 'mira-cep', file)
  } else {
    const cs = getCSInterface()
    if (!cs) return null
    path = cs.getSystemPath(w.SystemPath.EXTENSION) + '/tmp/' + file
  }
  // 文档要求:Windows 路径分隔符用双反斜杠 PS 才认
  const dndPath = isWindows
    ? path.replace(/\//g, '\\').replace(/\\/g, '\\\\')
    : path
  return { path, dndPath }
}

function writeTo(filePath: string, buffer: ArrayBuffer): Promise<void> | void {
  const req = nodeRequire()
  if (req) {
    const path = req('path'), fs = req('fs')
    const dir = path.dirname(filePath)
    // CEP 内嵌 Node 版本老,不支持 mkdirSync 的 recursive 选项:手动建目录并容忍 EEXIST
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir) } catch (e: any) { if (e?.code !== 'EEXIST') throw e }
    }
    fs.writeFileSync(filePath, req('buffer').Buffer.from(buffer))
    return
  }
  const cep = w.cep
  if (!cep) return Promise.reject(new Error('无可用文件写入方式(缺少 node / cep.fs)'))
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[])
  }
  const result = cep.fs.writeFile(filePath, btoa(binary), w.cep.encoding.Base64)
  if (result.err !== 0) return Promise.reject(new Error(`cep.fs 写入失败(${result.err})`))
}

/** 下载素材到本地缓存(同目标并发去重,完成后保留 60s 供兜底复用) */
const pending = new Map<string, Promise<string>>()

export function prefetchToTemp(url: string, dest: string): Promise<string> {
  let task = pending.get(dest)
  if (!task) {
    task = (async () => {
      const buffer = await xhrArrayBuffer(url)
      await writeTo(dest, buffer)
      return dest
    })()
    pending.set(dest, task)
    const cleanup = () => setTimeout(() => pending.delete(dest), 60_000)
    task.then(cleanup, cleanup)
  }
  return task
}

/** 兜底:确保本地文件就绪后经 ExtendScript 置入/打开,进度与诊断经 notify 回显 */
export async function placeLocalFile(url: string, localPath: string, name: string, notify: (msg: string) => void) {
  try {
    notify(`下载 ${name} …`)
    await prefetchToTemp(url, localPath)
    notify(`置入 ${name} …`)
    const result = await placeFileViaHost(localPath)
    if (result.startsWith('ERR')) {
      notify(`${name} 置入失败: ${result}`)
    } else if (result.startsWith('placed|')) {
      notify(`已置入 ${name} (${result.slice(7)})`)
    } else if (result.startsWith('opened|')) {
      notify(`已打开 ${name} (${result.slice(7)})`)
    } else {
      // 'EvalScript error.' 等异常返回:如实展示,避免假成功
      notify(`${name} 置入失败: ${result}`)
    }
  } catch (error: any) {
    notify(`置入失败: ${error?.message || error}`)
  }
}
