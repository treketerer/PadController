import json
import logging
import os
from fastapi import HTTPException, status
from pathlib import Path

from fastapi import APIRouter

from app.state import state
from app.schemas.pads_config import PadConfig

logger = logging.getLogger(__name__)

router = APIRouter()

CONFIG_PATH = Path('static/data.json').resolve()

TONALITY_LIST = [
    'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#',
    'G', 'Ab', 'A', 'Bb', 'B',
    'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m',
    'Gm', 'Abm', 'Am', 'Bbm', 'Bm'
]

BASE_PADS_CONFIG = [
    {"id": i, "label": '', "key": '', "soundfont": '', "type": 0, "isStop": False, "isClean": True}
    for i in range(1, 17)
]

@router.get("/tonalities")
async def get_tonalities():
    return TONALITY_LIST

@router.get("/config")
async def get_config():
    logger.info(state.volume)
    if not os.path.isfile(CONFIG_PATH):
        return {
            "volume": state.volume,
            "pads": BASE_PADS_CONFIG
        }

    with open(CONFIG_PATH, 'r', encoding='utf-8') as file:
        return {
            "volume": state.volume,
            "pads": json.load(file)
        }

@router.post("/config", status_code=status.HTTP_200_OK)
async def save_settings(cfg: list[PadConfig]):
    try:
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
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
