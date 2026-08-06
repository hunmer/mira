<script setup lang="ts">
/**
 * 工程管理（插件主界面）
 *
 * 职责：展示画布工程列表（新建/重命名/删除），点击工程 → 打开画布子窗口。
 *
 * 数据：localStorage（key=mira-whiteboard:projects）。窗口内没有宿主 api.storage，
 * 只能用 localStorage；key 与宿主侧不同（互不干扰）。
 * 窗口能力：window.electronAPI.pluginWindow.open({ entry:'dist/canvas.html', query:{projectId} })
 */
import { ref, onMounted } from 'vue'

interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'mira-whiteboard:projects'
const PLUGIN_ID = 'c3f4a5b6-7d8e-4f90-8a1b-2c3d4e5f6a7b'

const projects = ref<Project[]>([])
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const creating = ref(false)
const newName = ref('')

/** 工具：生成 id */
function uid(): string {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** 工具：当前时间格式化 */
function nowLabel(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 读取工程列表 */
function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/** 保存工程列表 */
function saveProjects(list: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('[whiteboard-manager] saveProjects failed', e)
    errorMsg.value = '保存失败：浏览器存储不可用'
  }
}

/** 新建工程（行内输入） */
function startCreate() {
  newName.value = ''
  creating.value = true
}

function confirmCreate() {
  const name = newName.value.trim()
  if (!name) {
    creating.value = false
    return
  }
  const project: Project = {
    id: uid(),
    name,
    createdAt: nowLabel(),
    updatedAt: nowLabel(),
  }
  projects.value = [project, ...projects.value]
  saveProjects(projects.value)
  creating.value = false
}

function cancelCreate() {
  creating.value = false
}

/** 重命名 */
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

/** 删除 */
function deleteProject(p: Project) {
  if (!confirm(`确定删除工程「${p.name}」？\n（画布内容仍保留在浏览器存储中，仅从列表移除）`)) return
  projects.value = projects.value.filter((x) => x.id !== p.id)
  saveProjects(projects.value)
}

/** 打开画布窗口 */
async function openProject(p: Project) {
  const w = (window as any).electronAPI
  if (!w?.pluginWindow?.open) {
    errorMsg.value = '当前环境不支持打开画布窗口'
    return
  }
  loading.value = true
  errorMsg.value = null
  try {
    const result = await w.pluginWindow.open({
      pluginId: PLUGIN_ID,
      entry: 'dist/canvas.html',
      title: `${p.name} - 画布`,
      width: 1280,
      height: 860,
      query: { projectId: p.id, projectName: p.name },
    })
    if (!result?.success) {
      errorMsg.value = result?.message || '打开画布失败'
    }
  } catch (e: any) {
    errorMsg.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  projects.value = loadProjects()
})
</script>

<template>
  <div class="wbm-root">
    <header class="wbm-header">
      <div class="wbm-title">
        <span class="material-icons wbm-title-icon">dashboard_customize</span>
        <span>自由画板</span>
      </div>
      <button class="wbm-btn wbm-btn-primary" @click="startCreate" :disabled="creating">
        <span class="material-icons" style="font-size:16px;">add</span>
        <span>新建工程</span>
      </button>
    </header>

    <!-- 新建输入行 -->
    <div v-if="creating" class="wbm-create-row">
      <input
        v-model="newName"
        class="wbm-input"
        placeholder="输入工程名称，回车确认"
        autofocus
        @keyup.enter="confirmCreate"
        @keyup.esc="cancelCreate"
      />
      <button class="wbm-btn wbm-btn-primary" @click="confirmCreate">确定</button>
      <button class="wbm-btn" @click="cancelCreate">取消</button>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="wbm-error">
      <span class="material-icons" style="font-size:16px;">error_outline</span>
      <span>{{ errorMsg }}</span>
    </div>

    <!-- 工程列表 -->
    <main class="wbm-list">
      <!-- 空状态 -->
      <div v-if="projects.length === 0" class="wbm-empty">
        <span class="material-icons wbm-empty-icon">inbox</span>
        <p>暂无工程</p>
        <p class="wbm-empty-hint">点击右上角「新建工程」创建你的第一个画布</p>
      </div>

      <!-- 工程卡片 -->
      <div
        v-for="p in projects"
        :key="p.id"
        class="wbm-item"
        :class="{ 'is-loading': loading }"
        @click="openProject(p)"
      >
        <div class="wbm-item-icon">
          <span class="material-icons" style="font-size:18px;">dashboard</span>
        </div>
        <div class="wbm-item-info">
          <div class="wbm-item-name">{{ p.name }}</div>
          <div class="wbm-item-meta">更新于 {{ p.updatedAt || p.createdAt }}</div>
        </div>
        <div class="wbm-item-actions" @click.stop>
          <button class="wbm-icon-btn" title="重命名" @click="renameProject(p)">
            <span class="material-icons" style="font-size:16px;">edit</span>
          </button>
          <button class="wbm-icon-btn danger" title="删除" @click="deleteProject(p)">
            <span class="material-icons" style="font-size:16px;">delete</span>
          </button>
        </div>
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #fafafa;
  color: #333;
}

.wbm-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px 24px;
  box-sizing: border-box;
}

.wbm-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.wbm-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  flex: 1;
}

.wbm-title-icon {
  font-size: 22px;
  color: #6366f1;
}

.wbm-btn {
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
.wbm-btn:hover {
  border-color: #6366f1;
  color: #6366f1;
}
.wbm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.wbm-btn-primary {
  background: #6366f1;
  color: #fff;
  border-color: #6366f1;
}
.wbm-btn-primary:hover {
  filter: brightness(1.08);
  color: #fff;
}

.wbm-create-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.wbm-input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.wbm-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.wbm-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  font-size: 12px;
}

.wbm-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wbm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #999;
  text-align: center;
}
.wbm-empty-icon {
  font-size: 56px;
  color: #d1d5db;
  margin-bottom: 8px;
}
.wbm-empty p {
  margin: 2px 0;
}
.wbm-empty-hint {
  font-size: 12px;
}

.wbm-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}
.wbm-item:hover {
  border-color: #6366f1;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.12);
  transform: translateY(-1px);
}
.wbm-item.is-loading {
  opacity: 0.6;
  pointer-events: none;
}

.wbm-item-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wbm-item-info {
  flex: 1;
  min-width: 0;
}
.wbm-item-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wbm-item-meta {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.wbm-item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}
.wbm-item:hover .wbm-item-actions {
  opacity: 1;
}

.wbm-icon-btn {
  width: 28px;
  height: 28px;
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
.wbm-icon-btn:hover {
  background: #f3f4f6;
  color: #333;
}
.wbm-icon-btn.danger:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}
</style>
