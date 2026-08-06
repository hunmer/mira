import type { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, type GenericObject } from 'vee-validate'
import type { SchemaFormEmits, SchemaFormProps } from './types'

/**
 * 基于 vee-validate + zod 的声明式表单 composable。
 *
 * 采用官方推荐的 `useForm()` + `handleSubmit()` 模式（而非 `<Form>` 组件）：
 * - schema 既是数据类型又是校验规则（toTypedSchema 桥接）
 * - handleSubmit 校验通过后 emit('submit', values)，失败 emit('invalid', errors)
 *
 * 注意：该 composable 会建立表单上下文，`<FormField>` 子节点会自动注入并绑定。
 */
export function useSchemaForm<T extends GenericObject>(
  props: SchemaFormProps<T>,
  emit: SchemaFormEmits<T>,
) {
  // useForm 的 initialValues 期望 PartialDeep<T>，T 约束为泛型时 TS 无法证明可赋值，
  // 这里经过 unknown 中转以满足类型检查（运行时 vee-validate 接受 Partial<Record<string, any>>）。
  const { handleSubmit, resetForm, values, errors, meta, setValues, setFieldValue } = useForm<GenericObject>({
    validationSchema: toTypedSchema(props.schema as z.ZodType<T>),
    initialValues: (props.initialValues ?? {}) as unknown as GenericObject,
  })

  // handleSubmit 返回一个事件处理器，可直接绑到 <form @submit="onSubmit">
  const onSubmit = handleSubmit(
    (formValues) => {
      emit('submit', formValues as unknown as T)
    },
    ({ errors: invalidErrors }) => {
      const cleaned: Record<string, string> = {}
      if (invalidErrors) {
        const record = invalidErrors as Record<string, unknown>
        for (const key in record) {
          const msg = record[key]
          if (typeof msg === 'string' && msg) cleaned[key] = msg
        }
      }
      emit('invalid', cleaned)
    },
  )

  return {
    onSubmit,
    resetForm,
    values,
    errors,
    meta,
    setValues,
    setFieldValue,
  }
}
