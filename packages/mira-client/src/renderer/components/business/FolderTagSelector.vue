<template>
  <div class="w-full">
    <div class="flex border-b mb-2">
      <button
        @click="activeTab = 'folders'"
        :class="[
          'py-1.5 px-3 text-sm font-semibold',
          activeTab === 'folders'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-500 hover:text-blue-600'
        ]"
      >
        文件夹
      </button>
      <button
        @click="activeTab = 'tags'"
        :class="[
          'py-1.5 px-3 text-sm font-semibold',
          activeTab === 'tags'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-500 hover:text-blue-600'
        ]"
      >
        标签
      </button>
    </div>

    <!-- 文件夹 -->
    <div v-if="activeTab === 'folders'">
      <Tree
        v-model:selectionKeys="selectedFolders"
        v-model:expandedKeys="expandedFolders"
        :value="folderTreeData"
        selectionMode="single"
        :filter="true"
        filterMode="lenient"
        filterPlaceholder="搜索文件夹..."
        :createable="true"
        createPlaceholder="输入文件夹名称..."
        class="border border-gray-200 rounded-lg h-56"
        @create="addNewFolder"
      />
    </div>

    <!-- 标签 -->
    <div v-if="activeTab === 'tags'">
      <Tree
        v-model:selectionKeys="selectedTags"
        v-model:expandedKeys="expandedTags"
        :value="tagTreeData"
        selectionMode="checkbox"
        :filter="true"
        filterMode="lenient"
        filterPlaceholder="搜索标签..."
        :createable="true"
        createPlaceholder="输入标签名称..."
        class="border border-gray-200 rounded-lg h-56"
        @create="addNewTag"
      />
    </div>

    <!-- 底部操作 -->
    <div class="flex justify-end gap-2 mt-3 pt-2 border-t">
      <button
        @click="handleClear"
        class="text-gray-500 hover:text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-100"
      >
        清空
      </button>
      <button
        @click="handleSave"
        class="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-4 rounded-md"
      >
        确定
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FileInfo } from '../../../shared/types'
import { useTagStore } from '../../stores/tag'
import { useFolderStore } from '../../stores/folder'
import { miraSDKService } from '../../services/MiraSDKService'
import Tree from '@/components/ui/volt/Tree.vue'

interface Props {
  fileInfos: FileInfo[]
  defaultTab?: 'folders' | 'tags'
}

interface Emits {
  (e: 'save', data: { folderId?: string; tags: string[] }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const tagStore = useTagStore()
const folderStore = useFolderStore()

const activeTab = ref<'folders' | 'tags'>(props.defaultTab || 'folders')
const selectedFolders = ref<Record<string, any>>({})
const expandedFolders = ref<Record<string, boolean>>({})
const selectedTags = ref<Record<string, any>>({})
const expandedTags = ref<Record<string, boolean>>({})

watch(() => props.defaultTab, (tab) => {
  if (tab) activeTab.value = tab
})

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

const initializeSelections = () => {
  const files = props.fileInfos
  if (!files.length) return

  if (files.length === 1) {
    const file = files[0]
    selectedFolders.value = file.folderId ? { [file.folderId]: true } : {}
    if (file.tags?.length) {
      const tagSelections: Record<string, any> = {}
      file.tags.forEach((tagName: string) => {
        const tag = tagStore.tags.find(t => t.title === tagName)
        if (tag) tagSelections[tag.id.toString()] = { checked: true, partialChecked: false }
      })
      selectedTags.value = tagSelections
    } else {
      selectedTags.value = {}
    }
  } else {
    const folderIds = [...new Set(files.map(f => f.folderId).filter(Boolean))]
    selectedFolders.value = folderIds.length === 1 ? { [folderIds[0]]: true } : {}

    const allTags = new Set<string>()
    files.forEach(f => f.tags?.forEach((t: string) => allTags.add(t)))
    const tagSelections: Record<string, any> = {}
    allTags.forEach(tagName => {
      const tag = tagStore.tags.find(t => t.title === tagName)
      if (tag) tagSelections[tag.id.toString()] = { checked: true, partialChecked: false }
    })
    selectedTags.value = tagSelections
  }
}

const loadStoreData = () => {
  const libraryId = props.fileInfos[0]?.libraryId || 'default'
  folderStore.fetchFolders(libraryId)
  tagStore.fetchTags(libraryId)
}

const addNewFolder = async (name: string) => {
  try {
    const client = (miraSDKService as any).client
    if (!client) return
    const libraryId = props.fileInfos[0]?.libraryId || 'default'
    await client.folders().createFolder(libraryId, name)
    await folderStore.fetchFolders(libraryId)
  } catch (error) {
    console.error('Failed to create folder:', error)
  }
}

const addNewTag = async (name: string) => {
  try {
    const client = (miraSDKService as any).client
    if (!client) return
    const libraryId = props.fileInfos[0]?.libraryId || 'default'
    await client.tags().createTag(libraryId, name, Math.floor(Math.random() * 5) + 1)
    await tagStore.fetchTags(libraryId)
  } catch (error) {
    console.error('Failed to create tag:', error)
  }
}

const handleClear = () => {
  selectedFolders.value = {}
  selectedTags.value = {}
}

const handleSave = async () => {
  const files = props.fileInfos
  if (!files.length) return

  try {
    const client = (miraSDKService as any).client
    if (!client) return

    const selectedFolderIds = Object.keys(selectedFolders.value).filter(k => selectedFolders.value[k] === true)
    const folderId = selectedFolderIds.length > 0 ? selectedFolderIds[0] : undefined

    const selectedTagNamesList = Object.keys(selectedTags.value).filter(k => {
      const sel = selectedTags.value[k]
      return sel && (sel === true || (typeof sel === 'object' && sel.checked))
    }).map(id => {
      const tag = tagStore.tags.find(t => t.id === parseInt(id))
      return tag?.title || id
    })

    for (const file of files) {
      const libraryId = file.libraryId || 'default'
      const fileId = parseInt(file.id)
      if (folderId) {
        await client.folders().setFileFolder({ libraryId, fileId, folder: parseInt(folderId) })
      }
      if (selectedTagNamesList.length > 0) {
        await client.tags().addTagsToFile(libraryId, fileId, selectedTagNamesList)
      }
    }

    emit('save', { folderId, tags: selectedTagNamesList })
  } catch (error) {
    console.error('Failed to save:', error)
  }
}

// 打开时加载数据
watch(() => props.fileInfos, () => {
  if (props.fileInfos.length > 0) {
    loadStoreData()
    initializeSelections()
  }
}, { immediate: true })
</script>

<style scoped>
.material-icons {
  font-size: 16px;
}
</style>
