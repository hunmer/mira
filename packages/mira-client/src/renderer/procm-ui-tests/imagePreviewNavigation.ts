import { waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { ensureMediaTab } from './helpers'

/**
 * 关键 DOM / 行为依据：
 * - 媒体项根节点带 [data-selectable-id]（MediaGridItem / MediaListComponent / MediaWaterfallItem），
 *   文件名可从项内 img[alt] 或 h3 读取；双击入口 MediaTabListView.vue handleMediaDoubleClick。
 * - 双击路由（HomeController/interactionHandler.ts）：
 *   image → #/image-preview/:id（ImagePreview.vue，根节点 .image-preview-view），
 *   video → #/video-preview/:id，其余 → #/file-preview?...（router 为 createWebHashHistory）。
 * - 预览标题：PreviewHeader.vue 的重命名按钮（title="点击重命名"/"Click to rename"）文本即当前文件名。
 * - 键盘导航（ImagePreview.vue handleKeyPress）：ArrowRight → nextImage()（route id 同步变化），
 *   Escape → closePreview()（router.push('/')）。已是最后一张时 nextImage() 为 no-op、
 *   底部“下一张”按钮 :disabled="currentImageIndex === length - 1"（icon navigate_next）。
 * - 同类素材 <2 个时无导航意义：只测预览打开+关闭，并在结果中注明。
 */

const IMAGE_NAME_RE = /\.(jpe?g|png|gif|bmp|svg|webp|ico|avif|heic|heif|tiff?|psd)$/i
const VIDEO_NAME_RE = /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v|mpg|mpeg|3gp|ts)$/i
const PREVIEW_HASH_RE = /#\/(image|video|file)-preview/

type FileKind = 'image' | 'video' | 'document' | 'unknown'

function getMediaItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.media-list-view [data-selectable-id]'))
}

function getItemName(item: HTMLElement): string {
  const alt = item.querySelector('img[alt]')?.getAttribute('alt')
  if (alt && alt.trim()) return alt.trim()
  const heading = item.querySelector('h3')?.textContent?.trim()
  if (heading) return heading
  const title = item.getAttribute('title')?.trim()
  return title ?? ''
}

function classifyName(name: string): FileKind {
  if (!name) return 'unknown'
  if (IMAGE_NAME_RE.test(name)) return 'image'
  if (VIDEO_NAME_RE.test(name)) return 'video'
  return 'document'
}

function getPreviewRoot(): HTMLElement | null {
  // ImagePreview 根节点；video/file 预览无该 class，退而求其次用 hash 判断
  return document.querySelector('.image-preview-view')
}

function findPreviewTitleButton(): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('header button'))
    .find((btn) => /重命名|rename/i.test(btn.getAttribute('title') ?? ''))
}

function findPreviewNextButton(): HTMLButtonElement | undefined {
  const root = getPreviewRoot()
  if (!root) return undefined
  return Array.from(root.querySelectorAll<HTMLButtonElement>('footer button'))
    .find((btn) => (btn.textContent ?? '').includes('navigate_next'))
}

function readPreviewTitle(): string {
  return (findPreviewTitleButton()?.textContent ?? '').trim()
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function imagePreviewNavigation(): Promise<{
  previewOpened: boolean
  navigated: boolean
  movedToEnd?: boolean
  exitedToGrid: boolean
  fileType: FileKind
  sameTypeCount: number
  previewRoute: string
}> {
  console.info('[procm-ui-test] image-preview-navigation started')
  const user = userEvent.setup()

  // 1) 前置：媒体 tab 打开且有可选素材
  await ensureMediaTab('[data-selectable-id]')
  let items = getMediaItems()
  if (items.length === 0) {
    await waitFor(() => {
      items = getMediaItems()
      if (items.length === 0) throw new Error('no selectable media items ([data-selectable-id]) in the media tab')
    }, { timeout: 10_000 })
  }

  // 2) 优先挑图片素材；没有图片则退化为任意素材并在结果注明 fileType
  const named = items.map((item) => ({ item, name: getItemName(item), kind: classifyName(getItemName(item)) }))
  const imageHit = named.find((entry) => entry.kind === 'image')
  const target = imageHit ?? named[0]
  const fileType = target.kind
  const sameTypeCount = named.filter((entry) => entry.kind === fileType).length
  // ImagePreview/VideoPreview 只在同类型列表内导航；document 类型预览无左右导航
  const navigationMeaningful = (fileType === 'image' || fileType === 'video') && sameTypeCount >= 2
  if (!imageHit) {
    console.info('[procm-ui-test] image-preview-navigation no image item found, falling back to first item', {
      fileType, name: target.name,
    })
  }

  // 3) 双击打开预览 → hash 进入 *-preview 路由，图片预览根节点 .image-preview-view 出现
  await user.dblClick(target.item)
  await waitFor(() => {
    if (!PREVIEW_HASH_RE.test(window.location.hash)) {
      throw new Error(`preview route did not open after double click (hash: ${window.location.hash})`)
    }
  }, { timeout: 15_000 })
  const previewRoute = window.location.hash
  if (fileType === 'image') {
    await waitFor(() => {
      if (!getPreviewRoot()) throw new Error('image preview DOM (.image-preview-view) did not render')
    }, { timeout: 10_000 })
  }
  await waitFor(() => {
    if (!findPreviewTitleButton()) throw new Error('preview header title button is not rendered')
  }, { timeout: 10_000 })
  const previewOpened = true

  // 4) ArrowRight：标题变化（切到下一张）或已是最后一张（标题不变 + 下一张按钮禁用）
  let navigated = false
  let movedToEnd: boolean | undefined
  if (navigationMeaningful) {
    const titleBefore = readPreviewTitle()
    const hashBefore = window.location.hash
    await user.keyboard('{ArrowRight}')
    await waitFor(() => {
      if (readPreviewTitle() !== titleBefore) return
      if (PREVIEW_HASH_RE.test(window.location.hash) && window.location.hash !== hashBefore) return
      const nextBtn = findPreviewNextButton()
      if (nextBtn && nextBtn.disabled) return // 已是最后一张
      throw new Error('ArrowRight neither switched the preview nor hit the disabled-at-end boundary')
    }, { timeout: 10_000 })

    navigated = readPreviewTitle() !== titleBefore
      || (PREVIEW_HASH_RE.test(window.location.hash) && window.location.hash !== hashBefore)
    if (!navigated) {
      const nextBtn = findPreviewNextButton()
      if (!nextBtn || !nextBtn.disabled) {
        throw new Error('expected the next-image button to be disabled at the last item')
      }
      movedToEnd = true
    }
  } else {
    console.info('[procm-ui-test] image-preview-navigation skipped navigation', { fileType, sameTypeCount })
  }

  // 5) 退出预览：image/video 用 Escape（组件 document keydown）；document 类型预览无 Escape，点返回按钮
  if (fileType === 'image' || fileType === 'video') {
    await user.keyboard('{Escape}')
  } else {
    const backBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('header button'))
      .find((btn) => /返回|back/i.test(btn.getAttribute('title') ?? ''))
    if (!backBtn) throw new Error('preview back button not found for the non-image fallback path')
    await user.click(backBtn)
  }
  await waitFor(() => {
    if (PREVIEW_HASH_RE.test(window.location.hash)) throw new Error('preview route did not exit')
    if (getPreviewRoot()) throw new Error('image preview DOM still rendered after exiting')
    if (!document.querySelector('.media-list-view')) throw new Error('media list view did not come back after exiting the preview')
  }, { timeout: 10_000 })
  const exitedToGrid = true

  // 6) 双击会顺带选中素材（click+click+dblclick），尽力清理选择态（纯 UI 状态，失败不影响结果）
  try {
    const clearBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('.media-list-view button'))
      .find((btn) => /取消选择|clear.?selection/i.test(btn.getAttribute('title') ?? ''))
    if (clearBtn && document.querySelector('.media-list-view .media-item.selected')) {
      await user.click(clearBtn)
    }
  } catch (error) {
    console.warn('[procm-ui-test] image-preview-navigation selection cleanup skipped', error)
  }

  console.info('[procm-ui-test] image-preview-navigation finished', {
    fileType, sameTypeCount, navigated, movedToEnd: movedToEnd ?? false,
  })
  return {
    previewOpened,
    navigated,
    ...(movedToEnd !== undefined ? { movedToEnd } : {}),
    exitedToGrid,
    fileType,
    sameTypeCount,
    previewRoute,
  }
}
