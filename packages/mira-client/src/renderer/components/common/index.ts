// 导出所有通用组件
export { default as SearchComponent } from './SearchComponent.vue'
export { default as ToolbarComponent } from './ToolbarComponent.vue'
export { default as MediaCardComponent } from './MediaCardComponent.vue'
export { default as SidebarNavComponent } from './SidebarNavComponent.vue'

// 新增的高级组件
export { default as VirtualScrollComponent } from './VirtualScrollComponent.vue'
export { default as LazyImageComponent } from './LazyImageComponent.vue'
export { default as ThemeSwitcherComponent } from './ThemeSwitcherComponent.vue'
export { default as AnimationComponent } from './AnimationComponent.vue'
export { default as ExpandableButton } from './ExpandableButton.vue'
export { default as ResponsiveLayoutComponent } from './ResponsiveLayoutComponent.vue'
export { default as AccessibilityProvider } from './AccessibilityProvider.vue'
export { default as PageSlide } from './PageSlide.vue'

// 文件上传组件
export { default as MultiTabFileUpload } from './MultiTabFileUpload.vue'

// 导出组件相关类型
export type {
  SearchComponentProps,
  SearchFilter,
  ToolbarButton,
  ToolbarGroup,
  ToolbarComponentProps,
  MediaCardComponentProps,
  ExtendedFileInfo,
  NavigationItem,
  SidebarNavComponentProps,
  SearchEvents,
  ToolbarEvents,
  MediaCardEvents,
  SidebarNavEvents
} from '../../types/components'
