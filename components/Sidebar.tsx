import React from 'react';
import { Surah } from '../types';
import { X } from 'lucide-react';

interface SidebarProps {
  surahs: Surah[];
  currentSurahId: number;
  onSelectSurah: (id: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ surahs, currentSurahId, onSelectSurah, isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        flex flex-col w-72 h-full md:h-[calc(100vh-4rem)]
        border-r bg-light-card dark:bg-dark-card border-light-border dark:border-dark-border
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-3 pl-2 md:hidden">
            <span className="text-lg font-semibold">Menü</span>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-light-bg dark:hover:bg-dark-bg">
              <X size={20} />
            </button>
          </div>

          <h2 className="text-xs font-semibold uppercase tracking-wider text-light-secondary dark:text-dark-secondary mb-3 pl-2 hidden md:block">
            Sureler
          </h2>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
            {surahs.map((surah) => {
              const isActive = surah.id === currentSurahId;
              return (
                <button
                  key={surah.id}
                  onClick={() => onSelectSurah(surah.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between group transition-all duration-200 
                    ${isActive 
                      ? 'bg-light-bg dark:bg-dark-bg shadow-sm' 
                      : 'hover:bg-light-bg hover:dark:bg-dark-bg'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                      ${isActive 
                        ? 'bg-light-accent dark:bg-dark-accent text-white dark:text-gray-900' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'}
                    `}>
                      {surah.id}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${isActive ? 'text-light-text dark:text-dark-text' : 'text-gray-600 dark:text-gray-400'}`}>
                        {surah.nameTurkish}
                      </div>
                    </div>
                  </div>
                  
                  {isActive && (
                    <div className="absolute left-0 w-1 h-8 bg-light-accent dark:bg-dark-accent rounded-r-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;