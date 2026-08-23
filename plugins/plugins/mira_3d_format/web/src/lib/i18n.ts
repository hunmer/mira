/**
 * 轻量 i18n（zh/en）：不引 vue-i18n，扁平 key 字典 + {x} 插值。
 * 初始语言：宿主 window.mira.app.locale（preload 注入，主窗口设置同步）→
 * 浏览器直开时回退 navigator.language；主窗口切换语言时经
 * window.mira.onLocaleChanged 实时更新（App.vue 中监听一处即可全局生效）。
 */
import { ref } from 'vue'

export type Locale = 'zh' | 'en'

const dict = {
  zh: {
    'app.errType': '仅支持 .glb / .gltf 文件',
    'app.errLoad': '无法加载模型，请检查文件 URL 或权限',
    'app.errParse': '模型加载失败：可能是格式损坏或 Draco 解码失败（检查控制台）',
    'app.loading': '加载中…',
    'app.close': '关闭',
    'app.noModel': '未提供模型',
    'app.noModelHint': '点击下方按钮选择本地 GLB/GLTF 文件，或从媒体网格双击打开。',
    'app.openFile': '打开模型文件',
    'app.open': '打开',
    'app.loadingModel': '正在加载模型…',
    'app.orbitHint': '拖拽旋转 · 滚轮缩放 · 右键平移',
    'app.localFile': '本地文件',
    'app.statMeshes': '网格',
    'app.statMaterials': '材质',
    'app.statVertices': '顶点',
    'app.statTriangles': '三角面',
    'app.sceneTree': '场景树',
    'app.propsPanel': '属性面板',
    'app.more': '更多',
    'app.openLocalModel': '打开本地模型文件',
    'app.openModel': '打开模型',
    'app.wireframe': '线框模式',
    'app.wireframeOff': '关闭线框',
    'app.grid': '网格地面',
    'app.gridOff': '隐藏网格',
    'app.autoRotate': '自动旋转',
    'app.pauseRotate': '暂停旋转',
    'app.resetView': '重置视角',
    'app.screenshot': '导出截图',
    'app.deselect': '取消选中',
    'app.tabMeshes': '网格',
    'app.tabMaterials': '材质',
    'app.tabAnimations': '动画',
    'app.sceneNodes': '场景节点',
    'app.faces': '{n} 面',
    'app.hide': '隐藏',
    'app.show': '显示',
    'app.animationClips': '动画片段',
    'app.animHint': '点击播放，再次点击暂停。',
    'app.selectedObject': '选中对象',
    'app.selectedMaterial': '选中材质',
    'app.unnamed': '(未命名)',
    'app.visible': '可见',
    'app.position': '位置 Position',
    'app.rotation': '旋转 Rotation (°)',
    'app.scale': '缩放 Scale',
    'app.color': '颜色',
    'app.metalness': '金属度',
    'app.roughness': '粗糙度',
    'app.emptyProps': '点击左侧网格或材质<br>查看并编辑属性',
  },
  en: {
    'app.errType': 'Only .glb / .gltf files are supported',
    'app.errLoad': 'Failed to load model; check the file URL or permission',
    'app.errParse': 'Model failed to load: the file may be corrupted or Draco decoding failed (see console)',
    'app.loading': 'Loading…',
    'app.close': 'Close',
    'app.noModel': 'No model provided',
    'app.noModelHint': 'Pick a local GLB/GLTF file below, or double-click one in the media grid.',
    'app.openFile': 'Open model file',
    'app.open': 'Open',
    'app.loadingModel': 'Loading model…',
    'app.orbitHint': 'Drag to orbit · scroll to zoom · right-drag to pan',
    'app.localFile': 'Local file',
    'app.statMeshes': 'Meshes',
    'app.statMaterials': 'Materials',
    'app.statVertices': 'Verts',
    'app.statTriangles': 'Tris',
    'app.sceneTree': 'Scene tree',
    'app.propsPanel': 'Properties',
    'app.more': 'More',
    'app.openLocalModel': 'Open a local model file',
    'app.openModel': 'Open model',
    'app.wireframe': 'Wireframe',
    'app.wireframeOff': 'Disable wireframe',
    'app.grid': 'Grid floor',
    'app.gridOff': 'Hide grid',
    'app.autoRotate': 'Auto-rotate',
    'app.pauseRotate': 'Pause rotation',
    'app.resetView': 'Reset view',
    'app.screenshot': 'Export screenshot',
    'app.deselect': 'Deselect',
    'app.tabMeshes': 'Meshes',
    'app.tabMaterials': 'Materials',
    'app.tabAnimations': 'Animations',
    'app.sceneNodes': 'Scene nodes',
    'app.faces': '{n} tris',
    'app.hide': 'Hide',
    'app.show': 'Show',
    'app.animationClips': 'Animation clips',
    'app.animHint': 'Click to play; click again to pause.',
    'app.selectedObject': 'Selected object',
    'app.selectedMaterial': 'Selected material',
    'app.unnamed': '(unnamed)',
    'app.visible': 'Visible',
    'app.position': 'Position',
    'app.rotation': 'Rotation (°)',
    'app.scale': 'Scale',
    'app.color': 'Color',
    'app.metalness': 'Metalness',
    'app.roughness': 'Roughness',
    'app.emptyProps': 'Click a mesh or material on the left<br>to view and edit properties',
  },
} as const

export type I18nKey = keyof typeof dict.zh

export function parseLocale(tag: string | undefined | null): Locale {
  return String(tag || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/** 初始语言：宿主注入的应用语言 → 浏览器语言 */
export function initialLocale(): Locale {
  const host = (typeof window !== 'undefined' && (window.mira || window.eagle)) || null
  const fromHost = (host as any)?.app?.locale
  if (fromHost) return parseLocale(fromHost)
  if (typeof navigator !== 'undefined') return parseLocale(navigator.language)
  return 'zh'
}

/** 共享单例：App / 工具栏 / 面板等组件共用同一 locale 状态 */
const sharedLocale = ref<Locale>(initialLocale())

export function useI18n() {
  const locale = sharedLocale

  /** 主窗口切换语言时调用（来自 window.mira.onLocaleChanged） */
  function setLocale(tag: string) {
    locale.value = parseLocale(tag)
  }

  function t(key: I18nKey, params?: Record<string, string | number>): string {
    let text: string = (dict[locale.value] as Record<string, string>)[key] ?? (dict.zh as Record<string, string>)[key] ?? key
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.split(`{${name}}`).join(String(value))
      }
    }
    return text
  }

  return { locale, setLocale, t }
}
