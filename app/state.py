from dataclasses import dataclass

@dataclass
class StatesClass:
    volume: int = 85
    active_pad: int | None = None

state = StatesClass()