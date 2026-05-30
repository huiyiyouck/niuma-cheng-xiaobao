import { reactive } from "vue";

interface ToastItem {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

const state = reactive<{ toasts: ToastItem[] }>({ toasts: [] });
let nextId = 0;

export function useToast() {
  function show(type: ToastItem["type"], message: string) {
    const id = nextId++;
    state.toasts.unshift({ id, type, message }); // 新 toast 在上方
    setTimeout(() => remove(id), 2500);
  }
  function success(msg: string) { show("success", msg); }
  function error(msg: string) { show("error", msg); }
  function info(msg: string) { show("info", msg); }
  function remove(id: number) {
    const idx = state.toasts.findIndex((t) => t.id === id);
    if (idx >= 0) state.toasts.splice(idx, 1);
  }
  return { toasts: state.toasts, success, error, info, remove };
}
