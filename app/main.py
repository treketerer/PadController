from contextlib import asynccontextmanager
import threading

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio

from app.services.midi import midi_controller
from app.api import main_router

import logging

from app.services import settings
from app.state import state

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

@asynccontextmanager
async def lifespan(app: FastAPI):

    state.pads_config = settings.get_pads_config().pads

    loop = asyncio.get_running_loop()

    midi_controller.set_loop(loop)
    t = threading.Thread(target=midi_controller.midi_listener, daemon=True)
    t.start()

    yield

    print("Приложение выключается...")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(main_router)

app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)