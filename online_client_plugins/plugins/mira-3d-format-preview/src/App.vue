<script setup lang="ts">
import { computed, ref } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import ModelScene from './ModelScene.vue'

const params = new URLSearchParams(window.location.search)
const fileName = ref(params.get('fileName') || '3D model')
const fileUrl = ref(params.get('fileUrl') || '')
const mimeType = ref(params.get('mimeType') || '')
const loadError = ref('')
const isLoading = ref(Boolean(fileUrl.value))
const modelPath = computed(() => fileUrl.value)
const isLocalFile = computed(() => modelPath.value.startsWith('file:'))

function onModelLoaded() {
  isLoading.value = false
  loadError.value = ''
}

function onModelError(error: unknown) {
  isLoading.value = false
  loadError.value = error instanceof Error ? error.message : '无法加载模型，请检查文件 URL 或权限'
}

function closeWindow() {
  window.close()
}
</script>

<template>
  <main class="viewer-shell">
    <header class="viewer-header">
      <div>
        <p class="eyebrow">MIRA / TRESJS</p>
        <h1>{{ fileName }}</h1>
        <p class="metadata">{{ mimeType || 'model/gltf-binary' }}<span v-if="isLocalFile"> · 本地文件</span></p>
      </div>
      <button class="close-button" type="button" @click="closeWindow">关闭窗口</button>
    </header>
    <section class="viewer-stage">
      <TresCanvas v-if="modelPath" clear-color="#0b121b" shadows>
        <TresPerspectiveCamera :position="[4, 3, 6]" :look-at="[0, 0, 0]" />
        <OrbitControls make-default />
        <ModelScene :path="modelPath" @loaded="onModelLoaded" @error="onModelError" />
        <TresAmbientLight :intensity="1.2" />
        <TresDirectionalLight :position="[4, 6, 4]" :intensity="2" cast-shadow />
        <TresGridHelper :args="[10, 10, '#294458', '#162633']" />
      </TresCanvas>
      <div v-else class="empty-state"><strong>未提供模型路径</strong><span>请从媒体网格双击 GLB/GLTF 文件打开。</span></div>
      <div v-if="isLoading" class="status-pill">正在加载模型...</div>
      <div v-if="loadError" class="error-banner">{{ loadError }}</div>
    </section>
    <footer class="viewer-footer"><span>拖拽旋转 · 滚轮缩放 · 右键平移</span><span class="path-label">{{ modelPath || '等待文件' }}</span></footer>
  </main>
</template>
