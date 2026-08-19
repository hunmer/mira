import { computed } from 'vue';
import { Separator } from 'reka-ui';
import { cn } from '@/lib/utils';
const props = withDefaults(defineProps(), {
    orientation: 'horizontal',
    decorative: true,
});
const delegatedProps = computed(() => {
    const { class: _omit, ...rest } = props;
    return rest;
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    orientation: 'horizontal',
    decorative: true,
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = {}.Separator;
/** @type {[typeof __VLS_components.Separator, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    dataSlot: "separator",
    ...(__VLS_ctx.delegatedProps),
    ...{ class: (__VLS_ctx.cn('bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px', props.class)) },
}));
const __VLS_2 = __VLS_1({
    dataSlot: "separator",
    ...(__VLS_ctx.delegatedProps),
    ...{ class: (__VLS_ctx.cn('bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px', props.class)) },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
var __VLS_3;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Separator: Separator,
            cn: cn,
            delegatedProps: delegatedProps,
        };
    },
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
