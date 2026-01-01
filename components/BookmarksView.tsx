import React from 'react';
import { Surah } from '../types';
import { ArrowRight, Bookmark } from 'lucide-react';

interface BookmarksViewProps {
  bookmarks: string[];
  surahs: Surah[];
  onNavigate: (surahId: number, ayahIndex: number) => void;
}

const BookmarksView: React.FC<BookmarksViewProps> = ({ bookmarks, surahs, onNavigate }) => {
  // Parse bookmarks "surahId:ayahId" to actual data objects
  const bookmarkItems = bookmarks.map(f => {
    const [sId, aId] = f.split(':').map(Number);
    const surah = surahs.find(s => s.id === sId);
    if (!surah) return null;
    
    const ayahIndex = surah.ayahs.findIndex(a => a.id === aId);
    if (ayahIndex === -1) return null;
    
    const ayah = surah.ayahs[ayahIndex];
    return { surah, ayah, ayahIndex };
  }).filter((item): item is { surah: Surah, ayah: any, ayahIndex: number } => item !== null);

  // Helper function to format text with colored parentheses
  const formatTurkishText = (text: string) => {
    return text.replace(
      /\(([^)]+)\)/g, 
      '<span class="text-light-secondary dark:text-dark-secondary font-normal opacity-90">($1)</span>'
    );
  };

  if (bookmarkItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-light-secondary dark:text-dark-secondary">
        <div className="w-20 h-20 mb-6 rounded-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border flex items-center justify-center">
             <Bookmark size={32} className="opacity-50" />
        </div>
        <h2 className="text-2xl font-semibold mb-3 text-light-text dark:text-dark-text">Henüz işaretli ayetiniz yok</h2>
        <p className="max-w-xs mx-auto text-sm md:text-base opacity-80">Okuma yaparken kaldığınız yeri işaretlemek için "Burada Kaldım" butonuna tıklayın.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-light-bg dark:bg-dark-bg p-4 md:p-8 scroll-smooth">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-light-text dark:text-dark-text flex items-center gap-3">
          <Bookmark className="fill-blue-500 text-blue-500" />
          Burada Kaldım
        </h1>
        
        <div className="grid gap-4">
          {bookmarkItems.map((item, idx) => (
            <div 
               key={`${item.surah.id}:${item.ayah.id}`} 
               onClick={() => onNavigate(item.surah.id, item.ayahIndex)}
               className="bg-light-card dark:bg-dark-card p-5 md:p-6 rounded-2xl border border-light-border dark:border-dark-border shadow-sm cursor-pointer hover:shadow-md hover:border-light-accent dark:hover:border-dark-accent transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                   <span className="font-bold text-lg text-light-accent dark:text-dark-accent">{item.surah.nameTurkish}</span>
                   <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-light-bg dark:bg-dark-bg text-light-secondary dark:text-dark-secondary border border-light-border dark:border-dark-border">
                     {item.ayah.numberInSurah}. Ayet
                   </span>
                </div>
                <ArrowRight size={20} className="text-light-secondary dark:text-dark-secondary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300"/>
              </div>
              
              <p 
                className="text-light-text dark:text-dark-text text-base md:text-lg leading-relaxed line-clamp-3 font-medium"
                dangerouslySetInnerHTML={{ __html: formatTurkishText(item.ayah.textTurkish) }}
              />
              
              <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border flex justify-end">
                 <p className="font-arabic text-xl text-light-secondary dark:text-dark-secondary opacity-60 line-clamp-2 max-w-full text-right break-words overflow-hidden" dir="rtl">
                   {item.ayah.textArabic}
                 </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookmarksView;
