import { onBeforeUnmount, ref, watchEffect } from 'vue';
/**
 * @tiptap/vue-3 2.x 的 useEditor 不订阅 transaction，
 * 模板里的 isActive()/can() 不会自动刷新。
 * 这里维护一个随 transaction 自增的版本号，组件渲染时读取它即可触发重渲染。
 */
export function useEditorVersion(getEditor) {
    const version = ref(0);
    const update = () => { version.value++; };
    let current;
    watchEffect(() => {
        const editor = getEditor();
        if (editor === current)
            return;
        current?.off('transaction', update);
        current = editor;
        editor?.on('transaction', update);
    });
    onBeforeUnmount(() => { current?.off('transaction', update); });
    return version;
}
