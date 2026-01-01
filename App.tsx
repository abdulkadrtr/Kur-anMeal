import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SurahView from './components/SurahView';
import HomeView from './components/HomeView';
import FavoritesView from './components/FavoritesView';
import BookmarksView from './components/BookmarksView';
import { SURAH_METADATA } from './constants';
import { Surah } from './types';

type ViewState = 'home' | 'reader' | 'favorites' | 'bookmarks';

const App: React.FC = () => {
  // --- State Management ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  
  // Data State
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentSurahId, setCurrentSurahId] = useState<number>(1);
  const [currentAyahIndex, setCurrentAyahIndex] = useState<number>(0);
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  // Favorites State: Array of strings "surahId:ayahId"
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Bookmarks State: Array of strings "surahId:ayahId"
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const saved = localStorage.getItem('bookmarks');
    return saved ? JSON.parse(saved) : [];
  });

  // --- Data Fetching ---
  useEffect(() => {
    const fetchMealData = async () => {
      try {
        setLoading(true);
        // Attempt to fetch meal.json from the public root
        const response = await fetch('./meal.json');
        if (!response.ok) {
          throw new Error('Meal verisi yüklenemedi.');
        }
        const data = await response.json();

        // Map raw JSON to our App Types, merging with SURAH_METADATA
        const mappedSurahs: Surah[] = data.map((s: any) => {
          const meta = SURAH_METADATA[s.sure_no] || {
            nameArabic: s.sure_adi, // Fallback if no arabic name known
            nameEnglish: ""
          };

          return {
            id: s.sure_no,
            nameArabic: meta.nameArabic,
            nameTurkish: s.sure_adi,
            nameEnglish: meta.nameEnglish,
            verseCount: s.ayetler.length,
            ayahs: s.ayetler.map((a: any, index: number) => ({
              id: index + 1, // Create a unique ID for the ayah within the surah logic
              surahId: s.sure_no,
              numberInSurah: a.a_no, // Can be string "1-2"
              textArabic: a.ar,
              textTurkish: a.tr
            }))
          };
        });

        setSurahs(mappedSurahs);
        setLoading(false);
      } catch (err) {
        console.error("Data load error:", err);
        setError("Veri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.");
        setLoading(false);
      }
    };

    fetchMealData();
  }, []);

  // --- Derived State ---
  const currentSurah: Surah | undefined = surahs.find(s => s.id === currentSurahId);
  
  // Filter Surahs based on search query
  const filteredSurahs = surahs.filter(s => 
    s.nameTurkish.toLocaleUpperCase('tr-TR').includes(searchQuery.toLocaleUpperCase('tr-TR')) ||
    s.nameArabic.toLocaleUpperCase('tr-TR').includes(searchQuery.toLocaleUpperCase('tr-TR')) ||
    s.id.toString().includes(searchQuery)
  );

  // --- Effects ---
  
  // Initialize Theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Persist Favorites
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Persist Bookmarks
  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // If user types in search, switch to home view to show results
  useEffect(() => {
    if (searchQuery.length > 0 && currentView !== 'home') {
      setCurrentView('home');
    }
  }, [searchQuery]);

  // --- Handlers ---
  const toggleTheme = () => setIsDarkMode(prev => !prev);
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  const goHome = () => {
    setSearchQuery(""); 
    setCurrentView('home');
    closeSidebar();
  };
  
  const goFavorites = () => {
    setSearchQuery("");
    setCurrentView('favorites');
    closeSidebar();
  };

  const goBookmarks = () => {
    setSearchQuery("");
    setCurrentView('bookmarks');
    closeSidebar();
  };
  
  const handleSelectSurah = (id: number) => {
    setCurrentSurahId(id);
    setCurrentAyahIndex(0); // Reset to first Ayah
    setCurrentView('reader');
    setSearchQuery(""); 
    closeSidebar();
  };

  const handleNavigateToAyah = (surahId: number, ayahIndex: number) => {
    setCurrentSurahId(surahId);
    setCurrentAyahIndex(ayahIndex);
    setCurrentView('reader');
    closeSidebar();
  };

  const handleAyahChange = (index: number) => {
    setCurrentAyahIndex(index);
  };

  const toggleFavorite = (surahId: number, ayahId: number) => {
    const key = `${surahId}:${ayahId}`;
    setFavorites(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const isAyahFavorite = (surahId: number, ayahId: number) => {
    return favorites.includes(`${surahId}:${ayahId}`);
  };

  const toggleBookmark = (surahId: number, ayahId: number) => {
    const key = `${surahId}:${ayahId}`;
    setBookmarks(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const isAyahBookmarked = (surahId: number, ayahId: number) => {
    return bookmarks.includes(`${surahId}:${ayahId}`);
  };

  // --- Random Ayah Logic (Equal Probability) ---
  const handleRandomAyah = () => {
    if (surahs.length === 0) return;

    // 1. Calculate total number of verses in the entire data set
    // This ensures that a verse in a long surah (like Baqarah) has the 
    // exact same probability as a verse in a short surah (like Kawthar).
    const totalVerses = surahs.reduce((acc, s) => acc + s.verseCount, 0);
    
    // 2. Pick a random global index
    let randomGlobalIndex = Math.floor(Math.random() * totalVerses);

    // 3. Find which surah and which index this global index corresponds to
    for (const surah of surahs) {
      if (randomGlobalIndex < surah.verseCount) {
        // We found the surah!
        // The remaining randomGlobalIndex is the ayah index within this surah.
        handleNavigateToAyah(surah.id, randomGlobalIndex);
        return;
      }
      // Subtract this surah's length and move to the next
      randomGlobalIndex -= surah.verseCount;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-light-accent dark:border-dark-accent mb-4"></div>
        <p className="text-lg animate-pulse">Kur-an Meal Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-light-bg dark:bg-dark-bg text-red-500 p-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-xl">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 px-6 py-2 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-light-text dark:text-dark-text"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden font-sans">
      {/* Header */}
      <Header 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        toggleSidebar={toggleSidebar}
        onLogoClick={goHome}
        onFavoritesClick={goFavorites}
        onBookmarksClick={goBookmarks}
        onRandomClick={handleRandomAyah}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          surahs={filteredSurahs} 
          currentSurahId={currentSurahId} 
          onSelectSurah={handleSelectSurah} 
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
        />

        {/* Main Content Area */}
        <div className="flex-1 relative flex flex-col min-w-0">
          {currentView === 'home' ? (
            <HomeView 
              surahs={filteredSurahs} 
              onSelectSurah={handleSelectSurah} 
            />
          ) : currentView === 'favorites' ? (
            <FavoritesView 
              favorites={favorites}
              surahs={surahs}
              onNavigate={handleNavigateToAyah}
            />
          ) : currentView === 'bookmarks' ? (
            <BookmarksView 
              bookmarks={bookmarks}
              surahs={surahs}
              onNavigate={handleNavigateToAyah}
            />
          ) : currentSurah ? (
            <SurahView 
              surah={currentSurah} 
              currentAyahIndex={currentAyahIndex}
              onAyahChange={handleAyahChange}
              isFavorite={isAyahFavorite(currentSurah.id, currentSurah.ayahs[currentAyahIndex]?.id)}
              onToggleFavorite={() => toggleFavorite(currentSurah.id, currentSurah.ayahs[currentAyahIndex]?.id)}
              isBookmarked={isAyahBookmarked(currentSurah.id, currentSurah.ayahs[currentAyahIndex]?.id)}
              onToggleBookmark={() => toggleBookmark(currentSurah.id, currentSurah.ayahs[currentAyahIndex]?.id)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-light-secondary dark:text-dark-secondary">
              Sure bulunamadı.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;