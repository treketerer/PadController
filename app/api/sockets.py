import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services import sockets_actions
from app.services.sockets_service import sockets_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    sockets_service.add(user_id, websocket)
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
                await sockets_service.send_except_author(
                    user_id, "pad_click", data
                )

                active_pad = data.get("active_pad")
                await sockets_actions.pad_click(active_pad)

            elif event == "volume_changed":
                await sockets_service.send_except_author(
                    user_id, "volume_changed", data
                )
                await sockets_actions.volume_change(data.get("value"))

            elif event == "open_settings":
                await sockets_service.send_except_author(
                    user_id, "open_settings", {}
                )

            elif event == "settings_saved":
                await sockets_service.send_except_author(
                    user_id, "settings_saved", {}
                )

            else:
                await websocket.send_json({
                    "event": "error",
                    "data": {"message": "Неизвестное событие"}
                })

    except WebSocketDisconnect:
        sockets_service.remove(user_id)