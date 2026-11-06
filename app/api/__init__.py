from fastapi.routing import APIRouter

from app.api.settings import router as settings_router
from app.api.sockets import router as sockets_router
from app.api.soundfonts import router as soundfonts_router

main_router = APIRouter()

main_router.include_router(settings_router)
main_router.include_router(sockets_router)
main_router.include_router(soundfonts_router)
