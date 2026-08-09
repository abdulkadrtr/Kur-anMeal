import React from 'react';
import { Surah, RecitationItem } from '../types';
import { formatTurkishText } from '../utils';
import { Play, Pause, Repeat, Repeat1, SkipBack, SkipForward, Youtube } from 'lucide-react';

interface RecitationViewProps {
  recitationId: string;
  surahs: Surah[];
}

// Tekrar modu: kapalı -> tek parça -> liste (bitince sıradakine geç, sonda başa dön)
type RepeatMode = 'off' | 'one' | 'all';

const fmtTime = (sec: number) => {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const RecitationView: React.FC<RecitationViewProps> = ({ recitationId, surahs }) => {
  const [items, setItems] = React.useState<RecitationItem[]>([]);
  const [currentId, setCurrentId] = React.useState<string>(recitationId);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [repeatMode, setRepeatMode] = React.useState<RepeatMode>(() => {
    const saved = localStorage.getItem('recitationRepeatMode');
    return saved === 'one' || saved === 'all' ? saved : 'off';
  });
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const repeatModeRef = React.useRef<RepeatMode>(repeatMode);

  // Tekrar tercihini hatırla
  React.useEffect(() => {
    repeatModeRef.current = repeatMode;
    localStorage.setItem('recitationRepeatMode', repeatMode);
  }, [repeatMode]);

  // Dışarıdan farklı kayıt açılırsa ona geç
  React.useEffect(() => {
    setCurrentId(recitationId);
  }, [recitationId]);

  // Manifest'i yükle (parça listesi ileri/geri ve liste döngüsü için gerekli)
  React.useEffect(() => {
    fetch('./recitations.json')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setItems(d.items || []))
      .catch(() => setItems([]));
  }, []);

  const itemIndex = items.findIndex(i => i.id === currentId);
  const item = itemIndex >= 0 ? items[itemIndex] : null;

  const itemsRef = React.useRef(items);
  const currentIdRef = React.useRef(currentId);
  const errorRunRef = React.useRef(0); // arka arkaya hata sayacı (sonsuz atlama kilidi)
  React.useEffect(() => { itemsRef.current = items; }, [items]);
  React.useEffect(() => { currentIdRef.current = currentId; }, [currentId]);

  const startTrack = React.useCallback((it: RecitationItem) => {
    const audio = audioRef.current;
    if (!audio || !it) return;
    if (audio.dataset.itemId !== it.id) {
      audio.dataset.itemId = it.id;
      audio.src = it.file;
    }
    audio.play().catch(() => {});
  }, []);

  // Önceki/sonraki parçaya geç (liste başı/sonunda diğer uca sarar)
  const goToTrack = React.useCallback((dir: -1 | 1) => {
    const list = itemsRef.current;
    if (list.length === 0) return;
    const idx = list.findIndex(i => i.id === currentIdRef.current);
    const next = list[(idx + dir + list.length) % list.length];
    currentIdRef.current = next.id; // olay içinde art arda çağrılara karşı hemen güncelle
    startTrack(next);               // sesi senkron başlat
    setCurrentId(next.id);          // UI'yı güncelle
  }, [startTrack]);

  // Kayıt yüklenince çalmayı başlat + kilit ekranı kontrollerini kur.
  // Not: Görselleştirici/WebAudio bilerek YOK — düz <audio> arka planda
  // (ekran kapalıyken) çalmaya devam eder, WebAudio yönlendirmesi ise
  // mobil tarayıcılarda askıya alınabiliyor.
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !item) return;
    startTrack(item);

    if ('mediaSession' in navigator) {
      // Kilit ekranı / bildirim kartı (müzik çalar gibi): başlık + okuyucu + ikon
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.title,
        artist: item.reciter,
        album: "Kur'an Meal — Özel Okuyuşlar",
        artwork: [{
          src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' fill='%231A1D23'/><circle cx='256' cy='256' r='190' fill='%23D4AF37'/><text x='256' y='350' font-family='Arial' font-size='220' fill='%231A1D23' text-anchor='middle' font-weight='bold'>ا</text></svg>",
          sizes: '512x512',
          type: 'image/svg+xml',
        }],
      });
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        audio.currentTime = Math.max(0, audio.currentTime - 10);
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
      });
      navigator.mediaSession.setActionHandler('seekto', (d) => {
        if (d.seekTime != null) audio.currentTime = d.seekTime;
      });
      // Kilit ekranından da parça değiştirme
      navigator.mediaSession.setActionHandler('previoustrack', () => goToTrack(-1));
      navigator.mediaSession.setActionHandler('nexttrack', () => goToTrack(1));
    }
  }, [item, startTrack, goToTrack]);

  React.useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
    };
  }, []);

  // Aktif ayet: startMs <= şu an olan SON segment (geçişlerde metin titremesin)
  const currentSeg = React.useMemo(() => {
    if (!item?.segments?.length) return null;
    const ms = currentTime * 1000;
    let found = null;
    for (const s of item.segments) {
      if (s.startMs <= ms) found = s;
      else break;
    }
    return found;
  }, [item, currentTime]);

  const currentAyah = React.useMemo(() => {
    if (!item?.surahId || !currentSeg) return null;
    const surah = surahs.find(s => s.id === item.surahId);
    return surah?.ayahs[currentSeg.ayahIndex] || null;
  }, [item, currentSeg, surahs]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => {});
  };

  // kapalı -> tek parça -> liste -> kapalı
  const cycleRepeatMode = () =>
    setRepeatMode(m => (m === 'off' ? 'one' : m === 'one' ? 'all' : 'off'));

  if (!item) {
    return (
      <main className="flex-1 flex items-center justify-center text-light-secondary dark:text-dark-secondary">
        Kayıt bulunamadı.
      </main>
    );
  }

  return (
    <main className="flex flex-col h-full bg-transparent relative overflow-hidden">
      {/* İçerik: ayet kartı */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-3 md:px-4 py-4 md:py-8">
          <div className="w-full max-w-3xl bg-light-card/50 dark:bg-dark-card/50 rounded-2xl shadow-sm border-2 border-light-border dark:border-dark-border p-5 md:p-10 flex flex-col items-center text-center">
            {/* Başlık */}
            <div className="w-full mb-5 pb-5 border-b border-light-border/30 dark:border-dark-border/30">
              <h1 className="text-lg md:text-xl font-bold text-light-text dark:text-dark-text">
                {item.title}
              </h1>
              <p className="text-sm text-light-secondary dark:text-dark-secondary mt-1 flex items-center justify-center gap-2">
                {item.reciter}
                {item.youtubeUrl && (
                  <a
                    href={item.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex p-1 rounded text-light-secondary dark:text-dark-secondary hover:text-red-500 transition-colors"
                    title="YouTube'da aç"
                  >
                    <Youtube size={16} />
                  </a>
                )}
              </p>
            </div>

            {/* Senkron ayet + meal */}
            {currentAyah && currentSeg ? (
              <>
                <span className="inline-block text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full bg-light-bg/50 dark:bg-dark-bg/50 text-light-secondary dark:text-dark-secondary border border-light-border/50 dark:border-dark-border/50 mb-5">
                  {currentSeg.a_no}. Ayet
                </span>
                <div className="w-full mb-4 md:mb-6 px-1" dir="rtl">
                  <p className="font-arabic text-2xl md:text-4xl leading-[2] md:leading-[2.2] text-light-arabic dark:text-dark-arabic text-center break-words">
                    {currentAyah.textArabic}
                  </p>
                </div>
                <div className="w-14 md:w-20 h-0.5 rounded-full bg-light-border dark:bg-dark-border mb-4 md:mb-6"></div>
                <p
                  className="text-sm md:text-lg leading-relaxed text-light-text dark:text-dark-text font-medium px-1"
                  dangerouslySetInnerHTML={{ __html: formatTurkishText(currentAyah.textTurkish) }}
                />
              </>
            ) : (
              <p className="text-light-secondary dark:text-dark-secondary py-8">
                {item.segments?.length
                  ? 'Okuyuş başlıyor…'
                  : 'Bu kayıt için ayet takibi yok, ses çalmaya devam ediyor.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Alt oynatıcı çubuğu — mobil uyumlu, iki satır */}
      <div className="flex-none bg-light-card/70 dark:bg-dark-card/70 backdrop-blur-sm border-t border-light-border dark:border-dark-border px-4 pt-3 pb-4 z-30">
        <div className="max-w-3xl mx-auto">
          {/* Satır 1: seek çubuğu tek başına tam genişlik */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-light-secondary dark:text-dark-secondary font-medium tabular-nums w-10 text-right shrink-0">
              {fmtTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || item.durationSec || 0}
              step={0.1}
              value={currentTime}
              onChange={e => {
                const audio = audioRef.current;
                if (audio) audio.currentTime = Number(e.target.value);
              }}
              className="flex-1 min-w-0 accent-light-accent dark:accent-dark-accent h-1.5 cursor-pointer"
            />
            <span className="text-xs text-light-secondary dark:text-dark-secondary font-medium tabular-nums w-10 shrink-0">
              {fmtTime(duration || item.durationSec)}
            </span>
          </div>
          {/* Satır 2: kontroller */}
          <div className="flex items-center justify-center gap-4 md:gap-6">
            <button
              onClick={cycleRepeatMode}
              className={`p-2.5 rounded-full transition-colors ${
                repeatMode !== 'off'
                  ? 'text-light-accent dark:text-dark-accent bg-light-accent/15 dark:bg-dark-accent/15'
                  : 'text-light-secondary dark:text-dark-secondary hover:text-light-text dark:hover:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg'
              }`}
              title={
                repeatMode === 'one'
                  ? 'Tek parça tekrarı — bitince aynı kayıt başa döner'
                  : repeatMode === 'all'
                  ? 'Liste tekrarı — bitince sıradaki kayda geçer'
                  : 'Tekrar kapalı'
              }
            >
              {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </button>
            <button
              onClick={() => goToTrack(-1)}
              className="p-2.5 rounded-full text-light-secondary dark:text-dark-secondary hover:text-light-text dark:hover:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
              title="Önceki kayıt"
            >
              <SkipBack size={22} />
            </button>
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-light-accent dark:bg-dark-accent text-white dark:text-gray-900 flex items-center justify-center hover:opacity-90 transition-opacity shadow-md"
              title={isPlaying ? 'Duraklat' : 'Oynat'}
            >
              {isPlaying ? <Pause size={26} /> : <Play size={26} className="ml-1" />}
            </button>
            <button
              onClick={() => goToTrack(1)}
              className="p-2.5 rounded-full text-light-secondary dark:text-dark-secondary hover:text-light-text dark:hover:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
              title="Sonraki kayıt"
            >
              <SkipForward size={22} />
            </button>
            {/* simetri için görünmez eş öğe */}
            <span className="w-[41px]"></span>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        preload="auto"
        loop={repeatMode === 'one'}
        onPlay={() => {
          setIsPlaying(true);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }}
        onPlaying={() => { errorRunRef.current = 0; }}
        onPause={() => {
          setIsPlaying(false);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        }}
        onEnded={() => {
          setIsPlaying(false);
          // liste tekrarı: sıradaki kayda AYNI olay içinde senkron geç
          if (repeatModeRef.current === 'all') goToTrack(1);
        }}
        onError={() => {
          setIsPlaying(false);
          const n = itemsRef.current.length;
          if (repeatModeRef.current === 'all' && n > 0 && errorRunRef.current < n) {
            errorRunRef.current += 1;
            goToTrack(1);
          }
        }}
        onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
      />
    </main>
  );
};

export default RecitationView;
