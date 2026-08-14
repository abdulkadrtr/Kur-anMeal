import React from 'react';
import { Surah } from '../types';
import { BISMILLAH } from '../constants';
import { formatTurkishText, makeArtworkPng } from '../utils';
import { Copy, ChevronLeft, ChevronRight, Heart, Check, Bookmark, Share2, Play, Pause, PlayCircle, StopCircle } from 'lucide-react';

type NavigationMode = 'arrows' | 'swipe' | 'scroll';
type ReciterType = 'husary' | 'alqatami' | 'dosari';
type DisplayMode = 'both' | 'arabic' | 'turkish';
type FontSize = 'small' | 'medium' | 'large';

interface SurahViewProps {
  surah: Surah;
  currentAyahIndex: number;
  onAyahChange: (index: number) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  navigationMode: NavigationMode;
  reciter: ReciterType;
  displayMode: DisplayMode;
  arabicFontSize: FontSize;
  turkishFontSize: FontSize;
  onAmbientStart: () => void;
  onAmbientStop: () => void;
  nextSurah?: { id: number; name: string; firstAyahParts: number[] };
  onAutoPlayNextSurah?: () => void;
  autoPlayPending?: boolean;
  onAutoPlayPendingConsumed?: () => void;
}

const SurahView: React.FC<SurahViewProps> = ({
  surah,
  currentAyahIndex,
  onAyahChange,
  isFavorite,
  onToggleFavorite,
  isBookmarked,
  onToggleBookmark,
  navigationMode,
  reciter,
  displayMode,
  arabicFontSize,
  turkishFontSize,
  onAmbientStart,
  onAmbientStop,
  nextSurah,
  onAutoPlayNextSurah,
  autoPlayPending,
  onAutoPlayPendingConsumed
}) => {
  const [copied, setCopied] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = React.useState<number | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = React.useState(false);

  // --- SES MOTORU (arka plan uyumlu) -------------------------------------
  // WebAudio + setTimeout tabanlı eski motor kilitli ekranda ölüyordu:
  // zamanlayıcılar kısılır, WebAudio bildirim kartı üretmez. Yeni motor tek
  // <audio> elemanı + 'ended' olayı zinciri kullanır (olaylar kısılmaz),
  // sıradaki parçaları blob olarak ÖNCEDEN indirir (geçişte ağ = sıfır) ve
  // Media Session ile kilit ekranı kartı kurar.
  type QueueEntry = { url: string; ayahIndex: number };
  // Çift eleman (ping-pong): sıradaki parça yedek elemana ÖNCEDEN yüklenir,
  // 'ended' anında hazır elemana geçilir -> ayetler arası boşluk ~0.
  const elsRef = React.useRef<(HTMLAudioElement | null)[]>([null, null]);
  const activeIdxRef = React.useRef(0);
  const queueRef = React.useRef<QueueEntry[]>([]);
  const queuePosRef = React.useRef(0);
  const modeRef = React.useRef<'idle' | 'single' | 'auto'>('idle');
  const engineSurahIdRef = React.useRef<number | null>(null);
  const blobMapRef = React.useRef<Map<string, string>>(new Map()); // url -> blobURL ('' = yükleniyor)
  const wantPlayingRef = React.useRef(false);
  const errorRunRef = React.useRef(0);
  const isAutoPlayingRef = React.useRef<boolean>(false);
  const onEndedRef = React.useRef<() => void>(() => {});
  const onErrorRef = React.useRef<() => void>(() => {});
  const onEarlyRef = React.useRef<() => void>(() => {});
  const surahRef = React.useRef(surah);
  const nextSurahRef = React.useRef(nextSurah);
  const navModeRef = React.useRef(navigationMode);
  React.useEffect(() => { surahRef.current = surah; }, [surah]);
  React.useEffect(() => { nextSurahRef.current = nextSurah; }, [nextSurah]);
  React.useEffect(() => { navModeRef.current = navigationMode; }, [navigationMode]);

  const cardRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const touchStartX = React.useRef<number>(0);
  const touchEndX = React.useRef<number>(0);
  const touchStartY = React.useRef<number>(0);
  const isSwiping = React.useRef<boolean>(false);
  const isAutoScrolling = React.useRef<boolean>(false);
  
  const activeAyah = surah.ayahs[currentAyahIndex];
  // Reset view when Surah changes usually handled by parent, but basic safety here
  const safeIndex = activeAyah ? currentAyahIndex : 0;
  const currentAyah = surah.ayahs[safeIndex];

  // Initialize cardRefs array
  React.useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, surah.ayahs.length);
  }, [surah.ayahs.length]);

  // Sure değişince motoru durdur — TEK İSTİSNA: otomatik akış sure sınırını
  // kendisi geçtiyse (engineSurahId zaten yeni sureyi gösterir) durdurma.
  React.useEffect(() => {
    if (modeRef.current === 'auto' && engineSurahIdRef.current === surah.id) return;
    stopEngine();
  }, [surah.id]);

  React.useEffect(() => {
    if (!autoPlayPending) return;
    onAutoPlayPendingConsumed?.();
    const el = elsRef.current[activeIdxRef.current];
    if (modeRef.current === 'auto' && engineSurahIdRef.current === surah.id && el && el.dataset.url) {
      // Sure sınırı 'ended' olayında senkron geçildi ve ilk ayet zaten çalıyor:
      // kuyruğu bu surenin tam listesiyle yeniden kur, konumu koru.
      const full = buildQueue(surah, 0);
      const pos = full.findIndex(e => e.url === el.dataset.url);
      queueRef.current = full;
      queuePosRef.current = Math.max(0, pos);
      prefetchAhead();
    } else {
      startAutoPlay(0);
    }
  }, [surah.id, autoPlayPending]);

  // Sigorta: play() arka planda yine de bloke olduysa ekran açılınca devam et.
  // Unmount'ta motoru tamamen kapat.
  React.useEffect(() => {
    const onVisible = () => {
      const el = elsRef.current[activeIdxRef.current];
      if (document.visibilityState === 'visible' && el && wantPlayingRef.current && el.paused) {
        el.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      wantPlayingRef.current = false;
      elsRef.current.forEach(e => e?.pause());
      blobMapRef.current.forEach(u => { if (u) URL.revokeObjectURL(u); });
      blobMapRef.current.clear();
      onAmbientStop();
      if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
    };
  }, []);

  // Sürekli modda ayet değiştiğinde scroll yap (sadece programatik değişikliklerde)
  React.useEffect(() => {
    if (navigationMode !== 'scroll') return;

    const targetCard = cardRefs.current[safeIndex];
    if (targetCard) {
      isAutoScrolling.current = true;
      
      requestAnimationFrame(() => {
        targetCard.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center'
        });
        
        // Scroll bittiğinde flag'i kaldır
        setTimeout(() => {
          isAutoScrolling.current = false;
        }, 1000);
      });
    }
  }, [surah.id]); // Sadece sure değiştiğinde çalış

  // Sürekli modda scroll ile ayet takibi
  React.useEffect(() => {
    if (navigationMode !== 'scroll') return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Otomatik scroll sırasında güncelleme yapma
        if (isAutoScrolling.current) return;

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

  // Ses URL'ini oluştur - Reciter'a göre
  const getAudioUrl = (surahNumber: number, ayahNumber: number) => {
    const surahPadded = String(surahNumber).padStart(3, '0');
    const ayahPadded = String(ayahNumber).padStart(3, '0');
    
    if (reciter === 'husary') {
      return `https://everyayah.com/data/Husary_128kbps/${surahPadded}${ayahPadded}.mp3`;
    } else if (reciter === 'alqatami') {
      return `https://everyayah.com/data/Nasser_Alqatami_128kbps/${surahPadded}${ayahPadded}.mp3`;
    } else {
      return `https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/${surahPadded}${ayahPadded}.mp3`;
    }
  };

  // Bitişik ayetler için tüm ayet numaralarını al (örn: "3-4" -> [3, 4])
  const getAyahNumbers = (numberInSurah: number | string): number[] => {
    const numStr = String(numberInSurah);
    if (numStr.includes('-')) {
      const [start, end] = numStr.split('-').map(n => parseInt(n));
      const numbers: number[] = [];
      for (let i = start; i <= end; i++) {
        numbers.push(i);
      }
      return numbers;
    }
    return [parseInt(numStr)];
  };

  // ---------------- SES MOTORU ----------------
  const RECITER_NAMES: Record<ReciterType, string> = {
    husary: 'Mahmud Halil el-Husarî',
    alqatami: 'Nasser Al Qatami',
    dosari: 'Yasser Al-Dosari',
  };

  // İki ses elemanı; dinleyiciler BİR KEZ bağlanır ve yalnızca AKTİF
  // elemandan gelen olaylar işlenir (yedek elemanın yükleme olayları karışmaz).
  const getEl = (i: number): HTMLAudioElement => {
    if (!elsRef.current[i]) {
      const el = new Audio();
      el.preload = 'auto';
      const isActive = () => el === elsRef.current[activeIdxRef.current];
      el.addEventListener('ended', () => { if (isActive()) onEndedRef.current(); });
      el.addEventListener('error', () => { if (isActive()) onErrorRef.current(); });
      el.addEventListener('playing', () => { if (isActive()) errorRunRef.current = 0; });
      el.addEventListener('play', () => { if (isActive()) setIsPlaying(true); });
      el.addEventListener('pause', () => { if (isActive()) setIsPlaying(false); });
      // ERKEN GEÇİŞ: dosyanın son ~250ms'i (sessizlik payı) kala, hazır bekleyen
      // yedek elemanı başlat -> geçiş kulağa tamamen kesintisiz gelir.
      // Arka planda timeupdate seyrekleşirse 'ended' yolu yedek olarak devrededir.
      el.addEventListener('timeupdate', () => {
        if (!isActive() || modeRef.current === 'idle') return;
        const d = el.duration;
        if (!isFinite(d) || d <= 0 || d - el.currentTime > 0.25) return;
        onEarlyRef.current();
      });
      elsRef.current[i] = el;
    }
    return elsRef.current[i]!;
  };
  const activeEl = () => getEl(activeIdxRef.current);
  const standbyEl = () => getEl(1 - activeIdxRef.current);

  // Sıradaki parçayı YEDEK elemana tam olarak yükle: 'ended' geldiğinde
  // decode edilmiş, çalmaya hazır bekler -> geçiş boşluğu duyulmaz.
  const prepareStandby = () => {
    const q = queueRef.current;
    const pos = queuePosRef.current;
    let url: string | null = q[pos + 1]?.url ?? null;
    if (!url && modeRef.current === 'auto') {
      const ns = nextSurahRef.current;
      if (ns) url = getAudioUrl(ns.id, ns.firstAyahParts[0]);
    }
    if (!url) return;
    const sb = standbyEl();
    if (sb.dataset.url === url) return;
    sb.dataset.url = url;
    sb.src = blobMapRef.current.get(url) || url;
    try { sb.load(); } catch { /* önemsiz */ }
  };

  const buildQueue = (s: Surah, fromIndex: number): QueueEntry[] => {
    const q: QueueEntry[] = [];
    for (let i = fromIndex; i < s.ayahs.length; i++) {
      for (const n of getAyahNumbers(s.ayahs[i].numberInSurah)) {
        q.push({ url: getAudioUrl(s.id, n), ayahIndex: i });
      }
    }
    return q;
  };

  const prefetchUrl = (url: string) => {
    if (blobMapRef.current.has(url)) return;
    blobMapRef.current.set(url, ''); // yükleniyor işareti
    fetch(url)
      .then(r => (r.ok ? r.blob() : Promise.reject()))
      .then(b => blobMapRef.current.set(url, URL.createObjectURL(b)))
      .catch(() => blobMapRef.current.delete(url));
  };

  // Sıradaki 3 parçayı blob olarak hazırla; kuyruk bitmek üzereyse sıradaki
  // surenin ilk ayetini de hazırla. Geçiş anında ağ trafiği sıfır olur —
  // kilitli telefonda zincirin kopmamasının anahtarı bu.
  const prefetchAhead = () => {
    const q = queueRef.current;
    const pos = queuePosRef.current;
    for (let i = pos + 1; i <= pos + 3 && i < q.length; i++) prefetchUrl(q[i].url);
    const ns = nextSurahRef.current;
    if (modeRef.current === 'auto' && ns && q.length - pos <= 2) {
      ns.firstAyahParts.forEach(n => prefetchUrl(getAudioUrl(ns.id, n)));
    }
    // geride kalan blob'ları bırak
    for (let i = 0; i < pos - 1; i++) {
      const url = q[i]?.url;
      if (!url) continue;
      const b = blobMapRef.current.get(url);
      if (b) { URL.revokeObjectURL(b); blobMapRef.current.delete(url); }
    }
  };

  const updateMediaMeta = (titleText: string) => {
    if (!('mediaSession' in navigator)) return;
    const art = makeArtworkPng();
    navigator.mediaSession.metadata = new MediaMetadata({
      title: titleText,
      artist: RECITER_NAMES[reciter],
      album: "Kur'an Meal",
      ...(art ? { artwork: [{ src: art, sizes: '512x512', type: 'image/png' }] } : {}),
    });
    navigator.mediaSession.playbackState = 'playing';
  };

  const setupMediaSessionHandlers = () => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => {
      wantPlayingRef.current = true;
      activeEl().play().catch(() => {});
      onAmbientStart();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      wantPlayingRef.current = false;
      activeEl().pause();
      onAmbientStop();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => jumpAyah(1));
    navigator.mediaSession.setActionHandler('previoustrack', () => jumpAyah(-1));
  };

  // Kuyruktaki parçayı başlat. Geçişlerde 'ended' olayının İÇİNDEN senkron
  // çağrılır — mobil arka planda yeni play() izninin korunması bunu gerektirir.
  const startQueueEntry = (pos: number, titleOverride?: string, keepPrev = false) => {
    const q = queueRef.current;
    const entry = q[pos];
    if (!entry) return;
    queuePosRef.current = pos;

    const prev = activeEl();
    const sb = standbyEl();
    let el: HTMLAudioElement;
    if (sb.dataset.url === entry.url) {
      // Yedek eleman bu parçayla hazır: boşluksuz geçiş
      activeIdxRef.current = 1 - activeIdxRef.current;
      el = sb;
      // erken geçişte önceki eleman kalan ~250ms sessizliğini çalıp kendi biter
      if (!keepPrev && !prev.paused) prev.pause();
    } else {
      el = prev;
      const blob = blobMapRef.current.get(entry.url);
      el.dataset.url = entry.url;
      el.src = blob || entry.url;
    }
    try { if (el.currentTime > 0.05) el.currentTime = 0; } catch { /* metadata henüz yoksa sorun değil */ }
    wantPlayingRef.current = true;
    el.play().catch(() => {});

    const s = surahRef.current;
    const a = s.ayahs[entry.ayahIndex];
    updateMediaMeta(titleOverride ?? `${s.nameTurkish} — ${a ? a.numberInSurah : ''}. Ayet`);

    setCurrentPlayingIndex(entry.ayahIndex);
    onAyahChange(entry.ayahIndex);
    if (navModeRef.current === 'scroll') {
      const card = cardRefs.current[entry.ayahIndex];
      if (card) {
        isAutoScrolling.current = true;
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { isAutoScrolling.current = false; }, 500);
      }
    }
    prepareStandby();
    prefetchAhead();
  };

  const stopEngine = () => {
    modeRef.current = 'idle';
    wantPlayingRef.current = false;
    elsRef.current.forEach(e => { if (e) { e.pause(); e.dataset.url = ''; } });
    blobMapRef.current.forEach(u => { if (u) URL.revokeObjectURL(u); });
    blobMapRef.current.clear();
    queueRef.current = [];
    queuePosRef.current = 0;
    errorRunRef.current = 0;
    setIsPlaying(false);
    setCurrentPlayingIndex(null);
    setIsAutoPlaying(false);
    isAutoPlayingRef.current = false;
    onAmbientStop();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
  };

  // 'ended' olayı: kuyrukta ilerle; kuyruk bittiyse moda göre dur ya da
  // sıradaki sureye AYNI olay içinde senkron geç.
  const advanceQueue = () => {
    if (modeRef.current === 'idle') return;
    const nextPos = queuePosRef.current + 1;
    if (nextPos < queueRef.current.length) {
      startQueueEntry(nextPos);
      return;
    }
    if (modeRef.current === 'single') { stopEngine(); return; }
    const ns = nextSurahRef.current;
    if (!ns) { stopEngine(); return; } // son sure bitti
    engineSurahIdRef.current = ns.id;
    queueRef.current = ns.firstAyahParts.map(n => ({ url: getAudioUrl(ns.id, n), ayahIndex: 0 }));
    startQueueEntry(0, `${ns.name} — 1. Ayet`);
    onAutoPlayNextSurah?.(); // React yeni sureyi yüklesin; kuyruk efektte tamamlanır
  };

  const handleAudioError = () => {
    if (modeRef.current === 'idle') return;
    errorRunRef.current += 1;
    if (errorRunRef.current > 5) { stopEngine(); return; } // art arda 5 hata: dur
    advanceQueue(); // bozuk/yüklenemeyen parçayı atla
  };

  // Erken geçiş: sıradaki parça yedekte HAZIRSA sesi şimdi başlat.
  // Hazır değilse hiçbir şey yapma - normal 'ended' yolu devreye girer.
  const earlyAdvance = () => {
    const q = queueRef.current;
    const pos = queuePosRef.current;
    const next = q[pos + 1];
    const sb = elsRef.current[1 - activeIdxRef.current];
    if (!next || !sb || sb.dataset.url !== next.url || sb.readyState < 3) return;
    startQueueEntry(pos + 1, undefined, true);
  };

  // Olay dinleyicileri her render'da güncel fonksiyonlara bağlansın
  onEndedRef.current = advanceQueue;
  onErrorRef.current = handleAudioError;
  onEarlyRef.current = earlyAdvance;

  // Kilit ekranından ayet atlama: kuyrukta bir sonraki/önceki FARKLI ayete git
  const jumpAyah = (dir: -1 | 1) => {
    const q = queueRef.current;
    let pos = queuePosRef.current;
    if (!q.length) return;
    const curIdx = q[pos]?.ayahIndex ?? 0;
    if (dir === 1) {
      while (pos < q.length && q[pos].ayahIndex === curIdx) pos++;
      if (pos >= q.length) return;
    } else {
      while (pos > 0 && q[pos].ayahIndex === curIdx) pos--;
      const prevIdx = q[pos].ayahIndex;
      if (prevIdx === curIdx) return;
      while (pos > 0 && q[pos - 1].ayahIndex === prevIdx) pos--;
    }
    startQueueEntry(pos);
  };

  const startAutoPlay = (fromIndex: number) => {
    onAmbientStart();
    modeRef.current = 'auto';
    engineSurahIdRef.current = surah.id;
    isAutoPlayingRef.current = true;
    setIsAutoPlaying(true);
    errorRunRef.current = 0;
    queueRef.current = buildQueue(surah, fromIndex);
    setupMediaSessionHandlers();
    startQueueEntry(0);
  };

  // Otomatik oynatmayı başlat/durdur
  const toggleAutoPlay = () => {
    if (isAutoPlaying) stopEngine();
    else startAutoPlay(safeIndex);
  };

  // Ses çalma/durdurma (manuel tek ayet)
  const handlePlayAudio = (index: number) => {
    // Çalan ayete tekrar basılırsa DURDUR (otomatik modda da geçerli)
    if (currentPlayingIndex === index && isPlaying) {
      stopEngine();
      return;
    }
    onAmbientStart();
    modeRef.current = 'single';
    engineSurahIdRef.current = surah.id;
    isAutoPlayingRef.current = false;
    setIsAutoPlaying(false);
    errorRunRef.current = 0;
    const parts = getAyahNumbers(surah.ayahs[index].numberInSurah);
    queueRef.current = parts.map(n => ({ url: getAudioUrl(surah.id, n), ayahIndex: index }));
    setupMediaSessionHandlers();
    startQueueEntry(0);
  };

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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newIndex = Number(e.target.value);
    onAyahChange(newIndex);
    
    // Sürekli modda seçilen ayete scroll yap
    if (navigationMode === 'scroll') {
      isAutoScrolling.current = true;
      
      setTimeout(() => {
        const targetCard = cardRefs.current[newIndex];
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          setTimeout(() => {
            isAutoScrolling.current = false;
          }, 1000);
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

  // Paylaşım görselini üret:
  // 1) Kart, ŞEFFAF zeminle çekilir (kendi yarı saydam arka planı korunur).
  // 2) Aktif arka plan videosu varsa o ANKİ karesi görselin arkasına
  //    uygulamadaki görünümle aynı şekilde (koyu zemin + %50 video) çizilir.
  // 3) html2canvas'ın hap rozetteki yazıyı kaydırma bug'ı, klonda rozete
  //    sabit yükseklik + line-height verilerek düzeltilir.
  const generateShareCanvas = async (targetEl: HTMLElement): Promise<HTMLCanvasElement> => {
    const html2canvas = (await import('html2canvas')).default;
    const isDarkMode = document.documentElement.classList.contains('dark');

    const card = await html2canvas(targetEl, {
      backgroundColor: null, // şeffaf: arka planı biz çizeceğiz
      scale: 3,
      logging: false,
      useCORS: true,
      allowTaint: true,
      removeContainer: true,
      onclone: (doc) => {
        // html2canvas hap kutucuğundaki yazıyı ortalamayı beceremiyor;
        // görselde kutucuğu tamamen kaldır, sadece "N. Ayet" yazısı kalsın.
        doc.querySelectorAll('[data-share-badge]').forEach((el) => {
          const s = (el as HTMLElement).style;
          s.background = 'transparent';
          s.border = 'none';
          s.borderRadius = '0';
          s.padding = '0';
        });
      },
    });

    const out = document.createElement('canvas');
    out.width = card.width;
    out.height = card.height;
    const g = out.getContext('2d')!;

    // PNG havası: kartın yuvarlak köşeleri DIŞI saydam kalsın.
    // Tuval, kartın köşe yarıçapıyla kırpılır; arka plan da kart da bu
    // yuvarlak alanın içine çizilir, dışarısı alfa=0 olarak kalır.
    const radiusPx = parseFloat(getComputedStyle(targetEl).borderRadius) || 16;
    const r = radiusPx * 3; // html2canvas scale=3 ile aynı ölçek
    g.beginPath();
    if (typeof g.roundRect === 'function') {
      g.roundRect(0, 0, out.width, out.height, r);
    } else {
      const w = out.width, h = out.height;
      g.moveTo(r, 0);
      g.arcTo(w, 0, w, h, r);
      g.arcTo(w, h, 0, h, r);
      g.arcTo(0, h, 0, 0, r);
      g.arcTo(0, 0, w, 0, r);
      g.closePath();
    }
    g.clip();

    const video = document.querySelector('video');
    if (video && video.videoWidth > 0 && video.readyState >= 2) {
      // uygulamadaki görünüm: koyu zemin üzerine %50 opaklıkta video
      g.fillStyle = '#1A1D23';
      g.fillRect(0, 0, out.width, out.height);
      const vs = Math.max(out.width / video.videoWidth, out.height / video.videoHeight);
      const dw = video.videoWidth * vs;
      const dh = video.videoHeight * vs;
      g.globalAlpha = 0.5;
      g.drawImage(video, (out.width - dw) / 2, (out.height - dh) / 2, dw, dh);
      g.globalAlpha = 1;
    } else {
      g.fillStyle = isDarkMode ? '#1A1D23' : '#FDFBF7';
      g.fillRect(0, 0, out.width, out.height);
    }
    g.drawImage(card, 0, 0);
    return out;
  };

  const handleShare = async () => {
    if (!cardRef.current) return;

    setSharing(true);
    try {
      const canvas = await generateShareCanvas(cardRef.current);

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
      const canvas = await generateShareCanvas(targetRef);

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

  // Font size classes
  const getArabicFontSizeClass = () => {
    switch (arabicFontSize) {
      case 'small': return 'text-2xl md:text-3xl leading-[1.8] md:leading-[2.0]';
      case 'medium': return 'text-3xl md:text-5xl leading-[2.0] md:leading-[2.2]';
      case 'large': return 'text-4xl md:text-6xl leading-[2.2] md:leading-[2.4]';
    }
  };

  const getTurkishFontSizeClass = () => {
    switch (turkishFontSize) {
      case 'small': return 'text-sm md:text-base';
      case 'medium': return 'text-base md:text-xl';
      case 'large': return 'text-lg md:text-2xl';
    }
  };

  return (
    <main className="flex flex-col h-full bg-transparent relative overflow-hidden">
      
      {/* Main Card Area - Değişken yapı modlara göre */}
      {navigationMode === 'scroll' ? (
        // Scroll Modu - Tüm ayetler alt alta
        <div className="flex-1 overflow-y-auto relative scroll-smooth bg-transparent">
          <div className="max-w-4xl lg:max-w-5xl mx-auto px-3 md:px-4 py-3 md:py-4 space-y-6">
            {surah.ayahs.map((ayah, index) => (
              <div 
                key={ayah.id}
                ref={(el) => (cardRefs.current[index] = el)}
                className={`w-full bg-light-card/50 dark:bg-dark-card/50 rounded-2xl shadow-sm border-2 transition-all duration-300 p-6 md:p-12 lg:p-16 relative flex flex-col items-center text-center ${
                  isAutoPlaying && currentPlayingIndex === index
                    ? 'border-green-500 shadow-lg shadow-green-500/20'
                    : 'border-light-border dark:border-dark-border'
                }`}
              >
                {/* Sure İsmi ve Bismillah - Sadece ilk ayette */}
                {index === 0 && (
                  <div className="w-full mb-6 pb-6 border-b border-light-border/30 dark:border-dark-border/30">
                    <h1 className="text-lg md:text-xl font-bold text-light-text dark:text-dark-text mb-3">
                      {surah.nameTurkish}
                    </h1>
                    {surah.id !== 9 && (
                      <div className="opacity-75 font-arabic text-xl md:text-2xl text-light-text dark:text-dark-text leading-relaxed">
                        {BISMILLAH}
                      </div>
                    )}
                  </div>
                )}
                {/* Ayet Numarası - Minimal Badge */}
                <div className="w-full mb-6 text-center">
                  <span data-share-badge className="inline-block text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full bg-light-bg/50 dark:bg-dark-bg/50 text-light-secondary dark:text-dark-secondary border border-light-border/50 dark:border-dark-border/50">
                    {ayah.numberInSurah}. Ayet
                  </span>
                </div>

                {/* Arabic Text */}
                {(displayMode === 'both' || displayMode === 'arabic') && (
                  <div className="w-full mb-4 md:mb-8 px-2" dir="rtl">
                    <p className={`font-arabic ${getArabicFontSizeClass()} text-light-arabic dark:text-dark-arabic text-center w-full break-words whitespace-normal`}>
                      {ayah.textArabic}
                    </p>
                  </div>
                )}

                {/* Separator */}
                {displayMode === 'both' && (
                  <div className="w-16 md:w-24 h-0.5 rounded-full bg-light-border dark:bg-dark-border mb-4 md:mb-8 shrink-0"></div>
                )}

                {/* Turkish Text */}
                {(displayMode === 'both' || displayMode === 'turkish') && (
                  <div className="w-full px-2">
                    <p 
                      className={`${getTurkishFontSizeClass()} leading-relaxed text-light-text dark:text-dark-text font-medium font-sans w-full break-words whitespace-normal`}
                      dangerouslySetInnerHTML={{ __html: formatTurkishText(ayah.textTurkish) }}
                    />
                  </div>
                )}

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
          className="flex-1 overflow-y-auto relative scroll-smooth bg-transparent"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="min-h-full flex flex-col items-center justify-center px-3 md:px-4 py-3 md:py-6 lg:py-8">
            <div 
              ref={cardRef}
              className={`w-full max-w-4xl lg:max-w-5xl bg-light-card/50 dark:bg-dark-card/50 rounded-2xl shadow-sm border-2 p-6 md:p-12 lg:p-16 relative flex flex-col items-center text-center transition-all duration-300 my-2 ${
                currentPlayingIndex === safeIndex && isPlaying
                  ? 'border-green-500 shadow-lg shadow-green-500/20'
                  : 'border-light-border dark:border-dark-border'
              }`}
            >
              {/* Sure İsmi ve Bismillah - Üstte */}
              <div className="w-full mb-6 pb-6 border-b border-light-border/30 dark:border-dark-border/30">
                <h1 className="text-lg md:text-xl font-bold text-light-text dark:text-dark-text mb-3">
                  {surah.nameTurkish}
                </h1>
                {surah.id !== 9 && (
                  <div className="opacity-75 font-arabic text-xl md:text-2xl text-light-text dark:text-dark-text leading-relaxed">
                    {BISMILLAH}
                  </div>
                )}
              </div>
              {/* Ayet Numarası - Minimal Badge */}
              <div className="w-full mb-6 text-center">
                <span data-share-badge className="inline-block text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full bg-light-bg/50 dark:bg-dark-bg/50 text-light-secondary dark:text-dark-secondary border border-light-border/50 dark:border-dark-border/50">
                  {currentAyah.numberInSurah}. Ayet
                </span>
              </div>

              {/* Arabic Text */}
              {(displayMode === 'both' || displayMode === 'arabic') && (
                <div className="w-full mb-4 md:mb-8 pt-8 md:pt-6 px-2" dir="rtl">
                  <p className={`font-arabic ${getArabicFontSizeClass()} text-light-arabic dark:text-dark-arabic text-center w-full break-words whitespace-normal`}>
                    {currentAyah.textArabic}
                  </p>
                </div>
              )}

              {/* Separator */}
              {displayMode === 'both' && (
                <div className="w-16 md:w-24 h-0.5 rounded-full bg-light-border dark:bg-dark-border mb-4 md:mb-8 shrink-0"></div>
              )}

              {/* Turkish Text */}
              {(displayMode === 'both' || displayMode === 'turkish') && (
                <div className="w-full px-2">
                  <p 
                    className={`${getTurkishFontSizeClass()} leading-relaxed text-light-text dark:text-dark-text font-medium font-sans w-full break-words whitespace-normal`}
                    dangerouslySetInnerHTML={{ __html: formatTurkishText(currentAyah.textTurkish) }}
                  />
                </div>
              )}

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
      <div className="flex-none bg-light-card/50 dark:bg-dark-card/50 border-t border-light-border dark:border-dark-border p-3 md:p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30 shrink-0">
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

            {/* Auto Play Button */}
            <button 
                onClick={toggleAutoPlay}
                className={`flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-3 rounded-xl border transition-all ${
                  isAutoPlaying
                    ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                    : 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                }`}
                title={isAutoPlaying ? 'Otomatik Okumayı Durdur' : 'Sırayla Oku'}
            >
                {isAutoPlaying ? <StopCircle size={20} /> : <PlayCircle size={20} />}
                <span className="hidden md:inline font-medium">
                  {isAutoPlaying ? 'Durdur' : 'Sırayla Oku'}
                </span>
            </button>

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