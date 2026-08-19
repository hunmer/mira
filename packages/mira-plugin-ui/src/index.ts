import type { App } from 'vue'
import './assets/tailwind.css'
import LibrarySelect from './library/LibrarySelect.vue'
import SaveLocationDialog from './SaveLocationDialog.vue'
import SaveLocationForm from './SaveLocationForm.vue'
import * as attachment from './components/ui/attachment'
import * as alertDialog from './components/ui/alert-dialog'
import * as button from './components/ui/button'
import * as combobox from './components/ui/combobox'
import * as dialog from './components/ui/dialog'
import * as input from './components/ui/input'
import * as label from './components/ui/label'
import * as popover from './components/ui/popover'
import * as progress from './components/ui/progress'
import * as select from './components/ui/select'
import * as tabs from './components/ui/tabs'
import * as tagsInput from './components/ui/tags-input'

export { default as SaveLocationDialog } from './SaveLocationDialog.vue'
export { default as SaveLocationForm } from './SaveLocationForm.vue'
export { default as LibrarySelect } from './library/LibrarySelect.vue'
export type { SaveLocation } from './types'
export type { LibrarySelectOption, LibrarySelectServer } from './library/types'
export * from './components/ui/attachment'
export * from './components/ui/alert-dialog'
export * from './components/ui/button'
export * from './components/ui/combobox'
export * from './components/ui/dialog'
export * from './components/ui/input'
export * from './components/ui/label'
export * from './components/ui/popover'
export * from './components/ui/progress'
export * from './components/ui/select'
export * from './components/ui/tabs'
export * from './components/ui/tags-input'

const components = {
  SaveLocationDialog,
  SaveLocationForm,
  LibrarySelect,
  ...attachment,
  ...alertDialog,
  ...button,
  ...combobox,
  ...dialog,
  ...input,
  ...label,
  ...popover,
  ...progress,
  ...select,
  ...tabs,
  ...tagsInput,
}

export type { components }

/** CDN/UMD 用：app.use(MiraPluginUI) 后全局注册所有组件 */
const plugin = {
  install (app: App) {
    for (const [name, component] of Object.entries(components)) app.component(name, component)
  },
}

export default plugin
