import json
import logging
import os
from fastapi import HTTPException, status

from fastapi import APIRouter

from app.config import TONALITY_LIST
from app.schemas.pads_config import PadConfig
from app.services.settings import get_pads_config, save_pads_config

router = APIRouter()

@router.get("/tonalities")
async def get_tonalities():
    return TONALITY_LIST


@router.get("/config")
async def _route_get_pads_config():
    return get_pads_config()

@router.post("/config", status_code=status.HTTP_200_OK)
async def _route_save_pads_config(cfg: list[PadConfig]):
    _isSaved: bool = await save_pads_config(cfg)
    if _isSaved:
        return {"message": "Конфигурация сохранена"}
    raise HTTPException(
        status_code=500,
        detail="Ошибка при сохранении конфигурации"
    )