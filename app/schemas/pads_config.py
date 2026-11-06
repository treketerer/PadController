from pydantic import BaseModel

class PadConfig(BaseModel):
    id: int
    label: str
    key: str
    soundfont: str
    type: int
    isClean: bool
    isStop: bool