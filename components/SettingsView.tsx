import React from 'react';
import { Sun, Moon, MousePointer, Hand, List, Volume2 } from 'lucide-react';

type NavigationMode = 'arrows' | 'swipe' | 'scroll';
type ReciterType = 'husary' | 'alqatami';

interface SettingsViewProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  navigationMode: NavigationMode;
  onNavigationModeChange: (mode: NavigationMode) => void;
  reciter: ReciterType;
  onReciterChange: (reciter: ReciterType) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  isDarkMode,
  onToggleTheme,
  navigationMode,
  onNavigationModeChange,
  reciter,
  onReciterChange
}) => {
  return (
    <main className="flex flex-col h-full bg-light-bg dark:bg-dark-bg overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full p-6 md:p-8">
        <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-8">Ayarlar</h1>

        {/* Tema Ayarları */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4 flex items-center gap-2">
            {isDarkMode ? <Moon size={24} /> : <Sun size={24} />}
            Tema
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => onToggleTheme()}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                !isDarkMode
                  ? 'border-light-accent bg-light-accent/10 text-light-text'
                  : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent text-light-text dark:text-dark-text'
              }`}
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

        {/* Navigasyon Modu */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-6 mb-6">
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
        <div className="bg-light-card dark:bg-dark-card rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-6">
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
          </div>
        </div>
      </div>
    </main>
  );
};

export default SettingsView;
