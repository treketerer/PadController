from pydantic import BaseModel

class PadConfig(BaseModel):
    id: int
    label: str
    key: str
    soundfont: str
    isClean: bool
    isStop: bool