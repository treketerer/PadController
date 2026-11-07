from dataclasses import dataclass, field

from app.schemas.pads_config import PadConfig

@dataclass
class StatesClass:
    volume: int = 85
    active_pad: int | None = None
    pads_config: list[PadConfig] | None = None
    stop_channels: set[int] = field(default_factory=set)

state = StatesClass()