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

class AudioService:
    def __init__(self):
        self.now_pad: PlayingPad | None = None

        self.fs = fluidsynth.Synth(
            gain=0.75,
            samplerate=44100
        )
        self.fs.start()  # Запускает вывод звука

        self.MAJOR_CHORD_SCHEME: list[int] = [0, 4, 7]
        self.MINOR_CHORD_SCHEME: list[int] = [0, 3, 7]

        self.soundfonts_list: dict[str, int] = {}
        self.sf_extensions = {".sf2", ".sf3", ".dls"}

        self.TRANSITION_TIME: float = 1.5
        self.TRANSITION_SAMPLES: int = 20

        self.update_soundfonts_list()

    def get_pad_channel(self, pad: PadConfig):
        return max(0, pad.id - 1)

    def now_pad_channel(self):
        if self.now_pad is None:
            return None
        return max(0, self.now_pad.pad.id - 1)

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

    async def set_volume(self, start_volume: int, target_volume: int, channel: int, transition_duration: float = None):
        duration = transition_duration if transition_duration else self.TRANSITION_TIME
        delay =  duration / self.TRANSITION_SAMPLES

        start_midi_volume = int(round( max(2, min(100, start_volume)) / 100 * 127))
        target_midi_volume = int(round(max(2, min(100, target_volume)) / 100 * 127))

        for step in range(1, self.TRANSITION_SAMPLES + 1):
            volume = round(
                start_midi_volume + (target_midi_volume - start_midi_volume) *
                step / self.TRANSITION_SAMPLES
            )

            self.fs.cc(channel, 7, volume)
            await asyncio.sleep(delay)

    def get_notes_conf(self, pad) -> tuple[list[int], int]:
        if pad.key[-1].lower() == "m":
            mode_scheme = self.MINOR_CHORD_SCHEME
            key = pad.key[:-1]
        else:
            mode_scheme = self.MAJOR_CHORD_SCHEME
            key = pad.key

        logger.warning(f"{mode_scheme} {key} {NOTES_LIST} {pad}")
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
        print(pads_config)
        if 0 <= active_pad_id >= 17:
            raise
        pad = pads_config[active_pad_id-1]

        channel = max(0, pad.id - 1)
        logger.info(f"ЗАПУСКАЕТСЯ КАНАЛ {channel}")

        mode_scheme, tonic_coef = self.get_notes_conf(pad)

        sfid: int = self.soundfonts_list[pad.soundfont]
        bank = 0
        preset = 88 + pad.type

        if not self.has_preset(sfid, bank, preset):
            await sockets_service.send_to_all("pad_click_error", {"message": f"Ошибка: Soundfont кнопки{active_pad_id} не имеет звуков пэда, замените его в настройках!"} )
            raise Exception("Ошибка запуска soundfont, выбранный инструмент не подходит")

        self.fs.program_select(
            channel,
            sfid,
            bank,
            preset
        )

        octave_coef = 12 * pad.octave
        notes: list[int] = [
            octave_coef + tonic_coef + mode_scheme[0],
            octave_coef + tonic_coef + mode_scheme[1],
            octave_coef + tonic_coef + mode_scheme[2],
            octave_coef + tonic_coef + mode_scheme[0] + 12
        ]

        now_pad_data = PlayingPad(
            pad=pad, notes=notes
        )

        self.fs.cc(channel, 7, 0)

        logger.info(f"PLAYING NOTES {notes}")
        self.fs.noteon(channel, notes[0], 100)
        self.fs.noteon(channel, notes[1], 100)
        self.fs.noteon(channel, notes[2], 100)
        self.fs.noteon(channel, notes[3], 100)

        self.now_pad = now_pad_data

        await self.set_volume(0, state.volume, channel)

    async def stop(self, pad_data: PlayingPad | None):
        channel = self.get_pad_channel(pad_data.pad)
        state.stop_channels.add(channel)

        logger.info(f"ОСТАНАВЛИВАЕТСЯ КАНАЛ {channel}")
        self.fs.program_select(
            channel,
            self.soundfonts_list[pad_data.pad.soundfont],
            0,
            88 + pad_data.pad.type
        )

        await self.set_volume(state.volume, 0, channel)

        self.fs.noteoff(channel, pad_data.notes[0])
        self.fs.noteoff(channel, pad_data.notes[1])
        self.fs.noteoff(channel, pad_data.notes[2])
        self.fs.noteoff(channel, pad_data.notes[3])

        state.stop_channels.discard(channel)

audio_service = AudioService()