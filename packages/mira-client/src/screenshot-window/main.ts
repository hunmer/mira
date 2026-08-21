import { createApp, ref } from 'vue'
import { createPinia } from 'pinia'
import ScreenshotDialog from '../renderer/components/business/ScreenshotDialog.vue'
import { useSettingsStore } from '../renderer/stores/settings'
import '../renderer/assets/main.css'
import './style.css'

const app = createApp({
  components: { ScreenshotDialog },
  setup() {
    const visible = ref(true)
    const completed = ref(false)
    const settingsStore = useSettingsStore()
    void settingsStore.loadSettings()
    async function handleCaptured(file: File) {
      completed.value = true
      const data = await file.arrayBuffer()
      await window.electronAPI.invoke('screenshot:complete', { data, name: file.name, mime: file.type })
    }
    async function handleVisibleChange(value: boolean) {
      visible.value = value
      if (!value && !completed.value) await window.electronAPI.invoke('screenshot:cancel')
    }
    return { visible, handleCaptured, handleVisibleChange }
  },
  template: '<ScreenshotDialog :visible="visible" @update:visible="handleVisibleChange" @captured="handleCaptured" />',
})
app.use(createPinia())
app.mount('#app')
