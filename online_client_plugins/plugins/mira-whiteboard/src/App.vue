<script setup lang="ts">
/**
 * 自由白板画布（dist SPA）
 *
 * 参考 @woven-canvas/vue 官方 Quick Start：
 *   - :background 点阵背景
 *   - :store.persistence.documentId 按 projectId 持久化到 IndexedDB（本地优先）
 *
 * 工程切换：窗口复用时主进程会重新 loadURL（带新的 projectId query），
 * 因此每次窗口聚焦到新工程会整体重新加载本页面，documentId 随之更新。
 */
import { computed, ref } from 'vue'
import { WovenCanvas } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'

// 从 location.search 读取工程标识
const params = new URLSearchParams(window.location.search)
const projectId = computed(() => params.get('projectId') || 'default')
const projectName = computed(() => params.get('projectName') || '自由画板')

// 画布背景配置：点阵
const background = { kind: 'dots' as const }

// 持久化配置：按 projectId 隔离每个工程的画布内容（IndexedDB，本地优先）
const store = computed(() => ({
  persistence: {
    documentId: `mira-whiteboard:${projectId.value}`,
  },
}))

// 组件加载失败的兜底（例如 @woven-canvas/vue 未能正确打包时）
const loadError = ref<string | null>(null)
</script>

<template>
  <div class="wb-root">
    <!-- 顶部工程信息条（轻量，不遮挡画布交互） -->
    <div class="wb-topbar">
      <span class="wb-topbar-icon material-icons">dashboard_customize</span>
      <span class="wb-topbar-name">{{ projectName }}</span>
    </div>

    <!-- 错误兜底 -->
    <div v-if="loadError" class="wb-error">
      <div class="wb-error-card">
        <span class="material-icons wb-error-icon">error_outline</span>
        <h2>画布加载失败</h2>
        <p>{{ loadError }}</p>
        <p class="wb-error-hint">请在插件目录执行 <code>pnpm install &amp;&amp; pnpm build</code> 重新构建 dist。</p>
      </div>
    </div>

    <!-- 画布主体 -->
    <WovenCanvas
      v-else
      :background="background"
      :store="store"
      class="wb-canvas"
    />
  </div>
</template>

<style>
/* Material Icons：尝试加载本地字体（主窗口已注册），失败则用文字回退 */
@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: local('Material Icons'), local('MaterialIcons-Regular');
}

html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.wb-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #fafafa;
}

.wb-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.wb-topbar {
  position: absolute;
  top: 12px;
  left: 12px;
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

.wb-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.wb-error-card {
  text-align: center;
  padding: 40px;
  max-width: 420px;
}

.wb-error-icon {
  font-size: 56px;
  color: #ef4444;
  margin-bottom: 12px;
}

.wb-error-card h2 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #333;
}

.wb-error-card p {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

.wb-error-hint {
  margin-top: 16px !important;
  color: #999 !important;
  font-size: 12px !important;
}

.wb-error-card code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
</style>
