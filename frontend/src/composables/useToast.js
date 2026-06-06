import { reactive } from "vue";
const state = reactive({ toasts: [] });
let nextId = 0;
export function useToast() {
    function show(type, message) {
        const id = nextId++;
        state.toasts.unshift({ id, type, message }); // 新 toast 在上方
        setTimeout(() => remove(id), 2500);
    }
    function success(msg) { show("success", msg); }
    function error(msg) { show("error", msg); }
    function info(msg) { show("info", msg); }
    function remove(id) {
        const idx = state.toasts.findIndex((t) => t.id === id);
        if (idx >= 0)
            state.toasts.splice(idx, 1);
    }
    return { toasts: state.toasts, success, error, info, remove };
}
