import React from 'react';
import { Surah } from '../types';
import { BookCheck, CheckCircle2, Circle } from 'lucide-react';

interface HatimViewProps {
  surahs: Surah[];
  completedSurahs: number[];
  onToggleSurahCompletion: (surahId: number) => void;
  onSelectSurah: (id: number) => void;
  isHatimMode: boolean;
  onToggleHatimMode: () => void;
}

const HatimView: React.FC<HatimViewProps> = ({ 
  surahs, 
  completedSurahs, 
  onToggleSurahCompletion,
  onSelectSurah,
  isHatimMode,
  onToggleHatimMode
}) => {
  const totalSurahs = surahs.length;
  const completedCount = completedSurahs.length;
  const completionPercentage = totalSurahs > 0 ? Math.round((completedCount / totalSurahs) * 100) : 0;

  const handleToggleHatimMode = () => {
    // Hatim modu kapatılıyorsa ve veri varsa onay iste
    if (isHatimMode && completedCount > 0) {
      const confirmed = window.confirm(
        `Hatim modunu kapatırsanız tüm ilerleme verileri silinecektir.\n\n` +
        `Okunan ${completedCount} sure kaydı kaybolacak.\n\n` +
        `Devam etmek istiyor musunuz?`
      );
      if (!confirmed) return;
    }
    
    onToggleHatimMode();
  };

  return (
    <main className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto bg-light-bg dark:bg-dark-bg scroll-smooth p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 mt-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookCheck size={40} className="text-light-accent dark:text-dark-accent" />
            <h1 className="text-3xl md:text-4xl font-bold text-light-text dark:text-dark-text">
              Hatim Takibi
            </h1>
          </div>
          <p className="text-light-secondary dark:text-dark-secondary text-lg mb-6">
            Kendilerine kitap verdiğimiz kişiler, onu gerektiği şekilde okurlar. İşte bunlar, kitaba gerçekten iman etmiş olanlardır. (Bakara - 121)
          </p>

          {/* Hatim Mode Toggle */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-light-text dark:text-dark-text font-medium">Hatim Modu:</span>
            <button
              onClick={handleToggleHatimMode}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                isHatimMode 
                  ? 'bg-green-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  isHatimMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${isHatimMode ? 'text-green-500 font-semibold' : 'text-light-secondary dark:text-dark-secondary'}`}>
              {isHatimMode ? 'Açık' : 'Kapalı'}
            </span>
          </div>

          {isHatimMode && completedCount > 0 && (
            <div className="text-center text-sm text-light-secondary dark:text-dark-secondary mb-4">
              ⚠️ Hatim modunu kapatırsanız tüm ilerleme verileri silinecektir
            </div>
          )}

          {/* Progress Stats */}
          <div className="bg-light-card dark:bg-dark-card rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Completion Percentage */}
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-32 h-32 mb-3">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-light-border dark:text-dark-border"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - completionPercentage / 100)}`}
                      className="text-green-500 transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-light-text dark:text-dark-text">
                      {completionPercentage}%
                    </span>
                  </div>
                </div>
                <p className="text-light-secondary dark:text-dark-secondary font-medium">Tamamlanma</p>
              </div>

              {/* Completed Surahs */}
              <div className="text-center flex flex-col items-center justify-center">
                <div className="text-5xl font-bold text-green-500 mb-2">
                  {completedCount}
                </div>
                <p className="text-light-secondary dark:text-dark-secondary font-medium">Okunan Sure</p>
              </div>

              {/* Remaining Surahs */}
              <div className="text-center flex flex-col items-center justify-center">
                <div className="text-5xl font-bold text-light-accent dark:text-dark-accent mb-2">
                  {totalSurahs - completedCount}
                </div>
                <p className="text-light-secondary dark:text-dark-secondary font-medium">Kalan Sure</p>
              </div>
            </div>
          </div>
        </div>

        {/* Surah List */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4">
            Sureler ({completedCount}/{totalSurahs})
          </h2>
          {surahs.map((surah) => {
            const isCompleted = completedSurahs.includes(surah.id);
            return (
              <div
                key={surah.id}
                className={`flex items-center justify-between p-4 bg-light-card dark:bg-dark-card rounded-xl shadow-sm border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium border-2 ${
                    isCompleted
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-light-bg dark:bg-dark-bg text-light-secondary dark:text-dark-secondary border-light-border dark:border-dark-border'
                  }`}>
                    {surah.id}
                  </div>
                  <button
                    onClick={() => onSelectSurah(surah.id)}
                    className="text-left flex-1 hover:text-light-accent dark:hover:text-dark-accent transition-colors"
                  >
                    <h3 className="font-semibold text-lg text-light-text dark:text-dark-text">
                      {surah.nameTurkish}
                    </h3>
                    <p className="text-sm text-light-secondary dark:text-dark-secondary">
                      {surah.verseCount} Ayet
                    </p>
                  </button>
                </div>

                {/* Completion Toggle */}
                <button
                  onClick={() => onToggleSurahCompletion(surah.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isCompleted
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border-2 border-light-border dark:border-dark-border hover:border-green-500 hover:text-green-500'
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 size={20} />
                      <span className="hidden md:inline">Okundu</span>
                    </>
                  ) : (
                    <>
                      <Circle size={20} />
                      <span className="hidden md:inline">İşaretle</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default HatimView;
