import logging
from http.client import HTTPException
from fastapi import APIRouter, status

from app.state import state

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/click/{pad_id}", status_code=status.HTTP_200_OK)
async def click_pad(pad_id: int):
    if not (0 < pad_id < 17):
        raise HTTPException(
            400,
            "Введены неверные данные"
        )

    return {"answer:" "пэд нажат!"}

@router.post("/volume/{value}", status_code=status.HTTP_200_OK)
async def set_volume(value: int):
    if not (0 <= value <= 100):
        raise HTTPException(
            400,
            "Введены неверные данные"
        )

    state.volume = value
    logger.info(state.volume)
    print(state.volume)
    return {"answer:" "пэд нажат!"}