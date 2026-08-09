import { MediaViewTabType } from '../TabTypes'
import type { TabContext } from '../TabRegistry'
import { useTagStore } from '../../stores/tag'
import i18n from '../../i18n'

export class TagTabType extends MediaViewTabType {
  name = 'tag'
  get displayName() {
    return i18n.global.t('composables.tagTab.displayName')
  }
  icon = 'label'
  iconColor = '#10B981'
  allowMultipleInstances = true // 允许多个标签tab
  cacheable = true

  protected getLabel(context: TabContext): string {
    const tagId = context.id || context.tagId || context.name || context.tabData?.id || context.tabData?.name

    if (tagId) {
      // 从 tagStore 获取标签信息
      const tagStore = useTagStore()

      // 尝试按 ID 查找（如果 tagId 是数字）
      let tag = tagStore.tags.find(t => t.id === parseInt(tagId.toString()))

      // 如果按 ID 没找到，尝试按标题查找
      if (!tag && typeof tagId === 'string') {
        tag = tagStore.tags.find(t => t.title === tagId)
      }

      if (tag) {
        return tag.title || i18n.global.t('composables.tagTab.fallbackLabel', { id: tagId })
      }
    }

    // 回退到 context 中的数据
    return context.name || context.tagName || context.tabData?.name || context.tabData?.title || i18n.global.t('composables.tagTab.fallbackLabel', { id: tagId || 'unknown' })
  }

  protected getTabFilters(context: TabContext): Record<string, any> {
    // Tag类型需要根据标签ID/名称过滤
    // 尝试从多个可能的源获取标签信息
    const tagId = context.id || context.tagId || context.tabData?.id
    const tagName = context.name || context.tagName || context.tabData?.name || context.tabData?.title

    // 优先使用tagId，如果没有则使用tagName
    const tagIdentifier = tagId || tagName

    console.log('🏷️ TagTabType.getTabFilters:', {
      tagId,
      tagName,
      tagIdentifier,
      context
    })

    // 返回 MediaTabData 格式的筛选器
    return tagIdentifier ? {
      tags: {
        id: 'tags',
        selectedValues: [tagIdentifier],
        label: i18n.global.t('composables.tagTab.filterLabel')
      }
    } : {}
  }

  protected getViewType(): string {
    // 使用 'files' 而不是 'tag'，通过 filter 来区分
    return 'files'
  }

  protected generateTabId(context: TabContext): string {
    const tagId = context.id || context.tagId || context.name || context.tabData?.id || context.tabData?.name || 'unknown'
    return tagId.startsWith('tag-') ? tagId : `tag-${tagId}`
  }

  async onInit(_context: TabContext) {
    console.log('🏷️ TagTabType 初始化:', _context)
    return { success: true }
  }

  async onActive(_context: TabContext) {
    console.log('▶️ TagTabType 激活:', _context)
    return { success: true }
  }

  async onInactive(_context: TabContext) {
    console.log('⏸️ TagTabType 失活:', _context)
    return { success: true }
  }

  async onClose(_context: TabContext) {
    console.log('🔚 TagTabType 关闭:', _context)
    return { success: true }
  }

  shouldUpdateForEvent(tabData: any, eventData: any): boolean {
    if (tabData?.libraryId !== eventData.libraryId) return false
    const tabTagId = tabData?.id || tabData?.tagId || tabData?.name
    if (!tabTagId) return false

    const matchTags = (tags: any[]): boolean =>
      tags.some((t: any) =>
        String(t?.id || t) === String(tabTagId) || String(t?.title || t) === String(tabTagId)
      )

    // 检查新标签
    if (eventData.tags) {
      const tags = typeof eventData.tags === 'string' ? JSON.parse(eventData.tags) : eventData.tags
      if (Array.isArray(tags) && matchTags(tags)) return true
    }
    // 检查旧标签（标签被移除时，来源标签 tab 也需更新）
    if (eventData.old_data?.tags) {
      const oldTags = typeof eventData.old_data.tags === 'string' ? JSON.parse(eventData.old_data.tags) : eventData.old_data.tags
      if (Array.isArray(oldTags) && matchTags(oldTags)) return true
    }
    return false
  }
}

// 导出单例实例
export const tagTabType = new TagTabType()