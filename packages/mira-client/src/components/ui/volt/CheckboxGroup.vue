<template>
    <div class="flex flex-col gap-4">
        <div
            v-for="option in options"
            :key="option.key || option.value"
            class="flex items-center gap-2"
        >
            <Checkbox
                :checked="isChecked(option.value)"
                :disabled="disabled || option.disabled"
                :class="sizeClass"
                @update:checked="toggleValue(option.value, $event)"
                @click.stop
            />
            <label
                :class="[
                    'cursor-pointer select-none',
                    size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base',
                    (disabled || option.disabled) ? 'opacity-60 cursor-not-allowed' : ''
                ]"
                @click="toggleValue(option.value, !isChecked(option.value))"
            >
                {{ option.label }}
            </label>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Checkbox } from '@/components/ui/checkbox';

interface CheckboxOption {
    label: string;
    value: any;
    key?: string;
    disabled?: boolean;
}

interface Props {
    modelValue?: any[];
    options: CheckboxOption[];
    name?: string;
    size?: 'small' | 'normal' | 'large';
    variant?: 'outlined' | 'filled';
    invalid?: boolean;
    disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: () => [],
    name: 'checkbox-group',
    size: 'normal',
    variant: 'outlined',
    invalid: false,
    disabled: false
});

const emit = defineEmits<{
    'update:modelValue': [value: any[]];
    'change': [event: { originalEvent: Event; value: any[] }];
}>();

const sizeClass: Record<string, string> = {
    small: 'h-3.5 w-3.5',
    normal: 'h-4 w-4',
    large: 'h-5 w-5',
};

function isChecked(value: any) {
    return (props.modelValue || []).includes(value);
}

function toggleValue(value: any, checked: boolean) {
    const current = [...(props.modelValue || [])];
    if (checked) {
        if (!current.includes(value)) current.push(value);
    } else {
        const idx = current.indexOf(value);
        if (idx >= 0) current.splice(idx, 1);
    }
    emit('update:modelValue', current);
    emit('change', { originalEvent: new Event('change'), value: current });
}
</script>
