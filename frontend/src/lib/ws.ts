import { ref } from "vue";
import { WS_BASE_URL } from "@/config";
import type { UUID, WSStatus } from "@/lib/types";

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let allowReconnect = false;

export function useWS() {
  const status = ref<WSStatus>("disconnected");
  let _onMessage: (() => void) | null = null;
  let _spaceId: UUID | null = null;

  function scheduleReconnect() {
    if (!allowReconnect || !_spaceId) return;
    if (reconnectTimer) return;
    const delay = Math.min(30000, 500 * Math.pow(2, reconnectAttempt));
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => { reconnectTimer = null; doConnect(); }, delay);
  }

  function doConnect() {
    disconnect();
    if (!_spaceId) return;
    allowReconnect = true;
    status.value = "connecting";
    ws = new WebSocket(WS_BASE_URL);
    ws.onopen = () => {
      status.value = "connected";
      reconnectAttempt = 0;
      ws?.send(JSON.stringify({ type: "subscribe", channel_space_id: _spaceId }));
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === "news.processed") _onMessage?.();
      } catch {}
    };
    ws.onclose = () => { status.value = "disconnected"; scheduleReconnect(); };
    ws.onerror = () => {
      status.value = "disconnected";
      if (ws) { try { ws.close(); } catch {}; ws = null; }
      scheduleReconnect();
    };
  }

  function disconnect() {
    allowReconnect = false;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (ws) { try { ws.close(); } catch {}; ws = null; }
    status.value = "disconnected";
  }

  function connect(spaceId: UUID, onMessage: () => void) {
    _spaceId = spaceId;
    _onMessage = onMessage;
    doConnect();
  }

  return { status, connect, disconnect };
}
