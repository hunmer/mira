import { DropdownMenuLabel } from 'reka-ui';
import { computed } from 'vue';
import { cn } from '@/lib/utils';
const props = defineProps();
const delegated = computed(() => {
    const { class: _omit, inset: _i, ...rest } = props;
    return rest;
});
const insetClass = computed(() => (props.inset ? 'pl-8' : ''));
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = {}.DropdownMenuLabel;
/** @type {[typeof __VLS_components.DropdownMenuLabel, typeof __VLS_components.DropdownMenuLabel, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...(__VLS_ctx.delegated),
    ...{ class: (__VLS_ctx.cn('px-2 py-1.5 text-sm font-medium', __VLS_ctx.insetClass, props.class)) },
}));
const __VLS_2 = __VLS_1({
    ...(__VLS_ctx.delegated),
    ...{ class: (__VLS_ctx.cn('px-2 py-1.5 text-sm font-medium', __VLS_ctx.insetClass, props.class)) },
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
            DropdownMenuLabel: DropdownMenuLabel,
            cn: cn,
            delegated: delegated,
            insetClass: insetClass,
        };
    },
    __typeProps: {},
});
const __VLS_component = (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
export default {};
; /* PartiallyEnd: #4569/main.vue */
