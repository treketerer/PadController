import json
import logging
import os
from fastapi import HTTPException, status
from pathlib import Path

from fastapi import APIRouter

from app.schemas.pads_config import PadConfig

logger = logging.getLogger(__name__)

router = APIRouter()

CONFIG_PATH = Path('static/data.json').resolve()

TONALITY_LIST = [
    'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#',
    'G', 'Ab', 'A', 'Bb', 'B', 'Cm', 'C#m',
    'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm',
    'Abm', 'Am', 'Bbm', 'Bm'
]

BASE_PADS_CONFIG = [
    {"id": 1, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 2, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 3, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 4, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 5, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 6, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 7, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 8, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 9, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 10, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 11, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 12, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 13, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 14, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 15, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
    {"id": 16, "label": '', "key": '', "soundfont": '', "isStop": False, "isClean": True},
]

@router.get("/tonalities")
async def get_tonalities():
    return TONALITY_LIST

@router.get("/config")
async def get_config():
    if not os.path.isfile(CONFIG_PATH):
        return BASE_PADS_CONFIG
    with open(CONFIG_PATH, 'r', encoding='utf-8') as file:
        return json.load(file)

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
