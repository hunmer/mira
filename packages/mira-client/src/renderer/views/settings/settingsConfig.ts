// 设置分类配置
export interface SettingSection {
  id: string
  name: string
  icon: string
}

export const settingSections: SettingSection[] = [
  { id: 'general', name: 'General', icon: 'settings' },
  { id: 'notifications', name: 'Notifications', icon: 'notifications' },
  { id: 'import', name: '导入选项', icon: 'upload_file' },
  { id: 'floating-ball', name: '悬浮球', icon: 'bubble_chart' },
  { id: 'plugins', name: 'Plugins', icon: 'extension' },
  { id: 'data', name: 'Data', icon: 'storage' },
  { id: 'playground', name: 'Playground', icon: 'science' }
]

// 语言选项配置
export const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
  { label: '繁體中文', value: 'zh-TW' },
  { label: '日本語', value: 'ja-JP' }
]

// 主题选项配置
export const themeOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '自动', value: 'auto' }
]

