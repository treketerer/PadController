import json
import logging
import os
from dataclasses import dataclass

from app.schemas.pads_config import PadConfig

from app.config import PADS_CONFIG_PATH, BASE_PADS_CONFIG
from app.services import sockets_actions
from app.services.audio import audio_service
from app.services.sockets_service import sockets_service
from app.state import state


logger = logging.getLogger(__name__)

@dataclass
class AppConfig:
    active_pad: int
    volume: int
    pads: list[PadConfig]

def get_pads_config() -> AppConfig:
    logger.info(state.volume)
    if not os.path.isfile(PADS_CONFIG_PATH):
        return AppConfig(
            active_pad=state.active_pad,
            volume=state.volume,
            pads=BASE_PADS_CONFIG
        )

    if state.pads_config is not None:
        return AppConfig(
            active_pad=state.active_pad,
            volume=state.volume,
            pads=state.pads_config
        )

    with open(PADS_CONFIG_PATH, 'r', encoding='utf-8') as file:
        pads_data = json.load(file)
        pads: list[PadConfig] = [
            PadConfig.model_validate(pad)
            for pad in pads_data
        ]

        state.pads_config = pads

        return AppConfig(
            active_pad=state.active_pad,
            volume=state.volume,
            pads=pads
        )

async def save_pads_config(cfg: list[PadConfig]):
    try:
        with open(PADS_CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(
                [pad.model_dump() for pad in cfg],
                f,
                ensure_ascii=False,
                indent=4
            )

        state.pads_config = cfg

        state.active_pad = None
        await sockets_actions.pad_click(None)
        # await sockets_service.send_to_all(
        #     event="pad_click",
        #     data={"active_pad": None}
        # )
        audio_service.update_soundfonts_list()

        return True

    except Exception as ex:
        logger.error(ex)
        return False
