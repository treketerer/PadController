import asyncio
import logging

from app.services.audio import audio_service
from app.state import state

logger = logging.getLogger(__name__)

async def pad_click(active_pad: int | None):
    try:
        logger.info(active_pad)
        if active_pad:
            state.active_pad = active_pad
            logger.info(f"Запускаем звучание {active_pad}")
            asyncio.create_task( audio_service.play(state.active_pad) )
        else:
            channel = audio_service.now_pad_channel()

            if channel is None:
                return

            if channel in state.stop_channels:
                return

            logger.info(f"Останавливаем звучание канала {channel}")
            asyncio.create_task( audio_service.stop(audio_service.now_pad) )
            audio_service.now_pad = None

    except Exception as ex:
        logger.warning(ex)

async def volume_change(volume: int):
    if volume is None:
        return

    old_volume = state.volume
    state.volume = volume

    channel=audio_service.now_pad_channel()
    if channel is None:
        return

    await audio_service.set_volume(
        old_volume,
        state.volume,
        channel,
        transition_duration= round(
            audio_service.TRANSITION_TIME/2.5
        )
    )

