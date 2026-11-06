import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.sockets_manager import SocketsManager
from app.state import state

logger = logging.getLogger(__name__)

router = APIRouter()

sockets_manager = SocketsManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    sockets_manager.add(user_id, websocket)
    try:
        while True:
            sock_data = await websocket.receive_text()

            json_data: dict = json.loads(sock_data)
            event: str = json_data.get("event")
            data: dict = json_data.get("data")

            if data is None or not event:
                logger.warning(f"В запросе не указан один из параметров {event} {data}")
                await websocket.send_json({
                    "event": "error",
                    "data": {"message": "В запросе не указан один из параметров"}
                })
                continue

            logger.info(f"{event} {data}")

            if event == "pad_click":
                active_pad = data.get("active_pad")
                logger.info(active_pad)
                if active_pad:
                    state.active_pad = active_pad

                await sockets_manager.send_except_author(
                    user_id, "pad_click", data
                )

            elif event == "volume_changed":
                volume = data.get("value")
                if volume:
                    state.volume = volume
                    await sockets_manager.send_except_author(
                        user_id, "volume_changed", data
                    )

            elif event == "open_settings":
                await sockets_manager.send_except_author(
                    user_id, "open_settings", {}
                )

            elif event == "settings_saved":
                await sockets_manager.send_except_author(
                    user_id, "settings_saved", {}
                )

            else:
                await websocket.send_json({
                    "event": "error",
                    "data": {"message": "Неизвестное событие"}
                })

    except WebSocketDisconnect:
        sockets_manager.remove(user_id)