from pydantic import BaseModel, Field


class PadConfig(BaseModel):
    id: int
    label: str
    key: str
    soundfont: str

    type: int = Field(default=1, ge=1, le=8)
    octave: int = Field(default=4, ge=1, le=9)

    isClean: bool
    isStop: bool