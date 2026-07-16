import React from 'react';
import { Search, Menu, Heart, Shuffle, Bookmark, Settings, BookCheck, ArrowLeft, X } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
  onLogoClick?: () => void;
  onFavoritesClick?: () => void;
  onBookmarksClick?: () => void;
  onRandomClick?: () => void;
  onSettingsClick?: () => void;
  onHatimClick?: () => void;
  backgroundTheme?: 'default' | 'fire' | 'rain' | 'wind' | 'waterfall';
  isMobileSearchOpen: boolean;
  setIsMobileSearchOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  toggleSidebar,
  onLogoClick,
  onFavoritesClick,
  onBookmarksClick,
  onRandomClick,
  onSettingsClick,
  onHatimClick,
  backgroundTheme = 'default',
  isMobileSearchOpen,
  setIsMobileSearchOpen
}) => {
  const headerClass = (backgroundTheme === 'fire' || backgroundTheme === 'rain' || backgroundTheme === 'wind' || backgroundTheme === 'waterfall')
    ? 'sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-4 transition-colors duration-300 border-b shadow-sm bg-light-card/50 dark:bg-dark-card/50 border-light-border dark:border-dark-border h-16'
    : 'sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-4 transition-colors duration-300 border-b shadow-sm bg-light-card dark:bg-dark-card border-light-border dark:border-dark-border h-16';

  return (
    <header className={headerClass}>
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile Menu Button */}
        <button 
          onClick={toggleSidebar}
          className="p-2 -ml-2 rounded-lg md:hidden text-light-secondary dark:text-dark-secondary hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
          aria-label="Menüyü Aç"
        >
          <Menu size={24} />
        </button>

        {/* Logo Area */}
        <button onClick={onLogoClick} className="flex items-center gap-3 group focus:outline-none">
          {/* Logo: White background circle, Black text */}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-black shadow-sm border border-gray-100 group-hover:scale-105 transition-transform">
            <span className="text-xl font-bold font-arabic leading-none pb-1">ا</span>
          </div>
          <span className="text-lg font-semibold tracking-wide hidden sm:block text-light-text dark:text-dark-text group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors">
            Kur-an Meal
          </span>
        </button>
      </div>

      {/* Search Bar - Masaüstü (mobilde büyüteç ikonuyla açılır) */}
      <div className="hidden md:block flex-1 max-w-xl px-4 lg:px-8">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-light-secondary dark:text-dark-secondary">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full p-2.5 pl-10 text-sm rounded-full
              bg-light-bg dark:bg-dark-bg
              border border-transparent
              focus:border-light-accent dark:focus:border-dark-accent
              text-light-text dark:text-dark-text
              focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent
              placeholder-light-secondary dark:placeholder-dark-secondary
              transition-all duration-300 shadow-inner"
            placeholder="Sure veya ayet ara..."
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={() => setIsMobileSearchOpen(true)}
          className="p-2 rounded-full md:hidden text-light-secondary dark:text-dark-secondary hover:bg-light-bg dark:hover:bg-dark-bg transition-colors duration-300"
          title="Ara"
          aria-label="Ara"
        >
          <Search size={20} className="hover:text-light-accent dark:hover:text-dark-accent transition-colors" />
        </button>

        <button
          onClick={onRandomClick}
          className="p-2 rounded-full text-light-secondary dark:text-dark-secondary hover:bg-light-bg dark:hover:bg-dark-bg transition-colors duration-300"
          title="Rastgele Ayet Göster"
          aria-label="Rastgele Ayet"
        >
          <Shuffle size={20} className="hover:text-light-accent dark:hover:text-dark-accent transition-colors" />
        </button>

        <button
          onClick={onBookmarksClick}
          className="p-2 rounded-full text-light-secondary dark:text-dark-secondary hover:bg-light-bg dark:hover:bg-dark-bg transition-colors duration-300"
          title="Burada Kaldım"
          aria-label="Burada Kaldım"
        >
          <Bookmark size={20} className="hover:text-blue-500 transition-colors" />
        </button>

        <button
          onClick={onFavoritesClick}
          className="p-2 rounded-full text-light-secondary dark:text-dark-secondary hover:bg-light-bg dark:hover:bg-dark-bg transition-colors duration-300"
          aria-label="Favorilerim"
        >
          <Heart size={20} className="hover:text-red-500 transition-colors" />
        </button>

        <button
          onClick={onHatimClick}
          className="p-2 rounded-full text-light-secondary dark:text-dark-secondary hover:bg-light-bg dark:hover:bg-dark-bg transition-colors duration-300"
          title="Hatim Takibi"
          aria-label="Hatim Takibi"
        >
          <BookCheck size={20} className="hover:text-green-500 transition-colors" />
        </button>
        
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-full text-light-secondary dark:text-dark-secondary hover:bg-light-bg dark:hover:bg-dark-bg transition-colors duration-300"
          aria-label="Ayarlar"
        >
          <Settings size={20} className="hover:text-light-accent dark:hover:text-dark-accent transition-colors" />
        </button>
      </div>

      {/* Mobil Arama - Tam genişlikte açılan arama çubuğu */}
      {isMobileSearchOpen && (
        <div className="absolute inset-0 z-40 flex md:hidden items-center gap-1 px-2 bg-light-card dark:bg-dark-card">
          <button
            onClick={() => setIsMobileSearchOpen(false)}
            className="p-2 shrink-0 rounded-full text-light-secondary dark:text-dark-secondary hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
            aria-label="Aramayı Kapat"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="block w-full p-2.5 pl-4 pr-10 text-sm rounded-full
                bg-light-bg dark:bg-dark-bg
                border border-transparent
                focus:border-light-accent dark:focus:border-dark-accent
                text-light-text dark:text-dark-text
                focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent
                placeholder-light-secondary dark:placeholder-dark-secondary
                transition-all duration-300 shadow-inner"
              placeholder="Sure veya ayet ara..."
            />
            {searchQuery.length > 0 && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-light-secondary dark:text-dark-secondary hover:text-light-text dark:hover:text-dark-text transition-colors"
                aria-label="Aramayı Temizle"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;