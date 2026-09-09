/**
 * 树视图拖放上传的默认处理(LibraryTreeView 内置调用,useDefaultDropUpload 缺省 true)。
 * - direct: 拖放的本地文件/链接直接路由到宿主 upload 服务(upload.files/urls)
 * - dialog: 打开宿主的上传对话框(upload.pick,带 target + 预填 files/urls)
 * 宿主关闭默认上传后可用 fileDrop 回调自行处理(如打开自己的上传对话框)。
 */
import type { LibraryTreeDropUploadMode, LibraryTreeUpload, LibraryTreeUploadTarget } from './types'

/** 默认拖放上传;无内容或未注入 upload 时不动,dialog 模式未提供 pick 时回退 direct(避免拖放被静默丢弃) */
export function defaultDropUpload(
  upload: LibraryTreeUpload | undefined,
  files: File[],
  urls: string[],
  target?: LibraryTreeUploadTarget,
  mode: LibraryTreeDropUploadMode = 'direct',
): void {
  if (!upload) return
  if (mode === 'dialog' && upload.pick) {
    upload.pick(target, files, urls)
    return
  }
  // 网页图片拖拽可能同时携带当前图片 File 与其 URL，它们是同一资源。
  // 优先使用 File，避免随后再按 URL 下载一次而造成重复上传或防盗链 400。
  if (files.length) {
    upload.files(files, target)
    return
  }
  if (urls.length) upload.urls(urls, target)
}
