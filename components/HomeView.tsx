import React from 'react';
import { Surah, AyahSearchResult } from '../types';
import { ARABIC_RUN_SOURCE } from '../utils';
import { CheckCircle2, ArrowRight, BookOpen } from 'lucide-react';

interface HomeViewProps {
  surahs: Surah[];
  onSelectSurah: (id: number) => void;
  isHatimMode: boolean;
  completedSurahs: number[];
  onToggleSurahCompletion: (surahId: number) => void;
  searchQuery: string;
  ayahResults: AyahSearchResult[];
  directResult: AyahSearchResult | null;
  onNavigateToAyah: (surahId: number, ayahIndex: number) => void;
}

const wrapArabicRuns = (text: string, keyPrefix: string): React.ReactNode[] => {
  const regex = new RegExp(ARABIC_RUN_SOURCE, 'g');
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <span key={`${keyPrefix}-ar-${key++}`} className="font-arabic text-[1.15em]">
        {match[0]}
      </span>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
};

const renderHighlightedText = (text: string, query: string): React.ReactNode => {
  const lowerText = text.toLocaleLowerCase('tr-TR');
  const lowerQuery = query.toLocaleLowerCase('tr-TR');
  if (!lowerQuery || lowerText.length !== text.length) return wrapArabicRuns(text, 'plain');

  const nodes: React.ReactNode[] = [];
  let pos = 0;
  let idx = lowerText.indexOf(lowerQuery);
  let key = 0;
  while (idx !== -1) {
    if (idx > pos) nodes.push(...wrapArabicRuns(text.slice(pos, idx), `seg-${key}`));
    nodes.push(
      <mark key={`mark-${key}`} className="bg-light-accent/40 dark:bg-dark-accent/30 text-inherit rounded px-0.5">
        {wrapArabicRuns(text.slice(idx, idx + lowerQuery.length), `hl-${key}`)}
      </mark>
    );
    key++;
    pos = idx + lowerQuery.length;
    idx = lowerText.indexOf(lowerQuery, pos);
  }
  nodes.push(...wrapArabicRuns(text.slice(pos), 'tail'));
  return nodes;
};

const AYAH_RESULTS_PAGE_SIZE = 30;

const HomeView: React.FC<HomeViewProps> = ({
  surahs,
  onSelectSurah,
  isHatimMode,
  completedSurahs,
  onToggleSurahCompletion,
  searchQuery,
  ayahResults,
  directResult,
  onNavigateToAyah
}) => {
  const [visibleAyahCount, setVisibleAyahCount] = React.useState(AYAH_RESULTS_PAGE_SIZE);

  // Yeni aramada sonuç sayfasını başa sar
  React.useEffect(() => {
    setVisibleAyahCount(AYAH_RESULTS_PAGE_SIZE);
  }, [searchQuery]);

  const trimmedQuery = searchQuery.trim();
  const isSearching = trimmedQuery.length > 0;
  const isQueryTooShortForAyah = isSearching && trimmedQuery.length < 3;
  const hasAyahResults = ayahResults.length > 0;
  const noResults = isSearching && surahs.length === 0 && !hasAyahResults && !directResult;

  return (
    <main className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto bg-transparent scroll-smooth p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 mt-6">
          <h1 className="text-3xl md:text-4xl font-bold text-light-text dark:text-dark-text mb-3">
            Kur-an Meal
          </h1>
          <p className="text-light-secondary dark:text-dark-secondary text-lg">
            Okumak istediğiniz sureyi seçin.
          </p>
        </div>

        {noResults ? (
          <div className="text-center text-light-secondary dark:text-dark-secondary py-10">
            <p>«{trimmedQuery}» için sonuç bulunamadı.</p>
            {isQueryTooShortForAyah && (
              <p className="text-sm mt-2 opacity-75">Ayetlerin içinde arama yapmak için en az 3 harf yazın.</p>
            )}
          </div>
        ) : (
          <>
          {/* Doğrudan Ayete Git ("bakara 12" gibi aramalarda) */}
          {directResult && (
            <div
              onClick={() => onNavigateToAyah(directResult.surah.id, directResult.ayahIndex)}
              className="mb-8 p-5 md:p-6 rounded-2xl border-2 border-light-accent dark:border-dark-accent bg-light-card/70 dark:bg-dark-card/70 shadow-md cursor-pointer hover:shadow-lg transition-all group"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-light-accent dark:text-dark-accent flex items-center gap-2">
                  <BookOpen size={20} />
                  Ayete Git: {directResult.surah.nameTurkish} • {directResult.ayah.numberInSurah}. Ayet
                </span>
                <ArrowRight size={20} className="shrink-0 text-light-accent dark:text-dark-accent group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-light-text dark:text-dark-text leading-relaxed text-sm md:text-base line-clamp-3">
                {wrapArabicRuns(directResult.ayah.textTurkish, 'direct')}
              </p>
            </div>
          )}

          {surahs.length > 0 && isSearching && hasAyahResults && (
            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4">
              Sureler ({surahs.length})
            </h2>
          )}
          {surahs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {surahs.map((surah) => {
              const isCompleted = completedSurahs.includes(surah.id);
              return (
                <div
                  key={surah.id}
                  className={`relative flex items-center justify-between p-5 bg-light-card/50 dark:bg-dark-card/50 rounded-xl shadow-sm border transition-all duration-300 group ${
                    isCompleted && isHatimMode
                      ? 'border-green-500 bg-green-50/70 dark:bg-green-900/30'
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

          {/* Ayet araması için minimum harf uyarısı */}
          {isQueryTooShortForAyah && surahs.length > 0 && (
            <p className="text-center text-sm text-light-secondary dark:text-dark-secondary mt-8 opacity-75">
              Ayetlerin içinde arama yapmak için en az 3 harf yazın.
            </p>
          )}

          {/* Ayet Arama Sonuçları */}
          {hasAyahResults && (
            <div className={surahs.length > 0 ? 'mt-10' : ''}>
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-light-accent dark:text-dark-accent" />
                Ayetlerde Bulunanlar ({ayahResults.length})
              </h2>
              <div className="grid gap-4">
                {ayahResults.slice(0, visibleAyahCount).map((result) => (
                  <div
                    key={`${result.surah.id}:${result.ayah.id}`}
                    onClick={() => onNavigateToAyah(result.surah.id, result.ayahIndex)}
                    className="bg-light-card/50 dark:bg-dark-card/50 p-5 md:p-6 rounded-2xl border border-light-border dark:border-dark-border shadow-sm cursor-pointer hover:shadow-md hover:border-light-accent dark:hover:border-dark-accent transition-all group"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-light-accent dark:text-dark-accent">
                        {result.surah.nameTurkish} • {result.ayah.numberInSurah}. Ayet
                      </span>
                      <ArrowRight size={18} className="shrink-0 text-light-secondary dark:text-dark-secondary group-hover:text-light-accent dark:group-hover:text-dark-accent group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-light-text dark:text-dark-text leading-relaxed text-sm md:text-base">
                      {renderHighlightedText(result.ayah.textTurkish, trimmedQuery)}
                    </p>
                  </div>
                ))}
              </div>
              {ayahResults.length > visibleAyahCount && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setVisibleAyahCount(c => c + AYAH_RESULTS_PAGE_SIZE)}
                    className="px-6 py-2.5 rounded-xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:border-light-accent dark:hover:border-dark-accent transition-colors font-medium"
                  >
                    Daha Fazla Göster ({ayahResults.length - visibleAyahCount} sonuç daha)
                  </button>
                </div>
              )}
            </div>
          )}
          </>
        )}
      </div>
    </main>
  );
};

export default HomeView;
