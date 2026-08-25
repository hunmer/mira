import type { App } from 'vue'
import './assets/tailwind.css'
import BatchUploadDialog from './BatchUploadDialog.vue'
import BatchUploadForm from './BatchUploadForm.vue'
import DeviceListPicker from './DeviceListPicker.vue'
import Dropzone from './library/Dropzone.vue'
import FileInfoForm from './FileInfoForm.vue'
import LibrarySelect from './library/LibrarySelect.vue'
import SaveLocationDialog from './SaveLocationDialog.vue'
import SaveLocationForm from './SaveLocationForm.vue'
import * as attachment from './components/ui/attachment'
import * as alertDialog from './components/ui/alert-dialog'
import * as button from './components/ui/button'
import * as combobox from './components/ui/combobox'
import * as dialog from './components/ui/dialog'
import * as empty from './components/ui/empty'
import * as input from './components/ui/input'
import * as label from './components/ui/label'
import * as menubar from './components/ui/menubar'
import * as popover from './components/ui/popover'
import * as progress from './components/ui/progress'
import * as select from './components/ui/select'
import * as spinner from './components/ui/spinner'
import * as tabs from './components/ui/tabs'
import * as tagsInput from './components/ui/tags-input'

export { default as BatchUploadDialog } from './BatchUploadDialog.vue'
export { default as BatchUploadForm } from './BatchUploadForm.vue'
export { default as DeviceListPicker } from './DeviceListPicker.vue'
export { default as Dropzone } from './library/Dropzone.vue'
export { default as FileInfoForm } from './FileInfoForm.vue'
export { default as SaveLocationDialog } from './SaveLocationDialog.vue'
export { default as SaveLocationForm } from './SaveLocationForm.vue'
export { default as LibrarySelect } from './library/LibrarySelect.vue'
export type { BatchUploadFileService, BatchUploadFileMeta, BatchUploadPayload, DeviceListItem, DeviceListPickerServices, SaveLocation } from './types'
export type { LibrarySelectOption, LibrarySelectServer } from './library/types'
export * from './components/ui/attachment'
export * from './components/ui/alert-dialog'
export * from './components/ui/button'
export * from './components/ui/combobox'
export * from './components/ui/dialog'
export * from './components/ui/empty'
export * from './components/ui/input'
export * from './components/ui/label'
export * from './components/ui/menubar'
export * from './components/ui/popover'
export * from './components/ui/progress'
export * from './components/ui/select'
export * from './components/ui/spinner'
export * from './components/ui/tabs'
export * from './components/ui/tags-input'

const components = {
  BatchUploadDialog,
  BatchUploadForm,
  DeviceListPicker,
  Dropzone,
  FileInfoForm,
  SaveLocationDialog,
  SaveLocationForm,
  LibrarySelect,
  ...attachment,
  ...alertDialog,
  ...button,
  ...combobox,
  ...dialog,
  ...empty,
  ...input,
  ...label,
  ...menubar,
  ...popover,
  ...progress,
  ...select,
  ...spinner,
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
