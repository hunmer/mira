import type { App } from 'vue'
import './assets/tailwind.css'
import SaveLocationDialog from './SaveLocationDialog.vue'
import SaveLocationForm from './SaveLocationForm.vue'
import * as attachment from './components/ui/attachment'
import * as button from './components/ui/button'
import * as combobox from './components/ui/combobox'
import * as dialog from './components/ui/dialog'
import * as input from './components/ui/input'
import * as label from './components/ui/label'
import * as progress from './components/ui/progress'
import * as select from './components/ui/select'
import * as tabs from './components/ui/tabs'

export { default as SaveLocationDialog } from './SaveLocationDialog.vue'
export { default as SaveLocationForm } from './SaveLocationForm.vue'
export type { SaveLocation } from './types'
export * from './components/ui/attachment'
export * from './components/ui/button'
export * from './components/ui/combobox'
export * from './components/ui/dialog'
export * from './components/ui/input'
export * from './components/ui/label'
export * from './components/ui/progress'
export * from './components/ui/select'
export * from './components/ui/tabs'

const components = {
  SaveLocationDialog,
  SaveLocationForm,
  ...attachment,
  ...button,
  ...combobox,
  ...dialog,
  ...input,
  ...label,
  ...progress,
  ...select,
  ...tabs,
}

export type { components }

/** CDN/UMD 用：app.use(MiraPluginUI) 后全局注册所有组件 */
const plugin = {
  install (app: App) {
    for (const [name, component] of Object.entries(components)) app.component(name, component)
  },
}

export default plugin
