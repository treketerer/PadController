from fastapi import WebSocket

class SocketsService:
    def __init__(self):
        self.conn_storage: dict[str, WebSocket] = {}

    def add(self, user_id: str, socket: WebSocket):
        self.conn_storage[user_id] = socket

    def remove(self, user_id: str):
        self.conn_storage.pop(user_id, None)

    async def send_to(self, user_id: str, event: str, data: dict):
        socket = self.conn_storage.get(user_id)

        if socket:
            await self.conn_storage[user_id].send_json({
                "event": event,
                "data": data
            })

    async def send_to_all(self, event: str, data: dict):
        for user_id in list(self.conn_storage.keys()):
            await self.send_to(user_id, event, data)

    async def send_except_author(self, author_id: str, event: str, data: dict):
        for user_id in list(self.conn_storage.keys()):
            if user_id != author_id:
                await self.send_to(user_id, event, data)