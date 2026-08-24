/**
 * 媒体标签页区块注册表
 *
 * MediaTabListView 的内容区由区块组成（内置 folders / media，外部可注册自定义区块），
 * 顺序与显示状态由 SortableLayoutDialog（LibraryPrefs.mediaTabLayout 偏好）统一控制，
 * 注册区块与内置区块拥有同等的排序 / 隐藏能力。
 */
import { defineComponent, h, reactive, type PropType, type VNodeChild } from 'vue'

export interface MediaTabSectionDef {
  /** 区块唯一 id（同时作为布局偏好的 key） */
  id: string
  /** header 标题；传函数可在语言切换后返回新文案 */
  title: string | (() => string)
  /** 布局对话框中展示的图标（material icons 名，缺省 extension） */
  icon?: string
  /** header 右侧计数徽标；返回 null 不显示 */
  count?: () => number | null
  /** header 右侧操作区（按钮 / 下拉等） */
  actions?: () => VNodeChild
  /** 区块内容 */
  content: () => VNodeChild
}

const registry = reactive(new Map<string, MediaTabSectionDef>())

/**
 * 注册自定义区块（重复 id 覆盖旧定义）；返回注销函数
 *
 * @example
 * ```ts
 * const unregister = registerMediaTabSection({
 *   id: 'my-recent',
 *   title: () => t('myModule.recent'),        // 传函数可随语言切换刷新
 *   icon: 'schedule',
 *   count: () => recentStore.items.length,
 *   actions: () => h(Button, { onClick: refresh }, '刷新'),
 *   content: () => h(MyRecentList, { items: recentStore.items }),
 * })
 * ```
 */
export function registerMediaTabSection(def: MediaTabSectionDef): () => void {
  registry.set(def.id, def)
  return () => { registry.delete(def.id) }
}

export function getRegisteredTabSections(): MediaTabSectionDef[] {
  return [...registry.values()]
}

export function resolveSectionTitle(def: MediaTabSectionDef): string {
  return typeof def.title === 'function' ? def.title() : def.title
}

/** 渲染函数组件：在模板中执行外部传入的 render 函数 */
const SectionRender = defineComponent({
  props: { render: { type: Function as PropType<() => VNodeChild>, required: true } },
  setup(props) {
    return () => props.render()
  },
})

const SECTION_HEADER_CLASS = 'flex items-center justify-between px-5 pt-3 pb-1'
const SECTION_TITLE_CLASS = 'text-sm font-medium text-foreground'
const SECTION_COUNT_BADGE_CLASS = 'inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground'

/** 注册区块的宿主组件：header（标题 + 计数 + 操作）与内容，样式与内置区块一致 */
export const MediaTabSectionHost = defineComponent({
  name: 'MediaTabSectionHost',
  props: { def: { type: Object as PropType<MediaTabSectionDef | null>, default: null } },
  setup(props) {
    return () => {
      const def = props.def
      if (!def) return null
      const count = def.count?.() ?? null
      return h('section', [
        h('header', { class: SECTION_HEADER_CLASS }, [
          h('h3', { class: SECTION_TITLE_CLASS }, resolveSectionTitle(def)),
          h('div', { class: 'flex items-center gap-2' }, [
            count !== null ? h('span', { class: SECTION_COUNT_BADGE_CLASS }, String(count)) : null,
            def.actions ? h(SectionRender, { render: def.actions }) : null,
          ]),
        ]),
        h(SectionRender, { render: def.content }),
      ])
    }
  },
})
