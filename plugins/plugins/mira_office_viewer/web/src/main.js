import { createApp } from 'vue'
import '@vue-office/docx/lib/v3/index.css'
import '@vue-office/excel/lib/v3/index.css'
const query = new URLSearchParams(location.search)
const format = (query.get('format') || '').toLowerCase()
const fileUrl = query.get('fileUrl') || ''
const status = document.getElementById('status')
const viewer = document.getElementById('viewer')
const fail = (error) => {
  status.textContent = `文档预览失败：${error?.message || error}`
  parent.postMessage({ type: 'mira-office-preview-error', fileId: query.get('fileId') || '', message: status.textContent }, '*')
}

const components = {
  docx: () => import('@vue-office/docx/lib/v3/index.js'),
  xlsx: () => import('@vue-office/excel/lib/v3/index.js'),
  pptx: () => import('@vue-office/pptx/lib/v3/index.js'),
  pdf: () => import('@vue-office/pdf/lib/v3/index.js'),
}

if (!fileUrl || !components[format]) fail(new Error('缺少文件地址或不支持的文件格式'))
else components[format]().then(({ default: Component }) => {
  status.remove()
  createApp(Component, { src: fileUrl, fileUrl }).mount(viewer)
}).catch(fail)
