<template>
  <div class="min-h-screen bg-[#f5f5f5] dark:bg-muted">
    <div class="p-6 space-y-6">
      <h2 class="text-2xl font-bold text-foreground dark:text-muted-foreground">{{ $t('views.menuTestView.title') }}</h2>

      <!-- 菜单管理 -->
      <div class="bg-white dark:bg-muted p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">{{ $t('views.menuTestView.menuManagement') }}</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- 添加自定义菜单 -->
          <div class="space-y-2">
            <button
              @click="addCustomMenu"
              class="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary"
            >
              {{ $t('views.menuTestView.addCustomMenu') }}
            </button>
          </div>

          <!-- 移除自定义菜单 -->
          <div class="space-y-2">
            <button
              @click="removeCustomMenu"
              class="w-full px-4 py-2 bg-destructive text-white rounded hover:bg-destructive"
            >
              {{ $t('views.menuTestView.removeCustomMenu') }}
            </button>
          </div>

          <!-- 更新导航菜单 -->
          <div class="space-y-2">
            <button
              @click="updateNavigationMenu"
              class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              {{ $t('views.menuTestView.syncNavMenu') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 菜单项管理 -->
      <div class="bg-white dark:bg-muted p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">{{ $t('views.menuTestView.menuItemManagement') }}</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            @click="addMenuItem"
            class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            {{ $t('views.menuTestView.addMenuItem') }}
          </button>

          <button
            @click="removeMenuItem"
            class="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            {{ $t('views.menuTestView.removeMenuItem') }}
          </button>

          <button
            @click="toggleMenuItemEnabled"
            class="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
          >
            {{ $t('views.menuTestView.toggleEnabled') }}
          </button>

          <button
            @click="toggleMenuItemVisible"
            class="px-4 py-2 bg-primary text-white rounded hover:bg-primary"
          >
            {{ $t('views.menuTestView.toggleVisible') }}
          </button>
        </div>
      </div>

      <!-- 当前菜单状态 -->
      <div class="bg-white dark:bg-muted p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">{{ $t('views.menuTestView.currentMenuState') }}</h3>
        
        <div class="space-y-4">
          <div v-for="menu in currentMenus" :key="menu.id" class="border rounded p-3">
            <h4 class="font-medium text-foreground dark:text-muted-foreground">{{ menu.label }} ({{ menu.id }})</h4>
            <ul class="mt-2 space-y-1">
              <li 
                v-for="item in menu.submenu" 
                :key="item.id"
                class="text-sm text-muted-foreground dark:text-muted-foreground pl-4"
                :class="{
                  'text-muted-foreground': item.enabled === false,
                  'line-through': item.visible === false
                }"
              >
                {{ item.label || item.id }} 
                <span v-if="item.accelerator" class="text-xs bg-muted dark:bg-muted px-1 rounded">
                  {{ item.accelerator }}
                </span>
                <span v-if="item.route" class="text-xs text-primary">
                  → {{ item.route }}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <button
          @click="refreshMenuState"
          class="mt-4 px-4 py-2 bg-muted dark:bg-muted text-white rounded hover:bg-muted"
        >
          {{ $t('views.menuTestView.refreshMenuState') }}
        </button>
      </div>

      <!-- 操作日志 -->
      <div class="bg-white dark:bg-muted p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">{{ $t('views.menuTestView.operationLogs') }}</h3>
        <div class="bg-muted dark:bg-muted p-3 rounded h-40 overflow-y-auto">
          <div
            v-for="(log, index) in logs"
            :key="index"
            class="text-sm text-foreground dark:text-muted-foreground mb-1"
          >
            <span class="text-muted-foreground dark:text-muted-foreground">{{ log.time }}</span> - {{ log.message }}
          </div>
        </div>
        <button
          @click="clearLogs"
          class="mt-2 px-3 py-1 bg-muted text-white text-sm rounded hover:bg-muted"
        >
          {{ $t('views.menuTestView.clearLogs') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { miraAPI } from '../api/MiraAPI'
import type { MenuConfig, MenuItemConfig } from '../services/MenuService'

const router = useRouter()
const { t } = useI18n()
const currentMenus = ref<MenuConfig[]>([])
const logs = ref<Array<{ time: string; message: string }>>([])

// 添加日志
const addLog = (message: string) => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString(),
    message
  })
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50)
  }
}

// 清空日志
const clearLogs = () => {
  logs.value = []
}

// 刷新菜单状态
const refreshMenuState = () => {
  try {
    currentMenus.value = miraAPI.menu.getAllMenus()
    addLog(t('views.menuTestView.logRefreshed'))
  } catch (error) {
    addLog(t('views.menuTestView.logRefreshFailed', { error }))
  }
}

// 添加自定义菜单
const addCustomMenu = () => {
  try {
    const customMenu: MenuConfig = {
      id: 'custom',
      label: t('views.menuTestView.customMenu'),
      submenu: [
        {
          id: 'custom-action-1',
          label: t('views.menuTestView.customAction1'),
          accelerator: 'CmdOrCtrl+Shift+1',
          action: 'customAction1'
        },
        {
          id: 'custom-action-2',
          label: t('views.menuTestView.customAction2'),
          accelerator: 'CmdOrCtrl+Shift+2',
          action: 'customAction2'
        },
        { id: 'custom-separator', type: 'separator' },
        {
          id: 'custom-route',
          label: t('views.menuTestView.goToSettings'),
          route: 'Settings'
        }
      ]
    }

    miraAPI.menu.addMenu(customMenu)
    addLog(t('views.menuTestView.logAddedCustom'))
    refreshMenuState()
  } catch (error) {
    addLog(t('views.menuTestView.logAddCustomFailed', { error }))
  }
}

// 移除自定义菜单
const removeCustomMenu = () => {
  try {
    miraAPI.menu.removeMenu('custom')
    addLog(t('views.menuTestView.logRemovedCustom'))
    refreshMenuState()
  } catch (error) {
    addLog(t('views.menuTestView.logRemoveCustomFailed', { error }))
  }
}

// 更新导航菜单
const updateNavigationMenu = () => {
  try {
    const routes = router.getRoutes().filter(route => !route.meta?.hideInNav)
    miraAPI.menu.updateNavigationFromRoutes(routes)
    addLog(t('views.menuTestView.logUpdatedNav', { n: routes.length }))
    refreshMenuState()
  } catch (error) {
    addLog(t('views.menuTestView.logUpdateNavFailed', { error }))
  }
}

// 添加菜单项
const addMenuItem = () => {
  try {
    const newItem: MenuItemConfig = {
      id: 'test-menu-item',
      label: t('views.menuTestView.testMenuItem'),
      accelerator: 'CmdOrCtrl+T',
      route: 'Home'
    }

    miraAPI.menu.addMenuItem('file', newItem, 1) // 添加到文件菜单的第二个位置
    addLog(t('views.menuTestView.logAddedMenuItem'))
    refreshMenuState()
  } catch (error) {
    addLog(t('views.menuTestView.logAddMenuItemFailed', { error }))
  }
}

// 移除菜单项
const removeMenuItem = () => {
  try {
    miraAPI.menu.removeMenuItem('file', 'test-menu-item')
    addLog(t('views.menuTestView.logRemovedMenuItem'))
    refreshMenuState()
  } catch (error) {
    addLog(t('views.menuTestView.logRemoveMenuItemFailed', { error }))
  }
}

// 切换菜单项启用状态
const toggleMenuItemEnabled = () => {
  try {
    const menu = miraAPI.menu.getMenu('file')
    const item = menu?.submenu.find(item => item.id === 'import-files')

    if (item) {
      const newEnabled = !(item.enabled !== false)
      miraAPI.menu.setMenuItemEnabled('file', 'import-files', newEnabled)
      addLog(t('views.menuTestView.logToggleEnabled', { action: newEnabled ? t('views.menuTestView.enabled') : t('views.menuTestView.disabled') }))
      refreshMenuState()
    } else {
      addLog(t('views.menuTestView.logMenuItemNotFound'))
    }
  } catch (error) {
    addLog(t('views.menuTestView.logToggleEnabledFailed', { error }))
  }
}

// 切换菜单项可见性
const toggleMenuItemVisible = () => {
  try {
    const menu = miraAPI.menu.getMenu('file')
    const item = menu?.submenu.find(item => item.id === 'export-selected')

    if (item) {
      const newVisible = !(item.visible !== false)
      miraAPI.menu.setMenuItemVisible('file', 'export-selected', newVisible)
      addLog(t('views.menuTestView.logToggleVisible', { action: newVisible ? t('views.menuTestView.shown') : t('views.menuTestView.hidden') }))
      refreshMenuState()
    } else {
      addLog(t('views.menuTestView.logExportNotFound'))
    }
  } catch (error) {
    addLog(t('views.menuTestView.logToggleVisibleFailed', { error }))
  }
}

onMounted(() => {
  addLog(t('views.menuTestView.pageLoaded'))
  refreshMenuState()
})
</script>

