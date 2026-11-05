import React, { useState, useEffect, useRef } from 'react';
import { Settings, X, Upload, Plus, Trash2, Save } from 'lucide-react';

export interface PadConfig {
  id: number;
  label: string;
  key: string;
  soundfont: string;
  isStop: boolean;
}

const STORAGE_PADS_KEY = 'ambient_pad_server_pads';
const STORAGE_SOUNDFONTS_KEY = 'ambient_pad_server_soundfonts';
const STORAGE_VOLUME_KEY = 'ambient_pad_server_volume';
const STORAGE_CUSTOM_COLOR_KEY = 'ambient_pad_server_custom_color';

// 24 музыкальные тональности (12 мажоров и 12 миноров)
const TONALITIES_MAJOR = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const TONALITIES_MINOR = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm'];

const DEFAULT_SOUNDFONTS = [
  'Warm_Ambient.sf2',
  'Lush_Strings.sf2',
  'Celestial_Choir.sf2',
  'Soft_Air_Pad.sf2'
];

const DEFAULT_PADS: PadConfig[] = [
  { id: 1, label: 'C', key: 'C', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 2, label: 'D', key: 'D', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 3, label: 'E', key: 'E', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 4, label: 'F', key: 'F', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 5, label: 'G', key: 'G', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 6, label: 'A', key: 'A', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 7, label: 'B', key: 'B', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 8, label: 'C#', key: 'C#', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 9, label: 'Eb', key: 'Eb', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 10, label: 'F#', key: 'F#', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 11, label: 'Ab', key: 'Ab', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 12, label: 'Bb', key: 'Bb', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 13, label: 'Am', key: 'Am', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 14, label: 'Em', key: 'Em', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 15, label: 'Dm', key: 'Dm', soundfont: 'Warm_Ambient.sf2', isStop: false },
  { id: 16, label: 'СТОП', key: '', soundfont: 'Warm_Ambient.sf2', isStop: true },
];

export default function App() {
  const [pads, setPads] = useState<PadConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PADS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 16) {
          // Гарантируем, что у всех пэдов есть валидный саундфонт
          return parsed.map(p => ({
            ...p,
            soundfont: p.soundfont?.trim() ? p.soundfont : 'Warm_Ambient.sf2',
          }));
        }
      }
    } catch (_) {}
    return DEFAULT_PADS;
  });

  const [soundfonts, setSoundfonts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SOUNDFONTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_SOUNDFONTS;
  });

  // Ручная настройка цвета подсветки (HEX)
  const [customColor, setCustomColor] = useState<string>(() => {
    return localStorage.getItem(STORAGE_CUSTOM_COLOR_KEY) || '#a855f7';
  });

  // Крутилка громкости (0..100)
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_VOLUME_KEY);
    return saved ? Number(saved) : 85;
  });

  const [activePadId, setActivePadId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'pads' | 'soundfonts'>('pads');
  const [selectedPadId, setSelectedPadId] = useState<number>(1);
  const [newSoundfontInput, setNewSoundfontInput] = useState('');

  // Автосохранение
  useEffect(() => {
    localStorage.setItem(STORAGE_PADS_KEY, JSON.stringify(pads));
  }, [pads]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SOUNDFONTS_KEY, JSON.stringify(soundfonts));
  }, [soundfonts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_VOLUME_KEY, volume.toString());
  }, [volume]);

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
  };

  const handleKnobPointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  // Клик по плитке
  const handlePadPress = (pad: PadConfig) => {
    if (pad.isStop) {
      setActivePadId(null);
    } else {
      setActivePadId(pad.id === activePadId ? null : pad.id);
    }
  };

  // Выбор тональности из 24 вариантов (автоматически ставит подпись и подтягивает саундфонт)
  const handleSelectTonality = (keyName: string) => {
    setPads(prev =>
      prev.map(p => {
        if (p.id === selectedPadId) {
          const sf = p.soundfont?.trim() ? p.soundfont : (soundfonts[0] || 'Warm_Ambient.sf2');
          return {
            ...p,
            isStop: false,
            key: keyName,
            label: keyName,
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
            isStop: true,
            key: '',
            label: 'СТОП',
            soundfont: p.soundfont?.trim() ? p.soundfont : (soundfonts[0] || 'Warm_Ambient.sf2'),
          };
        }
        return p;
      })
    );
  };

  // Смена саундфонта у пэда
  const handleSetPadSoundfont = (sf: string) => {
    setPads(prev =>
      prev.map(p => (p.id === selectedPadId ? { ...p, soundfont: sf } : p))
    );
  };

  // Применить саундфонт ко всем пэдам
  const handleApplySoundfontToAll = (sf: string) => {
    setPads(prev => prev.map(p => (p.isStop ? p : { ...p, soundfont: sf })));
  };

  // Добавить саундфонт в библиотеку
  const handleAddSoundfont = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const finalName = clean.endsWith('.sf2') ? clean : `${clean}.sf2`;
    if (!soundfonts.includes(finalName)) {
      setSoundfonts(prev => [...prev, finalName]);
    }
    handleSetPadSoundfont(finalName);
    setNewSoundfontInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(f => handleAddSoundfont(f.name));
    e.target.value = '';
  };

  const currentPad = pads.find(p => p.id === selectedPadId) || pads[0];
  const knobAngle = -135 + (volume / 100) * 270;

  return (
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
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-14 h-1 bg-[#232636] rounded cursor-pointer"
            style={{ accentColor: customColor }}
          />
          <span className="font-mono text-[10px] text-neutral-300 w-6 text-right tabular-nums">
            {volume}%
          </span>
        </div>

        <button
          onClick={() => setIsSettingsOpen(true)}
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
                    border: isActive
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
                        pad.isStop
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
                      {pad.isStop ? 'СТОП' : (pad.soundfont ? pad.soundfont.replace('.sf2', '') : '—')}
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
                  onClick={() => setSettingsTab('pads')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    settingsTab === 'pads'
                      ? 'bg-[#252838] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Пэды (16)
                </button>
                <button
                  onClick={() => setSettingsTab('soundfonts')}
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
                onClick={() => setIsSettingsOpen(false)}
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
                    <span className="font-mono text-neutral-300">{currentPad.label}</span>
                  </div>

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

                  {/* 24 Тональности */}
                  <div>
                    <span className="block text-[11px] text-neutral-400 mb-1">
                      Мажорные тональности (12):
                    </span>
                    <div className="grid grid-cols-6 gap-1 mb-2">
                      {TONALITIES_MAJOR.map((note) => (
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
                      ))}
                    </div>

                    <span className="block text-[11px] text-neutral-400 mb-1">
                      Минорные тональности (12):
                    </span>
                    <div className="grid grid-cols-6 gap-1">
                      {TONALITIES_MINOR.map((note) => (
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
                      ))}
                    </div>
                  </div>

                  {/* Назначенный саундфонт */}
                  {!currentPad.isStop && (
                    <div className="pt-2 border-t border-[#212432]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-neutral-400">Саундфонт кнопки:</span>
                        <button
                          onClick={() => handleApplySoundfontToAll(currentPad.soundfont)}
                          className="text-[11px] text-neutral-400 hover:text-white underline"
                        >
                          Ко всем 16
                        </button>
                      </div>
                      <select
                        value={currentPad.soundfont || soundfonts[0] || ''}
                        onChange={(e) => handleSetPadSoundfont(e.target.value)}
                        className="w-full bg-[#0c0d13] border border-[#242738] rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                      >
                        {soundfonts.map((sf) => (
                          <option key={sf} value={sf}>
                            {sf}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Тело настроек: Подраздел 2 — Саундфонты (ОТДЕЛЬНЫЙ ПОДРАЗДЕЛ) */}
            {settingsTab === 'soundfonts' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* Отгрузка файла .sf2 */}
                <div className="bg-[#141620] border border-[#202330] rounded-xl p-4 text-center">
                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-[#292d3e] hover:border-neutral-500 rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-5 h-5 text-neutral-400 mb-1.5" />
                    <span className="text-xs font-semibold text-neutral-200">
                      Отгрузить файл Soundfont (.sf2)
                    </span>
                    <span className="text-[10px] text-neutral-500 mt-0.5">
                      Нажмите для выбора с устройства
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

                {/* Добавить вручную */}
                <div className="bg-[#141620] border border-[#202330] rounded-xl p-3.5 space-y-2">
                  <span className="block font-semibold text-neutral-300">
                    Или добавить по имени:
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newSoundfontInput}
                      onChange={(e) => setNewSoundfontInput(e.target.value)}
                      placeholder="MySoundfont.sf2"
                      className="flex-1 bg-[#0c0d13] border border-[#232636] rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSoundfont(newSoundfontInput);
                      }}
                    />
                    <button
                      onClick={() => handleAddSoundfont(newSoundfontInput)}
                      className="px-3 py-1.5 bg-[#202332] hover:bg-[#2a2e40] text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Добавить</span>
                    </button>
                  </div>
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
                          {soundfonts.length > 1 && (
                            <button
                              onClick={() => setSoundfonts(prev => prev.filter(s => s !== sf))}
                              className="text-neutral-500 hover:text-rose-400 p-0.5"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                  localStorage.setItem(STORAGE_PADS_KEY, JSON.stringify(pads));
                  localStorage.setItem(STORAGE_SOUNDFONTS_KEY, JSON.stringify(soundfonts));
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
  );
}
