<template>
  <div class="menu-test-page">
    <div class="p-6 space-y-6">
      <h2 class="text-2xl font-bold text-gray-800">菜单 API 测试</h2>
      
      <!-- 菜单管理 -->
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">菜单管理</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- 添加自定义菜单 -->
          <div class="space-y-2">
            <button
              @click="addCustomMenu"
              class="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              添加自定义菜单
            </button>
          </div>

          <!-- 移除自定义菜单 -->
          <div class="space-y-2">
            <button
              @click="removeCustomMenu"
              class="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              移除自定义菜单
            </button>
          </div>

          <!-- 更新导航菜单 -->
          <div class="space-y-2">
            <button
              @click="updateNavigationMenu"
              class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              同步路由到导航菜单
            </button>
          </div>
        </div>
      </div>

      <!-- 菜单项管理 -->
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">菜单项管理</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            @click="addMenuItem"
            class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            添加菜单项
          </button>

          <button
            @click="removeMenuItem"
            class="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            移除菜单项
          </button>

          <button
            @click="toggleMenuItemEnabled"
            class="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
          >
            切换菜单项启用状态
          </button>

          <button
            @click="toggleMenuItemVisible"
            class="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            切换菜单项可见性
          </button>
        </div>
      </div>

      <!-- 当前菜单状态 -->
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">当前菜单状态</h3>
        
        <div class="space-y-4">
          <div v-for="menu in currentMenus" :key="menu.id" class="border rounded p-3">
            <h4 class="font-medium text-gray-800">{{ menu.label }} ({{ menu.id }})</h4>
            <ul class="mt-2 space-y-1">
              <li 
                v-for="item in menu.submenu" 
                :key="item.id"
                class="text-sm text-gray-600 pl-4"
                :class="{
                  'text-gray-400': item.enabled === false,
                  'line-through': item.visible === false
                }"
              >
                {{ item.label || item.id }} 
                <span v-if="item.accelerator" class="text-xs bg-gray-100 px-1 rounded">
                  {{ item.accelerator }}
                </span>
                <span v-if="item.route" class="text-xs text-blue-500">
                  → {{ item.route }}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <button
          @click="refreshMenuState"
          class="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          刷新菜单状态
        </button>
      </div>

      <!-- 操作日志 -->
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4">操作日志</h3>
        <div class="bg-gray-50 p-3 rounded h-40 overflow-y-auto">
          <div 
            v-for="(log, index) in logs" 
            :key="index"
            class="text-sm text-gray-700 mb-1"
          >
            <span class="text-gray-500">{{ log.time }}</span> - {{ log.message }}
          </div>
        </div>
        <button
          @click="clearLogs"
          class="mt-2 px-3 py-1 bg-gray-400 text-white text-sm rounded hover:bg-gray-500"
        >
          清空日志
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { miraAPI } from '../api/MiraAPI'
import type { MenuConfig, MenuItemConfig } from '../services/MenuService'

const router = useRouter()
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
    addLog('菜单状态已刷新')
  } catch (error) {
    addLog(`刷新菜单状态失败: ${error}`)
  }
}

// 添加自定义菜单
const addCustomMenu = () => {
  try {
    const customMenu: MenuConfig = {
      id: 'custom',
      label: '自定义菜单',
      submenu: [
        {
          id: 'custom-action-1',
          label: '自定义动作 1',
          accelerator: 'CmdOrCtrl+Shift+1',
          action: 'customAction1'
        },
        {
          id: 'custom-action-2',
          label: '自定义动作 2',
          accelerator: 'CmdOrCtrl+Shift+2',
          action: 'customAction2'
        },
        { id: 'custom-separator', type: 'separator' },
        {
          id: 'custom-route',
          label: '跳转到设置',
          route: 'Settings'
        }
      ]
    }

    miraAPI.menu.addMenu(customMenu)
    addLog('已添加自定义菜单')
    refreshMenuState()
  } catch (error) {
    addLog(`添加自定义菜单失败: ${error}`)
  }
}

// 移除自定义菜单
const removeCustomMenu = () => {
  try {
    miraAPI.menu.removeMenu('custom')
    addLog('已移除自定义菜单')
    refreshMenuState()
  } catch (error) {
    addLog(`移除自定义菜单失败: ${error}`)
  }
}

// 更新导航菜单
const updateNavigationMenu = () => {
  try {
    const routes = router.getRoutes().filter(route => !route.meta?.hideInNav)
    miraAPI.menu.updateNavigationFromRoutes(routes)
    addLog(`已根据 ${routes.length} 个路由更新导航菜单`)
    refreshMenuState()
  } catch (error) {
    addLog(`更新导航菜单失败: ${error}`)
  }
}

// 添加菜单项
const addMenuItem = () => {
  try {
    const newItem: MenuItemConfig = {
      id: 'test-menu-item',
      label: '测试菜单项',
      accelerator: 'CmdOrCtrl+T',
      route: 'Home'
    }

    miraAPI.menu.addMenuItem('file', newItem, 1) // 添加到文件菜单的第二个位置
    addLog('已在文件菜单中添加测试菜单项')
    refreshMenuState()
  } catch (error) {
    addLog(`添加菜单项失败: ${error}`)
  }
}

// 移除菜单项
const removeMenuItem = () => {
  try {
    miraAPI.menu.removeMenuItem('file', 'test-menu-item')
    addLog('已移除测试菜单项')
    refreshMenuState()
  } catch (error) {
    addLog(`移除菜单项失败: ${error}`)
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
      addLog(`已${newEnabled ? '启用' : '禁用'}导入文件菜单项`)
      refreshMenuState()
    } else {
      addLog('未找到导入文件菜单项')
    }
  } catch (error) {
    addLog(`切换菜单项启用状态失败: ${error}`)
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
      addLog(`已${newVisible ? '显示' : '隐藏'}导出菜单项`)
      refreshMenuState()
    } else {
      addLog('未找到导出菜单项')
    }
  } catch (error) {
    addLog(`切换菜单项可见性失败: ${error}`)
  }
}

onMounted(() => {
  addLog('菜单测试页面已加载')
  refreshMenuState()
})
</script>

<style scoped>
.menu-test-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}
</style>
