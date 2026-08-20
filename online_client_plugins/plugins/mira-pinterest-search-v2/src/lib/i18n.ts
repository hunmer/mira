/**
 * 内置中文文案（原迁移版 i18n 被剥离导致界面显示裸 key，这里直接内置字典）。
 */
const dict: Record<string, string> = {
  'app.title': 'Pinterest 视觉搜索',
  'main.empty.title': '还没有搜索任务',
  'main.empty.content': '在 Mira 中选中图片后右键「Pinterest 视觉搜索 v2」，或直接拖入 / 粘贴图片',
  'main.empty.demo': '试一试示例图片',
  'main.waiting.title': '正在搜索相似内容…',
  'main.noResult.title': '没有找到相似结果',
  'main.noResult.content': '换个区域重新裁剪，或换一张种子图试试',
  'main.connectError.title': '无法连接 Pinterest',
  'main.connectError.content': '网络不可用或被拦截，可点击重试',
  'main.connectError.retry': '重试',
  'main.authError.title': '未登录 Pinterest',
  'main.authError.content': '此窗口会话缺少 Pinterest 登录态，请先在宿主内完成登录后重试',
  'main.error.title': '搜索失败',
  'main.loadingMore': '加载更多…',
  'main.selection.count': '已选 {n} 项',
  'main.selection.import': '导入素材库',
  'main.selection.clear': '取消选择',
  'main.selection.fetching': '正在获取原图 {done}/{total}…',
  'main.selection.fetchFailed': '{n} 张原图获取失败已跳过，其余继续导入',
  'main.selection.fetchAllFailed': '原图全部获取失败，请检查网络后重试',
  'main.selection.noServer': '缺少服务器连接信息（server/token），无法导入素材库',
  'main.selection.loadFailed': '素材库信息加载失败：{error}',
  'main.selection.dialogTitle': '导入到素材库',
  'main.selection.dialogDescription': '将选中的 Pinterest 图片上传到指定素材库与文件夹。',
  'main.selection.submit': '开始导入',
  'main.image.noTitle': '未命名',
  'main.image.cropSearch': '搜索选中区域',
  'main.image.resetCrop': '清除选区',
  'main.image.cropHint': '在图片上拖动框选局部区域，可只搜索画面的一部分',
  'main.image.research': '以图搜图',
  'main.image.preview': '预览',
  'main.image.save': '保存',
  'main.image.saved': '已保存',
  'main.preview.openOnPinterest': '在 Pinterest 打开',
  'main.preview.prev': '上一张',
  'main.preview.next': '下一张',
  'main.preview.close': '关闭',
  'header.zoomIn': '放大',
  'header.zoomOut': '缩小',
  'header.pin.on': '取消窗口置顶',
  'header.pin.off': '窗口置顶',
  'header.close': '关闭窗口',
  'dialog.exit.title': '退出确认',
  'dialog.exit.description': '确定要关闭 Pinterest 视觉搜索窗口吗？',
  'dialog.exit.cancel': '取消',
  'dialog.exit.ok': '退出',
  'dialog.inputWarning.title': '图片数量较多',
  'dialog.inputWarning.description': '一次最多建议搜索 {count} 张图片，加载过多会明显变慢。仍要继续吗？',
  'dialog.inputWarning.cancel': '只加载前 5 张',
  'dialog.inputWarning.ok': '全部加载',
  'dropzone.tip': '松开鼠标，添加到搜索任务',
}

export function t(key: string, params?: Record<string, string | number>): string {
  let text = dict[key] ?? key
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}
