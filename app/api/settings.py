import json
import logging
import os
from fastapi import HTTPException, status

from fastapi import APIRouter

from app.config import TONALITY_LIST, PADS_CONFIG_PATH, BASE_PADS_CONFIG
from app.state import state
from app.schemas.pads_config import PadConfig

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/tonalities")
async def get_tonalities():
    return TONALITY_LIST

@router.get("/config")
async def get_config():
    logger.info(state.volume)
    if not os.path.isfile(PADS_CONFIG_PATH):
        return {
            "active_pad": state.active_pad,
            "volume": state.volume,
            "pads": BASE_PADS_CONFIG
        }

    with open(PADS_CONFIG_PATH, 'r', encoding='utf-8') as file:
        return {
            "active_pad": state.active_pad,
            "volume": state.volume,
            "pads": json.load(file)
        }

@router.post("/config", status_code=status.HTTP_200_OK)
async def save_settings(cfg: list[PadConfig]):
    try:
        with open(PADS_CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(
                [pad.model_dump() for pad in cfg],
                f,
                ensure_ascii=False,
                indent=4
            )

        return {"message": "Конфигурация сохранена"}
    except Exception as ex:
        logger.error(ex)
        raise HTTPException(
            status_code=500,
            detail="Ошибка при сохранении конфигурации"
        )
