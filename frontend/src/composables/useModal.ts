import { reactive } from "vue";

interface ModalState {
  visible: boolean;
  title: string;
  body: string;
  confirmText: string;
  danger: boolean;
  loading: boolean;
  resolve?: (value: boolean) => void;
}

const state = reactive<ModalState>({
  visible: false, title: "", body: "", confirmText: "确认", danger: false, loading: false,
});

export function useModal() {
  function confirm(
    title: string,
    body: string,
    opts?: { confirmText?: string; danger?: boolean },
  ): Promise<boolean> {
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
  function close(accepted: boolean) {
    state.visible = false;
    state.resolve?.(accepted);
  }
  return { state, confirm, close };
}
