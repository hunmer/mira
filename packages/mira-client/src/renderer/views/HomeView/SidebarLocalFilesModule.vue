<script setup lang="ts">
/**
 * SidebarLocalFilesModule —— 本地文件模块。
 *
 * 系统盘符（electron listRoots）+ 自定义本地文件夹（localStorage 持久化），
 * 两个小节折叠状态经 useSidebarCollapse 统一持久化、下次启动恢复。
 * 点击在当前素材库上下文中打开 local-folder 标签页。
 * addCustomLocalFolder 经 defineExpose 暴露，供父级标题栏「添加」按钮调用。
 * 由原 SidebarModuleList 拆出，逻辑零改动。
 */
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTabs } from '@/renderer/composables/useTabs'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { useSidebarCollapse } from './useSidebarCollapse'
import type { LocalFsRoot } from '@/shared/types'

defineOptions({ name: 'SidebarLocalFilesModule' })

const props = defineProps<{
  /** 当前素材库 id（打开 local-folder 标签页需要） */
  libraryId: string
}>()

const { t } = useI18n()
const { createTabFromRegisteredType } = useTabs()

const localRoots = ref<LocalFsRoot[]>([])
const localRootsError = ref('')
const customLocalFolders = ref<LocalFsRoot[]>([])
const CUSTOM_LOCAL_FOLDERS_KEY = 'mira-custom-local-folders'

const drivesOpen = useSidebarCollapse('local-files:drives')
const customOpen = useSidebarCollapse('local-files:custom')

function localPathKey(value: string) {
  return value.replace(/[\\/]+$/, '').toLowerCase()
}

function localFolderName(targetPath: string) {
  const trimmed = targetPath.replace(/[\\/]+$/, '')
  return trimmed.split(/[\\/]/).filter(Boolean).pop() || targetPath
}

function loadCustomLocalFolders() {
  try {
    const stored = JSON.parse(localStorage.getItem(CUSTOM_LOCAL_FOLDERS_KEY) || '[]')
    if (!Array.isArray(stored)) return
    customLocalFolders.value = stored.filter((item): item is LocalFsRoot => (
      typeof item?.path === 'string' && typeof item?.name === 'string'
    ))
  } catch (error) {
    console.warn('加载自定义本地文件夹失败:', error)
  }
}

function saveCustomLocalFolders() {
  localStorage.setItem(CUSTOM_LOCAL_FOLDERS_KEY, JSON.stringify(customLocalFolders.value))
}

async function loadLocalRoots() {
  const api = window.electronAPI?.fs
  if (!api?.listRoots) {
    localRootsError.value = t('views.localFolder.electronOnly')
    return
  }
  const result = await api.listRoots()
  localRoots.value = result.data || []
  localRootsError.value = result.success ? '' : (result.message || t('views.localFolder.loadFailed'))
}

function openLocalRoot(root: LocalFsRoot) {
  createTabFromRegisteredType('local-folder', {
    id: `local-folder:${encodeURIComponent(root.path)}`,
    label: root.name,
    icon: 'storage',
    data: { rootPath: root.path },
    libraryId: props.libraryId,
  })
}

async function addCustomLocalFolder() {
  const result = await window.electronAPI?.fs?.selectDirectory(t('views.localFolder.addCustomFolder'))
  if (!result?.success || !result.path) return
  const key = localPathKey(result.path)
  if (customLocalFolders.value.some((folder) => localPathKey(folder.path) === key)) return
  customLocalFolders.value.push({ path: result.path, name: localFolderName(result.path) })
  saveCustomLocalFolders()
}

function removeCustomLocalFolder(targetPath: string) {
  const key = localPathKey(targetPath)
  customLocalFolders.value = customLocalFolders.value.filter((folder) => localPathKey(folder.path) !== key)
  saveCustomLocalFolders()
}

onMounted(() => {
  loadCustomLocalFolders()
  loadLocalRoots()
})

defineExpose({ addCustomLocalFolder })
</script>

<template>
  <div class="text-foreground">
    <Collapsible v-model:open="drivesOpen">
      <CollapsibleTrigger as-child>
        <!-- !后缀工具类压制 CollapsibleTrigger 默认样式（as-child 会把组件 scoped 样式并入 h3，特异性高于普通工具类） -->
        <h3 class="flex cursor-pointer select-none items-center gap-1 px-2! pb-1! pt-2! text-[11px] font-medium text-muted-foreground! transition-colors hover:text-foreground! bg-transparent! border-0! rounded-none!">
          <span class="material-icons text-sm">storage</span>
          {{ t('views.localFolder.systemDrives') }}
          <span class="ml-auto flex items-center gap-1">
            <span v-if="localRoots.length" class="text-xs">{{ localRoots.length }}</span>
            <span class="material-icons text-base transition-transform duration-200" :class="drivesOpen ? 'rotate-0' : '-rotate-90'">expand_more</span>
          </span>
        </h3>
      </CollapsibleTrigger>
      <!-- p-0!/bg-transparent! 等压制 CollapsibleContent 默认盒样式（muted 底色/内边距/边框） -->
      <CollapsibleContent class="p-0! border-0! rounded-none! bg-transparent!">
        <ul v-if="localRoots.length" class="ml-[15px] space-y-0.5 border-l border-border/60 pl-3">
          <li v-for="root in localRoots" :key="root.path" class="local-tree-leaf relative">
            <button class="cat-item w-full text-foreground" type="button" @click="openLocalRoot(root)">
              <span class="flex min-w-0 items-center">
                <span class="material-icons mr-2 text-lg text-foreground/70">storage</span>
                <span class="truncate text-foreground">{{ root.name }}</span>
              </span>
            </button>
          </li>
        </ul>
        <p v-else class="px-2 py-3 text-xs text-foreground/70">{{ localRootsError || t('views.localFolder.loading') }}</p>
      </CollapsibleContent>
    </Collapsible>

    <Collapsible v-model:open="customOpen">
      <CollapsibleTrigger as-child>
        <h3 class="flex cursor-pointer select-none items-center gap-1 px-2! pb-1! pt-3! text-[11px] font-medium text-muted-foreground! transition-colors hover:text-foreground! bg-transparent! border-0! rounded-none!">
          <span class="material-icons text-sm">folder</span>
          {{ t('views.localFolder.customFolders') }}
          <span class="ml-auto flex items-center gap-1">
            <span v-if="customLocalFolders.length" class="text-xs">{{ customLocalFolders.length }}</span>
            <span class="material-icons text-base transition-transform duration-200" :class="customOpen ? 'rotate-0' : '-rotate-90'">expand_more</span>
          </span>
        </h3>
      </CollapsibleTrigger>
      <CollapsibleContent class="p-0! border-0! rounded-none! bg-transparent!">
        <ul v-if="customLocalFolders.length" class="ml-[15px] space-y-0.5 border-l border-border/60 pl-3">
          <li v-for="folder in customLocalFolders" :key="folder.path" class="group/local-folder local-tree-leaf relative">
            <button class="cat-item w-full pr-8 text-foreground" type="button" @click="openLocalRoot(folder)">
              <span class="flex min-w-0 items-center">
                <span class="material-icons mr-2 text-lg text-foreground/70">folder</span>
                <span class="truncate text-foreground">{{ folder.name }}</span>
              </span>
            </button>
            <button
              type="button"
              class="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover/local-folder:opacity-100"
              :title="t('views.localFolder.removeCustomFolder')"
              @click.stop="removeCustomLocalFolder(folder.path)"
            >
              <span class="material-icons leading-none" style="font-size: 16px">delete</span>
            </button>
          </li>
        </ul>
        <p v-else class="px-2 pb-2 pt-1 text-xs text-muted-foreground">{{ t('views.localFolder.noCustomFolders') }}</p>
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>

<style scoped>
/* 本地文件模块：列表项横向连线，左端接 ul 的垂直引导线（pl-3 + 1px 边框） */
.local-tree-leaf::before {
  content: '';
  position: absolute;
  left: -13px;
  top: 50%;
  width: 13px;
  height: 1px;
  background: color-mix(in oklch, var(--border) 60%, transparent);
}

.cat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
  color: var(--foreground);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.cat-item:hover {
  background-color: color-mix(in oklch, var(--primary) 5%, transparent);
}

.cat-item--active {
  background-color: color-mix(in oklch, var(--primary) 10%, transparent);
  color: var(--primary);
  font-weight: 500;
}
</style>
