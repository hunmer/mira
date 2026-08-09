<template>
  <div class="flex-1 overflow-y-auto w-full min-w-0">
    <div class="bg-white rounded-lg shadow p-6 w-full min-w-0">
      <!-- 头部信息 -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-3">
          <span class="material-icons text-2xl" :style="{ color: iconColor }">
            {{ icon }}
          </span>
          <div>
            <h2 class="text-xl font-semibold text-foreground">{{ title }}</h2>
            <p class="text-muted-foreground">{{ subtitle }}</p>
          </div>
        </div>

        <!-- 右侧控制按钮区域 -->
        <div class="flex items-center space-x-2">
          <button
            @click="$emit('toggle-detail-sidebar')"
            :class="[
              'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
              showDetailSidebar
                ? 'bg-primary text-primary hover:bg-primary'
                : 'bg-muted text-foreground hover:bg-accent'
            ]"
            :title="showDetailSidebar ? $t('business.mediaContentView.hideDetailPanel') : $t('business.mediaContentView.showDetailPanel')"
          >
            <span class="material-icons text-lg mr-1">
              {{ showDetailSidebar ? 'visibility_off' : 'visibility' }}
            </span>
            {{ showDetailSidebar ? $t('business.mediaContentView.hideDetail') : $t('business.mediaContentView.showDetail') }}
          </button>
        </div>
      </div>

      <!-- 加载状态 -->
      <div
        v-if="isLoading"
        class="flex items-center justify-center h-40"
      >
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p class="text-muted-foreground">{{ loadingMessage || $t('business.mediaContentView.loading') }}</p>
        </div>
      </div>

      <!-- 内容展示区域 -->
      <div v-else class="w-full">
        <!-- 网格视图 -->
        <MediaGridComponent
          v-if="viewMode === 'grid'"
          :key="`content-grid-${viewMode}`"
          :items="items"
          :selected-items="selectedItems"
          :card-size="cardSize"
          :columns-per-row="columnsPerRow"
          :is-trash="isTrash"
          @media-click="handleMediaClick"
          @media-double-click="handleMediaDoubleClick"
          @media-select="handleMediaSelect"
          @media-context-menu="handleMediaContextMenu"
          @media-info="handleMediaInfo"
          @media-set-folder="handleMediaSetFolder"
          @media-set-tags="handleMediaSetTags"
          @media-delete="handleMediaDelete"
          @media-restore="handleMediaRestore"
        />

        <!-- 列表视图 -->
        <MediaListComponent
          v-else-if="viewMode === 'list'"
          :key="`content-list-${viewMode}`"
          :items="items"
          :selected-items="selectedItems"
          :is-trash="isTrash"
          @click="handleMediaClick"
          @dblclick="handleMediaDoubleClick"
          @media-context-menu="handleMediaContextMenu"
          @media-info="handleMediaInfo"
          @media-set-folder="handleMediaSetFolder"
          @media-set-tags="handleMediaSetTags"
          @media-select="handleMediaSelect"
          @media-delete="handleMediaDelete"
          @media-restore="handleMediaRestore"
        />

        <!-- 瀑布流视图 -->
        <div v-else-if="viewMode === 'waterfall'" class="w-full h-full min-h-96">
          <WaterfallComponent
            :key="`content-waterfall-${viewMode}`"
            :items="items"
            :selected-items="selectedItems"
            :is-trash="isTrash"
            :column-width="dynamicColumnWidth"
            :columns-per-row="columnsPerRow"
            :gap="16"
            @click="handleMediaClick"
            @dblclick="handleMediaDoubleClick"
            @media-context-menu="handleMediaContextMenu"
            @media-info="handleMediaInfo"
            @media-set-folder="handleMediaSetFolder"
            @media-set-tags="handleMediaSetTags"
            @media-select="handleMediaSelect"
            @media-delete="handleMediaDelete"
            @media-restore="handleMediaRestore"
            @after-render="() => console.log('✅ 内容 Waterfall 组件已渲染，数据项数量:', items.length)"
          />
        </div>

        <!-- 未知视图模式 -->
        <div v-else class="flex items-center justify-center h-40 text-muted-foreground">
          {{ $t('business.mediaContentView.unknownViewMode', { mode: viewMode }) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MediaGridComponent from './MediaGridComponent.vue'
import MediaListComponent from './MediaListComponent.vue'
import WaterfallComponent from './WaterfallComponent.vue'
import type { FileInfo } from '../../../shared/types'

// Props
interface Props {
  /** 显示的标题 */
  title: string
  /** 子标题 */
  subtitle?: string
  /** 图标名称 */
  icon: string
  /** 图标颜色 */
  iconColor: string
  /** 媒体项目数组 */
  items: FileInfo[]
  /** 选中的项目 */
  selectedItems: string[]
  /** 视图模式 */
  viewMode: 'grid' | 'list' | 'waterfall'
  /** 卡片尺寸 */
  cardSize: 'small' | 'medium' | 'large'
  /** 每行列数 */
  columnsPerRow: number
  /** 动态列宽 */
  dynamicColumnWidth: number
  /** 是否显示详情侧边栏 */
  showDetailSidebar: boolean
  /** 是否加载中 */
  isLoading?: boolean
  /** 加载提示信息 */
  loadingMessage?: string
  /** 是否为回收站视图 */
  isTrash?: boolean
}

withDefaults(defineProps<Props>(), {
  subtitle: '',
  isLoading: false,
  loadingMessage: '',
  isTrash: false
})

// Emits
const emit = defineEmits<{
  'media-click': [item: FileInfo]
  'media-double-click': [item: FileInfo]
  'media-select': [item: FileInfo, selected: boolean]
  'media-context-menu': [item: FileInfo, event: MouseEvent]
  'media-info': [item: FileInfo]
  'media-set-folder': [item: FileInfo, folderId: string]
  'media-set-tags': [item: FileInfo, tagIds: string[]]
  'media-delete': [item: FileInfo]
  'media-restore': [item: FileInfo]
  'toggle-detail-sidebar': []
}>()

// 事件处理器
const handleMediaClick = (item: FileInfo) => {
  emit('media-click', item)
}

const handleMediaDoubleClick = (item: FileInfo) => {
  emit('media-double-click', item)
}

const handleMediaSelect = (item: FileInfo, selected: boolean) => {
  emit('media-select', item, selected)
}

const handleMediaContextMenu = (item: FileInfo, event: MouseEvent) => {
  emit('media-context-menu', item, event)
}

const handleMediaInfo = (item: FileInfo) => {
  emit('media-info', item)
}

const handleMediaSetFolder = (item: FileInfo) => {
  // 这里应该打开文件夹选择对话框，现在先直接传递事件
  emit('media-set-folder', item, '')
}

const handleMediaSetTags = (item: FileInfo) => {
  // 这里应该打开标签选择对话框，现在先直接传递事件
  emit('media-set-tags', item, [])
}

const handleMediaDelete = (item: FileInfo) => {
  emit('media-delete', item)
}

const handleMediaRestore = (item: FileInfo) => {
  emit('media-restore', item)
}
</script>
