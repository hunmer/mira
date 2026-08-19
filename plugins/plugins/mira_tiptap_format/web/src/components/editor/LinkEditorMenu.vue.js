import { BubbleMenu } from '@tiptap/vue-3';
import { Check, ExternalLink, Unlink } from 'lucide-vue-next';
import { onBeforeUnmount, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
const props = defineProps();
const url = ref('');
// 光标进出链接时同步输入框内容
function syncUrl() {
    const href = props.editor.getAttributes('link').href;
    if (typeof href === 'string')
        url.value = href;
}
props.editor.on('selectionUpdate', syncUrl);
onBeforeUnmount(() => props.editor.off('selectionUpdate', syncUrl));
// 仅在光标落入链接（折叠选区）时显示；选中文本时让位给格式气泡菜单
function shouldShow({ editor, from, to }) {
    return editor.isActive('link') && from === to;
}
function apply() {
    const href = url.value.trim();
    if (href) {
        props.editor.chain().focus().extendMarkRange('link').setLink({ href: normalizeUrl(href) }).run();
    }
    else {
        remove();
    }
}
function remove() {
    props.editor.chain().focus().extendMarkRange('link').unsetLink().run();
}
function openExternal() {
    const href = props.editor.getAttributes('link').href;
    if (typeof href === 'string' && href)
        window.open(href, '_blank', 'noopener');
}
function normalizeUrl(value) {
    return /^[a-z]+:/i.test(value) ? value : `https://${value}`;
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
    pluginKey: "linkEditorMenu",
    tippyOptions: ({ duration: 120, offset: [0, 8], interactive: true }),
    shouldShow: (__VLS_ctx.shouldShow),
    ...{ class: "w-72 rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg" },
}));
const __VLS_2 = __VLS_1({
    editor: (__VLS_ctx.editor),
    pluginKey: "linkEditorMenu",
    tippyOptions: ({ duration: 120, offset: [0, 8], interactive: true }),
    shouldShow: (__VLS_ctx.shouldShow),
    ...{ class: "w-72 rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex items-center gap-1.5" },
});
const __VLS_5 = {}.Input;
/** @type {[typeof __VLS_components.Input, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.url),
    placeholder: "编辑链接…",
    ...{ class: "h-8 text-sm" },
}));
const __VLS_7 = __VLS_6({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.url),
    placeholder: "编辑链接…",
    ...{ class: "h-8 text-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
let __VLS_9;
let __VLS_10;
let __VLS_11;
const __VLS_12 = {
    onKeyup: (__VLS_ctx.apply)
};
var __VLS_8;
const __VLS_13 = {}.Button;
/** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
    ...{ 'onClick': {} },
    variant: "ghost",
    size: "icon-sm",
    title: "浏览器打开",
}));
const __VLS_15 = __VLS_14({
    ...{ 'onClick': {} },
    variant: "ghost",
    size: "icon-sm",
    title: "浏览器打开",
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_17;
let __VLS_18;
let __VLS_19;
const __VLS_20 = {
    onClick: (__VLS_ctx.openExternal)
};
__VLS_16.slots.default;
const __VLS_21 = {}.ExternalLink;
/** @type {[typeof __VLS_components.ExternalLink, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({}));
const __VLS_23 = __VLS_22({}, ...__VLS_functionalComponentArgsRest(__VLS_22));
var __VLS_16;
const __VLS_25 = {}.Button;
/** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    ...{ 'onClick': {} },
    variant: "ghost",
    size: "icon-sm",
    title: "移除链接",
}));
const __VLS_27 = __VLS_26({
    ...{ 'onClick': {} },
    variant: "ghost",
    size: "icon-sm",
    title: "移除链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
let __VLS_29;
let __VLS_30;
let __VLS_31;
const __VLS_32 = {
    onClick: (__VLS_ctx.remove)
};
__VLS_28.slots.default;
const __VLS_33 = {}.Unlink;
/** @type {[typeof __VLS_components.Unlink, ]} */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({}));
const __VLS_35 = __VLS_34({}, ...__VLS_functionalComponentArgsRest(__VLS_34));
var __VLS_28;
const __VLS_37 = {}.Button;
/** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
    ...{ 'onClick': {} },
    size: "icon-sm",
    title: "应用",
}));
const __VLS_39 = __VLS_38({
    ...{ 'onClick': {} },
    size: "icon-sm",
    title: "应用",
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
let __VLS_41;
let __VLS_42;
let __VLS_43;
const __VLS_44 = {
    onClick: (__VLS_ctx.apply)
};
__VLS_40.slots.default;
const __VLS_45 = {}.Check;
/** @type {[typeof __VLS_components.Check, ]} */ ;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({}));
const __VLS_47 = __VLS_46({}, ...__VLS_functionalComponentArgsRest(__VLS_46));
var __VLS_40;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['w-72']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-popover']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-popover-foreground']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['h-8']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            BubbleMenu: BubbleMenu,
            Check: Check,
            ExternalLink: ExternalLink,
            Unlink: Unlink,
            Button: Button,
            Input: Input,
            url: url,
            shouldShow: shouldShow,
            apply: apply,
            remove: remove,
            openExternal: openExternal,
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
