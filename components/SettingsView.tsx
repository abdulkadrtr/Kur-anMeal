import React from 'react';
import { Sun, Moon, MousePointer, Hand, List, Volume2, BookOpen, Type, Flame, CloudRain, Wind, Waves } from 'lucide-react';

type NavigationMode = 'arrows' | 'swipe' | 'scroll';
type ReciterType = 'husary' | 'alqatami' | 'dosari';
type DisplayMode = 'both' | 'arabic' | 'turkish';
type FontSize = 'small' | 'medium' | 'large';
type BackgroundTheme = 'default' | 'fire' | 'rain' | 'wind' | 'waterfall';

interface SettingsViewProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  navigationMode: NavigationMode;
  onNavigationModeChange: (mode: NavigationMode) => void;
  reciter: ReciterType;
  onReciterChange: (reciter: ReciterType) => void;
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  arabicFontSize: FontSize;
  onArabicFontSizeChange: (size: FontSize) => void;
  turkishFontSize: FontSize;
  onTurkishFontSizeChange: (size: FontSize) => void;
  backgroundTheme: BackgroundTheme;
  onBackgroundThemeChange: (theme: BackgroundTheme) => void;
  videoVolume: number;
  onVideoVolumeChange: (volume: number) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  isDarkMode,
  onToggleTheme,
  navigationMode,
  onNavigationModeChange,
  reciter,
  onReciterChange,
  displayMode,
  onDisplayModeChange,
  arabicFontSize,
  onArabicFontSizeChange,
  turkishFontSize,
  onTurkishFontSizeChange,
  backgroundTheme,
  onBackgroundThemeChange,
  videoVolume,
  onVideoVolumeChange
}) => {
  return (
    <main className="flex flex-col h-full bg-transparent overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full p-6 md:p-8">
        <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-8">Ayarlar</h1>

        {/* Tema Ayarları */}
        <div className="bg-light-card/50 dark:bg-dark-card/50 rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4 flex items-center gap-2">
            {isDarkMode ? <Moon size={24} /> : <Sun size={24} />}
            Tema
          </h2>
          
          {/* Fire teması aktifken uyarı */}
          {(backgroundTheme === 'fire' || backgroundTheme === 'rain' || backgroundTheme === 'wind' || backgroundTheme === 'waterfall') && (
            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Aydınlık moda geçmek için önce Klasik Görünüme geçin.
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => {
                // Video temaları aktifken aydınlık moda geçişi engelle
                if (backgroundTheme === 'fire' || backgroundTheme === 'rain' || backgroundTheme === 'wind' || backgroundTheme === 'waterfall') return;
                onToggleTheme();
              }}
              disabled={backgroundTheme === 'fire' || backgroundTheme === 'rain' || backgroundTheme === 'wind' || backgroundTheme === 'waterfall'}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                !isDarkMode
                  ? 'border-light-accent bg-light-accent/10 text-light-text'
                  : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent text-light-text dark:text-dark-text'
              } ${(backgroundTheme === 'fire' || backgroundTheme === 'rain' || backgroundTheme === 'wind' || backgroundTheme === 'waterfall') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Sun size={20} />
                <span className="font-medium">Aydınlık Mod</span>
              </div>
              {!isDarkMode && (
                <div className="w-5 h-5 rounded-full bg-light-accent flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>

            <button
              onClick={() => onToggleTheme()}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                isDarkMode
                  ? 'border-dark-accent bg-dark-accent/10 text-dark-text'
                  : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent text-light-text dark:text-dark-text'
              }`}
            >
              <div className="flex items-center gap-3">
                <Moon size={20} />
                <span className="font-medium">Karanlık Mod</span>
              </div>
              {isDarkMode && (
                <div className="w-5 h-5 rounded-full bg-dark-accent flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Arka Plan Teması */}
        <div className="bg-light-card/50 dark:bg-dark-card/50 rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4 flex items-center gap-2">
            <Flame size={24} />
            Arka Plan Teması
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => onBackgroundThemeChange('default')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                backgroundTheme === 'default'
                  ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                  : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="font-medium">Varsayılan</div>
                  <div className="text-sm text-light-secondary dark:text-dark-secondary">Klasik görünüm</div>
                </div>
              </div>
              {backgroundTheme === 'default' && (
                <div className="w-5 h-5 rounded-full bg-light-accent dark:bg-dark-accent flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>

            <button
              onClick={() => onBackgroundThemeChange('fire')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                backgroundTheme === 'fire'
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-light-border dark:border-dark-border hover:border-orange-500'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <Flame size={20} className={backgroundTheme === 'fire' ? 'text-orange-500' : ''} />
                <div className="text-left">
                  <div className="font-medium">Alev Teması</div>
                  <div className="text-sm text-light-secondary dark:text-dark-secondary">Ateş sesi ve görüntüsü</div>
                </div>
              </div>
              {backgroundTheme === 'fire' && (
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>

            <button
              onClick={() => onBackgroundThemeChange('rain')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                backgroundTheme === 'rain'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-light-border dark:border-dark-border hover:border-blue-500'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <CloudRain size={20} className={backgroundTheme === 'rain' ? 'text-blue-500' : ''} />
                <div className="text-left">
                  <div className="font-medium">Yağmur Teması</div>
                  <div className="text-sm text-light-secondary dark:text-dark-secondary">Yağmur sesi ve görüntüsü</div>
                </div>
              </div>
              {backgroundTheme === 'rain' && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>

            <button
              onClick={() => onBackgroundThemeChange('wind')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                backgroundTheme === 'wind'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-light-border dark:border-dark-border hover:border-cyan-500'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <Wind size={20} className={backgroundTheme === 'wind' ? 'text-cyan-500' : ''} />
                <div className="text-left">
                  <div className="font-medium">Rüzgar Teması</div>
                  <div className="text-sm text-light-secondary dark:text-dark-secondary">Rüzgar sesi ve görüntüsü</div>
                </div>
              </div>
              {backgroundTheme === 'wind' && (
                <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>

            <button
              onClick={() => onBackgroundThemeChange('waterfall')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                backgroundTheme === 'waterfall'
                  ? 'border-teal-500 bg-teal-500/10'
                  : 'border-light-border dark:border-dark-border hover:border-teal-500'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <Waves size={20} className={backgroundTheme === 'waterfall' ? 'text-teal-500' : ''} />
                <div className="text-left">
                  <div className="font-medium">Şelale Teması</div>
                  <div className="text-sm text-light-secondary dark:text-dark-secondary">Şelale sesi ve görüntüsü</div>
                </div>
              </div>
              {backgroundTheme === 'waterfall' && (
                <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>
          </div>

          {/* Video Ses Seviyesi - Video temaları aktifse göster */}
          {(backgroundTheme === 'fire' || backgroundTheme === 'rain' || backgroundTheme === 'wind' || backgroundTheme === 'waterfall') && (
            <div className="mt-6 pt-6 border-t border-light-border/30 dark:border-dark-border/30">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-light-text dark:text-dark-text">
                  Video Ses Seviyesi
                </label>
                <span className={`text-sm font-semibold ${
                  backgroundTheme === 'fire' ? 'text-orange-500' :
                  backgroundTheme === 'rain' ? 'text-blue-500' :
                  backgroundTheme === 'wind' ? 'text-cyan-500' :
                  'text-teal-500'
                }`}>
                  %{videoVolume}
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={videoVolume}
                  onChange={(e) => onVideoVolumeChange(parseInt(e.target.value))}
                  className={`w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer ${
                    backgroundTheme === 'fire' ? 'slider-orange' :
                    backgroundTheme === 'rain' ? 'slider-blue' :
                    backgroundTheme === 'wind' ? 'slider-cyan' :
                    'slider-teal'
                  }`}
                />
                <style>{`
                  .slider-orange::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #f97316;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  }
                  .slider-orange::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #f97316;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  }
                  .slider-orange::-webkit-slider-runnable-track {
                    background: linear-gradient(to right, #f97316 0%, #f97316 ${videoVolume}%, #e5e7eb ${videoVolume}%, #e5e7eb 100%);
                    height: 8px;
                    border-radius: 4px;
                  }
                  .dark .slider-orange::-webkit-slider-runnable-track {
                    background: linear-gradient(to right, #f97316 0%, #f97316 ${videoVolume}%, #374151 ${videoVolume}%, #374151 100%);
                  }
                  .slider-orange::-moz-range-track {
                    background: linear-gradient(to right, #f97316 0%, #f97316 ${videoVolume}%, #e5e7eb ${videoVolume}%, #e5e7eb 100%);
                    height: 8px;
                    border-radius: 4px;
                  }
                  .dark .slider-orange::-moz-range-track {
                    background: linear-gradient(to right, #f97316 0%, #f97316 ${videoVolume}%, #374151 ${videoVolume}%, #374151 100%);
                  }
                  
                  .slider-blue::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  }
                  .slider-blue::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  }
                  .slider-blue::-webkit-slider-runnable-track {
                    background: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${videoVolume}%, #e5e7eb ${videoVolume}%, #e5e7eb 100%);
                    height: 8px;
                    border-radius: 4px;
                  }
                  .dark .slider-blue::-webkit-slider-runnable-track {
                    background: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${videoVolume}%, #374151 ${videoVolume}%, #374151 100%);
                  }
                  .slider-blue::-moz-range-track {
                    background: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${videoVolume}%, #e5e7eb ${videoVolume}%, #e5e7eb 100%);
                    height: 8px;
                    border-radius: 4px;
                  }
                  .dark .slider-blue::-moz-range-track {
                    background: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${videoVolume}%, #374151 ${videoVolume}%, #374151 100%);
                  }
                  
                  .slider-cyan::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #06b6d4;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  }
                  .slider-cyan::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #06b6d4;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  }
                  .slider-cyan::-webkit-slider-runnable-track {
                    background: linear-gradient(to right, #06b6d4 0%, #06b6d4 ${videoVolume}%, #e5e7eb ${videoVolume}%, #e5e7eb 100%);
                    height: 8px;
                    border-radius: 4px;
                  }
                  .dark .slider-cyan::-webkit-slider-runnable-track {
                    background: linear-gradient(to right, #06b6d4 0%, #06b6d4 ${videoVolume}%, #374151 ${videoVolume}%, #374151 100%);
                  }
                  .slider-cyan::-moz-range-track {
                    background: linear-gradient(to right, #06b6d4 0%, #06b6d4 ${videoVolume}%, #e5e7eb ${videoVolume}%, #e5e7eb 100%);
                    height: 8px;
                    border-radius: 4px;
                  }
                  .dark .slider-cyan::-moz-range-track {
                    background: linear-gradient(to right, #06b6d4 0%, #06b6d4 ${videoVolume}%, #374151 ${videoVolume}%, #374151 100%);
                  }
                  
                  .slider-teal::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #14b8a6;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  }
                  .slider-teal::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #14b8a6;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  }
                  .slider-teal::-webkit-slider-runnable-track {
                    background: linear-gradient(to right, #14b8a6 0%, #14b8a6 ${videoVolume}%, #e5e7eb ${videoVolume}%, #e5e7eb 100%);
                    height: 8px;
                    border-radius: 4px;
                  }
                  .dark .slider-teal::-webkit-slider-runnable-track {
                    background: linear-gradient(to right, #14b8a6 0%, #14b8a6 ${videoVolume}%, #374151 ${videoVolume}%, #374151 100%);
                  }
                  .slider-teal::-moz-range-track {
                    background: linear-gradient(to right, #14b8a6 0%, #14b8a6 ${videoVolume}%, #e5e7eb ${videoVolume}%, #e5e7eb 100%);
                    height: 8px;
                    border-radius: 4px;
                  }
                  .dark .slider-teal::-moz-range-track {
                    background: linear-gradient(to right, #14b8a6 0%, #14b8a6 ${videoVolume}%, #374151 ${videoVolume}%, #374151 100%);
                  }
                `}</style>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-light-secondary dark:text-dark-secondary">Sessiz</span>
                <span className="text-xs text-light-secondary dark:text-dark-secondary">Maksimum</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigasyon Modu */}
        <div className="bg-light-card/50 dark:bg-dark-card/50 rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4 flex items-center gap-2">
            <MousePointer size={24} />
            Navigasyon Modu
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigationModeChange('scroll')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                navigationMode === 'scroll'
                  ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                  : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <List size={20} />
                <div className="text-left">
                  <div className="font-medium">Sürekli Mod</div>
                  <div className="text-sm text-light-secondary dark:text-dark-secondary">Tüm ayetler alt alta</div>
                </div>
              </div>
              {navigationMode === 'scroll' && (
                <div className="w-5 h-5 rounded-full bg-light-accent dark:bg-dark-accent flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>

            <button
              onClick={() => onNavigationModeChange('swipe')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                navigationMode === 'swipe'
                  ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                  : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <Hand size={20} />
                <div className="text-left">
                  <div className="font-medium">Kaydırma Modu</div>
                  <div className="text-sm text-light-secondary dark:text-dark-secondary">Sağa/sola kaydırarak geçiş</div>
                </div>
              </div>
              {navigationMode === 'swipe' && (
                <div className="w-5 h-5 rounded-full bg-light-accent dark:bg-dark-accent flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>

            <button
              onClick={() => onNavigationModeChange('arrows')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                navigationMode === 'arrows'
                  ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                  : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <MousePointer size={20} />
                <div className="text-left">
                  <div className="font-medium">Ok Tuşları Modu</div>
                  <div className="text-sm text-light-secondary dark:text-dark-secondary">Önceki/Sonraki butonları</div>
                </div>
              </div>
              {navigationMode === 'arrows' && (
                <div className="w-5 h-5 rounded-full bg-light-accent dark:bg-dark-accent flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Okuyucu Seçimi */}
        <div className="bg-light-card/50 dark:bg-dark-card/50 rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4 flex items-center gap-2">
            <Volume2 size={24} />
            Okuyucu
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => onReciterChange('husary')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                reciter === 'husary'
                  ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                  : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="font-medium">Mahmud Halil Husari</div>
                </div>
              </div>
              {reciter === 'husary' && (
                <div className="w-5 h-5 rounded-full bg-light-accent dark:bg-dark-accent flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>

            <button
              onClick={() => onReciterChange('alqatami')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                reciter === 'alqatami'
                  ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                  : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="font-medium">Nasser Alqatami</div>
                </div>
              </div>
              {reciter === 'alqatami' && (
                <div className="w-5 h-5 rounded-full bg-light-accent dark:bg-dark-accent flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>

            <button
              onClick={() => onReciterChange('dosari')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                reciter === 'dosari'
                  ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                  : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="font-medium">Yasser Al-Dosari</div>
                </div>
              </div>
              {reciter === 'dosari' && (
                <div className="w-5 h-5 rounded-full bg-light-accent dark:bg-dark-accent flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Görüntüleme Modu */}
        <div className="bg-light-card/50 dark:bg-dark-card/50 rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4 flex items-center gap-2">
            <BookOpen size={24} />
            Görüntüleme
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => onDisplayModeChange('both')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                displayMode === 'both'
                  ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                  : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="font-medium">Arapça ve Türkçe Meal</div>
                </div>
              </div>
              {displayMode === 'both' && (
                <div className="w-5 h-5 rounded-full bg-light-accent dark:bg-dark-accent flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>

            <button
              onClick={() => onDisplayModeChange('arabic')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                displayMode === 'arabic'
                  ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                  : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="font-medium">Sadece Arapça Ayet</div>
                </div>
              </div>
              {displayMode === 'arabic' && (
                <div className="w-5 h-5 rounded-full bg-light-accent dark:bg-dark-accent flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>

            <button
              onClick={() => onDisplayModeChange('turkish')}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                displayMode === 'turkish'
                  ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                  : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
              } text-light-text dark:text-dark-text`}
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="font-medium">Sadece Türkçe Meal</div>
                </div>
              </div>
              {displayMode === 'turkish' && (
                <div className="w-5 h-5 rounded-full bg-light-accent dark:bg-dark-accent flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Yazı Boyutu Ayarları */}
        <div className="bg-light-card/50 dark:bg-dark-card/50 rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-6">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4 flex items-center gap-2">
            <Type size={24} />
            Yazı Boyutu
          </h2>
          
          {/* Arapça Yazı Boyutu */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-light-secondary dark:text-dark-secondary mb-3">Arapça Ayet</h3>
            <div className="flex gap-2">
              <button
                onClick={() => onArabicFontSizeChange('small')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all text-center ${
                  arabicFontSize === 'small'
                    ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                    : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
                } text-light-text dark:text-dark-text`}
              >
                <span className="text-sm font-medium">Küçük</span>
              </button>
              <button
                onClick={() => onArabicFontSizeChange('medium')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all text-center ${
                  arabicFontSize === 'medium'
                    ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                    : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
                } text-light-text dark:text-dark-text`}
              >
                <span className="text-base font-medium">Orta</span>
              </button>
              <button
                onClick={() => onArabicFontSizeChange('large')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all text-center ${
                  arabicFontSize === 'large'
                    ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                    : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
                } text-light-text dark:text-dark-text`}
              >
                <span className="text-lg font-medium">Büyük</span>
              </button>
            </div>
          </div>

          {/* Türkçe Yazı Boyutu */}
          <div>
            <h3 className="text-sm font-medium text-light-secondary dark:text-dark-secondary mb-3">Türkçe Meal</h3>
            <div className="flex gap-2">
              <button
                onClick={() => onTurkishFontSizeChange('small')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all text-center ${
                  turkishFontSize === 'small'
                    ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                    : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
                } text-light-text dark:text-dark-text`}
              >
                <span className="text-sm font-medium">Küçük</span>
              </button>
              <button
                onClick={() => onTurkishFontSizeChange('medium')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all text-center ${
                  turkishFontSize === 'medium'
                    ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                    : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
                } text-light-text dark:text-dark-text`}
              >
                <span className="text-base font-medium">Orta</span>
              </button>
              <button
                onClick={() => onTurkishFontSizeChange('large')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all text-center ${
                  turkishFontSize === 'large'
                    ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                    : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
                } text-light-text dark:text-dark-text`}
              >
                <span className="text-lg font-medium">Büyük</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default SettingsView;
