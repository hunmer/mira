// 设置分类配置
// name 字段存的是 i18n key（settings.sections.{id}），消费处需用 t() 渲染
export interface SettingSection {
  id: string
  name: string // i18n key: settings.sections.{id}
  icon: string
}

export const settingSections: SettingSection[] = [
  { id: 'general', name: 'settings.sections.general', icon: 'settings' },
  { id: 'library', name: 'settings.sections.library', icon: 'perm_media' },
  { id: 'notifications', name: 'settings.sections.notifications', icon: 'notifications' },
  { id: 'import', name: 'settings.sections.import', icon: 'upload_file' },
  { id: 'floating-ball', name: 'settings.sections.floatingBall', icon: 'bubble_chart' },
  { id: 'plugins', name: 'settings.sections.plugins', icon: 'extension' },
  { id: 'network', name: 'settings.sections.network', icon: 'lan' },
  { id: 'data', name: 'settings.sections.data', icon: 'storage' }
]

// 语言选项配置（仅保留简体中文与 English）
export const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
]

// 主题选项配置（label 存 i18n key: settings.themeLight/Dark/Auto）
export const themeOptions = [
  { label: 'settings.themeLight', value: 'light' },
  { label: 'settings.themeDark', value: 'dark' },
  { label: 'settings.themeAuto', value: 'auto' }
]

