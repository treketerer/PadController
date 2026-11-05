from fastapi.routing import APIRouter

from app.api.actions import router as action_router
from app.api.frontend import router as front_router
from app.api.settings import router as settings_router
from app.api.sockets import router as sockets_router

main_router = APIRouter()

main_router.include_router(action_router)
main_router.include_router(front_router)
main_router.include_router(settings_router)
main_router.include_router(sockets_router)
