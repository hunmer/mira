<script setup lang="ts">
/**
 * SidebarImportToolbar —— 侧边栏顶部工具区（原 SidebarToolbar 迁入）。
 *
 * OrderedSectionList 标题行 + 「更多操作」dot dropdown：
 *   - 导入子菜单：上传文件 / 导入文件夹 / 从 URL 导入
 *   - 自定义布局（打开 SidebarLayoutDialog）
 * 导入进行中（isImporting）按钮禁用并显示沙漏图标；具体导入动作由父级传入（负责关闭移动端抽屉）。
 * 由原 SidebarModuleList 拆出，逻辑零改动。
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import OrderedSectionList from '@/renderer/components/common/OrderedSectionList.vue'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu'

defineOptions({ name: 'SidebarImportToolbar' })

const props = defineProps<{
  /** 上传文件 */
  onUpload: () => void
  /** 导入文件夹（异步，进行中禁用按钮） */
  onImportFolder: () => Promise<void>
  /** 从 URL 导入 */
  onImportUrl: () => void
}>()

const emit = defineEmits<{
  /** 打开自定义布局对话框 */
  customize: []
}>()

const { t } = useI18n()

const isImporting = ref(false)

async function handleImportFolder() {
  if (isImporting.value) return
  isImporting.value = true
  try {
    await props.onImportFolder()
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <OrderedSectionList
    :title="t('views.sidebarLayoutDialog.title')"
    :customize-label="''"
    @customize="emit('customize')"
  >
    <template #headerActions>
      <!-- 更多操作（dot dropdown）：导入 / 自定义布局 -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            class="header-action-btn pointer-events-auto relative z-10 cursor-pointer text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            :title="t('views.sidebarToolbar.moreActions')"
            :disabled="isImporting"
            @mousedown.stop
          >
            <span class="material-icons pointer-events-none leading-none text-primary" style="font-size: 18px">{{ isImporting ? 'hourglass_top' : 'more_vert' }}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-44">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span class="material-icons text-base mr-2">drive_folder_upload</span>
              <span>{{ t('views.sidebarToolbar.import') }}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent class="w-40">
              <DropdownMenuItem @click="props.onUpload"><span class="material-icons text-base mr-2">upload_file</span><span>{{ t('views.sidebarToolbar.uploadFile') }}</span></DropdownMenuItem>
              <DropdownMenuItem @click="handleImportFolder"><span class="material-icons text-base mr-2">folder_open</span><span>{{ t('views.sidebarToolbar.importFolder') }}</span></DropdownMenuItem>
              <DropdownMenuItem @click="props.onImportUrl"><span class="material-icons text-base mr-2">cloud_download</span><span>{{ t('business.homeHeader.importFromUrl') }}</span></DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem @click="emit('customize')">
            <span class="material-icons text-base mr-2">dashboard_customize</span>
            <span>{{ t('views.sidebarToolbar.customizeLayout') }}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </template>
  </OrderedSectionList>
</template>
