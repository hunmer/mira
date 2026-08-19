import { onBeforeUnmount, onMounted, ref } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { MiraClient } from 'mira-app-core/shared/sdk';
import { SaveLocationDialog } from 'mira-plugin-ui';
const params = new URLSearchParams(location.search);
const initialLibraryId = params.get('libraryId') || '';
const initialFileId = params.get('fileId') || '';
const fileUrl = params.get('fileUrl') || '';
const initialFileName = params.get('fileName') || 'document.tiptap';
const isNewDocument = ref(params.get('new') === '1' || !fileUrl);
const apiBaseUrl = params.get('apiBaseUrl') || location.origin;
const token = params.get('token') || new URL(fileUrl || location.href).searchParams.get('token') || '';
const client = new MiraClient(apiBaseUrl).setToken(token);
const status = ref(isNewDocument.value ? '新建文档' : '正在加载...');
const showSaveDialog = ref(false);
const libraries = ref([]);
const folders = ref([]);
const currentLibraryId = ref(initialLibraryId);
const currentFileId = ref(initialFileId);
const currentFileName = ref(initialFileName);
let saveTimer;
const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: '开始写作...' })],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: () => {
        if (!currentFileId.value)
            return;
        status.value = '有未保存修改';
        if (saveTimer)
            clearTimeout(saveTimer);
        saveTimer = setTimeout(() => void saveExisting(), 700);
    },
});
async function saveExisting() {
    if (!editor.value || !currentLibraryId.value || !currentFileId.value)
        return;
    status.value = '保存中...';
    try {
        await client.files().writeFile(currentLibraryId.value, currentFileId.value, JSON.stringify(editor.value.getJSON(), null, 2), { name: currentFileName.value, contentType: 'application/vnd.mira.tiptap+json' });
        status.value = '已保存';
    }
    catch (error) {
        console.error('[mira-tiptap] save failed', error);
        status.value = '保存失败';
    }
}
async function openSaveDialog() {
    libraries.value = await client.libraries().getAll();
    currentLibraryId.value || (currentLibraryId.value = String(libraries.value[0]?.id || ''));
    folders.value = currentLibraryId.value ? await client.folders().getAll(currentLibraryId.value) : [];
    showSaveDialog.value = true;
}
async function saveToLocation(location) {
    if (!editor.value)
        return;
    status.value = '保存中...';
    try {
        const content = JSON.stringify(editor.value.getJSON(), null, 2);
        if (currentFileId.value && currentLibraryId.value === location.libraryId && !isNewDocument.value) {
            await client.files().writeFile(location.libraryId, currentFileId.value, content, { name: location.fileName, contentType: 'application/vnd.mira.tiptap+json' });
        }
        else {
            const response = await client.files().uploadFile(new File([content], location.fileName, { type: 'application/vnd.mira.tiptap+json' }), location.libraryId, { folderId: location.folderId });
            const created = response?.results?.[0]?.result || response?.data || response?.result;
            currentFileId.value = created?.id ? String(created.id) : currentFileId.value;
            currentLibraryId.value = location.libraryId;
            currentFileName.value = location.fileName;
            isNewDocument.value = false;
        }
        status.value = '已保存';
    }
    catch (error) {
        console.error('[mira-tiptap] save failed', error);
        status.value = '保存失败';
    }
}
function handleKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void openSaveDialog();
    }
}
onMounted(async () => {
    window.addEventListener('keydown', handleKeydown);
    if (isNewDocument.value)
        return;
    try {
        const response = await fetch(fileUrl);
        if (!response.ok)
            throw new Error(`加载失败 (${response.status})`);
        editor.value?.commands.setContent(await response.json());
        status.value = '已加载';
    }
    catch (error) {
        console.error('[mira-tiptap] load failed', error);
        status.value = '加载失败';
    }
});
onBeforeUnmount(() => { window.removeEventListener('keydown', handleKeydown); if (saveTimer)
    clearTimeout(saveTimer); editor.value?.destroy(); });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "editor-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.editor?.chain().focus().toggleBold().run();
        } },
    title: "粗体",
    ...{ class: ({ active: __VLS_ctx.editor?.isActive('bold') }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.editor?.chain().focus().toggleItalic().run();
        } },
    title: "斜体",
    ...{ class: ({ active: __VLS_ctx.editor?.isActive('italic') }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.editor?.chain().focus().toggleHeading({ level: 2 }).run();
        } },
    title: "标题",
    ...{ class: ({ active: __VLS_ctx.editor?.isActive('heading', { level: 2 }) }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.editor?.chain().focus().toggleBulletList().run();
        } },
    title: "项目列表",
    ...{ class: ({ active: __VLS_ctx.editor?.isActive('bulletList') }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.editor?.chain().focus().undo().run();
        } },
    title: "撤销",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.editor?.chain().focus().redo().run();
        } },
    title: "重做",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.openSaveDialog) },
    ...{ class: "save-button" },
    title: "保存",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "status" },
});
(__VLS_ctx.status);
if (__VLS_ctx.editor) {
    const __VLS_0 = {}.EditorContent;
    /** @type {[typeof __VLS_components.EditorContent, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        editor: (__VLS_ctx.editor),
        ...{ class: "editor" },
    }));
    const __VLS_2 = __VLS_1({
        editor: (__VLS_ctx.editor),
        ...{ class: "editor" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
const __VLS_4 = {}.SaveLocationDialog;
/** @type {[typeof __VLS_components.SaveLocationDialog, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onSave': {} },
    open: (__VLS_ctx.showSaveDialog),
    libraries: (__VLS_ctx.libraries),
    folders: (__VLS_ctx.folders),
    initialLibraryId: (__VLS_ctx.currentLibraryId),
    initialFileName: (__VLS_ctx.initialFileName),
}));
const __VLS_6 = __VLS_5({
    ...{ 'onSave': {} },
    open: (__VLS_ctx.showSaveDialog),
    libraries: (__VLS_ctx.libraries),
    folders: (__VLS_ctx.folders),
    initialLibraryId: (__VLS_ctx.currentLibraryId),
    initialFileName: (__VLS_ctx.initialFileName),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onSave: (__VLS_ctx.saveToLocation)
};
var __VLS_7;
/** @type {__VLS_StyleScopedClasses['editor-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['save-button']} */ ;
/** @type {__VLS_StyleScopedClasses['status']} */ ;
/** @type {__VLS_StyleScopedClasses['editor']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            EditorContent: EditorContent,
            SaveLocationDialog: SaveLocationDialog,
            initialFileName: initialFileName,
            status: status,
            showSaveDialog: showSaveDialog,
            libraries: libraries,
            folders: folders,
            currentLibraryId: currentLibraryId,
            editor: editor,
            openSaveDialog: openSaveDialog,
            saveToLocation: saveToLocation,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
