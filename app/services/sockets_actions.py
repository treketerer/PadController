import asyncio
import logging

from app.services.midi import midi_controller
from app.services.audio import audio_service
from app.state import state

logger = logging.getLogger(__name__)

async def pad_click(active_pad: int | None) -> str | bool:
    try:
        pad = active_pad if active_pad is not None else state.active_pad
        print(pad)
        if pad is None:
            return False
        pad = max(1, min(16, int(pad)))

        print(state.pads_config[pad - 1].key)
        pad_config = state.pads_config[pad - 1]

        if pad_config.isClean:
            return False

        is_stop = pad_config.isStop

        # Если нажали обычный Pad и он не является текущим
        if not is_stop and state.active_pad != pad:
            state.active_pad = pad

            logger.info(f"Запускаем звучание {pad}")

            asyncio.create_task(audio_service.play(pad))
            midi_controller.light_off_all_device_pads()
            midi_controller.light_on_device_pad(state.active_pad)
            return True

        logger.info(active_pad)
        active_pad = state.active_pad
        pad_data = audio_service.now_pad

        state.active_pad = None
        audio_service.now_pad = None

        if pad_data is None:
            return "СТОП" if is_stop else False

        channel = pad_data.channel

        if channel in state.stop_channels:
            return "СТОП" if is_stop else False

        logger.info(f"Останавливаем звучание канала {channel}")

        midi_controller.light_off_device_pad(active_pad)
        asyncio.create_task(audio_service.stop(pad_data))

        if is_stop:
            return "СТОП"

        return True

    except Exception as ex:
        logger.exception(ex)
        return False

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

