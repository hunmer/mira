import { BubbleMenu } from '@tiptap/vue-3';
import { Bold, Code, Italic, Strike, Underline } from 'lucide-vue-next';
import { useEditorVersion } from '@/composables/useEditorVersion';
const props = defineProps();
const version = useEditorVersion(() => props.editor);
const marks = [
    { name: 'bold', label: '粗体', icon: Bold },
    { name: 'italic', label: '斜体', icon: Italic },
    { name: 'underline', label: '下划线', icon: Underline },
    { name: 'strike', label: '删除线', icon: Strike },
    { name: 'code', label: '行内代码', icon: Code },
];
function toggleMark(name) {
    props.editor.chain().focus().toggleMark(name).run();
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = {}.BubbleMenu;
/** @type {[typeof __VLS_components.BubbleMenu, typeof __VLS_components.BubbleMenu, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    editor: (__VLS_ctx.editor),
    tippyOptions: ({ duration: 120, offset: [0, 8] }),
    ...{ class: "flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg" },
    dataVersion: (__VLS_ctx.version),
}));
const __VLS_2 = __VLS_1({
    editor: (__VLS_ctx.editor),
    tippyOptions: ({ duration: 120, offset: [0, 8] }),
    ...{ class: "flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg" },
    dataVersion: (__VLS_ctx.version),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
for (const [mark] of __VLS_getVForSourceType((__VLS_ctx.marks))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onMousedown: () => { } },
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleMark(mark.name);
            } },
        key: (mark.name),
        type: "button",
        title: (mark.label),
        ...{ class: "flex size-7 items-center justify-center rounded-md transition-colors" },
        ...{ class: (__VLS_ctx.editor.isActive(mark.name) ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50') },
    });
    const __VLS_5 = ((mark.icon));
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
        ...{ class: "size-4" },
    }));
    const __VLS_7 = __VLS_6({
        ...{ class: "size-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-popover']} */ ;
/** @type {__VLS_StyleScopedClasses['p-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-popover-foreground']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['size-7']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
/** @type {__VLS_StyleScopedClasses['size-4']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            BubbleMenu: BubbleMenu,
            version: version,
            marks: marks,
            toggleMark: toggleMark,
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
