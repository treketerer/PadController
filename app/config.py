from pathlib import Path

from app.schemas.pads_config import PadConfig

# ПУТЬ ДЛЯ SOUNDFONTS
BASE_DIR = Path(__file__).resolve().parent
SOUNDFONTS_UPLOAD_PATH = (BASE_DIR / ".."/ "media/").resolve()

# ПУТЬ К КОНФИГУ
BASE_DIR = Path(__file__).resolve().parent
PADS_CONFIG_PATH = BASE_DIR / "static" / "data.json"

NOTES_LIST = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#',
    'G', 'G#', 'A', 'A#', 'H',
]

TONALITY_LIST = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#',
    'G', 'G#', 'A', 'A#', 'H',
    'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m',
    'Gm', 'G#m', 'Am', 'A#m', 'Hm'
]

BASE_PADS_CONFIG = [
    PadConfig(
        id=i,
        label='',
        key='',
        soundfont='',
        type=1,
        octave=4,
        isStop=False,
        isClean=True
    )
    for i in range(1, 17)
]