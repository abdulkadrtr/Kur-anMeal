import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SurahView from './components/SurahView';
import HomeView from './components/HomeView';
import FavoritesView from './components/FavoritesView';
import BookmarksView from './components/BookmarksView';
import SettingsView from './components/SettingsView';
import HatimView from './components/HatimView';
import RecitationView from './components/RecitationView';
import { SURAH_METADATA } from './constants';
import { Surah, AyahSearchResult } from './types';

type ViewState = 'home' | 'reader' | 'favorites' | 'bookmarks' | 'settings' | 'hatim' | 'recitation';
type NavigationMode = 'arrows' | 'swipe' | 'scroll';
type ReciterType = 'husary' | 'alqatami' | 'dosari';
type DisplayMode = 'both' | 'arabic' | 'turkish';
type FontSize = 'small' | 'medium' | 'large';
type BackgroundTheme = 'default' | 'fire' | 'rain' | 'wind' | 'waterfall';

const App: React.FC = () => {
  // --- State Management ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('isDarkMode');
    return saved ? JSON.parse(saved) : true;
  });
  const [navigationMode, setNavigationMode] = useState<NavigationMode>(() => {
    const saved = localStorage.getItem('navigationMode');
    return (saved as NavigationMode) || 'arrows';
  });
  const [reciter, setReciter] = useState<ReciterType>(() => {
    const saved = localStorage.getItem('reciter');
    return (saved as ReciterType) || 'alqatami';
  });
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    const saved = localStorage.getItem('displayMode');
    return (saved as DisplayMode) || 'both';
  });
  const [arabicFontSize, setArabicFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem('arabicFontSize');
    return (saved as FontSize) || 'medium';
  });
  const [turkishFontSize, setTurkishFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem('turkishFontSize');
    return (saved as FontSize) || 'medium';
  });
  const [currentView, setCurrentView] = useState<ViewState>('home');
  
  // Background Theme State
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>(() => {
    const saved = localStorage.getItem('backgroundTheme');
    return (saved as BackgroundTheme) || 'default';
  });
  
  // Video Volume State (0-100)
  const [videoVolume, setVideoVolume] = useState<number>(() => {
    const saved = localStorage.getItem('videoVolume');
    return saved ? parseInt(saved) : 50; // Varsayılan %50
  });
  
  // Video ref for background video
  const backgroundVideoRef = React.useRef<HTMLVideoElement>(null);
  
  // Hatim Mode State
  const [isHatimMode, setIsHatimMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('isHatimMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [completedSurahs, setCompletedSurahs] = useState<number[]>(() => {
    const saved = localStorage.getItem('completedSurahs');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Data State
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentSurahId, setCurrentSurahId] = useState<number>(1);
  const [currentAyahIndex, setCurrentAyahIndex] = useState<number>(0);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);

  const [pendingAutoPlay, setPendingAutoPlay] = useState<boolean>(false);

  const [currentRecitationId, setCurrentRecitationId] = useState<string | null>(null);

  type NavSnapshot = { view: ViewState; surahId: number; ayahIndex: number; searchQuery: string; recitationId: string | null };
  const viewStackRef = React.useRef<NavSnapshot[]>([]);
  const navStateRef = React.useRef<NavSnapshot>({ view: 'home', surahId: 1, ayahIndex: 0, searchQuery: '', recitationId: null });
  const atGuardRef = React.useRef<boolean>(false);
  const exitTimerRef = React.useRef<number | null>(null);
  const [showExitToast, setShowExitToast] = useState<boolean>(false);

  useEffect(() => {
    navStateRef.current = { view: currentView, surahId: currentSurahId, ayahIndex: currentAyahIndex, searchQuery, recitationId: currentRecitationId };
  }, [currentView, currentSurahId, currentAyahIndex, searchQuery, currentRecitationId]);
  
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

  const ayahSearchIndex = React.useMemo(() =>
    surahs.flatMap(surah =>
      surah.ayahs.map((ayah, ayahIndex) => ({
        surah,
        ayah,
        ayahIndex,
        searchText: ayah.textTurkish.toLocaleLowerCase('tr-TR')
      }))
    )
  , [surahs]);

  const ayahSearchResults: AyahSearchResult[] = React.useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (query.length < 3) return [];
    return ayahSearchIndex
      .filter(item => item.searchText.includes(query))
      .map(({ surah, ayah, ayahIndex }) => ({ surah, ayah, ayahIndex }));
  }, [ayahSearchIndex, searchQuery]);

  const directAyahMatch: AyahSearchResult | null = React.useMemo(() => {
    const match = searchQuery.trim().match(/^(.+?)[\s:/]+(\d+)$/);
    if (!match) return null;

    const normalize = (s: string) =>
      s.toLocaleUpperCase('tr-TR').replace(/[^\p{L}\p{N}]/gu, '');
    const namePart = match[1].trim();
    const nameNormalized = normalize(namePart);
    const ayahNo = parseInt(match[2]);
    if (!nameNormalized || !ayahNo) return null;

    const surah = surahs.find(s =>
      s.id.toString() === namePart ||
      normalize(s.nameTurkish).includes(nameNormalized)
    );
    if (!surah) return null;

    const ayahIndex = surah.ayahs.findIndex(a => {
      const parts = String(a.numberInSurah).split('-').map(n => parseInt(n));
      return parts.length > 1
        ? ayahNo >= parts[0] && ayahNo <= parts[parts.length - 1]
        : parts[0] === ayahNo;
    });
    if (ayahIndex === -1) return null;

    return { surah, ayah: surah.ayahs[ayahIndex], ayahIndex };
  }, [surahs, searchQuery]);

  // --- Effects ---
  useEffect(() => {
    window.history.replaceState({ kuranMeal: 'guard' }, '');
    window.history.pushState({ kuranMeal: 'top' }, '');

    const handlePopState = () => {
      if (viewStackRef.current.length > 0) {
        // Uygulama içinde bir önceki görünüme dön
        const prev = viewStackRef.current.pop()!;
        setCurrentView(prev.view);
        setCurrentSurahId(prev.surahId);
        setCurrentAyahIndex(prev.ayahIndex);
        setSearchQuery(prev.searchQuery);
        setCurrentRecitationId(prev.recitationId);
        setIsSidebarOpen(false);
        setIsMobileSearchOpen(false);
        window.history.pushState({ kuranMeal: 'top' }, '');
      } else {
        // Kök görünümdeyiz: çıkış için ikinci basışı bekle
        atGuardRef.current = true;
        setShowExitToast(true);
        if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = window.setTimeout(() => {
          setShowExitToast(false);
          if (atGuardRef.current) {
            window.history.pushState({ kuranMeal: 'top' }, '');
            atGuardRef.current = false;
          }
        }, 2000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Initialize Theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Persist Navigation Mode
  useEffect(() => {
    localStorage.setItem('navigationMode', navigationMode);
  }, [navigationMode]);

  // Persist Reciter
  useEffect(() => {
    localStorage.setItem('reciter', reciter);
  }, [reciter]);

  // Persist Display Mode
  useEffect(() => {
    localStorage.setItem('displayMode', displayMode);
  }, [displayMode]);

  // Persist Arabic Font Size
  useEffect(() => {
    localStorage.setItem('arabicFontSize', arabicFontSize);
  }, [arabicFontSize]);

  // Persist Turkish Font Size
  useEffect(() => {
    localStorage.setItem('turkishFontSize', turkishFontSize);
  }, [turkishFontSize]);

  // Persist Background Theme
  useEffect(() => {
    localStorage.setItem('backgroundTheme', backgroundTheme);
  }, [backgroundTheme]);

  // Persist Video Volume
  useEffect(() => {
    localStorage.setItem('videoVolume', videoVolume.toString());
    // Video ref varsa volume'u güncelle
    if (backgroundVideoRef.current) {
      backgroundVideoRef.current.volume = videoVolume / 100;
    }
  }, [videoVolume]);

  // Persist Favorites
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Persist Bookmarks
  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Persist Hatim Mode
  useEffect(() => {
    localStorage.setItem('isHatimMode', JSON.stringify(isHatimMode));
  }, [isHatimMode]);

  // Persist Completed Surahs
  useEffect(() => {
    localStorage.setItem('completedSurahs', JSON.stringify(completedSurahs));
  }, [completedSurahs]);

  // If user types in search, switch to home view to show results
  useEffect(() => {
    if (searchQuery.length > 0 && currentView !== 'home') {
      pushHistorySnapshot({ searchQuery: '' });
      setCurrentView('home');
    }
  }, [searchQuery]);

  // --- Handlers ---

  const pushHistorySnapshot = (overrides?: Partial<NavSnapshot>) => {
    if (atGuardRef.current) {
      window.history.pushState({ kuranMeal: 'top' }, '');
      atGuardRef.current = false;
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setShowExitToast(false);
    }
    viewStackRef.current.push({ ...navStateRef.current, ...overrides });
    if (viewStackRef.current.length > 50) viewStackRef.current.shift();
  };
  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    // Aydınlık moda geçildiğinde video temalarını varsayılana çevir
    if (!newDarkMode && (backgroundTheme === 'fire' || backgroundTheme === 'rain' || backgroundTheme === 'wind' || backgroundTheme === 'waterfall')) {
      setBackgroundTheme('default');
    }
  };
  
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  const goToView = (view: ViewState) => {
    if (navStateRef.current.view !== view) pushHistorySnapshot();
    setSearchQuery("");
    setCurrentView(view);
    setIsMobileSearchOpen(false);
    closeSidebar();
  };

  const goHome = () => goToView('home');
  const goFavorites = () => goToView('favorites');
  const goBookmarks = () => goToView('bookmarks');
  const goSettings = () => goToView('settings');
  const goHatim = () => goToView('hatim');

  const toggleHatimMode = () => {
    const newMode = !isHatimMode;
    setIsHatimMode(newMode);
    
    // Hatim modu kapatılırsa tüm verileri sıfırla
    if (!newMode) {
      setCompletedSurahs([]);
    }
  };
  
  const handleOpenRecitation = (id: string) => {
    const cur = navStateRef.current;
    if (cur.view !== 'recitation' || cur.recitationId !== id) pushHistorySnapshot();
    setCurrentRecitationId(id);
    setCurrentView('recitation');
    setSearchQuery("");
    setIsMobileSearchOpen(false);
    closeSidebar();
  };

  const handleSelectSurah = (id: number) => {
    const cur = navStateRef.current;
    if (cur.view !== 'reader' || cur.surahId !== id) pushHistorySnapshot();
    setCurrentSurahId(id);
    setCurrentAyahIndex(0); // Reset to first Ayah
    setCurrentView('reader');
    setSearchQuery("");
    setIsMobileSearchOpen(false);
    closeSidebar();
  };

  const handleNavigateToAyah = (surahId: number, ayahIndex: number) => {
    const cur = navStateRef.current;
    if (cur.view !== 'reader' || cur.surahId !== surahId || cur.ayahIndex !== ayahIndex) {
      pushHistorySnapshot();
    }
    setCurrentSurahId(surahId);
    setCurrentAyahIndex(ayahIndex);
    setCurrentView('reader');

    setSearchQuery("");
    setIsMobileSearchOpen(false);
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

  const toggleSurahCompletion = (surahId: number) => {
    setCompletedSurahs(prev => 
      prev.includes(surahId) ? prev.filter(id => id !== surahId) : [...prev, surahId]
    );
  };

  const isSurahCompleted = (surahId: number) => {
    return completedSurahs.includes(surahId);
  };

  const handleBackgroundThemeChange = (theme: BackgroundTheme) => {
    setBackgroundTheme(theme);
    
    // Herhangi bir video teması seçildiğinde otomatik olarak karanlık moda geç
    if ((theme === 'fire' || theme === 'rain' || theme === 'wind' || theme === 'waterfall') && !isDarkMode) {
      setIsDarkMode(true);
    }
  };

  const handleAutoPlayNextSurah = () => {
    if (currentView !== 'reader') return;
    const idx = surahs.findIndex(s => s.id === currentSurahId);
    if (idx === -1 || idx >= surahs.length - 1) return; // Son suredeyse dur
    setPendingAutoPlay(true);
    setCurrentSurahId(surahs[idx + 1].id);
    setCurrentAyahIndex(0);
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
    <div className="flex flex-col h-[100dvh] overflow-hidden font-sans relative">
      {/* Global Background Video - Video temaları aktifse */}
      {(backgroundTheme === 'fire' || backgroundTheme === 'rain' || backgroundTheme === 'wind' || backgroundTheme === 'waterfall') && (
        <video
          key={backgroundTheme} // Tema değiştiğinde video yeniden yüklenir
          ref={backgroundVideoRef}
          autoPlay
          loop
          muted={true}
          playsInline
          preload="auto"
          className="fixed inset-0 w-full h-full object-cover -z-10"
          style={{ opacity: 0.5 }}
          onLoadedData={(e) => {
            const video = e.currentTarget;
            video.muted = true; // Başlangıçta sessiz
            video.volume = videoVolume / 100; // Ses seviyesini ayarla
            // Videoyu 0.5 saniye sonrasından başlat (başlangıç sessizliğini atla)
            video.currentTime = 0.5;
            video.play().catch(err => {
              console.log('Video autoplay engellendi:', err);
            });
          }}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            // Video bitiminden 1 saniye önce 0.5 saniyeye sar (seamless loop için)
            if (video.duration > 0 && video.currentTime >= video.duration - 1) {
              video.currentTime = 0.5;
            }
          }}
        >
          <source 
            src={
              backgroundTheme === 'fire' ? './fire-video.mp4' :
              backgroundTheme === 'rain' ? './rain-video.mp4' :
              backgroundTheme === 'wind' ? './wind-video.mp4' :
              './waterfall-video.mp4'
            } 
            type="video/mp4" 
          />
        </video>
      )}

      {/* Header */}
      <Header 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        toggleSidebar={toggleSidebar}
        onLogoClick={goHome}
        onFavoritesClick={goFavorites}
        onBookmarksClick={goBookmarks}
        onRandomClick={handleRandomAyah}
        onSettingsClick={goSettings}
        onHatimClick={goHatim}
        backgroundTheme={backgroundTheme}
        isMobileSearchOpen={isMobileSearchOpen}
        setIsMobileSearchOpen={setIsMobileSearchOpen}
      />

      {/* Çıkış Uyarısı (geri tuşuna ikinci kez basılırsa çıkılır) */}
      {showExitToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-black/80 text-white text-sm font-medium shadow-lg backdrop-blur-sm pointer-events-none">
          Çıkmak için tekrar geri tuşuna basın
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          surahs={filteredSurahs} 
          currentSurahId={currentSurahId} 
          onSelectSurah={handleSelectSurah} 
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          backgroundTheme={backgroundTheme}
        />

        {/* Main Content Area */}
        <div className="flex-1 relative flex flex-col min-w-0">
          {currentView === 'home' ? (
            <HomeView
              surahs={filteredSurahs}
              onOpenRecitation={handleOpenRecitation}
              onSelectSurah={handleSelectSurah}
              isHatimMode={isHatimMode}
              completedSurahs={completedSurahs}
              onToggleSurahCompletion={toggleSurahCompletion}
              backgroundTheme={backgroundTheme}
              searchQuery={searchQuery}
              ayahResults={ayahSearchResults}
              directResult={directAyahMatch}
              onNavigateToAyah={handleNavigateToAyah}
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
          ) : currentView === 'settings' ? (
            <SettingsView 
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
              navigationMode={navigationMode}
              onNavigationModeChange={setNavigationMode}
              reciter={reciter}
              onReciterChange={setReciter}
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
              arabicFontSize={arabicFontSize}
              onArabicFontSizeChange={setArabicFontSize}
              turkishFontSize={turkishFontSize}
              onTurkishFontSizeChange={setTurkishFontSize}
              backgroundTheme={backgroundTheme}
              onBackgroundThemeChange={handleBackgroundThemeChange}
              videoVolume={videoVolume}
              onVideoVolumeChange={setVideoVolume}
            />
          ) : currentView === 'recitation' && currentRecitationId ? (
            <RecitationView
              recitationId={currentRecitationId}
              surahs={surahs}
            />
          ) : currentView === 'hatim' ? (
            <HatimView 
              surahs={surahs}
              completedSurahs={completedSurahs}
              onToggleSurahCompletion={toggleSurahCompletion}
              onSelectSurah={handleSelectSurah}
              isHatimMode={isHatimMode}
              onToggleHatimMode={toggleHatimMode}
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
              navigationMode={navigationMode}
              reciter={reciter}
              displayMode={displayMode}
              arabicFontSize={arabicFontSize}
              turkishFontSize={turkishFontSize}
              backgroundVideoRef={backgroundVideoRef}
              onAutoPlayNextSurah={handleAutoPlayNextSurah}
              autoPlayPending={pendingAutoPlay}
              onAutoPlayPendingConsumed={() => setPendingAutoPlay(false)}
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