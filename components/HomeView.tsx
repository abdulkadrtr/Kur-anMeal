import React from 'react';
import { Surah } from '../types';
import { CheckCircle2 } from 'lucide-react';

interface HomeViewProps {
  surahs: Surah[];
  onSelectSurah: (id: number) => void;
  isHatimMode: boolean;
  completedSurahs: number[];
  onToggleSurahCompletion: (surahId: number) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ 
  surahs, 
  onSelectSurah,
  isHatimMode,
  completedSurahs,
  onToggleSurahCompletion
}) => {
  return (
    <main className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto bg-light-bg dark:bg-dark-bg scroll-smooth p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 mt-6">
          <h1 className="text-3xl md:text-4xl font-bold text-light-text dark:text-dark-text mb-3">
            Kur-an Meal
          </h1>
          <p className="text-light-secondary dark:text-dark-secondary text-lg">
            Okumak istediğiniz sureyi seçin.
          </p>
        </div>

        {surahs.length === 0 ? (
          <div className="text-center text-light-secondary dark:text-dark-secondary py-10">
            Aradığınız kriterlere uygun sure bulunamadı.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {surahs.map((surah) => {
              const isCompleted = completedSurahs.includes(surah.id);
              return (
                <div
                  key={surah.id}
                  className={`relative flex items-center justify-between p-5 bg-light-card dark:bg-dark-card rounded-xl shadow-sm border transition-all duration-300 group ${
                    isCompleted && isHatimMode
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent hover:shadow-md'
                  }`}
                >
                  <button
                    onClick={() => onSelectSurah(surah.id)}
                    className="flex items-center gap-4 flex-1 text-left"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium border transition-colors ${
                      isCompleted && isHatimMode
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-light-bg dark:bg-dark-bg text-light-secondary dark:text-dark-secondary border-light-border dark:border-dark-border group-hover:bg-light-accent group-hover:dark:bg-dark-accent group-hover:text-white dark:group-hover:text-gray-900'
                    }`}>
                      {surah.id}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-light-text dark:text-dark-text">
                        {surah.nameTurkish}
                      </h3>
                    </div>
                  </button>

                  {/* Hatim Mode Checkbox */}
                  {isHatimMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSurahCompletion(surah.id);
                      }}
                      className={`ml-2 p-2 rounded-lg transition-all ${
                        isCompleted
                          ? 'text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30'
                          : 'text-light-secondary dark:text-dark-secondary hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                      title={isCompleted ? 'Okundu olarak işaretli' : 'Okudum olarak işaretle'}
                    >
                      <CheckCircle2 
                        size={24} 
                        className={isCompleted ? 'fill-current' : ''}
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default HomeView;