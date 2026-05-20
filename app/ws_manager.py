import asyncio
import json
import uuid

from fastapi import WebSocket


class WSManager:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._space_sockets: dict[uuid.UUID, set[WebSocket]] = {}

    async def add(self, space_id: uuid.UUID, ws: WebSocket) -> None:
        async with self._lock:
            self._space_sockets.setdefault(space_id, set()).add(ws)

    async def remove(self, space_id: uuid.UUID, ws: WebSocket) -> None:
        async with self._lock:
            sockets = self._space_sockets.get(space_id)
            if not sockets:
                return
            sockets.discard(ws)
            if not sockets:
                self._space_sockets.pop(space_id, None)

    async def broadcast(self, space_id: uuid.UUID, message: dict) -> None:
        async with self._lock:
            sockets = list(self._space_sockets.get(space_id, set()))
        if not sockets:
            return
        data = json.dumps(message, ensure_ascii=False)
        for ws in sockets:
            try:
                await ws.send_text(data)
            except Exception:
                pass


ws_manager = WSManager()

