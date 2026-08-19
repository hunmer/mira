import { DropdownMenuItem, useForwardPropsEmits } from 'reka-ui';
import { computed } from 'vue';
import { cn } from '@/lib/utils';
const props = defineProps();
const emits = defineEmits();
const delegated = computed(() => {
    const { class: _omit, inset: _i, ...rest } = props;
    return rest;
});
const forwarded = useForwardPropsEmits(delegated, emits);
// class 字符串放在 script 中，避免模板属性内出现双引号嵌套（含 [class*="size-"]）
const itemClass = computed(() => cn('relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors', 'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', '[&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 [&_svg]:shrink-0', props.inset && 'pl-8', props.class));
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = {}.DropdownMenuItem;
/** @type {[typeof __VLS_components.DropdownMenuItem, typeof __VLS_components.DropdownMenuItem, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...(__VLS_ctx.forwarded),
    ...{ class: (__VLS_ctx.itemClass) },
}));
const __VLS_2 = __VLS_1({
    ...(__VLS_ctx.forwarded),
    ...{ class: (__VLS_ctx.itemClass) },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
var __VLS_5 = {};
var __VLS_3;
// @ts-ignore
var __VLS_6 = __VLS_5;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DropdownMenuItem: DropdownMenuItem,
            forwarded: forwarded,
            itemClass: itemClass,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
const __VLS_component = (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
export default {};
; /* PartiallyEnd: #4569/main.vue */
