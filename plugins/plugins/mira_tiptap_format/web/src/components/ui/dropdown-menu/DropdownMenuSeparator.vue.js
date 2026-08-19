import { DropdownMenuSeparator } from 'reka-ui';
import { computed } from 'vue';
import { cn } from '@/lib/utils';
const props = defineProps();
const delegated = computed(() => {
    const { class: _omit, ...rest } = props;
    return rest;
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = {}.DropdownMenuSeparator;
/** @type {[typeof __VLS_components.DropdownMenuSeparator, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...(__VLS_ctx.delegated),
    ...{ class: (__VLS_ctx.cn('-mx-1 my-1 h-px bg-border', props.class)) },
}));
const __VLS_2 = __VLS_1({
    ...(__VLS_ctx.delegated),
    ...{ class: (__VLS_ctx.cn('-mx-1 my-1 h-px bg-border', props.class)) },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
var __VLS_3;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DropdownMenuSeparator: DropdownMenuSeparator,
            cn: cn,
            delegated: delegated,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
