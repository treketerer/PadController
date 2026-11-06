import React, { useState, useEffect, useRef } from 'react';
import { Settings, X, Upload, Plus, Trash2, Save } from 'lucide-react';
import { Toaster, toast } from "sonner";
import { socketService } from "./sockets";

export interface PadConfig {
  id: number;
  label: string;
  key: string;
  soundfont: string;

  type: number;
  octave:  number;

  isClean: boolean;
  isStop: boolean;
}

export interface ControlsConfig{
  active_pad: number,
  volume: number,
  pads: PadConfig[]
}

const STORAGE_CUSTOM_COLOR_KEY = 'ambient_pad_server_custom_color';

const API_URL = import.meta.env.VITE_API_URL;

export default function App() {

    useEffect(() => {
        socketService.connect();
    }, []);

    const [pads, setPads] = useState<PadConfig[]>([]);

    const fetchPadsCfg = async () => {
            try {
                const response = await fetch(`${API_URL}/config`);

                if (!response.ok){
                    throw new Error("Не удалось получить настройки для pads_config");
                }
                
                const data: ControlsConfig = await response.json();
                console.log(data)
                const pads = data.pads
                if (pads.length === 16){
                    setPads(pads);
                } else{
                    toast.error("Не удалось получить настройки пэдов");
                    throw new Error("Не удалось получить настройки для pads_config");
                }

                const volume = data.volume
                if (volume){
                    setVolume(volume);
                } else{
                    toast.error("Не удалось получить настройки громкости");
                    throw new Error("Не удалось получить настройки громкости");
                }

                const active_pad_id = data.active_pad
                if (active_pad_id && active_pad_id > 0 && active_pad_id < 17){
                    setActivePadId(active_pad_id);
                } else if (active_pad_id !== 0 && active_pad_id !== null){
                    toast.error("Не удалось получить активный пэд");
                    throw new Error("Не удалось получить активный пэд");
                }
            } catch (error) {
                toast.error("Не удалось получить настройки пэдов");
                console.error("Ошибка загрузки конфигурации пэдов:", error);
            }
        };

    useEffect(() => {
        fetchPadsCfg();
    }, []);

    const [soundfonts, setSoundfonts] = useState<string[]>([]);

    const fetchSoundfonts = async () => {
            try {
                const response = await fetch(`${API_URL}/soundfonts`);

                if (!response.ok){
                    toast.error("Не удалось получить soundfonts");
                    throw new Error("Не удалось получить soundfonts");
                }

                let data: string[] = await response.json();
                setSoundfonts(data);
            } catch (_) {
                toast.error("Не удалось получить soundfonts");
                throw new Error("Не удалось получить soundfonts");
                return;
            }
        };

    useEffect(() => {
        fetchSoundfonts();
    }, []);

    const [tonalities, setTonalities] = useState<string[]>([]);

    useEffect(() => {
        const fetchTonalities = async () => {
            try {
                const response = await fetch(`${API_URL}/tonalities`);

                if (!response.ok){
                    toast.error("Не удалось получить тональности");
                    throw new Error("Не удалось получить тональности");
                }

                let data: string[] = await response.json();
                setTonalities(data);
            } catch (_) {
                toast.error("Не удалось получить тональности");
                throw new Error("Не удалось получить тональности");
                return;
            }
        };
        fetchTonalities();
    }, []);

  // Ручная настройка цвета подсветки (HEX)
  const [customColor, setCustomColor] = useState<string>(() => {
    return localStorage.getItem(STORAGE_CUSTOM_COLOR_KEY) || '#a855f7';
  });

    // Крутилка громкости (0..100)
    const [volume, setVolume] = useState<number>(85);

    const volumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleVolumeChange = (value: number) => {
        setVolume(value);

        // Сбрасываем предыдущий таймер
        if (volumeTimeout.current !== null) {
            clearTimeout(volumeTimeout.current);
        }

        // Отправляем только последнее значение
        volumeTimeout.current = setTimeout(async () => {
            try {
              socketService.send("volume_changed", {"value": value});
            } catch (error) {
                console.error(error);
                toast.error("Не удалось применить громкость пэдов");
            }
        }, 100);
    };

  const [activePadId, setActivePadId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'pads' | 'soundfonts'>('pads');
  const [selectedPadId, setSelectedPadId] = useState<number>(1);
  
    // Регистрация сокет хендлеров 
    useEffect(() => {
        const handleVolumeChanged = (data: any) => {
            console.log(data)
            setVolume(data.value);
        };

        socketService.on("volume_changed", handleVolumeChanged);

        return () => {
            socketService.off("volume_changed");
        };
    }, []);

    useEffect(() => {
        const handleClickPad = (data: any) => {
          const active_pad_id = data.active_pad;

          if ((active_pad_id > 0 && active_pad_id < 17) || (active_pad_id === null)){
            setActivePadId(active_pad_id)
          }
        };
        
        socketService.on("pad_click", handleClickPad);

        return () => {
            socketService.off("pad_click");
        };
    }, [pads, activePadId]);

    useEffect(() => {
        const handleGlobalSettingsOpen = (data: any) => {
            toast.warning("Кто-то открыл настройки, возможны конфликты конфигурации!");
        };

        const handleGlobalNewSettings = async (data: any) => {
            toast.warning("Кто-то обновил настройки пэдов, загружаем новые настройки!");
            await fetchPadsCfg();
            await fetchSoundfonts();
        };

        socketService.on("open_settings", handleGlobalSettingsOpen);
        socketService.on("settings_saved", handleGlobalNewSettings);

        return () => {
            socketService.off("open_settings");
            socketService.off("settings_saved");
        };
    }, []);

    useEffect(() => {
        const handleSocketError = (data: any) => {
            toast.error("Ошибка при совершении сетевого действия!" + data.message);
        };

        socketService.on("error", handleSocketError);

        return () => {
            socketService.off("error");
        };
    }, []);
    
  useEffect(() => {
    localStorage.setItem(STORAGE_CUSTOM_COLOR_KEY, customColor);
  }, [customColor]);

  // Логика вращения крутилки громкости
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startValRef = useRef(0);

  const handleKnobPointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startValRef.current = volume;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleKnobPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaY = startYRef.current - e.clientY;
    const newVal = Math.min(100, Math.max(0, Math.round(startValRef.current + deltaY * 0.7)));
    setVolume(newVal);
    handleVolumeChange(newVal);
  };

  const handleKnobPointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const [stopPadId, setStopPadId] = useState<number | null>(null);

  // Клик по плитке
  const handlePadPress = (pad: PadConfig, need_send_click = true) => {
    console.log(pad)

    if (pad.isClean) {
      return;
    } else if (pad.isStop) {
      setActivePadId(null);
      setStopPadId(pad.id);
      setTimeout(() => setStopPadId(null), 175);

      if (need_send_click){
        socketService.send("pad_click", {"active_pad": null});
      }
    } else if (pad.soundfont === "" || pad.key === ""){
      toast.warning("Выбран пэд без указания набора звуков или тональности. Проверьте настройки");
      return;
    }  else {
      const active = pad.id === activePadId ? null : pad.id
      setActivePadId(active);

      if (need_send_click){
        socketService.send("pad_click", {"active_pad": active});
      }
    }  
  };

  // Выбор тональности из 24 вариантов (автоматически ставит подпись и подтягивает саундфонт)
  const handleSelectTonality = (keyName: string) => {
    setPads(prev =>
      prev.map(p => {
        if (p.id === selectedPadId) {
          const sf = p.soundfont?.trim() ? p.soundfont : (soundfonts[0] || '.sf2');
          return {
            ...p,
            isClean: false,
            isStop: false,
            key: keyName,
            label: keyName,
            type: 0,
            octave: 0,
            soundfont: sf,
          };
        }
        return p;
      })
    );
  };

  // Установка кнопки СТОП (сохраняя саундфонт в фоне, чтобы он не терялся при возврате)
  const handleSetStopMode = () => {
    setPads(prev =>
      prev.map(p => {
        if (p.id === selectedPadId) {
          return {
            ...p,
            isClean: false,
            isStop: true,
            key: '',
            label: 'СТОП',

            type: 0,
            octave: 0,

            soundfont: p.soundfont?.trim() ? p.soundfont : (soundfonts[0] || '.sf2'),
          };
        }
        return p;
      })
    );
  };

  const  handleSetCleanMode = () => {
    setPads(prev =>
      prev.map(p => {
        if (p.id === selectedPadId) {
          return {
            ...p,
            isClean: true,
            isStop: false,
            key: '',
            label: '',
            type: 0,
            octave: 0,
            soundfont: '',
          };
        }
        return p;
      })
    );
  };

  const handleSetPadType = (type: number) => {
    setPads(prev =>
      prev.map(p => (p.id === selectedPadId ? { ...p, type: type } : p))
    );
  }

  const handleSetPadOctave = (octave: number) => {
    setPads(prev =>
      prev.map(p => (p.id === selectedPadId ? { ...p, octave: octave } : p))
    );
  }

  // Смена саундфонта у пэда
  const handleSetPadSoundfont = (sf: string) => {
    setPads(prev =>
      prev.map(p => (p.id === selectedPadId ? { ...p, soundfont: sf } : p))
    );
  };

  // Применить саундфонт ко всем пэдам
  const handleApplySoundfontToAll = (sf: string) => {
    const updatedPads = pads.map(p =>
      p.isStop || p.isClean ? p : { ...p, soundfont: sf }
    );

    setPads(updatedPads);
    handleSaveConfig(updatedPads);
  };

  const handleSaveConfig = async (custom_pads: PadConfig[] | undefined = undefined) => {
      try {
          const set_pads = custom_pads ? custom_pads : pads;

          console.log(JSON.stringify(set_pads))
          const response = await fetch(`${API_URL}/config`, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json"
              },
              body: JSON.stringify(set_pads)
          });

          if (!response.ok) {
              toast.error("Не удалось сохранить настройки");
              throw new Error("Не удалось сохранить настройки");
          }
          
          socketService.send("settings_saved", {})
          await fetchPadsCfg();
          await fetchSoundfonts();
          toast.success("Конфигурация сохранена");

      } catch (error) {
          console.error("Не удалось сохранить настройки:", error);
          toast.error("Не удалось сохранить настройки");
      }
  };

  const handleDeleteSoundfont = async (filename: string) => {
      try {
          const response = await fetch(
              `${API_URL}/soundfonts/${encodeURIComponent(filename)}`,
              { method: "DELETE" }
          );

          if (!response.ok) {
            toast.error("Не удалось удалить файл");
            throw new Error("Не удалось удалить файл");
          }
          
          await fetchPadsCfg();
          await fetchSoundfonts();
          socketService.send("settings_saved", {})

      } catch (error) {
          console.error("Ошибка удаления SoundFont:", error);
      }
  };

  const handleFileUpload = async (
      event: React.ChangeEvent<HTMLInputElement>
  ) => {
      const files = event.target.files;

      if (!files || files.length === 0) return;

      try {
          for (const file of Array.from(files)) {
              const formData = new FormData();
              formData.append("file", file);

              const response = await fetch(`${API_URL}/soundfonts/`, {
                  method: "POST",
                  body: formData
              });

              if (!response.ok) {
                  if (response.status == 409){
                       toast.warning(`Файл ${file.name} не был отправлен, потому что уже есть на сервере.`);
                  }
                  console.log(`Ошибка загрузки: ${file.name} ${response.status}`);
              } else{
                  toast.success(`Файл ${file.name} был успешно загружен на сервер!`);
              }
          }

          await fetchPadsCfg();
          await fetchSoundfonts();

      } catch (error) {
          console.error("Ошибка загрузки SoundFont:", error);
      } finally {
          event.target.value = "";
      }
  };

  const currentPad = pads.find(p => p.id === selectedPadId) || pads[0];
  const knobAngle = -135 + (volume / 100) * 270;

  return (
  <>
    <Toaster theme="dark" position="top-left" richColors />

    <div className="h-screen w-screen max-h-screen overflow-hidden bg-[#090a0d] text-[#f1f3f7] flex flex-col select-none">
      {/* Лаконичная верхняя строка */}
      <header className="h-11 shrink-0 px-3 sm:px-6 border-b border-[#181a22] bg-[#0d0e14] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="w-2.5 h-2.5 rounded-full transition-colors"
            style={{ backgroundColor: customColor }}
          />
          <span className="text-xs sm:text-sm font-bold tracking-wide text-neutral-200">
            Пэд-станция
          </span>
        </div>

        {/* Мелкая плашечка громкости (ЧИСТО НА МОБИЛЕ) */}
        <div className="flex sm:hidden items-center gap-1.5 px-2 py-0.5 bg-[#141620] border border-[#232636] rounded-md text-xs">
          <span className="text-[10px] text-neutral-400 font-mono">Громк:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-14 h-1 bg-[#232636] rounded cursor-pointer"
            style={{ accentColor: customColor }}
          />
          <span className="font-mono text-[10px] text-neutral-300 w-6 text-right tabular-nums">
            {volume}%
          </span>
        </div>

        <button
          onClick={() => {
              socketService.send("open_settings", {})
              setIsSettingsOpen(true);
            }
          }
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-[#151722] hover:bg-[#1e202e] text-neutral-300 hover:text-white border border-[#232636] rounded-md text-xs font-medium transition-colors shrink-0"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Настроить</span>
        </button>
      </header>

      {/* Основная адаптивная область: слева крутилка (на планшете/ПК), справа 16 пэдов (БЕЗ СКРОЛЛА) */}
      <main className="flex-1 min-h-0 flex items-stretch p-2 sm:p-4 gap-2 sm:gap-4 overflow-hidden">
        {/* Крутилка громкости слева (СКРЫТА НА МОБИЛЕ, ВИДНА НА ПЛАНШЕТЕ И ПК) */}
        <div className="hidden sm:flex w-20 sm:w-24 shrink-0 bg-[#0d0f15] border border-[#1b1e28] rounded-xl flex-col items-center justify-center p-2">
          <span className="text-[10px] text-neutral-400 font-medium mb-3">Громкость</span>

          <div
            onPointerDown={handleKnobPointerDown}
            onPointerMove={handleKnobPointerMove}
            onPointerUp={handleKnobPointerUp}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-[#202330] to-[#11131a] border-2 border-[#2b2f3e] cursor-ns-resize flex items-center justify-center touch-none active:scale-95 transition-transform"
          >
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#151722] relative flex items-center justify-center pointer-events-none"
              style={{ transform: `rotate(${knobAngle}deg)` }}
            >
              <div
                className="absolute top-1 w-1 h-2.5 rounded-full"
                style={{ backgroundColor: customColor }}
              />
            </div>
          </div>

          <span className="font-mono text-xs font-bold text-neutral-300 tabular-nums mt-3">
            {volume}%
          </span>
        </div>

        {/* 16 плиток (4x4) на весь остаток экрана — ЧИСТЫЙ МАТОВЫЙ СТИЛЬ БЕЗ БЛУМА */}
        <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center h-full">
          <div className="grid grid-cols-4 grid-rows-4 gap-1.5 sm:gap-3 w-full h-full max-h-full max-w-4xl p-1.5 sm:p-2 bg-[#0b0c11] border border-[#181a24] rounded-xl">
            {pads.map((pad) => {
              const isActive = activePadId === pad.id;

              return (
                <button
                  key={pad.id}
                  onClick={() => handlePadPress(pad)}
                  className="relative h-full w-full flex flex-col justify-between p-1.5 sm:p-3 rounded-lg select-none active:scale-[0.98] text-left transition-colors"
                  style={{
                    backgroundColor: isActive
                      ? pad.isStop
                        ? '#261215'
                        : `${customColor}24`
                      : '#13151e',
                    border: stopPadId === pad.id
                      ? '2px solid #f43f5e'
                      : isActive
                      ? `2px solid ${pad.isStop ? '#f43f5e' : customColor}`
                      : '1px solid #1f2230',
                  }}
                >
                  {/* Номер кнопки */}
                  <span
                    className="text-[9px] sm:text-[10px] font-mono leading-none"
                    style={{ color: isActive ? (pad.isStop ? '#fb7185' : customColor) : '#5b6172' }}
                  >
                    {pad.id}
                  </span>

                  {/* Крупная надпись тональности (аккуратно уменьшена на мобилке) */}
                  <div className="my-auto text-center w-full">
                    <span
                      className={`block font-extrabold leading-none tracking-tight ${
                        (pad.isStop || pad.isClean)
                          ? 'text-rose-400 text-base sm:text-2xl md:text-3xl'
                          : isActive
                            ? 'text-white text-lg sm:text-2xl md:text-3xl lg:text-4xl'
                            : 'text-neutral-200 text-lg sm:text-2xl md:text-3xl lg:text-4xl'
                      }`}
                    >
                      {pad.label}
                    </span>
                  </div>

                  {/* Нижняя надпись саундфонта */}
                  <div className="w-full truncate text-[8px] sm:text-[10px] font-mono border-t border-white/[0.04] pt-0.5">
                    <span className="text-neutral-500">
                      {pad.isClean ? '—' : (pad.isStop) ? 'СТОП' : (pad.soundfont ? pad.soundfont.replace('.sf2', '') : '—')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Меню настроек с разделением на подразделы */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md h-full bg-[#101218] border-l border-[#202330] flex flex-col shadow-2xl">
            {/* Шапка настроек с переключателем подразделов */}
            <div className="p-3 border-b border-[#202330] bg-[#13151f] flex items-center justify-between gap-2">
              <div className="flex bg-[#0b0c12] p-1 rounded-lg border border-[#202332]">
                <button
                  onClick={() => {
                      setSettingsTab('pads');
                      handleSaveConfig();
                      }
                  }
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    settingsTab === 'pads'
                      ? 'bg-[#252838] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Пэды (16)
                </button>
                <button
                  onClick={() => {
                      setSettingsTab('soundfonts');
                      handleSaveConfig();
                      }
                  }
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    settingsTab === 'soundfonts'
                      ? 'bg-[#252838] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Саундфонты (.sf2)
                </button>
              </div>

              <button
                onClick={() => {
                    setIsSettingsOpen(false);
                  }
                }
                className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-[#1a1d28] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Тело настроек: Подраздел 1 — Настройка пэдов */}
            {settingsTab === 'pads' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* 1. Ручная накрутка цвета подсветки */}
                <div className="bg-[#141620] border border-[#202330] rounded-xl p-3">
                  <span className="block font-semibold text-neutral-300 mb-2">
                    Цвет активной кнопки:
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-9 h-9 rounded cursor-pointer border border-[#2f3244] bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      placeholder="#a855f7"
                      className="flex-1 bg-[#0c0d13] border border-[#232636] rounded px-3 py-1.5 text-xs text-white font-mono uppercase focus:outline-none"
                    />
                    <div
                      className="w-6 h-6 rounded-md shrink-0 border border-white/10"
                      style={{ backgroundColor: customColor }}
                    />
                  </div>
                </div>

                {/* 2. Выбор кнопки 1..16 */}
                <div>
                  <span className="block font-semibold text-neutral-300 mb-1.5">
                    Выберите кнопку:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 bg-[#0b0c12] p-2 rounded-xl border border-[#1c1e28]">
                    {pads.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPadId(p.id)}
                        className="py-2 text-xs font-mono rounded border transition-colors"
                        style={{
                          backgroundColor: p.id === selectedPadId ? customColor : '#13151f',
                          borderColor: p.id === selectedPadId ? customColor : '#202330',
                          color: p.id === selectedPadId ? '#ffffff' : '#9ca3af',
                          fontWeight: p.id === selectedPadId ? 700 : 400,
                        }}
                      >
                        {p.id}. {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Настройка выбранной кнопки: 24 тональности или СТОП */}
                <div className="bg-[#141620] border border-[#202330] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#212432]">
                    <span className="font-bold text-white">Кнопка #{currentPad.id}</span>
                  </div>
                  
                  <div className="bg-[#13151f] flex items-center justify-between gap-2">
                    {/* Очистка кнопки от тональности */}
                    <button
                      onClick={handleSetCleanMode}
                      className={`w-full py-1.5 rounded border text-xs font-semibold transition-colors ${
                        currentPad.isClean
                          ? 'bg-rose-950/70 text-rose-300 border-rose-500'
                          : 'bg-[#0f1118] text-neutral-400 border-[#202332] hover:text-neutral-200'
                      }`}
                    >
                      Пустая кнопка
                    </button>

                    {/* Режим кнопки СТОП */}
                    <button
                      onClick={handleSetStopMode}
                      className={`w-full py-1.5 rounded border text-xs font-semibold transition-colors ${
                        currentPad.isStop
                          ? 'bg-rose-950/70 text-rose-300 border-rose-500'
                          : 'bg-[#0f1118] text-neutral-400 border-[#202332] hover:text-neutral-200'
                      }`}
                    >
                      Сделать кнопкой СТОП
                    </button>
                  </div>

                  {/* 24 Тональности */}
                  <div>
                    <span className="block text-[11px] text-neutral-400 mb-1">
                      Тональности:
                    </span>
                    
                    <div className="grid grid-cols-6 gap-1 mb-2">
                      {(tonalities.length > 0) ? (
                        tonalities.map((note) => (
                          <button
                            key={note}
                            onClick={() => handleSelectTonality(note)}
                            className="py-1 rounded border text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: !currentPad.isStop && currentPad.key === note ? customColor : '#0e1017',
                              borderColor: !currentPad.isStop && currentPad.key === note ? customColor : '#202332',
                              color: !currentPad.isStop && currentPad.key === note ? '#ffffff' : '#d1d5db',
                              fontWeight: !currentPad.isStop && currentPad.key === note ? 700 : 400,
                            }}
                          >
                            {note}
                          </button>
                        ))
                      ) : (
                        <span className="col-span-6 block font-semibold text-neutral-300 mb-1.5">
                          Библиотека тональностей пуста!!!
                        </span>
                      )}
                    </div>
                  </div>
                    
                  <div className="bg-[#141620] rounded-xl p-1 space-y-1">
                    {!currentPad.isStop && !currentPad.isClean && (
                      <div className="grid grid-cols-2 gap-3">

                        <div>
                          <span className="text-neutral-400 block mb-1">Тип пэда:</span>
                          <select
                            value={currentPad.type}
                            onChange={(e) => handleSetPadType(Number(e.target.value))}
                            className="w-full bg-[#0c0d13] border border-[#242738] rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                          >
                            <option value={1}>Тип 1</option>
                            <option value={2}>Тип 2</option>
                            <option value={3}>Тип 3</option>
                          </select>
                        </div>

                        <div>
                          <span className="text-neutral-400 block mb-1">Октава:</span>
                          <input
                            type="number"
                            min={-10}
                            max={10}
                            step={1}
                            value={currentPad.octave}
                            onChange={(e) => handleSetPadOctave(Math.max(-10, Math.min(10, Number(e.target.value))))}
                            className="w-full bg-[#0c0d13] border border-[#242738] rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Назначенный саундфонт */}
                  {(!currentPad.isStop && !currentPad.isClean) && (
                    <div className="p-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-neutral-400">Саундфонт кнопки:</span>
                        <button
                          onClick={() => handleApplySoundfontToAll(currentPad.soundfont)}
                          className="text-[11px] text-neutral-400 hover:text-white underline"
                        > 
                          Ко всем 16
                        </button> 
                      </div>

                      {soundfonts.length > 0 ? (
                        <select
                          value={currentPad.soundfont || ""}
                          onChange={(e) => handleSetPadSoundfont(e.target.value)}
                          className="w-full bg-[#0c0d13] border border-[#242738] rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                        >
                          <option value="">— Не выбран —</option>

                          {soundfonts.map((sf) => (
                            <option key={sf} value={sf}>
                              {sf}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-s text-gray-400 font-mono">
                          Библиотека soundfont пуста!!!
                        </span>
                      )}
                    </div>
                  )}



                </div>
              </div>
            )}

            {/* Тело настроек: Подраздел 2 — Саундфонты (ОТДЕЛЬНЫЙ ПОДРАЗДЕЛ) */}
            {settingsTab === 'soundfonts' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* Отгрузка файла .sf2 */}
                <div className="bg-[#141620] border border-[#202330] rounded-xl p-3 text-center">
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();

                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        handleFileUpload({
                          target: { files }
                        } as React.ChangeEvent<HTMLInputElement>);
                      }
                    }}
                    className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-[#292d3e] hover:border-neutral-500 rounded-lg cursor-pointer transition-colors"
                  >
                    <Upload className="w-5 h-11 text-neutral-400 mb-1.5" />

                    <span className="text-xs font-semibold text-neutral-200">
                      Отгрузить файл Soundfont (.sf2)
                    </span>

                    <span className="text-[10px] text-neutral-500 mt-0.5">
                      Нажмите для выбора с устройства или перетащите файл
                    </span>

                    <input
                      type="file"
                      accept=".sf2,.sf3,.dls"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Список загруженных саундфонтов */}
                <div className="bg-[#141620] border border-[#202330] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#212432]">
                    <span className="font-semibold text-neutral-300">
                      Библиотека ({soundfonts.length})
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {soundfonts.map((sf) => (
                      <div
                        key={sf}
                        className="flex items-center justify-between p-2 bg-[#0c0d13] border border-[#1e202c] rounded font-mono text-[11px]"
                      >
                        <span className="truncate max-w-[210px] text-neutral-300">{sf}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApplySoundfontToAll(sf)}
                            className="text-[10px] text-neutral-400 hover:text-white underline font-sans"
                            title="Назначить этот саундфонт на все 16 пэдов"
                          >
                            Ко всем
                          </button>
                            <button
                                onClick={() => handleDeleteSoundfont(sf)}
                                className="text-neutral-500 hover:text-rose-400 p-0.5"
                                title="Удалить"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Подвал настроек */}
            <div className="p-3 border-t border-[#202330] bg-[#13151f] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={() => {
                    handleSaveConfig()
                    localStorage.setItem(STORAGE_CUSTOM_COLOR_KEY, customColor);
                    setIsSettingsOpen(false);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
                style={{ backgroundColor: customColor }}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Сохранить</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
  );
}
