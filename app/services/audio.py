import asyncio
import logging
import os
from dataclasses import dataclass
from pathlib import Path

from app.services.sockets_service import sockets_service
from app.config import SOUNDFONTS_UPLOAD_PATH, NOTES_LIST
from app.schemas.pads_config import PadConfig
import fluidsynth

from app.services import settings
from app.state import state

logger = logging.getLogger(__name__)

@dataclass
class PlayingPad:
    pad: PadConfig = None
    notes: list[int] = None
    channel: int = None

class AudioService:
    def __init__(self):
        self.now_pad: PlayingPad | None = None

        self.channels_pool = list(range(1,17))

        self.fs = fluidsynth.Synth(
            gain=0.85,
            samplerate=44100
        )

        self.fs.set_reverb(
            roomsize=0.9,  # размер помещения
            damping=0.2,  # затухание высоких частот
            width=0.9,  # ширина стерео
            level=0.8  # общая громкость эффекта
        )

        self.fs.start()  # Запускает вывод звука

        self.MAJOR_CHORD_SCHEME: list[int] = [0, 4, 7]
        self.MINOR_CHORD_SCHEME: list[int] = [0, 3, 7]

        self.soundfonts_list: dict[str, int] = {}
        self.sf_extensions = {".sf2", ".sf3", ".dls"}

        self.TRANSITION_TIME: float = 2
        self.TRANSITION_SAMPLES: int = 20

        self.VOLUME_TARGET_VALUES = {}

        self.update_soundfonts_list()

    def get_free_channel(self):
        return self.channels_pool.pop(0)

    def now_pad_channel(self):
        if self.now_pad is not None:
            return self.now_pad.channel
        return None

    def update_soundfonts_list(self):
        files_list = os.listdir(SOUNDFONTS_UPLOAD_PATH)

        # Очистка хранилища
        for key in self.soundfonts_list.keys():
            if key not in files_list:
                self.fs.sfunload(self.soundfonts_list[key])
        self.soundfonts_list = {}

        # Добавление нового
        for file in files_list:
            file_path = SOUNDFONTS_UPLOAD_PATH / file

            if not file_path.is_file():
                continue
            if Path(file).suffix.lower() not in self.sf_extensions:
                continue

            print(file_path)
            sf_load = self.fs.sfload(str(file_path))
            if sf_load != -1:
                self.soundfonts_list[file] = sf_load
            else:
                logger.warning(f"Не удалось загрузить файл {file} в fluidsynth")

    async def set_volume(self, start_volume: int, target_volume: int, channel: int, transition_duration: float = None) -> bool:
        # Если канал уже в списке на изменение громкости, то меняем целевую громкость
        if channel in self.VOLUME_TARGET_VALUES:
            self.VOLUME_TARGET_VALUES[channel] = target_volume

            while channel in self.VOLUME_TARGET_VALUES:
                await asyncio.sleep(0.05)

            return True

        self.VOLUME_TARGET_VALUES[channel] = target_volume

        duration = (
            transition_duration
            if transition_duration is not None
            else self.TRANSITION_TIME
        )
        delay =  duration / self.TRANSITION_SAMPLES

        volume = int(round( max(0, min(100, start_volume)) / 100 * 127))

        try:
            while True:
                print(f"ЦИКЛ ИТЕРАЦИИ {channel}")
                current_target = self.VOLUME_TARGET_VALUES[channel]
                target_midi_volume = int(round(max(0, min(100, current_target )) / 100 * 127))

                for step in range(1, self.TRANSITION_SAMPLES + 1):
                    # Если кто-то заменил требуемую громкость,
                    # останавливаем процесс ее нынешнего изменения
                    if self.VOLUME_TARGET_VALUES[channel] != current_target:
                        break

                    volume = round(
                        volume + (target_midi_volume - volume) *
                        step / self.TRANSITION_SAMPLES
                    )

                    self.fs.cc(channel, 7, volume)
                    await asyncio.sleep(delay)

                # Если прошлый цикл завершился штатно
                if self.VOLUME_TARGET_VALUES[channel] == current_target:
                    return True
        finally:
            del self.VOLUME_TARGET_VALUES[channel]
    def get_notes_conf(self, pad) -> tuple[list[int], int]:
        if pad.key[-1].lower() == "m":
            mode_scheme = self.MINOR_CHORD_SCHEME
            key = pad.key[:-1]
        else:
            mode_scheme = self.MAJOR_CHORD_SCHEME
            key = pad.key

        if key not in NOTES_LIST:
            logger.warning(f"Переданная тональность не в списке {key}")

        tonic_coef = NOTES_LIST.index(key)
        return mode_scheme, tonic_coef

    def has_preset(self, sfid: int, bank: int, preset: int) -> bool:
        name = self.fs.sfpreset_name(sfid, bank, preset)
        return name is not None

    async def play(self, active_pad_id: int):
        old_pad = self.now_pad
        if old_pad is not None:
            asyncio.create_task(self.stop(old_pad))

        pads_config = settings.get_pads_config().pads
        if not (0 <= active_pad_id <= 16):
            raise
        pad = pads_config[active_pad_id-1]

        channel = self.get_free_channel()
        logger.info(f"ЗАПУСКАЕТСЯ КАНАЛ {channel}")

        mode_scheme, tonic_coef = self.get_notes_conf(pad)

        sfid: int = self.soundfonts_list[pad.soundfont]
        bank = 0
        preset = 88 + pad.type

        if not self.has_preset(sfid, bank, preset):
            self.channels_pool.insert(0, channel)
            await sockets_service.send_to_all("pad_click_error", {"message": f"Ошибка: Soundfont кнопки{active_pad_id} не имеет звуков пэда, замените его в настройках!"} )
            raise Exception("Ошибка запуска soundfont, выбранный инструмент не подходит")

        self.fs.program_select(
            channel,
            sfid,
            bank,
            preset
        )

        octave_coef = 12 * max(0, pad.octave+1)
        notes: list[int] = [
            octave_coef + tonic_coef + mode_scheme[0],
            octave_coef + tonic_coef + mode_scheme[1],
            octave_coef + tonic_coef + mode_scheme[2],
            octave_coef + tonic_coef + mode_scheme[2] - 12,
            octave_coef + tonic_coef + mode_scheme[0] + 12
        ]

        self.now_pad = PlayingPad(
            pad=pad, notes=notes,
            channel=channel
        )

        self.fs.cc(channel, 7, 0)

        for note in notes:
            self.fs.noteon(channel, note, 100)

        await self.set_volume(0, state.volume, channel)

    async def stop(self, pad_data: PlayingPad | None):
        if pad_data is None:
            return

        channel = pad_data.channel
        state.stop_channels.add(channel)

        logger.info(f"ОСТАНАВЛИВАЕТСЯ КАНАЛ {channel}")

        await self.set_volume(
            state.volume,
            0,
            channel
        )

        for note in pad_data.notes:
            self.fs.noteoff(channel, note)
        self.channels_pool.insert(0, channel)

        state.stop_channels.discard(channel)

audio_service = AudioService()