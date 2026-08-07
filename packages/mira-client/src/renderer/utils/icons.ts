// 状态图标统一注册入口
// 所有 empty / loading / error 占位图标的唯一硬编码入口，避免各组件重复写资源路径。
// 图标文件位于 packages/mira-client/assets/img_icons/，通过 Vite 静态资源 import 引入。
import empty_placeholder from '../../../assets/img_icons/empty_placeholder.webp'
import loading from '../../../assets/img_icons/loading.webp'
import img_load_failed from '../../../assets/img_icons/img_load_failed.webp'
import errorIcon from '../../../assets/img_icons/error.webp'
import no_result from '../../../assets/img_icons/no_result.webp'
import file_losed from '../../../assets/img_icons/file_losed.webp'
import not_found_404 from '../../../assets/img_icons/404.webp'
import busy from '../../../assets/img_icons/busy.webp'
import done from '../../../assets/img_icons/done.webp'

/** 状态图标的逻辑名称，组件层只引用此字符串，不接触文件路径 */
export type IconName =
  | 'empty'
  | 'loading'
  | 'load_failed'
  | 'error'
  | 'no_result'
  | 'file_lost'
  | 'not_found'
  | 'busy'
  | 'done'

/** 逻辑名称到解析后资源 URL 的映射 */
export const ICONS: Record<IconName, string> = {
  empty: empty_placeholder,
  loading,
  load_failed: img_load_failed,
  error: errorIcon,
  no_result,
  file_lost: file_losed,
  not_found: not_found_404,
  busy,
  done,
}

/** 兜底解析：未知名称回退到通用空状态图标 */
export const resolveIcon = (name: IconName): string => ICONS[name] ?? ICONS.empty
