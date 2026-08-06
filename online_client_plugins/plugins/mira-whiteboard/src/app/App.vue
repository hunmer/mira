<script setup lang="ts">
/**
 * 自由画板组合窗口（单窗口 = 画布 + 工程管理对话框）
 *
 * 设计要点：
 *   1. <WovenCanvas> 的 documentId 在 AssetManager 构造时一次性读取（非响应式），
 *      因此切换工程必须用 :key="currentProjectId" 强制重挂组件，让 IndexedDB
 *      documentId 随之切换 → 每个工程的画布内容互相隔离。
 *   2. 工程列表存在 localStorage（窗口内只有 electronAPI.pluginWindow，无宿主 api.storage）。
 *   3. 顶部条：左侧是当前工程名（点击进入 input 行内重命名），右侧 dots 按钮打开工程管理对话框。
 *   4. 工程管理对话框：第一行 = 搜索栏 + 新建按钮；下方是卡片网格（一行多个）。
 *      新建工程直接用当前时间命名、无需表单、创建即进入画布。卡片仅保留删除按钮。
 *   5. 本窗口自定义 Electron 菜单栏：
 *      【项目】子菜单 = 所有工程（radio，当前项打勾）+ 新建工程 + 管理工程。
 *      点击菜单项 → 主进程把 { action, projectId } 发回本窗口 → 切换 / 新建 / 开对话框。
 *      工程列表或当前工程变化时重建菜单（watch）。
 */
import { computed, ref, defineComponent, h, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { WovenCanvas, useImageCreation } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import CanvasContextMenu from './CanvasContextMenu.vue'
import CanvasImagePreview from './CanvasImagePreview.vue'
import CanvasSelectionToolbar from './CanvasSelectionToolbar.vue'

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
const errorMsg = ref<string | null>(null)
// 待插入的媒体（来自 ?media= 或 pluginWindow.send('media:add')）
const pendingMedia = ref<any[]>([])
// 工程管理对话框开关（列表已从常驻侧栏改为对话框）
const dialogOpen = ref(false)
// 对话框搜索关键字
const searchKeyword = ref('')
// 顶部栏行内重命名态
const editingName = ref(false)
const editingNameValue = ref('')

const currentProject = computed<Project | null>(
  () => projects.value.find((p) => p.id === currentId.value) || null
)

// 对话框搜索过滤后的工程列表
const filteredProjects = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return projects.value
  return projects.value.filter((p) => p.name.toLowerCase().includes(kw))
})

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
/**
 * 新建工程：直接用当前时间命名，无需表单，创建后立即切换到新画布。
 * 卡片上的「新建」入口与菜单「新建工程」共用此函数。
 */
function createProject(): string {
  const project: Project = {
    id: uid(),
    name: nowLabel(),
    createdAt: nowLabel(),
    updatedAt: nowLabel(),
  }
  projects.value = [project, ...projects.value]
  saveProjects(projects.value)
  currentId.value = project.id
  dialogOpen.value = false
  return project.id
}

/** 顶部栏：进入工程名行内编辑态 */
function startEditName() {
  if (!currentProject.value) return
  editingNameValue.value = currentProject.value.name
  editingName.value = true
  void nextTick(() => {
    const el = document.querySelector<HTMLInputElement>('.wb-name-input')
    el?.focus()
    el?.select()
  })
}

/** 顶部栏：提交工程名编辑 */
function commitEditName() {
  if (!editingName.value || !currentProject.value) {
    editingName.value = false
    return
  }
  const name = editingNameValue.value.trim()
  if (name && name !== currentProject.value.name) {
    currentProject.value.name = name
    currentProject.value.updatedAt = nowLabel()
    saveProjects(projects.value)
  }
  editingName.value = false
}

/** 顶部栏：取消工程名编辑 */
function cancelEditName() {
  editingName.value = false
}

/** 卡片上的重命名（对话框内行内输入） */
function renameProjectInline(p: Project) {
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

/** 从对话框列表里选一个工程：切换并关闭对话框 */
function selectProject(p: Project) {
  currentId.value = p.id
  dialogOpen.value = false
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
        { label: '管理工程…', accelerator: 'CmdOrCtrl+M', action: 'manage-projects' },
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

// 菜单点击回调：切换工程 / 新建工程 / 管理工程（开对话框）
function handleMenuAction(payload: { action: string; projectId?: string }) {
  if (payload.action === 'switch-project' && payload.projectId) {
    if (projects.value.some((p) => p.id === payload.projectId)) {
      currentId.value = payload.projectId
    }
  } else if (payload.action === 'new-project') {
    createProject()
  } else if (payload.action === 'manage-projects') {
    dialogOpen.value = true
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
        // 无当前工程时自动新建一个（用时间命名）接收媒体
        if (!currentId.value) {
          createProject()
        }
        if (currentId.value) {
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
    <!-- 画布区（全屏） -->
    <main class="wb-canvas-area">
      <div v-if="!currentProject" class="wb-canvas-empty">
        <span class="material-icons wb-canvas-empty-icon">dashboard_customize</span>
        <p>还没有工程</p>
        <div class="wb-canvas-empty-actions">
          <button class="wb-empty-btn" @click="createProject">
            <span class="material-icons" style="font-size: 16px">add</span>
            新建工程
          </button>
          <button class="wb-empty-btn wb-empty-btn-ghost" @click="dialogOpen = true">
            <span class="material-icons" style="font-size: 16px">apps</span>
            管理工程
          </button>
        </div>
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
        <CanvasContextMenu />
        <CanvasImagePreview />
        <template #floating-menu>
          <CanvasSelectionToolbar />
        </template>
      </WovenCanvas>

      <!-- 顶部工程切换条（最左侧：可编辑工程名；右侧：dots 打开管理对话框） -->
      <div v-if="currentProject" class="wb-topbar">
        <!-- 左：工程名（点击进入 input 编辑） -->
        <input
          v-if="editingName"
          v-model="editingNameValue"
          class="wb-name-input"
          @keyup.enter="commitEditName"
          @keyup.esc="cancelEditName"
          @blur="commitEditName"
        />
        <button v-else class="wb-name-btn" :title="'点击重命名'" @click="startEditName">
          <span class="wb-topbar-name">{{ currentProject.name }}</span>
          <span class="material-icons wb-name-edit-icon">edit</span>
        </button>

        <!-- 右：dots，打开工程管理对话框 -->
        <button class="wb-dots-btn" title="切换 / 管理工程" @click="dialogOpen = true">
          <span class="material-icons">apps</span>
        </button>
      </div>
    </main>

    <!-- 工程管理对话框 -->
    <div v-if="dialogOpen" class="wb-dialog-mask" @click.self="dialogOpen = false">
      <div class="wb-dialog" role="dialog" aria-modal="true">
        <header class="wb-dialog-header">
          <div class="wb-dialog-title">
            <span class="material-icons wb-dialog-icon">dashboard_customize</span>
            <span>工程管理</span>
          </div>
          <button class="wb-icon-btn" title="关闭" @click="dialogOpen = false">
            <span class="material-icons" style="font-size: 18px">close</span>
          </button>
        </header>

        <!-- 第一行：搜索栏（左）+ 新建按钮（右） -->
        <div class="wb-dialog-toolbar">
          <div class="wb-search">
            <span class="material-icons wb-search-icon">search</span>
            <input
              v-model="searchKeyword"
              class="wb-search-input"
              placeholder="搜索工程…"
            />
          </div>
          <button class="wb-btn wb-btn-primary" @click="createProject">
            <span class="material-icons" style="font-size: 16px">add</span>
            <span>新建工程</span>
          </button>
        </div>

        <!-- 错误提示 -->
        <div v-if="errorMsg" class="wb-error">
          <span class="material-icons" style="font-size: 16px">error_outline</span>
          <span>{{ errorMsg }}</span>
        </div>

        <!-- 工程卡片网格 -->
        <div class="wb-project-list">
          <div v-if="filteredProjects.length === 0" class="wb-empty">
            <span class="material-icons wb-empty-icon">inbox</span>
            <p>{{ projects.length === 0 ? '暂无工程' : '没有匹配的工程' }}</p>
            <p class="wb-empty-hint">{{ projects.length === 0 ? '点击右上角新建第一个画布' : '试试别的关键字' }}</p>
          </div>

          <div
            v-for="p in filteredProjects"
            :key="p.id"
            class="wb-card"
            :class="{ active: p.id === currentId }"
            @click="selectProject(p)"
          >
            <div class="wb-card-thumb">
              <span class="material-icons wb-card-thumb-icon">dashboard</span>
            </div>
            <div class="wb-card-body">
              <div class="wb-card-name">{{ p.name }}</div>
              <div class="wb-card-meta">更新于 {{ p.updatedAt || p.createdAt }}</div>
            </div>
            <!-- 仅保留删除（编辑按钮已移除） -->
            <button
              class="wb-icon-btn danger wb-card-del"
              title="删除"
              @click.stop="deleteProject(p)"
            >
              <span class="material-icons" style="font-size: 16px">delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
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
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* ── 画布区（全屏） ── */
.wb-canvas-area {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #fafafa;
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
  justify-content: center;
  white-space: nowrap;
}
.wb-btn-primary:hover {
  filter: brightness(1.08);
  color: #fff;
}
.wb-btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.wb-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  margin: 0 18px 10px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  font-size: 12px;
}

/* 工程卡片网格（替代原列表） */
.wb-project-list {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  align-content: start;
}

.wb-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  text-align: center;
  padding: 40px 0;
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

/* 单个工程卡片 */
.wb-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.15s;
}
.wb-card:hover {
  border-color: #6366f1;
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.14);
  transform: translateY(-2px);
}
.wb-card.active {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.35);
}

.wb-card-thumb {
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
}
.wb-card-thumb-icon {
  font-size: 40px;
  opacity: 0.9;
}

.wb-card-body {
  padding: 10px 12px;
}
.wb-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wb-card-meta {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.wb-card-del {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.85);
  color: #6b7280;
  opacity: 0;
  backdrop-filter: blur(4px);
}
.wb-card:hover .wb-card-del {
  opacity: 1;
}
.wb-card-del:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
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

/* （画布区 .wb-canvas-area 已在前面定义，全屏） */

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
.wb-canvas-empty-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.wb-empty-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 10px;
  border: none;
  background: #6366f1;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: filter 0.15s;
}
.wb-empty-btn:hover {
  filter: brightness(1.08);
}
.wb-empty-btn-ghost {
  background: #fff;
  color: #6366f1;
  border: 1px solid #6366f1;
}
.wb-empty-btn-ghost:hover {
  background: rgba(99, 102, 241, 0.08);
}

/* 顶部工程条：左侧可编辑工程名 + 右侧 dots */
.wb-topbar {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  font-size: 14px;
  color: #333;
}
.wb-name-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 280px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: #333;
  font-size: 14px;
  cursor: text;
  transition: background 0.15s;
}
.wb-name-btn:hover {
  background: rgba(99, 102, 241, 0.08);
}
.wb-topbar-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wb-name-edit-icon {
  font-size: 14px;
  color: #9ca3af;
}
.wb-name-input {
  max-width: 280px;
  padding: 4px 8px;
  border: 1px solid #6366f1;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.wb-dots-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}
.wb-dots-btn:hover {
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
}
.wb-dots-btn .material-icons {
  font-size: 20px;
}

/* ── 工程管理对话框 ── */
.wb-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  animation: wb-fade-in 0.15s ease-out;
}
@keyframes wb-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.wb-dialog {
  width: 760px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 96px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.24);
  overflow: hidden;
  animation: wb-pop-in 0.18s ease-out;
}
@keyframes wb-pop-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.wb-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid #f0f0f0;
}
.wb-dialog-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}
.wb-dialog-icon {
  font-size: 20px;
  color: #6366f1;
}

.wb-dialog-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px 12px;
}

.wb-search {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}
.wb-search-icon {
  position: absolute;
  left: 10px;
  font-size: 18px;
  color: #9ca3af;
  pointer-events: none;
}
.wb-search-input {
  width: 100%;
  padding: 8px 12px 8px 34px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.wb-search-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

/* 对话框内的卡片网格区域：占据剩余高度、可滚动 */
.wb-dialog .wb-project-list {
  flex: 1;
  min-height: 280px;
  padding: 0 18px 18px;
}
</style>
