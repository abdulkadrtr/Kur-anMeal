import React from 'react';
import { Surah } from '../types';

interface HomeViewProps {
  surahs: Surah[];
  onSelectSurah: (id: number) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ surahs, onSelectSurah }) => {
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
            {surahs.map((surah) => (
              <button
                key={surah.id}
                onClick={() => onSelectSurah(surah.id)}
                className="flex items-center justify-between p-5 bg-light-card dark:bg-dark-card rounded-xl shadow-sm border border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent hover:shadow-md transition-all duration-300 group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-light-bg dark:bg-dark-bg text-light-secondary dark:text-dark-secondary flex items-center justify-center font-medium border border-light-border dark:border-dark-border group-hover:bg-light-accent group-hover:dark:bg-dark-accent group-hover:text-white dark:group-hover:text-gray-900 transition-colors">
                    {surah.id}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-light-text dark:text-dark-text">
                      {surah.nameTurkish}
                    </h3>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default HomeView;