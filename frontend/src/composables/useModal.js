import { reactive } from "vue";
const state = reactive({
    visible: false, title: "", body: "", confirmText: "确认", danger: false, loading: false,
});
export function useModal() {
    function confirm(title, body, opts) {
        return new Promise((resolve) => {
            Object.assign(state, {
                visible: true, title, body,
                confirmText: opts?.confirmText || "确认",
                danger: opts?.danger || false,
                loading: false,
                resolve,
            });
        });
    }
    function close(accepted) {
        state.visible = false;
        state.resolve?.(accepted);
    }
    return { state, confirm, close };
}
