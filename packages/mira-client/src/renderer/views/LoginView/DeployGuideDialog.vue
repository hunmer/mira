<script setup lang="ts">
/**
 * 部署指南入口按钮 + 两层对话框
 *
 * 外层：部署指南（Electron 展示在线部署组件 DeploymentChecklist，否则展示 ManualDeployGuide）
 * 内层：手动部署指南（点击「手动部署指南」按钮弹出，关闭后回到外层，仅 Electron）
 */
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import DeploymentChecklist from '@renderer/components/business/DeploymentChecklist.vue'
import ManualDeployGuide from '@renderer/components/business/ManualDeployGuide.vue'
import { environment } from '@renderer/utils'

defineOptions({ name: 'DeployGuideDialog' })

const emit = defineEmits<{
  connect: [defaultLibraryId: string]
}>()

// 是否为 Electron 环境（决定部署对话框展示在线部署组件还是手动指南）
const isElectron = environment.isElectron

// 部署指南对话框状态
const showDeployGuide = ref(false)
const showManualGuide = ref(false)

// 打开手动部署指南：先关闭部署对话框，避免两个对话框层叠遮挡
function openManualGuide() {
  showDeployGuide.value = false
  showManualGuide.value = true
}

// 关闭手动部署指南时，回到部署指南（仅 Electron：手动指南是从部署指南内打开的）
function handleManualGuideOpenChange(open: boolean) {
  showManualGuide.value = open
  if (!open && isElectron) {
    showDeployGuide.value = true
  }
}

function handleConnect(defaultLibraryId: string) {
  showDeployGuide.value = false
  emit('connect', defaultLibraryId)
}
</script>

<template>
  <!-- 部署指南入口 -->
  <button
    type="button"
    class="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary dark:text-muted-foreground dark:hover:text-primary bg-transparent border-none cursor-pointer transition-colors"
    @click="showDeployGuide = true"
  >
    <span class="material-icons text-sm">rocket_launch</span>
    部署指南
  </button>

  <!-- 部署指南对话框 -->
  <Dialog :open="showDeployGuide" @update:open="showDeployGuide = $event">
    <DialogContent class="max-h-[min(760px,calc(100vh-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>部署指南</DialogTitle>
        <DialogDescription>
          {{ isElectron ? '使用在线部署向导一键完成，或查看手动部署指南。' : '按以下步骤手动部署 mira-app-server 后端。' }}
        </DialogDescription>
      </DialogHeader>

      <!-- Electron：展示在线部署组件 -->
      <div v-if="isElectron" class="flex min-h-0 justify-center overflow-hidden">
        <DeploymentChecklist @connect="handleConnect" />
      </div>

      <!-- 非 Electron：直接展示手动部署指南 -->
      <div v-else class="min-h-0 overflow-y-auto">
        <ManualDeployGuide />
      </div>

      <DialogFooter v-if="isElectron" class="gap-2 sm:justify-center">
        <Button type="button" variant="outline" size="sm" @click="openManualGuide">
          <span class="material-icons text-sm">menu_book</span>
          手动部署指南
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 手动部署指南对话框（点击「手动部署指南」按钮弹出，关闭后回到部署指南） -->
  <Dialog :open="showManualGuide" @update:open="handleManualGuideOpenChange">
    <DialogContent class="sm:max-w-[560px]">
      <DialogHeader>
        <DialogTitle>手动部署指南</DialogTitle>
        <DialogDescription>按以下步骤在本地或服务器上部署 mira-app-server。</DialogDescription>
      </DialogHeader>
      <ManualDeployGuide />
    </DialogContent>
  </Dialog>
</template>
