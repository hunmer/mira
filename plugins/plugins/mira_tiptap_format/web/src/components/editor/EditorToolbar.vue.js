import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, Check, CheckSquare, ChevronDown, Code, Code2, Heading1, Heading2, Heading3, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, RemoveFormatting, Save, Strike, Type, Underline, Undo2, } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useEditorVersion } from '@/composables/useEditorVersion';
const props = defineProps();
const emit = defineEmits();
// 依赖 version，使下方所有 isActive/can 计算随 transaction 刷新
const version = useEditorVersion(() => props.editor);
const editor = computed(() => { void version.value; return props.editor; });
/* ---------- 转换为（Turn into） ---------- */
const blockItems = [
    { key: 'paragraph', label: '文本', icon: Type },
    { key: 'h1', label: '标题 1', icon: Heading1 },
    { key: 'h2', label: '标题 2', icon: Heading2 },
    { key: 'h3', label: '标题 3', icon: Heading3 },
    { key: 'taskList', label: '待办列表', icon: CheckSquare },
    { key: 'bulletList', label: '无序列表', icon: List },
    { key: 'orderedList', label: '有序列表', icon: ListOrdered },
    { key: 'blockquote', label: '引用', icon: Quote },
    { key: 'codeBlock', label: '代码块', icon: Code2 },
    { key: 'hr', label: '分割线', icon: Minus },
];
const blockLabel = computed(() => {
    const e = editor.value;
    if (e.isActive('heading', { level: 1 }))
        return '标题 1';
    if (e.isActive('heading', { level: 2 }))
        return '标题 2';
    if (e.isActive('heading', { level: 3 }))
        return '标题 3';
    if (e.isActive('taskList'))
        return '待办列表';
    if (e.isActive('bulletList'))
        return '无序列表';
    if (e.isActive('orderedList'))
        return '有序列表';
    if (e.isActive('blockquote'))
        return '引用';
    if (e.isActive('codeBlock'))
        return '代码块';
    return '文本';
});
function isBlockActive(key) {
    const e = editor.value;
    switch (key) {
        case 'paragraph': return e.isActive('paragraph') && blockLabel.value === '文本';
        case 'h1': return e.isActive('heading', { level: 1 });
        case 'h2': return e.isActive('heading', { level: 2 });
        case 'h3': return e.isActive('heading', { level: 3 });
        case 'taskList': return e.isActive('taskList');
        case 'bulletList': return e.isActive('bulletList');
        case 'orderedList': return e.isActive('orderedList');
        case 'blockquote': return e.isActive('blockquote');
        case 'codeBlock': return e.isActive('codeBlock');
        default: return false;
    }
}
function setBlock(key) {
    const chain = props.editor.chain().focus();
    switch (key) {
        case 'paragraph':
            chain.clearNodes().setParagraph().run();
            break;
        case 'h1':
            chain.clearNodes().setNode('heading', { level: 1 }).run();
            break;
        case 'h2':
            chain.clearNodes().setNode('heading', { level: 2 }).run();
            break;
        case 'h3':
            chain.clearNodes().setNode('heading', { level: 3 }).run();
            break;
        case 'taskList':
            chain.clearNodes().toggleTaskList().run();
            break;
        case 'bulletList':
            chain.clearNodes().toggleBulletList().run();
            break;
        case 'orderedList':
            chain.clearNodes().toggleOrderedList().run();
            break;
        case 'blockquote':
            chain.clearNodes().toggleBlockquote().run();
            break;
        case 'codeBlock':
            chain.clearNodes().toggleCodeBlock().run();
            break;
        case 'hr':
            chain.setHorizontalRule().run();
            break;
    }
}
/* ---------- 行内标记 ---------- */
const marks = [
    { name: 'bold', label: '粗体 (Ctrl+B)', icon: Bold, run: chain => chain.toggleBold() },
    { name: 'italic', label: '斜体 (Ctrl+I)', icon: Italic, run: chain => chain.toggleItalic() },
    { name: 'underline', label: '下划线 (Ctrl+U)', icon: Underline, run: chain => chain.toggleUnderline() },
    { name: 'strike', label: '删除线', icon: Strike, run: chain => chain.toggleStrike() },
    { name: 'code', label: '行内代码', icon: Code, run: chain => chain.toggleCode() },
];
function runMark(mark) {
    mark.run(props.editor.chain().focus()).run();
}
/* ---------- 颜色与高亮 ---------- */
const textColors = [
    { label: '默认', value: '' },
    { label: '灰色', value: '#6B7280' },
    { label: '棕色', value: '#9B6B53' },
    { label: '红色', value: '#DC2626' },
    { label: '橙色', value: '#EA580C' },
    { label: '黄色', value: '#CA8A04' },
    { label: '绿色', value: '#16A34A' },
    { label: '蓝色', value: '#2563EB' },
    { label: '紫色', value: '#7C3AED' },
];
const highlightColors = [
    { label: '无背景', value: '' },
    { label: '灰色', value: '#F1F1EF' },
    { label: '红色', value: '#FDEBEC' },
    { label: '橙色', value: '#FBEBDD' },
    { label: '黄色', value: '#FBF3DB' },
    { label: '绿色', value: '#EDF3EC' },
    { label: '蓝色', value: '#E7F3F8' },
    { label: '紫色', value: '#F6F3F9' },
    { label: '粉色', value: '#FAF1F5' },
];
function applyTextColor(value) {
    const chain = props.editor.chain().focus();
    if (value)
        chain.setColor(value).run();
    else
        chain.unsetColor().run();
}
function applyHighlight(value) {
    const chain = props.editor.chain().focus();
    if (value)
        chain.setHighlight({ color: value }).run();
    else
        chain.unsetHighlight().run();
}
/* ---------- 对齐 ---------- */
const aligns = [
    { key: 'left', label: '左对齐', icon: AlignLeft },
    { key: 'center', label: '居中', icon: AlignCenter },
    { key: 'right', label: '右对齐', icon: AlignRight },
    { key: 'justify', label: '两端对齐', icon: AlignJustify },
];
function setAlign(key) {
    props.editor.chain().focus().setTextAlign(key).run();
}
/* ---------- 链接 ---------- */
const linkPopoverOpen = ref(false);
const linkUrl = ref('');
function onLinkPopoverChange(open) {
    linkPopoverOpen.value = open;
    if (open) {
        const href = editor.value.getAttributes('link').href;
        linkUrl.value = typeof href === 'string' ? href : '';
    }
}
function applyLink() {
    const href = linkUrl.value.trim();
    if (href) {
        props.editor.chain().focus().setLink({ href: /^[a-z]+:/i.test(href) ? href : `https://${href}` }).run();
    }
    else {
        props.editor.chain().focus().unsetLink().run();
    }
    linkPopoverOpen.value = false;
}
const activeBtn = 'bg-accent text-accent-foreground';
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "sticky top-0 z-20 flex items-center gap-1 border-b bg-background/85 px-3 py-1.5 backdrop-blur" },
});
const __VLS_0 = {}.DropdownMenu;
/** @type {[typeof __VLS_components.DropdownMenu, typeof __VLS_components.DropdownMenu, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.DropdownMenuTrigger;
/** @type {[typeof __VLS_components.DropdownMenuTrigger, typeof __VLS_components.DropdownMenuTrigger, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    asChild: true,
}));
const __VLS_6 = __VLS_5({
    asChild: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
const __VLS_8 = {}.Button;
/** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    variant: "ghost",
    size: "sm",
    ...{ class: "gap-1 px-2.5 font-medium" },
}));
const __VLS_10 = __VLS_9({
    variant: "ghost",
    size: "sm",
    ...{ class: "gap-1 px-2.5 font-medium" },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
(__VLS_ctx.blockLabel);
const __VLS_12 = {}.ChevronDown;
/** @type {[typeof __VLS_components.ChevronDown, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ class: "size-3.5 opacity-60" },
}));
const __VLS_14 = __VLS_13({
    ...{ class: "size-3.5 opacity-60" },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
var __VLS_11;
var __VLS_7;
const __VLS_16 = {}.DropdownMenuContent;
/** @type {[typeof __VLS_components.DropdownMenuContent, typeof __VLS_components.DropdownMenuContent, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    align: "start",
    ...{ class: "w-48" },
}));
const __VLS_18 = __VLS_17({
    align: "start",
    ...{ class: "w-48" },
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.DropdownMenuLabel;
/** @type {[typeof __VLS_components.DropdownMenuLabel, typeof __VLS_components.DropdownMenuLabel, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
var __VLS_23;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.blockItems))) {
    const __VLS_24 = {}.DropdownMenuItem;
    /** @type {[typeof __VLS_components.DropdownMenuItem, typeof __VLS_components.DropdownMenuItem, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onClick': {} },
        key: (item.key),
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onClick': {} },
        key: (item.key),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_28;
    let __VLS_29;
    let __VLS_30;
    const __VLS_31 = {
        onClick: (...[$event]) => {
            __VLS_ctx.setBlock(item.key);
        }
    };
    __VLS_27.slots.default;
    const __VLS_32 = ((item.icon));
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ class: "size-4 text-muted-foreground" },
    }));
    const __VLS_34 = __VLS_33({
        ...{ class: "size-4 text-muted-foreground" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    (item.label);
    if (__VLS_ctx.isBlockActive(item.key)) {
        const __VLS_36 = {}.Check;
        /** @type {[typeof __VLS_components.Check, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            ...{ class: "ml-auto size-4" },
        }));
        const __VLS_38 = __VLS_37({
            ...{ class: "ml-auto size-4" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    }
    var __VLS_27;
}
var __VLS_19;
var __VLS_3;
const __VLS_40 = {}.Separator;
/** @type {[typeof __VLS_components.Separator, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    orientation: "vertical",
    ...{ class: "mx-1 !h-5" },
}));
const __VLS_42 = __VLS_41({
    orientation: "vertical",
    ...{ class: "mx-1 !h-5" },
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
for (const [mark] of __VLS_getVForSourceType((__VLS_ctx.marks))) {
    const __VLS_44 = {}.Button;
    /** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        ...{ 'onClick': {} },
        key: (mark.name),
        variant: "ghost",
        size: "icon-sm",
        title: (mark.label),
        ...{ class: (__VLS_ctx.editor.isActive(mark.name) && __VLS_ctx.activeBtn) },
    }));
    const __VLS_46 = __VLS_45({
        ...{ 'onClick': {} },
        key: (mark.name),
        variant: "ghost",
        size: "icon-sm",
        title: (mark.label),
        ...{ class: (__VLS_ctx.editor.isActive(mark.name) && __VLS_ctx.activeBtn) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    let __VLS_48;
    let __VLS_49;
    let __VLS_50;
    const __VLS_51 = {
        onClick: (...[$event]) => {
            __VLS_ctx.runMark(mark);
        }
    };
    __VLS_47.slots.default;
    const __VLS_52 = ((mark.icon));
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({}));
    const __VLS_54 = __VLS_53({}, ...__VLS_functionalComponentArgsRest(__VLS_53));
    var __VLS_47;
}
const __VLS_56 = {}.DropdownMenu;
/** @type {[typeof __VLS_components.DropdownMenu, typeof __VLS_components.DropdownMenu, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({}));
const __VLS_58 = __VLS_57({}, ...__VLS_functionalComponentArgsRest(__VLS_57));
__VLS_59.slots.default;
const __VLS_60 = {}.DropdownMenuTrigger;
/** @type {[typeof __VLS_components.DropdownMenuTrigger, typeof __VLS_components.DropdownMenuTrigger, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    asChild: true,
}));
const __VLS_62 = __VLS_61({
    asChild: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
const __VLS_64 = {}.Button;
/** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    variant: "ghost",
    size: "icon-sm",
    title: "文字颜色 / 高亮",
}));
const __VLS_66 = __VLS_65({
    variant: "ghost",
    size: "icon-sm",
    title: "文字颜色 / 高亮",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
const __VLS_68 = {}.Baseline;
/** @type {[typeof __VLS_components.Baseline, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({}));
const __VLS_70 = __VLS_69({}, ...__VLS_functionalComponentArgsRest(__VLS_69));
var __VLS_67;
var __VLS_63;
const __VLS_72 = {}.DropdownMenuContent;
/** @type {[typeof __VLS_components.DropdownMenuContent, typeof __VLS_components.DropdownMenuContent, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    align: "start",
    ...{ class: "w-44" },
}));
const __VLS_74 = __VLS_73({
    align: "start",
    ...{ class: "w-44" },
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_75.slots.default;
const __VLS_76 = {}.DropdownMenuLabel;
/** @type {[typeof __VLS_components.DropdownMenuLabel, typeof __VLS_components.DropdownMenuLabel, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({}));
const __VLS_78 = __VLS_77({}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
var __VLS_79;
for (const [color] of __VLS_getVForSourceType((__VLS_ctx.textColors))) {
    const __VLS_80 = {}.DropdownMenuItem;
    /** @type {[typeof __VLS_components.DropdownMenuItem, typeof __VLS_components.DropdownMenuItem, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        ...{ 'onClick': {} },
        key: (`t-${color.label}`),
    }));
    const __VLS_82 = __VLS_81({
        ...{ 'onClick': {} },
        key: (`t-${color.label}`),
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    let __VLS_84;
    let __VLS_85;
    let __VLS_86;
    const __VLS_87 = {
        onClick: (...[$event]) => {
            __VLS_ctx.applyTextColor(color.value);
        }
    };
    __VLS_83.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "size-3.5 rounded-full border" },
        ...{ style: ({ background: color.value || 'var(--foreground)' }) },
    });
    (color.label);
    var __VLS_83;
}
const __VLS_88 = {}.DropdownMenuSeparator;
/** @type {[typeof __VLS_components.DropdownMenuSeparator, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
const __VLS_92 = {}.DropdownMenuLabel;
/** @type {[typeof __VLS_components.DropdownMenuLabel, typeof __VLS_components.DropdownMenuLabel, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({}));
const __VLS_94 = __VLS_93({}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
var __VLS_95;
for (const [color] of __VLS_getVForSourceType((__VLS_ctx.highlightColors))) {
    const __VLS_96 = {}.DropdownMenuItem;
    /** @type {[typeof __VLS_components.DropdownMenuItem, typeof __VLS_components.DropdownMenuItem, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        ...{ 'onClick': {} },
        key: (`h-${color.label}`),
    }));
    const __VLS_98 = __VLS_97({
        ...{ 'onClick': {} },
        key: (`h-${color.label}`),
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    let __VLS_100;
    let __VLS_101;
    let __VLS_102;
    const __VLS_103 = {
        onClick: (...[$event]) => {
            __VLS_ctx.applyHighlight(color.value);
        }
    };
    __VLS_99.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "size-3.5 rounded border" },
        ...{ style: ({ background: color.value || 'var(--muted)' }) },
    });
    (color.label);
    var __VLS_99;
}
var __VLS_75;
var __VLS_59;
const __VLS_104 = {}.DropdownMenu;
/** @type {[typeof __VLS_components.DropdownMenu, typeof __VLS_components.DropdownMenu, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({}));
const __VLS_106 = __VLS_105({}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_107.slots.default;
const __VLS_108 = {}.DropdownMenuTrigger;
/** @type {[typeof __VLS_components.DropdownMenuTrigger, typeof __VLS_components.DropdownMenuTrigger, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    asChild: true,
}));
const __VLS_110 = __VLS_109({
    asChild: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
__VLS_111.slots.default;
const __VLS_112 = {}.Button;
/** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    variant: "ghost",
    size: "icon-sm",
    title: "文本对齐",
    ...{ class: ((__VLS_ctx.editor.isActive({ textAlign: 'center' }) || __VLS_ctx.editor.isActive({ textAlign: 'right' }) || __VLS_ctx.editor.isActive({ textAlign: 'justify' })) && __VLS_ctx.activeBtn) },
}));
const __VLS_114 = __VLS_113({
    variant: "ghost",
    size: "icon-sm",
    title: "文本对齐",
    ...{ class: ((__VLS_ctx.editor.isActive({ textAlign: 'center' }) || __VLS_ctx.editor.isActive({ textAlign: 'right' }) || __VLS_ctx.editor.isActive({ textAlign: 'justify' })) && __VLS_ctx.activeBtn) },
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_115.slots.default;
const __VLS_116 = ((__VLS_ctx.editor.isActive({ textAlign: 'center' }) ? __VLS_ctx.AlignCenter : __VLS_ctx.editor.isActive({ textAlign: 'right' }) ? __VLS_ctx.AlignRight : __VLS_ctx.editor.isActive({ textAlign: 'justify' }) ? __VLS_ctx.AlignJustify : __VLS_ctx.AlignLeft));
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({}));
const __VLS_118 = __VLS_117({}, ...__VLS_functionalComponentArgsRest(__VLS_117));
var __VLS_115;
var __VLS_111;
const __VLS_120 = {}.DropdownMenuContent;
/** @type {[typeof __VLS_components.DropdownMenuContent, typeof __VLS_components.DropdownMenuContent, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    align: "start",
    ...{ class: "w-36" },
}));
const __VLS_122 = __VLS_121({
    align: "start",
    ...{ class: "w-36" },
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_123.slots.default;
for (const [align] of __VLS_getVForSourceType((__VLS_ctx.aligns))) {
    const __VLS_124 = {}.DropdownMenuItem;
    /** @type {[typeof __VLS_components.DropdownMenuItem, typeof __VLS_components.DropdownMenuItem, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        ...{ 'onClick': {} },
        key: (align.key),
    }));
    const __VLS_126 = __VLS_125({
        ...{ 'onClick': {} },
        key: (align.key),
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    let __VLS_128;
    let __VLS_129;
    let __VLS_130;
    const __VLS_131 = {
        onClick: (...[$event]) => {
            __VLS_ctx.setAlign(align.key);
        }
    };
    __VLS_127.slots.default;
    const __VLS_132 = ((align.icon));
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        ...{ class: "size-4 text-muted-foreground" },
    }));
    const __VLS_134 = __VLS_133({
        ...{ class: "size-4 text-muted-foreground" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    (align.label);
    var __VLS_127;
}
var __VLS_123;
var __VLS_107;
const __VLS_136 = {}.Popover;
/** @type {[typeof __VLS_components.Popover, typeof __VLS_components.Popover, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    ...{ 'onUpdate:open': {} },
    open: (__VLS_ctx.linkPopoverOpen),
}));
const __VLS_138 = __VLS_137({
    ...{ 'onUpdate:open': {} },
    open: (__VLS_ctx.linkPopoverOpen),
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
let __VLS_140;
let __VLS_141;
let __VLS_142;
const __VLS_143 = {
    'onUpdate:open': (__VLS_ctx.onLinkPopoverChange)
};
__VLS_139.slots.default;
const __VLS_144 = {}.PopoverTrigger;
/** @type {[typeof __VLS_components.PopoverTrigger, typeof __VLS_components.PopoverTrigger, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    asChild: true,
}));
const __VLS_146 = __VLS_145({
    asChild: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
__VLS_147.slots.default;
const __VLS_148 = {}.Button;
/** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    variant: "ghost",
    size: "icon-sm",
    title: "链接",
    ...{ class: (__VLS_ctx.editor.isActive('link') && __VLS_ctx.activeBtn) },
}));
const __VLS_150 = __VLS_149({
    variant: "ghost",
    size: "icon-sm",
    title: "链接",
    ...{ class: (__VLS_ctx.editor.isActive('link') && __VLS_ctx.activeBtn) },
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
__VLS_151.slots.default;
const __VLS_152 = {}.Link2;
/** @type {[typeof __VLS_components.Link2, ]} */ ;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({}));
const __VLS_154 = __VLS_153({}, ...__VLS_functionalComponentArgsRest(__VLS_153));
var __VLS_151;
var __VLS_147;
const __VLS_156 = {}.PopoverContent;
/** @type {[typeof __VLS_components.PopoverContent, typeof __VLS_components.PopoverContent, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    align: "center",
    ...{ class: "w-80 p-3" },
    sideOffset: (8),
}));
const __VLS_158 = __VLS_157({
    align: "center",
    ...{ class: "w-80 p-3" },
    sideOffset: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
__VLS_159.slots.default;
const __VLS_160 = {}.Input;
/** @type {[typeof __VLS_components.Input, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.linkUrl),
    placeholder: "粘贴或输入链接，留空则移除",
}));
const __VLS_162 = __VLS_161({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.linkUrl),
    placeholder: "粘贴或输入链接，留空则移除",
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
let __VLS_164;
let __VLS_165;
let __VLS_166;
const __VLS_167 = {
    onKeyup: (__VLS_ctx.applyLink)
};
var __VLS_163;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mt-2.5 flex items-center justify-end gap-2" },
});
if (__VLS_ctx.editor.isActive('link')) {
    const __VLS_168 = {}.Button;
    /** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        ...{ 'onClick': {} },
        variant: "ghost",
        size: "sm",
    }));
    const __VLS_170 = __VLS_169({
        ...{ 'onClick': {} },
        variant: "ghost",
        size: "sm",
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    let __VLS_172;
    let __VLS_173;
    let __VLS_174;
    const __VLS_175 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.editor.isActive('link')))
                return;
            __VLS_ctx.linkUrl = '';
            __VLS_ctx.applyLink();
        }
    };
    __VLS_171.slots.default;
    var __VLS_171;
}
const __VLS_176 = {}.Button;
/** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    ...{ 'onClick': {} },
    size: "sm",
    disabled: (!__VLS_ctx.linkUrl.trim()),
}));
const __VLS_178 = __VLS_177({
    ...{ 'onClick': {} },
    size: "sm",
    disabled: (!__VLS_ctx.linkUrl.trim()),
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
let __VLS_180;
let __VLS_181;
let __VLS_182;
const __VLS_183 = {
    onClick: (__VLS_ctx.applyLink)
};
__VLS_179.slots.default;
var __VLS_179;
var __VLS_159;
var __VLS_139;
const __VLS_184 = {}.Button;
/** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
    ...{ 'onClick': {} },
    variant: "ghost",
    size: "icon-sm",
    title: "清除格式",
}));
const __VLS_186 = __VLS_185({
    ...{ 'onClick': {} },
    variant: "ghost",
    size: "icon-sm",
    title: "清除格式",
}, ...__VLS_functionalComponentArgsRest(__VLS_185));
let __VLS_188;
let __VLS_189;
let __VLS_190;
const __VLS_191 = {
    onClick: (...[$event]) => {
        __VLS_ctx.editor.chain().focus().unsetAllMarks().clearNodes().run();
    }
};
__VLS_187.slots.default;
const __VLS_192 = {}.RemoveFormatting;
/** @type {[typeof __VLS_components.RemoveFormatting, ]} */ ;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({}));
const __VLS_194 = __VLS_193({}, ...__VLS_functionalComponentArgsRest(__VLS_193));
var __VLS_187;
const __VLS_196 = {}.Separator;
/** @type {[typeof __VLS_components.Separator, ]} */ ;
// @ts-ignore
const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
    orientation: "vertical",
    ...{ class: "mx-1 !h-5" },
}));
const __VLS_198 = __VLS_197({
    orientation: "vertical",
    ...{ class: "mx-1 !h-5" },
}, ...__VLS_functionalComponentArgsRest(__VLS_197));
const __VLS_200 = {}.Button;
/** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
    ...{ 'onClick': {} },
    variant: "ghost",
    size: "icon-sm",
    title: "撤销",
    disabled: (!__VLS_ctx.editor.can().undo()),
}));
const __VLS_202 = __VLS_201({
    ...{ 'onClick': {} },
    variant: "ghost",
    size: "icon-sm",
    title: "撤销",
    disabled: (!__VLS_ctx.editor.can().undo()),
}, ...__VLS_functionalComponentArgsRest(__VLS_201));
let __VLS_204;
let __VLS_205;
let __VLS_206;
const __VLS_207 = {
    onClick: (...[$event]) => {
        __VLS_ctx.editor.chain().focus().undo().run();
    }
};
__VLS_203.slots.default;
const __VLS_208 = {}.Undo2;
/** @type {[typeof __VLS_components.Undo2, ]} */ ;
// @ts-ignore
const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({}));
const __VLS_210 = __VLS_209({}, ...__VLS_functionalComponentArgsRest(__VLS_209));
var __VLS_203;
const __VLS_212 = {}.Button;
/** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
    ...{ 'onClick': {} },
    variant: "ghost",
    size: "icon-sm",
    title: "重做",
    disabled: (!__VLS_ctx.editor.can().redo()),
}));
const __VLS_214 = __VLS_213({
    ...{ 'onClick': {} },
    variant: "ghost",
    size: "icon-sm",
    title: "重做",
    disabled: (!__VLS_ctx.editor.can().redo()),
}, ...__VLS_functionalComponentArgsRest(__VLS_213));
let __VLS_216;
let __VLS_217;
let __VLS_218;
const __VLS_219 = {
    onClick: (...[$event]) => {
        __VLS_ctx.editor.chain().focus().redo().run();
    }
};
__VLS_215.slots.default;
const __VLS_220 = {}.Redo2;
/** @type {[typeof __VLS_components.Redo2, ]} */ ;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({}));
const __VLS_222 = __VLS_221({}, ...__VLS_functionalComponentArgsRest(__VLS_221));
var __VLS_215;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "ml-auto text-xs text-muted-foreground" },
});
(__VLS_ctx.status);
const __VLS_224 = {}.Button;
/** @type {[typeof __VLS_components.Button, typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
    ...{ 'onClick': {} },
    size: "sm",
    ...{ class: "ml-2 gap-1.5" },
}));
const __VLS_226 = __VLS_225({
    ...{ 'onClick': {} },
    size: "sm",
    ...{ class: "ml-2 gap-1.5" },
}, ...__VLS_functionalComponentArgsRest(__VLS_225));
let __VLS_228;
let __VLS_229;
let __VLS_230;
const __VLS_231 = {
    onClick: (...[$event]) => {
        __VLS_ctx.emit('save');
    }
};
__VLS_227.slots.default;
const __VLS_232 = {}.Save;
/** @type {[typeof __VLS_components.Save, ]} */ ;
// @ts-ignore
const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
    ...{ class: "size-3.5" },
}));
const __VLS_234 = __VLS_233({
    ...{ class: "size-3.5" },
}, ...__VLS_functionalComponentArgsRest(__VLS_233));
var __VLS_227;
/** @type {__VLS_StyleScopedClasses['sticky']} */ ;
/** @type {__VLS_StyleScopedClasses['top-0']} */ ;
/** @type {__VLS_StyleScopedClasses['z-20']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-background/85']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['backdrop-blur']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['size-3.5']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-60']} */ ;
/** @type {__VLS_StyleScopedClasses['w-48']} */ ;
/** @type {__VLS_StyleScopedClasses['size-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted-foreground']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['size-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-1']} */ ;
/** @type {__VLS_StyleScopedClasses['!h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['w-44']} */ ;
/** @type {__VLS_StyleScopedClasses['size-3.5']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['size-3.5']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['w-36']} */ ;
/** @type {__VLS_StyleScopedClasses['size-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted-foreground']} */ ;
/** @type {__VLS_StyleScopedClasses['w-80']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2.5']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-1']} */ ;
/** @type {__VLS_StyleScopedClasses['!h-5']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted-foreground']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['size-3.5']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AlignCenter: AlignCenter,
            AlignJustify: AlignJustify,
            AlignLeft: AlignLeft,
            AlignRight: AlignRight,
            Baseline: Baseline,
            Check: Check,
            ChevronDown: ChevronDown,
            Link2: Link2,
            Redo2: Redo2,
            RemoveFormatting: RemoveFormatting,
            Save: Save,
            Undo2: Undo2,
            Button: Button,
            DropdownMenu: DropdownMenu,
            DropdownMenuContent: DropdownMenuContent,
            DropdownMenuItem: DropdownMenuItem,
            DropdownMenuLabel: DropdownMenuLabel,
            DropdownMenuSeparator: DropdownMenuSeparator,
            DropdownMenuTrigger: DropdownMenuTrigger,
            Input: Input,
            Popover: Popover,
            PopoverContent: PopoverContent,
            PopoverTrigger: PopoverTrigger,
            Separator: Separator,
            emit: emit,
            editor: editor,
            blockItems: blockItems,
            blockLabel: blockLabel,
            isBlockActive: isBlockActive,
            setBlock: setBlock,
            marks: marks,
            runMark: runMark,
            textColors: textColors,
            highlightColors: highlightColors,
            applyTextColor: applyTextColor,
            applyHighlight: applyHighlight,
            aligns: aligns,
            setAlign: setAlign,
            linkPopoverOpen: linkPopoverOpen,
            linkUrl: linkUrl,
            onLinkPopoverChange: onLinkPopoverChange,
            applyLink: applyLink,
            activeBtn: activeBtn,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
