import type { InjectionKey, Ref } from "vue"

/** ColorPicker 根组件 provide 的上下文 */
export interface ColorPickerContextValue {
  /** 当前颜色值（任意 CSS 颜色字符串，建议 hex） */
  color: Readonly<Ref<string>>
  /** 更新颜色值 */
  setColor: (value: string) => void
  /** 是否禁用整个选择器 */
  disabled: Readonly<Ref<boolean>>
}

export const ColorPickerContextKey: InjectionKey<ColorPickerContextValue> = Symbol("color-picker")
