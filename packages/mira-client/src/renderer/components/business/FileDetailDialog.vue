<template>
  <div v-if="visible" class="fixed inset-0 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
      <!-- 对话框头部 -->
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-800">
          {{ isMultipleFiles ? `文件详情 (${fileList.length} 个文件)` : '文件详情' }}
        </h2>
        <button 
          @click="$emit('close')"
          class="text-gray-500 hover:text-gray-800"
        >
          <span class="material-icons">close</span>
        </button>
      </div>

      <!-- 对话框内容 - 三栏布局 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
        <!-- 左侧预览区域 -->
        <div class="md:col-span-1">
          <!-- 文件预览 -->
          <div class="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
            <!-- 单文件预览 -->
            <template v-if="!isMultipleFiles && fileList[0]">
              <img 
                v-if="isImageFile(fileList[0])"
                :src="fileList[0].thumbnailPath || fileList[0].url"
                :alt="fileList[0].name"
                class="w-full h-full object-cover rounded-lg"
              />
              <div v-else class="flex flex-col items-center text-gray-500">
                <span class="material-icons text-6xl mb-2">description</span>
                <span class="text-sm">{{ getFileExtension(fileList[0]) }}</span>
              </div>
            </template>
            <!-- 多文件相册效果 -->
            <template v-else>
              <div class="image-stack">
                <img 
                  v-for="(file, index) in fileList.slice(0, 4)"
                  :key="file.id"
                  :src="file.thumbnailPath || file.url"
                  :alt="file.name"
                  :style="{ zIndex: index }"
                  :class="[
                    'stack-img',
                    `stack-img-${index + 1}`
                  ]"
                />
                <!-- 更多文件提示 -->
                <div 
                  v-if="fileList.length > 4"
                  class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-10"
                >
                  +{{ fileList.length - 4 }}
                </div>
              </div>
            </template>
          </div>

          <!-- 当前标签显示 -->
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-lg font-semibold text-gray-800">标签</h3>
              <button 
                v-if="selectedTagNames.length > 0"
                @click="clearAllTags"
                class="text-gray-400 hover:text-gray-600 text-sm flex items-center"
              >
                <span class="material-icons text-base mr-1">delete_sweep</span>
                <span>清空</span>
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="tagName in selectedTagNames" 
                :key="tagName"
                class="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full"
              >
                {{ tagName }}
              </span>
              <span 
                v-if="selectedTagNames.length === 0"
                class="text-gray-500 text-sm"
              >
                暂无标签
              </span>
            </div>
          </div>

          <!-- 当前文件夹显示 -->
          <div>
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-lg font-semibold text-gray-800">文件夹</h3>
              <button 
                v-if="selectedFolderName"
                @click="clearSelectedFolder"
                class="text-gray-400 hover:text-gray-600 text-sm flex items-center"
              >
                <span class="material-icons text-base mr-1">delete_sweep</span>
                <span>清空</span>
              </button>
            </div>
            <div class="flex items-center text-gray-600">
              <span class="material-icons text-base mr-2">{{ selectedFolderName ? 'folder' : 'folder_open' }}</span>
              <span>{{ selectedFolderName || '未分类' }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧管理区域 -->
        <div class="md:col-span-2">
          <!-- Tab 导航 -->
          <div class="flex border-b">
            <button
              @click="activeTab = 'folders'"
              :class="[
                'py-2 px-4 font-semibold',
                activeTab === 'folders' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-blue-600'
              ]"
            >
              文件夹管理
            </button>
            <button
              @click="activeTab = 'tags'"
              :class="[
                'py-2 px-4 font-semibold',
                activeTab === 'tags' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-blue-600'
              ]"
            >
              标签管理
            </button>
          </div>

          <!-- Tab 内容 -->
          <div class="mt-6">
            <!-- 文件夹管理 -->
            <div v-if="activeTab === 'folders'">
              <!-- 面包屑导航 -->
              <nav aria-label="Breadcrumb" class="flex items-center text-sm text-gray-600 space-x-2 mb-6">
                <a class="text-blue-600 hover:underline" href="#" @click.prevent>最近</a>
                <span class="text-gray-500">/</span>
                <a class="text-blue-600 hover:underline" href="#" @click.prevent>收藏</a>
              </nav>

              <!-- 添加文件夹 -->
              <div class="flex mb-4">
                <div class="relative flex-grow">
                  <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">folder</span>
                  <input
                    v-model="folderSearchQuery"
                    type="text"
                    placeholder="添加新文件夹..."
                    class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  @click="addNewFolder"
                  :disabled="!folderSearchQuery.trim()"
                  class="bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-2 px-4 rounded-r-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <span class="material-icons">add</span>
                </button>
              </div>

              <!-- 文件夹Tree -->
              <Tree
                v-model:selectionKeys="selectedFolders"
                v-model:expandedKeys="expandedFolders"
                :value="folderTreeData"
                selectionMode="single"
                :filter="true"
                filterMode="lenient"
                placeholder="搜索文件夹..."
                class="border border-gray-200 rounded-lg h-64"
              />
            </div>

            <!-- 标签管理 -->
            <div v-if="activeTab === 'tags'">
              <!-- 添加标签 -->
              <div class="flex mb-4">
                <div class="relative flex-grow">
                  <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">local_offer</span>
                  <input
                    v-model="tagSearchQuery"
                    type="text"
                    placeholder="添加新标签..."
                    class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  @click="addNewTag"
                  :disabled="!tagSearchQuery.trim()"
                  class="bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-2 px-4 rounded-r-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <span class="material-icons">add</span>
                </button>
              </div>

              <!-- 标签Tree -->
              <Tree
                v-model:selectionKeys="selectedTags"
                v-model:expandedKeys="expandedTags"
                :value="tagTreeData"
                selectionMode="checkbox"
                :filter="true"
                filterMode="lenient"
                placeholder="搜索标签..."
                class="border border-gray-200 rounded-lg h-64"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 对话框底部 -->
      <div class="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
        <button
          @click="$emit('close')"
          class="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded-md shadow-sm"
        >
          取消
        </button>
        <button
          @click="handleSave"
          :disabled="isSaving"
          class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <span v-if="isSaving" class="inline-flex items-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            保存中...
          </span>
          <span v-else>保存</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { FileInfo } from '../../../shared/types'
import { useTagStore } from '../../stores/tag'
import { useFolderStore } from '../../stores/folder'
import { miraSDKService } from '../../services/MiraSDKService'
import Tree from '@/components/ui/volt/Tree.vue'

interface Props {
  visible: boolean
  fileInfos: FileInfo[] // 统一使用文件列表，单文件时传入数组
  defaultTab?: 'folders' | 'tags' // 默认激活的tab
}

interface Emits {
  (e: 'close'): void
  (e: 'save', data: { folderId?: string; tags: string[] }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 使用 stores
const tagStore = useTagStore()
const folderStore = useFolderStore()

// Tab 状态
const activeTab = ref<'folders' | 'tags'>(props.defaultTab || 'folders')

// 监听defaultTab变化
watch(() => props.defaultTab, (newTab) => {
  if (newTab) {
    activeTab.value = newTab
  }
}, { immediate: true })

// 计算文件列表
const fileList = computed(() => {
  return props.fileInfos || []
})

// 是否为多文件模式
const isMultipleFiles = computed(() => fileList.value.length > 1)

// 保存状态
const isSaving = ref(false)

// 搜索查询
const folderSearchQuery = ref('')
const tagSearchQuery = ref('')

// 文件夹相关状态
const selectedFolders = ref<Record<string, any>>({})
const expandedFolders = ref<Record<string, boolean>>({})

// 标签相关状态
const selectedTags = ref<Record<string, any>>({})
const expandedTags = ref<Record<string, boolean>>({})

// 计算属性
const selectedFolderName = computed(() => {
  // 对于单选模式，selectedFolders是 { [key]: true } 的格式
  const selectedIds = Object.keys(selectedFolders.value).filter(key => selectedFolders.value[key] === true)
  if (selectedIds.length === 0) return null
  
  const folderId = parseInt(selectedIds[0])
  const folder = folderStore.folders.find(f => f.id === folderId)
  return folder?.title || null
})

const selectedTagNames = computed(() => {
  // 对于checkbox模式，selectedTags是 { [key]: { checked: boolean, partialChecked: boolean } } 的格式
  const selectedIds = Object.keys(selectedTags.value).filter(key => {
    const selection = selectedTags.value[key]
    return selection && (selection === true || (typeof selection === 'object' && selection.checked))
  })
  
  return selectedIds.map(id => {
    const tagId = parseInt(id)
    const tag = tagStore.tags.find(t => t.id === tagId)
    return tag?.title || id
  })
})

// 文件夹树数据
const folderTreeData = computed(() => {
  return folderStore.folders.map(folder => ({
    key: folder.id.toString(),
    label: folder.title,
    data: folder,
    type: 'folder',
    children: [],
    leaf: true,
    icon: 'folder',
    selectable: true
  }))
})

const tagTreeData = computed(() => {
  return tagStore.tags.map(tag => ({
    key: tag.id.toString(),
    label: tag.title,
    data: tag,
    type: 'tag',
    children: [],
    leaf: true,
    icon: 'local_offer',
    selectable: true
  }))
})

// 方法
const clearSelectedFolder = () => {
  selectedFolders.value = {}
}

const clearAllTags = () => {
  selectedTags.value = {}
}

// Tree组件会自动处理选择逻辑，不需要手动toggle方法

// 文件类型判断
const isImageFile = (file: any): boolean => {
  return file.mimeType && file.mimeType.startsWith('image/')
}

const getFileExtension = (file: any): string => {
  return file.extension || file.name.split('.').pop()?.toUpperCase() || 'FILE'
}

const addNewFolder = async () => {
  if (!folderSearchQuery.value.trim()) return
  
  try {
    if (!miraSDKService.isClientConnected()) {
      throw new Error('Mira client is not connected')
    }

    // 获取 Mira client 实例
    const client = (miraSDKService as any).client
    if (!client) {
      throw new Error('Mira client instance is not available')
    }

    // 使用第一个文件的 libraryId 或默认值
    const libraryId = fileList.value.length > 0 ? (fileList.value[0].libraryId || 'default') : 'default'

    // 使用 Mira SDK 创建文件夹
    await client.folders().createFolder(libraryId, folderSearchQuery.value.trim())
    
    // 重新加载文件夹数据
    await folderStore.fetchFolders(libraryId)
    
    folderSearchQuery.value = ''
  } catch (error) {
    console.error('Failed to create folder:', error)
  }
}

const addNewTag = async () => {
  if (!tagSearchQuery.value.trim()) return
  
  try {
    if (!miraSDKService.isClientConnected()) {
      throw new Error('Mira client is not connected')
    }

    // 获取 Mira client 实例
    const client = (miraSDKService as any).client
    if (!client) {
      throw new Error('Mira client instance is not available')
    }

    // 使用第一个文件的 libraryId 或默认值
    const libraryId = fileList.value.length > 0 ? (fileList.value[0].libraryId || 'default') : 'default'

    // 使用 Mira SDK 创建标签
    await client.tags().createTag(libraryId, tagSearchQuery.value.trim(), Math.floor(Math.random() * 5) + 1)
    
    // 重新加载标签数据
    await tagStore.fetchTags(libraryId)
    
    tagSearchQuery.value = ''
  } catch (error) {
    console.error('Failed to create tag:', error)
  }
}

// 处理保存
const handleSave = async () => {
  if (!fileList.value.length) return
  
  isSaving.value = true
  
  try {
    // 获取选中的文件夹ID（单选模式）
    const selectedFolderIds = Object.keys(selectedFolders.value).filter(key => selectedFolders.value[key] === true)
    const folderId = selectedFolderIds.length > 0 ? selectedFolderIds[0] : undefined
    
    // 获取选中的标签名称（checkbox模式）
    const selectedTagNamesList = Object.keys(selectedTags.value).filter(key => {
      const selection = selectedTags.value[key]
      return selection && (selection === true || (typeof selection === 'object' && selection.checked))
    }).map(id => {
      const tagId = parseInt(id)
      const tag = tagStore.tags.find(t => t.id === tagId)
      return tag?.title || id
    })
    
    // 使用全局 Mira SDK 服务保存数据
    if (!miraSDKService.isClientConnected()) {
      throw new Error('Mira client is not connected')
    }

    // 获取 Mira client 实例
    const client = (miraSDKService as any).client
    if (!client) {
      throw new Error('Mira client instance is not available')
    }

    // 遍历所有文件进行保存
    for (const file of fileList.value) {
      const libraryId = file.libraryId || 'default'
      const fileId = parseInt(file.id)
      
      // 保存文件夹信息（如果选中了文件夹）
      if (folderId) {
        await client.folders().setFileFolder({
          libraryId,
          fileId,
          folder: parseInt(folderId)
        })
      }
      
      // 保存标签信息（如果选中了标签）
      if (selectedTagNamesList.length > 0) {
        await client.tags().addTagsToFile(libraryId, fileId, selectedTagNamesList)
      }
    }
    
    // 触发保存事件，让父组件处理UI更新
    emit('save', { folderId, tags: selectedTagNamesList })
    emit('close')
  } catch (error) {
    console.error('Failed to save file info:', error)
    // 可以在这里添加错误提示
  } finally {
    isSaving.value = false
  }
}

// 监听对话框打开，加载数据
watch(() => props.visible, (visible) => {
  if (visible && fileList.value.length > 0) {
    // 使用第一个文件的 libraryId 或默认值
    const libraryId = fileList.value[0].libraryId || 'default'
    
    // 加载文件夹和标签数据
    folderStore.fetchFolders(libraryId)
    tagStore.fetchTags(libraryId)
    
    // 初始化选中状态 - 基于多文件的合并逻辑
    initializeSelections()
  }
})

// 初始化选中状态的函数
const initializeSelections = () => {
  if (fileList.value.length === 0) return

  // 如果是单文件，直接使用该文件的设置
  if (fileList.value.length === 1) {
    const file = fileList.value[0]
    
    // 设置文件夹选中状态
    if (file.folderId) {
      selectedFolders.value = { [file.folderId]: true }
    } else {
      selectedFolders.value = {}
    }
    
    // 设置标签选中状态
    if (file.tags && file.tags.length > 0) {
      const tagSelections: Record<string, any> = {}
      file.tags.forEach((tagName: string) => {
        const tag = tagStore.tags.find(t => t.title === tagName)
        if (tag) {
          tagSelections[tag.id.toString()] = { checked: true, partialChecked: false }
        }
      })
      selectedTags.value = tagSelections
    } else {
      selectedTags.value = {}
    }
  } else {
    // 多文件模式：如果所有文件都在同一个文件夹，选中该文件夹，否则不选中
    const folderIds = fileList.value.map(file => file.folderId).filter(Boolean)
    const uniqueFolderIds = [...new Set(folderIds)]
    
    if (uniqueFolderIds.length === 1 && uniqueFolderIds[0]) {
      selectedFolders.value = { [uniqueFolderIds[0]]: true }
    } else {
      selectedFolders.value = {}
    }
    
    // 多文件模式：收集所有标签的并集
    const allTags = new Set<string>()
    fileList.value.forEach(file => {
      if (file.tags) {
        file.tags.forEach((tagName: string) => allTags.add(tagName))
      }
    })
    
    // 设置标签选中状态
    const tagSelections: Record<string, any> = {}
    allTags.forEach(tagName => {
      const tag = tagStore.tags.find(t => t.title === tagName)
      if (tag) {
        tagSelections[tag.id.toString()] = { checked: true, partialChecked: false }
      }
    })
    selectedTags.value = tagSelections
  }
}
</script>

<style scoped>
.material-icons {
  font-size: 20px;
}

/* 叠放相册样式 */
.image-stack {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto;
}

.stack-img {
  position: absolute;
  width: 100px;
  height: 100px;
  top: 0;
  left: 0;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  border: 2px solid white;
}

.stack-img-2 { 
  left: 8px; 
  top: 8px; 
}

.stack-img-3 { 
  left: 16px; 
  top: 16px; 
}

.stack-img-4 { 
  left: 24px; 
  top: 24px; 
}
</style>
