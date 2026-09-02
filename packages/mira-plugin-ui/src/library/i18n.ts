/**
 * 兜底 t 转发:词典与包级 i18n 单例(zh/en)统一收敛到 src/i18n.ts,
 * 宿主传 t(vue-i18n 等)仍可接管文案;未传时内置文案随包级 setLocale 切换。
 */
export { createLibraryTreeT } from '../i18n'
