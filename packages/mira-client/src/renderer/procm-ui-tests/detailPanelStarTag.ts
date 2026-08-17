import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { ensureMediaTab } from './helpers'

/**
 * 右侧详情面板（MediaDetailComponent）：选中素材 → 星标切换还原 → 标签移除/加回 → 取消选择。
 *
 * 关键 DOM（源码核实，MediaDetailComponent.vue）：
 * - 星标（约 119-129 行）：label「评分」所在字段容器内 5 个按钮，
 *   material-icons 连字 'star'（实心）/'star_border'（空心）表示当前 editStars；
 *   editStars>0 时额外渲染 icon 'close' 的清零按钮（title=评分）。
 * - 标签（约 162-176 行）：h3「标签」区块内 .flex-wrap 容器，
 *   每个标签 chip 为含「×」移除按钮的 span；加回途径存在——
 *   「设置标签/编辑」按钮打开 Popover（FolderTreeComponent 标签树，多选勾选即添加）。
 * - 详情面板 = 桌面 resizable 布局第三个 panel 内唯一 <aside>（同 toggleDetailPanel.ts）；
 *   HomeHeader view_sidebar 按钮切换显隐。
 */

function isVisible(element: Element): boolean {
  return element.getClientRects().length > 0
}

/** 详情面板 aside（index.vue 第三个 ResizablePanel，v-if="!isDetailCollapsed"）。 */
function findDetailAside(): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('aside')).find((element) =>
      element.closest('[data-slot="resizable-panel"]'),
    ) ?? null
  )
}

function findViewSidebarButton(): HTMLButtonElement {
  const button = screen.getAllByRole('button', { name: /view_sidebar/i })[0]
  if (!button) throw new Error('view_sidebar toggle button is not available')
  return button as HTMLButtonElement
}

function visibleMediaItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-selectable-id]')).filter((element) =>
    isVisible(element),
  )
}

/** 评分字段容器（label「评分」的父级 div，内含 5 个星标按钮 + 可选清零按钮）。 */
function findRatingContainer(aside: HTMLElement): HTMLElement {
  const label = Array.from(aside.querySelectorAll<HTMLElement>('label'))
    .filter((element) => isVisible(element))
    .find((element) => /^(评分|rating)$/i.test((element.textContent ?? '').trim()))
  const container = label?.parentElement ?? null
  if (!container) throw new Error('detail panel rating (评分) section is not found')
  return container
}

function getStarButtons(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).filter((button) => {
    const icon = (button.querySelector('.material-icons')?.textContent ?? '').trim()
    return icon === 'star' || icon === 'star_border'
  })
}

function readStarCount(container: HTMLElement): number {
  return getStarButtons(container).filter(
    (button) => (button.querySelector('.material-icons')?.textContent ?? '').trim() === 'star',
  ).length
}

/** 星标初始值可能随详情补读（miraSDKService.getFile）异步刷新，值需保持稳定 500ms 才认可。 */
async function readStableStarCount(container: HTMLElement): Promise<number> {
  let stableValue: number | null = null
  let lastChange = Date.now()
  return waitFor(() => {
    const current = readStarCount(container)
    if (stableValue === null || current !== stableValue) {
      stableValue = current
      lastChange = Date.now()
      throw new Error('star rating is still settling (detail fetch pending)')
    }
    if (Date.now() - lastChange < 500) throw new Error('star rating stability window not elapsed yet')
    return current
  }, { timeout: 10_000 })
}

async function clickStar(user: ReturnType<typeof userEvent.setup>, starNumber: number): Promise<void> {
  const container = findRatingContainer(findDetailAside() ?? document.body)
  await waitFor(() => {
    const buttons = getStarButtons(container)
    if (buttons.length < 5) throw new Error(`expected 5 star buttons, found ${buttons.length}`)
    if (buttons[starNumber - 1].disabled) throw new Error(`star button #${starNumber} is temporarily disabled`)
  }, { timeout: 10_000 })
  await user.click(getStarButtons(container)[starNumber - 1])
}

async function clickClearStars(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const container = findRatingContainer(findDetailAside() ?? document.body)
  const clearButton = await waitFor(() => {
    const target = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
      .filter((element) => isVisible(element))
      .find((button) => (button.querySelector('.material-icons')?.textContent ?? '').trim() === 'close')
    if (!target) throw new Error('clear-rating (close) button is not visible; star value may already be 0')
    return target
  }, { timeout: 10_000 })
  await user.click(clearButton)
}

async function waitForStarCount(count: number): Promise<void> {
  await waitFor(() => {
    const aside = findDetailAside()
    if (!aside) throw new Error('detail panel disappeared during star assertion')
    const current = readStarCount(findRatingContainer(aside))
    if (current !== count) throw new Error(`expected ${count} filled stars, found ${current}`)
  }, { timeout: 15_000 })
}

/** 标签区块（h3「标签」的父级 div）。 */
function findTagsSection(aside: HTMLElement): HTMLElement {
  const heading = Array.from(aside.querySelectorAll<HTMLElement>('h3'))
    .filter((element) => isVisible(element))
    .find((element) => /^(标签|tags)$/i.test((element.textContent ?? '').trim()))
  const section = heading?.parentElement ?? null
  if (!section) throw new Error('detail panel tags (标签) section is not found')
  return section
}

/** 当前标签 chip（.flex-wrap 内含按钮的 span），返回 [元素, 名称]。 */
function findTagChips(section: HTMLElement): Array<{ element: HTMLElement; name: string }> {
  const wrap = section.querySelector('.flex-wrap')
  if (!wrap) return []
  return Array.from(wrap.children)
    .filter((element): element is HTMLElement => element instanceof HTMLElement && element.querySelector('button') !== null)
    .map((element) => ({
      element,
      name: (element.textContent ?? '').replace(/×/g, '').trim(),
    }))
}

/** 打开的 reka Popover 面板（标签树选择弹层）。 */
function findVisiblePopover(): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('[data-slot="popover-content"]')).find((element) =>
      isVisible(element),
    ) ?? null
  )
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function detailPanelStarTag(): Promise<{
  fileInfoShown: true
  starToggledAndRestored: true
  initialStars: number
  tagRemoved?: boolean
  tagRestored?: boolean
  removedTagName?: string
  tagCheckDegraded?: string
  detailPanelRestored: true
}> {
  console.info('[procm-ui-test] detail-panel-star-tag started')
  const user = userEvent.setup()
  await ensureMediaTab('[data-selectable-id]')

  // 0) 详情面板未显示时先打开（结束后还原初始显隐态）
  const initialAside = findDetailAside()
  const initiallyVisible = Boolean(initialAside && isVisible(initialAside))
  if (!initiallyVisible) {
    await user.click(findViewSidebarButton())
    await waitFor(() => {
      const aside = findDetailAside()
      if (!aside || !isVisible(aside)) throw new Error('detail panel did not open after clicking view_sidebar')
    }, { timeout: 10_000 })
  }

  // 1) 点击第一个素材选中
  const firstItem = await waitFor(() => {
    const item = visibleMediaItems()[0]
    if (!item) throw new Error('no visible media item to select')
    return item
  }, { timeout: 15_000 })
  await user.click(firstItem)

  // 2) 断言详情面板显示该文件信息（文件名输入框有值 + 基本信息/标签区块出现）
  await waitFor(() => {
    const aside = findDetailAside()
    if (!aside) throw new Error('detail panel aside is not rendered after selecting a media item')
    const nameInput = Array.from(aside.querySelectorAll<HTMLInputElement>('input'))
      .filter((element) => isVisible(element))
      .find((element) => (element.value ?? '').length > 0)
    if (!nameInput) throw new Error('detail panel did not show the selected file name input')
    findRatingContainer(aside)
    findTagsSection(aside)
  }, { timeout: 15_000 })

  // 3) 星标：记录当前值 → 切换 → 断言翻转 → 还原
  const asideForStars = findDetailAside()
  if (!asideForStars) throw new Error('detail panel aside is not rendered')
  const initialStars = await readStableStarCount(findRatingContainer(asideForStars))
  const targetStars = initialStars < 5 ? initialStars + 1 : 4
  await clickStar(user, targetStars)
  await waitForStarCount(targetStars)
  if (initialStars === 0) {
    await clickClearStars(user)
    await waitForStarCount(0)
  } else {
    await clickStar(user, initialStars)
    await waitForStarCount(initialStars)
  }

  // 4) 标签：有标签则移除并加回；无标签降级为只断言 UI 存在
  let tagRemoved = false
  let tagRestored = false
  let removedTagName: string | undefined
  let tagCheckDegraded: string | undefined
  const asideForTags = findDetailAside()
  if (!asideForTags) throw new Error('detail panel aside is not rendered')
  const tagsSection = findTagsSection(asideForTags)
  const chips = findTagChips(tagsSection)
  if (chips.length === 0) {
    tagCheckDegraded =
      'selected file has no tags; degraded to asserting tag UI only (no removable tag chip to exercise)'
  } else {
    removedTagName = chips[0].name
    const removeButton = chips[0].element.querySelector('button')
    if (!removeButton) throw new Error('tag chip remove (×) button is not found')
    await user.click(removeButton)
    await waitFor(() => {
      const aside = findDetailAside()
      if (!aside) throw new Error('detail panel disappeared after tag removal')
      const remaining = findTagChips(findTagsSection(aside))
      if (remaining.some((chip) => chip.name === removedTagName)) {
        throw new Error(`tag "${removedTagName}" is still shown after clicking its × remove button`)
      }
    }, { timeout: 15_000 })
    tagRemoved = true

    // 还原：详情面板「设置标签/编辑」Popover 的标签树中勾选同名标签
    const tagTrigger = await waitFor(() => {
      const aside = findDetailAside()
      if (!aside) throw new Error('detail panel disappeared before tag restore')
      const section = findTagsSection(aside)
      const target = Array.from(section.querySelectorAll<HTMLButtonElement>('button'))
        .filter((element) => isVisible(element))
        .find((button) => /设置标签|编辑标签|^编辑$|set tags|edit tags|^edit$/i.test((button.textContent ?? '').trim()))
      if (!target) throw new Error('tag picker trigger (设置标签/编辑) is not visible in detail panel')
      return target
    }, { timeout: 10_000 })
    await user.click(tagTrigger)

    const tagNode = await waitFor(() => {
      const popover = findVisiblePopover()
      if (!popover) throw new Error('tag picker popover did not open')
      const nodes = Array.from(popover.querySelectorAll<HTMLElement>('[data-folder-tree-node-id]'))
        .filter((element) => isVisible(element))
      const match = nodes.find(
        (element) => (element.querySelector('.flex-1')?.textContent ?? '').trim() === removedTagName,
      )
      if (!match) throw new Error(`tag tree node "${removedTagName}" is not visible in the tag picker popover`)
      return match
    }, { timeout: 15_000 })
    tagNode.scrollIntoView({ block: 'center' })
    await user.click(tagNode)
    await waitFor(() => {
      const aside = findDetailAside()
      if (!aside) throw new Error('detail panel disappeared during tag restore')
      const chipsNow = findTagChips(findTagsSection(aside))
      if (!chipsNow.some((chip) => chip.name === removedTagName)) {
        throw new Error(`tag "${removedTagName}" did not reappear after re-adding it via the tag picker`)
      }
    }, { timeout: 15_000 })
    tagRestored = true

    // 关闭标签选择弹层（Escape，兜底点击面板外）
    await user.keyboard('{Escape}')
    await waitFor(() => {
      if (findVisiblePopover()) throw new Error('tag picker popover did not close after Escape')
    }, { timeout: 5_000 }).catch(async () => {
      const heading = Array.from(document.querySelectorAll<HTMLElement>('header h3'))
        .filter((element) => isVisible(element))
        .find((element) => /^(素材|media)$/i.test((element.textContent ?? '').trim()))
      if (heading) await user.click(heading)
      await waitFor(() => {
        if (findVisiblePopover()) throw new Error('tag picker popover did not close after clicking outside')
      }, { timeout: 5_000 })
    })
  }

  // 5) 取消选择还原（浮动工具栏「取消选择」按钮）
  const clearSelectionButton = await waitFor(() => {
    const target = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .filter((element) => isVisible(element))
      .find((button) => /^(取消选择|clear selection)$/i.test((button.getAttribute('title') ?? '').trim()))
    if (!target) throw new Error('clear-selection toolbar button (取消选择) is not visible')
    return target
  }, { timeout: 10_000 })
  await user.click(clearSelectionButton)
  await waitFor(() => {
    const gone = !Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .filter((element) => isVisible(element))
      .some((button) => /^(取消选择|clear selection)$/i.test((button.getAttribute('title') ?? '').trim()))
    if (!gone) throw new Error('selection was not cleared after clicking 取消选择')
  }, { timeout: 10_000 })

  // 6) 还原详情面板初始显隐态
  if (!initiallyVisible) {
    await user.click(findViewSidebarButton())
    await waitFor(() => {
      if (findDetailAside()) throw new Error('detail panel did not collapse back to its initial hidden state')
    }, { timeout: 10_000 })
  }

  console.info('[procm-ui-test] detail-panel-star-tag finished', {
    initialStars,
    tagRemoved,
    tagRestored,
    tagCheckDegraded,
  })
  return {
    fileInfoShown: true,
    starToggledAndRestored: true,
    initialStars,
    ...(tagRemoved ? { tagRemoved: true } : {}),
    ...(tagRestored ? { tagRestored: true } : {}),
    ...(removedTagName !== undefined ? { removedTagName } : {}),
    ...(tagCheckDegraded ? { tagCheckDegraded } : {}),
    detailPanelRestored: true,
  }
}
