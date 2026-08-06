<script setup lang="ts">
/**
 * 自由画板组合窗口（单窗口 = 工程列表 + 画布）
 *
 * 设计要点：
 *   1. <WovenCanvas> 的 documentId 在 AssetManager 构造时一次性读取（非响应式），
 *      因此切换工程必须用 :key="currentProjectId" 强制重挂组件，让 IndexedDB
 *      documentId 随之切换 → 每个工程的画布内容互相隔离。
 *   2. 工程列表存在 localStorage（窗口内只有 electronAPI.pluginWindow，无宿主 api.storage）。
 *   3. 本窗口自定义 Electron 菜单栏：
 *      【项目】子菜单 = 所有工程（radio，当前项打勾）+ 分隔符 + 新建工程
 *      点击菜单项 → 主进程把 { action, projectId } 发回本窗口 → 切换画布 / 新建。
 *      工程列表或当前工程变化时重建菜单（watch）。
 */
import { computed, ref, defineComponent, h, onMounted, onBeforeUnmount, watch } from 'vue'
import { WovenCanvas, useImageCreation } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'

interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'mira-whiteboard:projects'
const PLUGIN_ID = 'c3f4a5b6-7d8e-4f90-8a1b-2c3d4e5f6a7b'

const projects = ref<Project[]>([])
const currentId = ref<string>('')
const creating = ref(false)
const newName = ref('')
const errorMsg = ref<string | null>(null)
// 待插入的媒体（来自 ?media= 或 pluginWindow.send('media:add')）
const pendingMedia = ref<any[]>([])

const currentProject = computed<Project | null>(
  () => projects.value.find((p) => p.id === currentId.value) || null
)

// ── localStorage 持久化 ───────────────────────────────────────────
function uid(): string {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function nowLabel(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveProjects(list: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('[whiteboard] saveProjects failed', e)
    errorMsg.value = '保存失败：浏览器存储不可用'
  }
}

// ── 工程增删改 ────────────────────────────────────────────────────
function startCreate() {
  newName.value = ''
  creating.value = true
}

function confirmCreate(): string | null {
  const name = newName.value.trim()
  if (!name) {
    creating.value = false
    return null
  }
  const project: Project = { id: uid(), name, createdAt: nowLabel(), updatedAt: nowLabel() }
  projects.value = [project, ...projects.value]
  saveProjects(projects.value)
  creating.value = false
  currentId.value = project.id
  return project.id
}

function cancelCreate() {
  creating.value = false
}

function renameProject(p: Project) {
  const name = prompt('请输入新的工程名称', p.name)
  if (!name || !name.trim() || name.trim() === p.name) return
  const target = projects.value.find((x) => x.id === p.id)
  if (target) {
    target.name = name.trim()
    target.updatedAt = nowLabel()
    saveProjects(projects.value)
  }
}

function deleteProject(p: Project) {
  if (!confirm(`确定删除工程「${p.name}」？\n（画布内容仍保留在浏览器存储中，仅从列表移除）`)) return
  const idx = projects.value.findIndex((x) => x.id === p.id)
  projects.value = projects.value.filter((x) => x.id !== p.id)
  saveProjects(projects.value)
  // 删除的是当前工程 → 切到第一个（或清空）
  if (currentId.value === p.id) {
    currentId.value = projects.value[0]?.id || ''
  }
  void idx
}

function selectProject(p: Project) {
  currentId.value = p.id
}

// ── 画布配置（随 currentId 切换） ─────────────────────────────────
const background = { kind: 'dots' as const }
const store = computed(() => ({
  persistence: { documentId: `mira-whiteboard:${currentId.value}` },
}))

// ── 媒体插入桥（renderless 组件，挂在 <WovenCanvas> 内） ──────────
// useImageCreation 必须在 <WovenCanvas> 的子组件里调用（依赖其 provide）。
const CanvasMediaBridge = defineComponent({
  name: 'CanvasMediaBridge',
  setup() {
    const { createImageBlock } = useImageCreation()
    const insertMedia = async (files: any[]) => {
      for (const [index, media] of (files || []).entries()) {
        const source = media?.url || media?.thumbnailPath
        if (!source) continue
        try {
          const response = await fetch(source)
          if (!response.ok) continue
          const blob = await response.blob()
          const file = new File([blob], media.name || `media-${index}`, {
            type: media.mimeType || blob.type,
          })
          await createImageBlock(file, index * 260, 0)
        } catch (error) {
          console.warn('[whiteboard] insert media failed', media?.id, error)
        }
      }
    }
    onMounted(() => {
      // 初始挂载时消费 URL 上带进来的 media
      if (pendingMedia.value.length) {
        void insertMedia(pendingMedia.value)
        pendingMedia.value = []
      }
      // 后续通过 pluginWindow.send('media:add') 到达的媒体也要消费：
      // watch pendingMedia，一旦有值就插入并清空。
      const stop = watch(pendingMedia, (list) => {
        if (list.length) {
          void insertMedia(list)
          pendingMedia.value = []
        }
      })
      onBeforeUnmount(stop)
    })
    return () => h('span', { style: 'display:none' })
  },
})

// ── 自定义窗口菜单 ────────────────────────────────────────────────
// 工程列表 / 当前工程变化时重建；菜单点击经主进程转发回 onMenuAction。
function buildMenuTemplate(): any[] {
  const projectItems = projects.value.map((p) => ({
    label: p.name,
    type: 'radio' as const,
    checked: p.id === currentId.value,
    action: 'switch-project',
    projectId: p.id,
  }))
  return [
    {
      label: '项目',
      submenu: [
        ...(projectItems.length
          ? projectItems
          : [{ label: '（暂无工程）', enabled: false }]),
        { type: 'separator' as const },
        { label: '新建工程', accelerator: 'CmdOrCtrl+N', action: 'new-project' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' as const },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { label: '实际大小', role: 'resetZoom' },
        { type: 'separator' as const },
        { label: '全屏', role: 'togglefullscreen' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '关闭', role: 'close' },
      ],
    },
  ]
}

let unsubMenu: (() => void) | undefined
let unsubMessage: (() => void) | undefined

async function rebuildMenu() {
  const w = (window as any).electronAPI
  if (!w?.pluginWindow?.setMenu) return
  try {
    await w.pluginWindow.setMenu(buildMenuTemplate())
  } catch (e) {
    console.warn('[whiteboard] setMenu failed', e)
  }
}

watch([projects, currentId], rebuildMenu, { deep: true })

// 菜单点击回调：切换工程 / 新建工程
function handleMenuAction(payload: { action: string; projectId?: string }) {
  if (payload.action === 'switch-project' && payload.projectId) {
    if (projects.value.some((p) => p.id === payload.projectId)) {
      currentId.value = payload.projectId
    }
  } else if (payload.action === 'new-project') {
    startCreate()
  }
}

// ── 初始化 ────────────────────────────────────────────────────────
onMounted(() => {
  projects.value = loadProjects()
  currentId.value = projects.value[0]?.id || ''

  // 解析 URL 上的 media（来自宿主侧 openManagerWithMedia）
  try {
    const raw = new URLSearchParams(window.location.search).get('media')
    pendingMedia.value = raw ? JSON.parse(decodeURIComponent(raw)) : []
  } catch {
    pendingMedia.value = []
  }

  const w = (window as any).electronAPI
  if (w?.pluginWindow?.onMenuAction) {
    unsubMenu = w.pluginWindow.onMenuAction(handleMenuAction)
  }
  // 宿主侧 pluginWindow.send('media:add', files) 投递路径
  if (w?.pluginWindow?.onMessage) {
    unsubMessage = w.pluginWindow.onMessage((channel: string, data: any) => {
      if (channel === 'media:add') {
        // 无当前工程时自动新建一个接收媒体
        if (!currentId.value) {
          const fallbackName = '未命名工程'
          newName.value = fallbackName
          const id = confirmCreate()
          if (id) {
            pendingMedia.value = data || []
          }
        } else {
          pendingMedia.value = data || []
        }
      }
    })
  }

  // 初始建菜单（watch 在 onMounted 后首次触发也会建，这里显式调一次更稳妥）
  void rebuildMenu()
})

onBeforeUnmount(() => {
  unsubMenu?.()
  unsubMessage?.()
})
</script>

<template>
  <div class="wb-root">
    <!-- 左侧：工程列表 -->
    <aside class="wb-sidebar">
      <header class="wb-sidebar-header">
        <span class="material-icons wb-sidebar-icon">dashboard_customize</span>
        <span class="wb-sidebar-title">自由画板</span>
      </header>

      <div class="wb-sidebar-actions">
        <button class="wb-btn wb-btn-primary" @click="startCreate" :disabled="creating">
          <span class="material-icons" style="font-size: 16px">add</span>
          <span>新建工程</span>
        </button>
      </div>

      <!-- 新建输入行 -->
      <div v-if="creating" class="wb-create-row">
        <input
          v-model="newName"
          class="wb-input"
          placeholder="工程名称，回车确认"
          autofocus
          @keyup.enter="confirmCreate"
          @keyup.esc="cancelCreate"
        />
        <button class="wb-btn wb-btn-primary wb-btn-sm" @click="confirmCreate">确定</button>
        <button class="wb-btn wb-btn-sm" @click="cancelCreate">取消</button>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="wb-error">
        <span class="material-icons" style="font-size: 16px">error_outline</span>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- 工程列表 -->
      <div class="wb-project-list">
        <div v-if="projects.length === 0" class="wb-empty">
          <span class="material-icons wb-empty-icon">inbox</span>
          <p>暂无工程</p>
          <p class="wb-empty-hint">点击上方新建第一个画布</p>
        </div>

        <div
          v-for="p in projects"
          :key="p.id"
          class="wb-project-item"
          :class="{ active: p.id === currentId }"
          @click="selectProject(p)"
        >
          <div class="wb-project-icon">
            <span class="material-icons" style="font-size: 18px">dashboard</span>
          </div>
          <div class="wb-project-info">
            <div class="wb-project-name">{{ p.name }}</div>
            <div class="wb-project-meta">更新于 {{ p.updatedAt || p.createdAt }}</div>
          </div>
          <div class="wb-project-actions" @click.stop>
            <button class="wb-icon-btn" title="重命名" @click="renameProject(p)">
              <span class="material-icons" style="font-size: 16px">edit</span>
            </button>
            <button class="wb-icon-btn danger" title="删除" @click="deleteProject(p)">
              <span class="material-icons" style="font-size: 16px">delete</span>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- 右侧：画布 -->
    <main class="wb-canvas-area">
      <div v-if="!currentProject" class="wb-canvas-empty">
        <span class="material-icons wb-canvas-empty-icon">dashboard_customize</span>
        <p>从左侧选择一个工程，或新建一个开始绘画</p>
      </div>

      <!-- :key 强制重挂 → 切换 IndexedDB documentId -->
      <WovenCanvas
        v-else
        :key="currentId"
        :background="background"
        :store="store"
        class="wb-canvas"
      >
        <CanvasMediaBridge />
      </WovenCanvas>

      <!-- 顶部工程名条（覆盖在画布上） -->
      <div v-if="currentProject" class="wb-topbar">
        <span class="material-icons wb-topbar-icon">dashboard_customize</span>
        <span class="wb-topbar-name">{{ currentProject.name }}</span>
      </div>
    </main>
  </div>
</template>

<style>
/* Material Icons 字体由 main.ts 的 loadMaterialIcons() 动态注入
   （import 字体文件触发 vite asset 处理，避免在 <style> 里写 url() 被
   原样保留导致字体不进 dist）。这里不再声明 @font-face。 */

html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #fafafa;
  color: #333;
}

.wb-root {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* ── 左侧工程列表 ── */
.wb-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  box-sizing: border-box;
  padding: 16px 14px;
}

.wb-sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.wb-sidebar-icon {
  font-size: 22px;
  color: #6366f1;
}
.wb-sidebar-title {
  font-size: 16px;
  font-weight: 600;
}

.wb-sidebar-actions {
  margin-bottom: 12px;
}

.wb-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #333;
  cursor: pointer;
  transition: all 0.15s;
}
.wb-btn:hover {
  border-color: #6366f1;
  color: #6366f1;
}
.wb-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.wb-btn-primary {
  background: #6366f1;
  color: #fff;
  border-color: #6366f1;
  width: 100%;
  justify-content: center;
}
.wb-btn-primary:hover {
  filter: brightness(1.08);
  color: #fff;
}
.wb-btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.wb-create-row {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}
.wb-input {
  flex: 1;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.wb-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.wb-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  font-size: 12px;
}

.wb-project-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #999;
  text-align: center;
}
.wb-empty-icon {
  font-size: 48px;
  color: #d1d5db;
  margin-bottom: 6px;
}
.wb-empty p {
  margin: 2px 0;
}
.wb-empty-hint {
  font-size: 12px;
}

.wb-project-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.wb-project-item:hover {
  background: #f3f4f6;
}
.wb-project-item.active {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
}

.wb-project-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wb-project-info {
  flex: 1;
  min-width: 0;
}
.wb-project-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wb-project-meta {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.wb-project-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.wb-project-item:hover .wb-project-actions {
  opacity: 1;
}

.wb-icon-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
}
.wb-icon-btn:hover {
  background: #e5e7eb;
  color: #333;
}
.wb-icon-btn.danger:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

/* ── 右侧画布区 ── */
.wb-canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #fafafa;
}

.wb-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.wb-canvas-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  text-align: center;
}
.wb-canvas-empty-icon {
  font-size: 72px;
  color: #d1d5db;
  margin-bottom: 12px;
}

.wb-topbar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  font-size: 14px;
  color: #333;
  pointer-events: none;
}
.wb-topbar-icon {
  font-size: 18px;
  color: #6366f1;
}
.wb-topbar-name {
  font-weight: 500;
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
