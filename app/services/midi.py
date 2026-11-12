import mido
import asyncio

from app.services.sockets_service import sockets_service

import logging

from app.state import state

logger = logging.getLogger(__name__)

class MidiController:
    """
    Контроллер MIDI устройства

    Необходимо задать loop через set_loop
    """
    loop = None
    def __init__(self):
        self.device_base_name = 'MPD218'

        self.input_port_name = None
        self.output_port_name = None
        self.input_port = None
        self.output_port = None

        self.setting_ports()

    def set_loop(self, loop):
        if MidiController.loop is None:
            MidiController.loop = loop

    def setting_ports(self):
        self.input_port_name = next((name for name in mido.get_input_names() if self.device_base_name in name), None)
        self.output_port_name = next((name for name in mido.get_output_names() if self.device_base_name in name), None)

        if not self.input_port_name or not self.output_port_name:
            logger.warning("MPD218 не найден! Проверьте подключение.")
            return False

        self.input_port = mido.open_input(self.input_port_name)
        self.output_port = mido.open_output(self.output_port_name)

        return True

    def midi_listener(self):
        from app.services import sockets_actions

        # Внешний while True нужен на случай, если устройство переподключат
        while True:
            if not self.setting_ports():
                logger.warning("MPD218 не найден! Проверьте подключение.")
                return

            try:
                for msg in self.input_port:  # Этот цикл блокирует поток и ждет нажатий
                    logger.debug(f"\nТип: {msg.type}, Сообщение: {msg}")
                    if msg.type == "note_on":
                        logger.debug(f"КЛИК ПО {msg.note}")

                        old_active = state.active_pad
                        future = asyncio.run_coroutine_threadsafe(
                            sockets_actions.pad_click(msg.note),
                            MidiController.loop
                        )
                        is_success = future.result()

                        logger.debug(f"После клика активный канал: {state.active_pad}")
                        # Если выключено повторным нажатием
                        if state.active_pad is None and is_success == True:
                            asyncio.run_coroutine_threadsafe(
                                sockets_service.send_to_all("pad_click", {"active_pad": None}),
                                MidiController.loop
                            )

                            self.light_off_all_device_pads()

                        # Включен пэд
                        elif is_success == True:
                            asyncio.run_coroutine_threadsafe(
                                sockets_service.send_to_all("pad_click", {"active_pad": msg.note}),
                                MidiController.loop
                            )

                            self.light_on_device_pad(state.active_pad)

                        # Кнопка стоп
                        elif is_success == "СТОП":
                            if old_active is not None:
                                self.light_off_all_device_pads()

                            asyncio.run_coroutine_threadsafe(
                                sockets_service.send_to_all("pad_click", {"click_pad": msg.note}),
                                MidiController.loop
                            )

                    elif msg.type == "control_change":
                        print(f"КРУТИЛКА {msg.value}")
                        print(int(msg.value) / 127 * 100)
                        value = min(100, max(0, round(int(msg.value) / 127 * 100)))
                        asyncio.run_coroutine_threadsafe(
                            sockets_service.send_to_all("volume_changed", {"value": value}),
                            MidiController.loop
                        )

                        asyncio.run_coroutine_threadsafe(
                            sockets_actions.volume_change(value),
                            MidiController.loop
                        )
            except Exception as ex:
                logger.exception(ex)

    def light_on_device_pad(self, pad_id):
        if not self.setting_ports():
            logger.warning("MPD218 не найден! Проверьте подключение.")
            return

        if self.output_port is not None:
            self.output_port.send(mido.Message(
                "note_on", channel=0, note=pad_id, velocity=127
            ))

    def light_off_device_pad(self, pad_id):
        if not self.setting_ports():
            logger.warning("MPD218 не найден! Проверьте подключение.")
            return

        if pad_id is not None:
            self.output_port.send(mido.Message(
                "note_off", channel=0, note=pad_id, velocity=127
            ))

    def light_off_all_device_pads(self):
        if not self.setting_ports():
            logger.warning("MPD218 не найден! Проверьте подключение.")
            return

        for pad in range(1, 17):
            self.output_port.send(mido.Message(
                "note_off", channel=0, note=pad, velocity=127
            ))

midi_controller = MidiController()