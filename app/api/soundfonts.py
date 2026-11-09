import json
import logging
import os

from fastapi import UploadFile, HTTPException, status, APIRouter
from pathlib import Path

from app.config import PADS_CONFIG_PATH, SOUNDFONTS_UPLOAD_PATH
from app.services.settings import get_pads_config

logger = logging.getLogger(__name__)

router = APIRouter()

# Создаем папку если ее нет
SOUNDFONTS_UPLOAD_PATH.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".sf2", ".sf3", ".dls"}

# Максимальный размер файла 250 МБ
MAX_FILE_SIZE = 250 * 1024 * 1024

@router.get("/soundfonts")
async def get_fonts_list():
    return os.listdir(SOUNDFONTS_UPLOAD_PATH)

@router.post("/soundfonts/", status_code=201)
async def create_soundfont(file: UploadFile):
    original_name = file.filename or ""
    filename = Path(original_name).name
    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Передан файл неверного типа"
        )

    file_path = SOUNDFONTS_UPLOAD_PATH / filename
    if os.path.isfile(file_path):
        raise HTTPException(
            status_code=409,
            detail="Переданный файл уже сохранен на сервере"
        )

    size = 0

    try:
        # Читаем по чанкам, а не загружаем целиком в озу
        with file_path.open("xb") as buffer:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)

                if size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Файл слишком большой"
                    )

                buffer.write(chunk)

    except Exception:
        # Удаляем частично записанный файл при ошибке
        file_path.unlink(missing_ok=True)
        raise

    return {"Answer", "Soundfont сохранен!"}


@router.delete("/soundfonts/{filename}", status_code=status.HTTP_200_OK)
async def delete_soundfont(filename: str):
    file_path = SOUNDFONTS_UPLOAD_PATH/filename

    if not file_path.is_file():
        raise HTTPException(
            status_code=400,
            detail="Данный sounfont не находится на сервере!"
        )

    try:
        try:
            pads = get_pads_config().pads

            for pad in pads:
                logger.info(f"{pad.soundfont} {filename} {pad.soundfont == filename}")
                if pad.soundfont == filename:
                    pad.soundfont = ""

            with open(PADS_CONFIG_PATH, 'w', encoding='utf-8') as f:
                json.dump(
                    [pad.model_dump() for pad in pads],
                    f,
                    ensure_ascii=False,
                    indent=4
                )

        except Exception as ex:
            logger.error(ex)
            raise

        file_path.unlink()
        return {"message": "Файл удалён"}
    except OSError:
        logger.exception("Ошибка удаления SoundFont")
        raise HTTPException(
            status_code=500,
            detail="Ошибка при удалении файла"
        )