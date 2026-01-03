import React from 'react';
import { Surah } from '../types';
import { BISMILLAH } from '../constants';
import { Copy, ChevronLeft, ChevronRight, Heart, Check, Bookmark, Share2, MousePointer, Hand, List, Play, Pause } from 'lucide-react';

type NavigationMode = 'arrows' | 'swipe' | 'scroll';

interface SurahViewProps {
  surah: Surah;
  currentAyahIndex: number;
  onAyahChange: (index: number) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

const SurahView: React.FC<SurahViewProps> = ({ 
  surah, 
  currentAyahIndex, 
  onAyahChange,
  isFavorite,
  onToggleFavorite,
  isBookmarked,
  onToggleBookmark
}) => {
  const [copied, setCopied] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [navigationMode, setNavigationMode] = React.useState<NavigationMode>('scroll');
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = React.useState<number | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const touchStartX = React.useRef<number>(0);
  const touchEndX = React.useRef<number>(0);
  const touchStartY = React.useRef<number>(0);
  const isSwiping = React.useRef<boolean>(false);
  
  const activeAyah = surah.ayahs[currentAyahIndex];
  // Reset view when Surah changes usually handled by parent, but basic safety here
  const safeIndex = activeAyah ? currentAyahIndex : 0;
  const currentAyah = surah.ayahs[safeIndex];

  // Initialize cardRefs array
  React.useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, surah.ayahs.length);
  }, [surah.ayahs.length]);

  // Sürekli modda scroll ile ayet takibi
  React.useEffect(() => {
    if (navigationMode !== 'scroll') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const index = cardRefs.current.indexOf(entry.target as HTMLDivElement);
            if (index !== -1 && index !== safeIndex) {
              onAyahChange(index);
            }
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '-20% 0px -20% 0px'
      }
    );

    cardRefs.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => {
      observer.disconnect();
    };
  }, [navigationMode, surah.ayahs.length, safeIndex, onAyahChange]);

  const handleNext = () => {
    if (safeIndex < surah.ayahs.length - 1) {
      onAyahChange(safeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      onAyahChange(safeIndex - 1);
    }
  };

  // Ses URL'ini oluştur
  const getAudioUrl = (surahNumber: number, ayahNumber: number) => {
    const surahPadded = String(surahNumber).padStart(3, '0');
    const ayahPadded = String(ayahNumber).padStart(3, '0');
    return `https://everyayah.com/data/Husary_128kbps/${surahPadded}${ayahPadded}.mp3`;
  };

  // Ses çalma/durdurma
  const handlePlayAudio = (index: number) => {
    const ayah = surah.ayahs[index];
    const audioUrl = getAudioUrl(surah.id, ayah.numberInSurah);

    // Aynı ayete tekrar basılırsa durdur
    if (currentPlayingIndex === index && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setCurrentPlayingIndex(null);
      return;
    }

    // Yeni ses çal
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setCurrentPlayingIndex(index);
    setIsPlaying(true);

    audio.play().catch((err) => {
      console.error('Ses çalma hatası:', err);
      setIsPlaying(false);
      setCurrentPlayingIndex(null);
    });

    // Ses bittiğinde
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentPlayingIndex(null);
    };

    // Hata durumunda
    audio.onerror = () => {
      console.error('Ses yükleme hatası');
      setIsPlaying(false);
      setCurrentPlayingIndex(null);
    };
  };

  // Component unmount olduğunda sesi durdur
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Swipe handlers - sadece swipe modunda çalışacak
  const handleTouchStart = (e: React.TouchEvent) => {
    if (navigationMode !== 'swipe') return;
    
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (navigationMode !== 'swipe') return;
    
    touchEndX.current = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    
    const deltaX = Math.abs(touchStartX.current - touchEndX.current);
    const deltaY = Math.abs(touchStartY.current - touchEndY);
    
    // Yatay kaydırma dikey kaydırmadan fazlaysa swipe olarak işaretle
    if (deltaX > deltaY && deltaX > 10) {
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (navigationMode !== 'swipe' || !isSwiping.current) {
      touchStartX.current = 0;
      touchEndX.current = 0;
      touchStartY.current = 0;
      isSwiping.current = false;
      return;
    }

    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 70; // Daha yüksek hassasiyet

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        // Sağdan sola kaydırma - Sonraki ayet
        handleNext();
      } else {
        // Soldan sağa kaydırma - Önceki ayet
        handlePrev();
      }
    }

    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
    touchStartY.current = 0;
    isSwiping.current = false;
  };

  const toggleNavigationMode = () => {
    const modes: NavigationMode[] = ['scroll', 'swipe', 'arrows'];
    const currentIndex = modes.indexOf(navigationMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setNavigationMode(modes[nextIndex]);
  };

  const getModeIcon = () => {
    switch (navigationMode) {
      case 'arrows':
        return <MousePointer size={18} />;
      case 'swipe':
        return <Hand size={18} />;
      case 'scroll':
        return <List size={18} />;
    }
  };

  const getModeText = () => {
    switch (navigationMode) {
      case 'arrows':
        return 'Yön Tuşları';
      case 'swipe':
        return 'Kaydırma';
      case 'scroll':
        return 'Sürekli';
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newIndex = Number(e.target.value);
    onAyahChange(newIndex);
    
    // Sürekli modda seçilen ayete scroll yap
    if (navigationMode === 'scroll') {
      setTimeout(() => {
        const targetCard = cardRefs.current[newIndex];
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentAyah.textTurkish);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Kopyalama başarısız:', err);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    
    setSharing(true);
    try {
      // Dinamik import
      const html2canvas = (await import('html2canvas')).default;
      
      // Kartın screenshot'ını al
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3, // Daha yüksek kalite için
        logging: false,
        useCORS: true,
        allowTaint: true,
        removeContainer: true
      });
      
      // Canvas'ı blob'a çevir
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const fileName = `${surah.nameTurkish}-${currentAyah.numberInSurah}.png`;
        
        // Mobil cihaz kontrolü
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Sadece mobilde Web Share API kullan
        if (isMobile && navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `${surah.nameTurkish} - ${currentAyah.numberInSurah}. Ayet`,
                text: 'Kur\'an-ı Kerim\'den bir ayet'
              });
              setSharing(false);
              return;
            }
          } catch (err) {
            // Paylaşım iptal edildi, indirmeye geç
            console.log('Paylaşım iptal edildi');
          }
        }
        
        // Bilgisayarda veya paylaşım başarısız olursa direkt indir
        downloadImage(blob, fileName);
        setSharing(false);
        
      }, 'image/png');
      
    } catch (err) {
      console.error('Paylaşma hatası:', err);
      setSharing(false);
    }
  };

  const handleShareScroll = async (index: number) => {
    const targetRef = cardRefs.current[index];
    if (!targetRef) return;
    
    setSharing(true);
    try {
      // Dinamik import
      const html2canvas = (await import('html2canvas')).default;
      
      // Kartın screenshot'ını al
      const canvas = await html2canvas(targetRef, {
        backgroundColor: null,
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
        removeContainer: true
      });
      
      // Canvas'ı blob'a çevir
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const ayah = surah.ayahs[index];
        const fileName = `${surah.nameTurkish}-${ayah.numberInSurah}.png`;
        
        // Mobil cihaz kontrolü
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Sadece mobilde Web Share API kullan
        if (isMobile && navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `${surah.nameTurkish} - ${ayah.numberInSurah}. Ayet`,
                text: 'Kur\'an-ı Kerim\'den bir ayet'
              });
              setSharing(false);
              return;
            }
          } catch (err) {
            console.log('Paylaşım iptal edildi');
          }
        }
        
        // Bilgisayarda veya paylaşım başarısız olursa direkt indir
        downloadImage(blob, fileName);
        setSharing(false);
        
      }, 'image/png');
      
    } catch (err) {
      console.error('Paylaşma hatası:', err);
      setSharing(false);
    }
  };

  const downloadImage = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper function to format text with colored parentheses
  const formatTurkishText = (text: string) => {
    // Replaces (...) with a span styled with secondary color
    return text.replace(
      /\(([^)]+)\)/g, 
      '<span class="text-light-secondary dark:text-dark-secondary font-normal opacity-90">($1)</span>'
    );
  };

  return (
    <main className="flex flex-col h-full bg-light-bg dark:bg-dark-bg relative overflow-hidden">
      
      {/* Top Info Bar - Rigid Fixed Height - Updated to remove Arabic Title */}
      <div className="flex-none py-6 px-4 text-center z-10 shrink-0 border-b border-transparent bg-light-bg dark:bg-dark-bg transition-all">
        <h1 className="text-1xl md:text-1xl font-bold text-light-text dark:text-dark-text mb-4 leading-tight">
          {surah.nameTurkish}
        </h1>
        
        {/* Bismillah (Significantly larger) */}
        {surah.id !== 9 && (
           <div className="mt-2 opacity-75 font-arabic text-2xl md:text-3xl text-light-text dark:text-dark-text leading-relaxed">
             {BISMILLAH}
           </div>
        )}
      </div>

      {/* Main Card Area - Değişken yapı modlara göre */}
      {navigationMode === 'scroll' ? (
        // Scroll Modu - Tüm ayetler alt alta
        <div className="flex-1 overflow-y-auto relative scroll-smooth bg-light-bg dark:bg-dark-bg">
          <div className="max-w-2xl mx-auto p-3 md:p-8 space-y-6">
            {surah.ayahs.map((ayah, index) => (
              <div 
                key={ayah.id}
                ref={(el) => (cardRefs.current[index] = el)}
                className="w-full bg-light-card dark:bg-dark-card rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-5 md:p-10 relative flex flex-col items-center text-center transition-all duration-300"
              >
                {/* Sure Adı ve Ayet Numarası */}
                <div className="w-full mb-4 text-center pt-2">
                  <h2 className="text-sm md:text-base font-medium text-light-secondary dark:text-dark-secondary opacity-70">
                    {surah.nameTurkish} - {ayah.numberInSurah}. Ayet
                  </h2>
                </div>

                {/* Arabic Text */}
                <div className="w-full mb-4 md:mb-8 px-2" dir="rtl">
                  <p className="font-arabic text-3xl md:text-5xl leading-[2.0] md:leading-[2.2] text-light-arabic dark:text-dark-arabic text-center w-full break-words whitespace-normal">
                    {ayah.textArabic}
                  </p>
                </div>

                {/* Separator */}
                <div className="w-16 md:w-24 h-0.5 rounded-full bg-light-border dark:bg-dark-border mb-4 md:mb-8 shrink-0"></div>

                {/* Turkish Text */}
                <div className="w-full px-2">
                  <p 
                    className="text-base md:text-xl leading-relaxed text-light-text dark:text-dark-text font-medium font-sans w-full break-words whitespace-normal"
                    dangerouslySetInnerHTML={{ __html: formatTurkishText(ayah.textTurkish) }}
                  />
                </div>

                {/* Action Row */}
                <div className="flex gap-4 mt-8 pt-4 border-t border-light-border/50 dark:border-dark-border/50 w-full justify-center opacity-80 hover:opacity-100 transition-opacity shrink-0">
                  {/* Play Button */}
                  <button 
                    onClick={() => handlePlayAudio(index)}
                    className={`flex items-center gap-2 p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-all ${currentPlayingIndex === index && isPlaying ? 'text-green-500' : 'text-light-secondary dark:text-dark-secondary hover:text-green-500'}`}
                    title={currentPlayingIndex === index && isPlaying ? 'Durdur' : 'Dinle'}
                  >
                    {currentPlayingIndex === index && isPlaying ? (
                      <Pause size={20} className="fill-current" />
                    ) : (
                      <Play size={20} />
                    )}
                    <span className="text-sm font-medium hidden md:block">
                      {currentPlayingIndex === index && isPlaying ? 'Durdur' : 'Dinle'}
                    </span>
                  </button>

                  {/* Share Button */}
                  <button 
                    onClick={() => handleShareScroll(index)}
                    disabled={sharing}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg text-light-secondary dark:text-dark-secondary hover:text-green-500 transition-all disabled:opacity-50"
                    title="Görsel Olarak Paylaş"
                  >
                    <Share2 size={20} className={sharing ? 'animate-pulse' : ''} />
                    <span className="text-sm font-medium hidden md:block">
                      {sharing ? 'Hazırlanıyor...' : 'Paylaş'}
                    </span>
                  </button>

                  {/* Copy Button */}
                  <button 
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(ayah.textTurkish);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch (err) {
                        console.error('Kopyalama başarısız:', err);
                      }
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg text-light-secondary dark:text-dark-secondary hover:text-light-text dark:hover:text-dark-text transition-all"
                    title="Türkçe Meali Kopyala"
                  >
                    {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                    <span className="text-sm font-medium hidden md:block">
                      {copied ? 'Kopyalandı' : 'Kopyala'}
                    </span>
                  </button>

                  {/* Favorite Button */}
                  <button 
                    onClick={() => {
                      onAyahChange(index);
                      setTimeout(() => onToggleFavorite(), 100);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-all ${index === safeIndex && isFavorite ? 'text-red-500' : 'text-light-secondary dark:text-dark-secondary hover:text-red-500'}`}
                    title="Favorilere Ekle"
                  >
                    <Heart size={20} className={index === safeIndex && isFavorite ? 'fill-current' : ''} />
                    <span className="text-sm font-medium hidden md:block">
                      Beğen
                    </span>
                  </button>

                  {/* Bookmark Button */}
                  <button 
                    onClick={() => {
                      onAyahChange(index);
                      setTimeout(() => onToggleBookmark(), 100);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-all ${index === safeIndex && isBookmarked ? 'text-blue-500' : 'text-light-secondary dark:text-dark-secondary hover:text-blue-500'}`}
                    title="Burada Kaldım"
                  >
                    <Bookmark size={20} className={index === safeIndex && isBookmarked ? 'fill-current' : ''} />
                    <span className="text-sm font-medium hidden md:block">
                      Burada Kaldım
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Arrows ve Swipe Modu - Tek ayet gösterimi
        <div 
          className="flex-1 overflow-y-auto relative scroll-smooth bg-light-bg dark:bg-dark-bg"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="min-h-full flex flex-col items-center justify-center p-3 md:p-8">
            <div 
              ref={cardRef}
              className="w-full max-w-2xl bg-light-card dark:bg-dark-card rounded-2xl shadow-sm border border-light-border dark:border-dark-border p-5 md:p-10 relative flex flex-col items-center text-center transition-all duration-300 my-2"
            >
              {/* Sure Adı ve Ayet Numarası */}
              <div className="w-full mb-4 text-center pt-2">
                <h2 className="text-sm md:text-base font-medium text-light-secondary dark:text-dark-secondary opacity-70">
                  {surah.nameTurkish} - {currentAyah.numberInSurah}. Ayet
                </h2>
              </div>

              {/* Arabic Text */}
              <div className="w-full mb-4 md:mb-8 pt-8 md:pt-6 px-2" dir="rtl">
                <p className="font-arabic text-3xl md:text-5xl leading-[2.0] md:leading-[2.2] text-light-arabic dark:text-dark-arabic text-center w-full break-words whitespace-normal">
                  {currentAyah.textArabic}
                </p>
              </div>

              {/* Separator */}
              <div className="w-16 md:w-24 h-0.5 rounded-full bg-light-border dark:bg-dark-border mb-4 md:mb-8 shrink-0"></div>

              {/* Turkish Text */}
              <div className="w-full px-2">
                <p 
                  className="text-base md:text-xl leading-relaxed text-light-text dark:text-dark-text font-medium font-sans w-full break-words whitespace-normal"
                  dangerouslySetInnerHTML={{ __html: formatTurkishText(currentAyah.textTurkish) }}
                />
              </div>

              {/* Action Row */}
              <div className="flex gap-4 mt-8 pt-4 border-t border-light-border/50 dark:border-dark-border/50 w-full justify-center opacity-80 hover:opacity-100 transition-opacity shrink-0">
                {/* Play Button */}
                <button 
                  onClick={() => handlePlayAudio(safeIndex)}
                  className={`flex items-center gap-2 p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-all ${currentPlayingIndex === safeIndex && isPlaying ? 'text-green-500' : 'text-light-secondary dark:text-dark-secondary hover:text-green-500'}`}
                  title={currentPlayingIndex === safeIndex && isPlaying ? 'Durdur' : 'Dinle'}
                >
                  {currentPlayingIndex === safeIndex && isPlaying ? (
                    <Pause size={20} className="fill-current" />
                  ) : (
                    <Play size={20} />
                  )}
                  <span className="text-sm font-medium hidden md:block">
                    {currentPlayingIndex === safeIndex && isPlaying ? 'Durdur' : 'Dinle'}
                  </span>
                </button>

                {/* Share Button */}
                <button 
                  onClick={handleShare}
                  disabled={sharing}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg text-light-secondary dark:text-dark-secondary hover:text-green-500 transition-all disabled:opacity-50"
                  title="Görsel Olarak Paylaş"
                >
                  <Share2 size={20} className={sharing ? 'animate-pulse' : ''} />
                  <span className="text-sm font-medium hidden md:block">
                    {sharing ? 'Hazırlanıyor...' : 'Paylaş'}
                  </span>
                </button>

                {/* Copy Button */}
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg text-light-secondary dark:text-dark-secondary hover:text-light-text dark:hover:text-dark-text transition-all"
                  title="Türkçe Meali Kopyala"
                >
                  {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                  <span className="text-sm font-medium hidden md:block">
                    {copied ? 'Kopyalandı' : 'Kopyala'}
                  </span>
                </button>

                {/* Favorite Button */}
                <button 
                  onClick={onToggleFavorite}
                  className={`flex items-center gap-2 p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-all ${isFavorite ? 'text-red-500' : 'text-light-secondary dark:text-dark-secondary hover:text-red-500'}`}
                  title={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                >
                  <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
                  <span className="text-sm font-medium hidden md:block">
                    {isFavorite ? 'Beğenildi' : 'Beğen'}
                  </span>
                </button>

                {/* Bookmark Button */}
                <button 
                  onClick={onToggleBookmark}
                  className={`flex items-center gap-2 p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-all ${isBookmarked ? 'text-blue-500' : 'text-light-secondary dark:text-dark-secondary hover:text-blue-500'}`}
                  title={isBookmarked ? 'İşaretten Çıkar' : 'Burada Kaldım'}
                >
                  <Bookmark size={20} className={isBookmarked ? 'fill-current' : ''} />
                  <span className="text-sm font-medium hidden md:block">
                    {isBookmarked ? 'İşaretli' : 'Burada Kaldım'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar - Rigid Fixed */}
      <div className="flex-none bg-light-card dark:bg-dark-card border-t border-light-border dark:border-dark-border p-3 md:p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30 shrink-0">
         <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            
            {/* Previous Button - Sadece arrows modunda */}
            {navigationMode === 'arrows' && (
              <button 
                  onClick={handlePrev}
                  disabled={safeIndex === 0}
                  className="flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-3 rounded-xl bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                  <ChevronLeft size={20} />
                  <span className="hidden md:inline font-medium">Önceki</span>
              </button>
            )}

            {/* Ayah Selector - Tüm modlarda */}
            <div className="flex-1 max-w-xs mx-auto">
                <select 
                    value={safeIndex}
                    onChange={handleSelectChange}
                    className="w-full text-center appearance-none bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-border rounded-xl py-2.5 px-4 md:py-3 md:px-8 font-medium focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm md:text-base"
                >
                    {surah.ayahs.map((a, idx) => (
                        <option key={a.id} value={idx}>
                            {a.numberInSurah}. Ayet
                        </option>
                    ))}
                </select>
            </div>

            {/* Mode Toggle Button */}
            <button 
                onClick={toggleNavigationMode}
                className="flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-3 rounded-xl bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                title="Navigasyon Modunu Değiştir"
            >
                {getModeIcon()}
                <span className="hidden md:inline font-medium">{getModeText()}</span>
            </button>

            {/* Next Button - Sadece arrows modunda */}
            {navigationMode === 'arrows' && (
              <button 
                  onClick={handleNext}
                  disabled={safeIndex === surah.ayahs.length - 1}
                  className="flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-3 rounded-xl bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                  <span className="hidden md:inline font-medium">Sonraki</span>
                  <ChevronRight size={20} />
              </button>
            )}

         </div>
      </div>

    </main>
  );
};

export default SurahView;