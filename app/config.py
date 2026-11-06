from pathlib import Path

PADS_CONFIG_PATH = Path('static/data.json').resolve()

TONALITY_LIST = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#',
    'G', 'G#', 'A', 'A#', 'H',
    'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m',
    'Gm', 'G#m', 'Am', 'A#m', 'Hm'
]

BASE_PADS_CONFIG = [
    {
        "id": i,
        "label": '',
        "key": '',
        "soundfont": '',
        "type": 0,
        "octave": 0,
        "isStop": False,
        "isClean": True
    }
    for i in range(1, 17)
]