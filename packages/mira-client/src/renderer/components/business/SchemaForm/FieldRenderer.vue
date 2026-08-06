<script setup lang="ts">
import { computed } from 'vue'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import type { SchemaField, SelectOption } from './types'

const props = defineProps<{
  field: SchemaField
}>()

const isTextType = computed(() => ['text', 'password', 'email'].includes(props.field.type))
const inputType = computed(() => {
  switch (props.field.type) {
    case 'password': return 'password'
    case 'email': return 'email'
    default: return 'text'
  }
})

// 把 SelectOption 的 value 统一转成字符串（SelectItem.value 接受 string）
const optionValue = (opt: SelectOption) => String(opt.value)
</script>

<template>
  <FormField v-slot="{ value, handleChange, setValue }" :name="field.name">
    <FormItem :class="field.colSpan === 2 ? 'md:col-span-2' : ''">
      <FormLabel>
        {{ field.label }}
        <span v-if="field.required" class="text-destructive">*</span>
      </FormLabel>

      <!-- 文本类：text / password / email -->
      <FormControl v-if="isTextType">
        <Input
          :type="inputType"
          :model-value="value as string"
          :placeholder="field.placeholder"
          :disabled="field.disabled"
          @update:model-value="handleChange"
        />
      </FormControl>

      <!-- 数字 -->
      <FormControl v-else-if="field.type === 'number'">
        <Input
          type="number"
          :model-value="value as number | undefined"
          :placeholder="field.placeholder"
          :disabled="field.disabled"
          @update:model-value="(v: string | number) => setValue(v === '' || v === undefined ? undefined : Number(v))"
        />
      </FormControl>

      <!-- 多行文本 -->
      <FormControl v-else-if="field.type === 'textarea'">
        <Textarea
          :model-value="value as string"
          :placeholder="field.placeholder"
          :disabled="field.disabled"
          @update:model-value="handleChange"
        />
      </FormControl>

      <!-- 下拉选择 -->
      <Select
        v-else-if="field.type === 'select'"
        :model-value="value !== undefined && value !== null ? String(value) : undefined"
        :disabled="field.disabled"
        @update:model-value="(v: any) => setValue(v)"
      >
        <FormControl>
          <SelectTrigger class="w-full">
            <SelectValue :placeholder="field.placeholder || '请选择'" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem
            v-for="opt in field.options || []"
            :key="optionValue(opt)"
            :value="optionValue(opt)"
            :disabled="opt.disabled"
          >
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <!-- 单选组 -->
      <FormControl v-else-if="field.type === 'radio-group'">
        <RadioGroup
          :model-value="value !== undefined && value !== null ? String(value) : undefined"
          :disabled="field.disabled"
          @update:model-value="(v: any) => setValue(v)"
        >
          <div v-for="opt in field.options || []" :key="optionValue(opt)" class="flex items-center gap-2">
            <RadioGroupItem :id="`${field.name}-${optionValue(opt)}`" :value="optionValue(opt)" :disabled="opt.disabled" />
            <Label :for="`${field.name}-${optionValue(opt)}`" class="font-normal">{{ opt.label }}</Label>
          </div>
        </RadioGroup>
      </FormControl>

      <!-- 开关 -->
      <div v-else-if="field.type === 'switch'" class="flex items-center gap-2">
        <FormControl>
          <Switch
            :model-value="!!value"
            :disabled="field.disabled"
            @update:model-value="(v: any) => setValue(!!v)"
          />
        </FormControl>
      </div>

      <!-- 单布尔复选框 -->
      <div v-else-if="field.type === 'checkbox'" class="flex items-center gap-2">
        <FormControl>
          <Checkbox
            :model-value="!!value"
            :disabled="field.disabled"
            @update:model-value="(v: any) => setValue(!!v)"
          />
        </FormControl>
      </div>

      <!-- 多选复选框组 -> string[] -->
      <div v-else-if="field.type === 'checkbox-group'" class="flex flex-col gap-2">
        <template v-for="opt in field.options || []" :key="optionValue(opt)">
          <div class="flex items-center gap-2">
            <Checkbox
              :id="`${field.name}-${optionValue(opt)}`"
              :model-value="Array.isArray(value) ? value.map(String).includes(optionValue(opt)) : false"
              :disabled="field.disabled || opt.disabled"
              @update:model-value="(checked: any) => {
                const arr: string[] = Array.isArray(value) ? value.map(String) : []
                const next = checked
                  ? [...new Set([...arr, optionValue(opt)])]
                  : arr.filter(v => v !== optionValue(opt))
                setValue(next)
              }"
            />
            <Label :for="`${field.name}-${optionValue(opt)}`" class="font-normal">{{ opt.label }}</Label>
          </div>
        </template>
      </div>

      <!-- 滑块 -->
      <FormControl v-else-if="field.type === 'slider'">
        <Slider
          :model-value="Array.isArray(value) ? value : (value !== undefined && value !== null ? [value as number] : [])"
          :min="field.min ?? 0"
          :max="field.max ?? 100"
          :step="field.step ?? 1"
          :disabled="field.disabled"
          @update:model-value="(v: any) => setValue(Array.isArray(v) ? v : [v])"
        />
      </FormControl>

      <!-- 日期 -->
      <FormControl v-else-if="field.type === 'date'">
        <DatePicker
          :model-value="value as Date | string | undefined"
          show-icon
          :disabled="field.disabled"
          @update:model-value="(v: Date | string) => setValue(v)"
        />
      </FormControl>

      <FormDescription v-if="field.description">
        {{ field.description }}
      </FormDescription>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
