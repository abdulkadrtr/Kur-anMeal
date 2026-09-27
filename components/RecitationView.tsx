import React from 'react';
import { Surah, RecitationItem } from '../types';
import { formatTurkishText, makeArtworkPng, keepAlive } from '../utils';
import { Play, Pause, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Youtube } from 'lucide-react';

interface RecitationViewProps {
  recitationId: string;
  surahs: Surah[];
}

// Tekrar modu: kapalı -> tek parça -> liste (bitince sıradakine geç, sonda başa dön)
type RepeatMode = 'off' | 'one' | 'all';

const REPEAT_LABELS: Record<RepeatMode, string> = {
  off: 'Tekrar kapalı',
  one: 'Tek parça tekrarı',
  all: 'Liste tekrarı',
};

// Sûre adını karşılaştırılabilir hale getir: "EL-MUʾMİNUN SURESİ" ve
// "Mü'minûn" ikisi de "muminun" olur (karışık çalmada aynı sûreyi ayırt etmek için).
const normSurahName = (s: string) =>
  s.toLocaleLowerCase('tr-TR')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\bsuresi\b/g, ' ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/^\s*e[a-z]-/, '')
    .replace(/[^a-z]/g, '');

// Karışık çalma sırası: her kayıt turda bir kez. firstId verilirse sıra onunla
// başlar (çalan parça yerinde kalır); verilmezse yeni tur, avoidId'nin (az önce
// biten) sûresiyle başlamaz. Aynı sûreden kayıtlar mümkünse yan yana gelmez.
const buildShuffleOrder = (
  ids: string[],
  keyOf: (id: string) => string,
  firstId: string | null,
  avoidId: string | null,
): string[] => {
  // Tek denemede sonda düzeltilemeyen çakışma kalabiliyor (yer değiştirecek
  // eleman kalmıyor); birkaç deneme arasından en az çakışanı seç.
  const conflicts = (order: string[]) => {
    let n = 0;
    for (let i = 1; i < order.length; i++) if (keyOf(order[i]) === keyOf(order[i - 1])) n++;
    if (!firstId && avoidId && order.length && keyOf(order[0]) === keyOf(avoidId)) n++;
    return n;
  };
  let best: string[] = [];
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 30 && bestScore > 0; attempt++) {
    const cand = shuffleOnce(ids, keyOf, firstId, avoidId);
    const score = conflicts(cand);
    if (score < bestScore) {
      best = cand;
      bestScore = score;
    }
  }
  return best;
};

const shuffleOnce = (
  ids: string[],
  keyOf: (id: string) => string,
  firstId: string | null,
  avoidId: string | null,
): string[] => {
  const rest = ids.filter(id => id !== firstId);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const order = firstId ? [firstId, ...rest] : rest;
  for (let i = firstId ? 1 : 0; i < order.length; i++) {
    const prevId = i === 0 ? avoidId : order[i - 1];
    if (!prevId || keyOf(order[i]) !== keyOf(prevId)) continue;
    for (let j = i + 1; j < order.length; j++) {
      if (keyOf(order[j]) !== keyOf(prevId)) {
        [order[i], order[j]] = [order[j], order[i]];
        break;
      }
    }
  }
  // hepsi aynı sûreden olsa bile az önce biten kayıt yeni turu açmasın
  if (!firstId && avoidId && order.length > 1 && order[0] === avoidId) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
};

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
  const [shuffle, setShuffle] = React.useState<boolean>(
    () => localStorage.getItem('recitationShuffle') === '1'
  );
  const [repeatToast, setRepeatToast] = React.useState<string | null>(null);
  const repeatToastTimer = React.useRef<number | null>(null);
  const repeatModeRef = React.useRef<RepeatMode>(repeatMode);
  const shuffleRef = React.useRef(shuffle);
  // Karışık çalmada geçerli tur (id sırası), turdaki konum ve bir sonraki tur
  // (ön-indirme sıradakini önceden bilsin diye tur bitmeden üretilir)
  const orderRef = React.useRef<string[]>([]);
  const orderPosRef = React.useRef(0);
  const nextOrderRef = React.useRef<string[] | null>(null);
  const surahsRef = React.useRef(surahs);
  surahsRef.current = surahs;

  // Manifest'i yükle (parça listesi ileri/geri ve liste döngüsü için gerekli)
  React.useEffect(() => {
    fetch('./recitations.json')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setItems(d.items || []))
      .catch(() => setItems([]));
  }, []);

  // Dışarıdan farklı kayıt açılırsa ona geç
  React.useEffect(() => {
    setCurrentId(recitationId);
  }, [recitationId]);

  const itemIndex = items.findIndex(i => i.id === currentId);
  const item = itemIndex >= 0 ? items[itemIndex] : null;

  const itemsRef = React.useRef(items);
  const currentIdRef = React.useRef(currentId);
  React.useEffect(() => { itemsRef.current = items; }, [items]);
  React.useEffect(() => { currentIdRef.current = currentId; }, [currentId]);

  // --- SES MOTORU ----------------------------------------------------------
  // İki ses elemanı (ping-pong): çalan parça bir elemanda, SIRADAKİ parça
  // diğerine önceden tamamen yüklenip bekletilir. Parça bitince, 'ended'
  // olayının içinden hazır elemana play() denir: geçişte ağ trafiği yok,
  // boşluk ~0. Kilitli ekranda zincirin kopmamasının anahtarı bu.
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const elsRef = React.useRef<(HTMLAudioElement | null)[]>([null, null]);
  const activeIdxRef = React.useRef(0);
  // id -> blob URL ('' = indiriliyor). Tek bir "sıradaki" yuvası yerine harita:
  // geç biten indirmeler birbirinin üstüne yazamaz (eski yarış hatası).
  const blobsRef = React.useRef<Map<string, string>>(new Map());
  const wantPlayingRef = React.useRef(false);
  const errorRunRef = React.useRef(0); // arka arkaya hata sayacı (sonsuz atlama kilidi)
  const handlersRef = React.useRef({
    ended: () => {},
    error: () => {},
    timeupdate: () => {},
    loadedmetadata: () => {},
  });

  const getEl = (i: number): HTMLAudioElement => {
    if (!elsRef.current[i]) {
      const el = document.createElement('audio');
      el.preload = 'auto';
      const isActive = () => el === elsRef.current[activeIdxRef.current];
      el.addEventListener('ended', () => { if (isActive()) handlersRef.current.ended(); });
      el.addEventListener('error', () => { if (isActive()) handlersRef.current.error(); });
      el.addEventListener('timeupdate', () => { if (isActive()) handlersRef.current.timeupdate(); });
      el.addEventListener('loadedmetadata', () => { if (isActive()) handlersRef.current.loadedmetadata(); });
      el.addEventListener('seeked', () => { if (isActive()) syncPositionState(); });
      el.addEventListener('playing', () => { if (isActive()) errorRunRef.current = 0; });
      el.addEventListener('play', () => {
        if (!isActive()) return;
        setIsPlaying(true);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      });
      el.addEventListener('pause', () => {
        if (!isActive()) return;
        setIsPlaying(false);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      });
      containerRef.current?.appendChild(el);
      elsRef.current[i] = el;
    }
    return elsRef.current[i]!;
  };
  const activeEl = () => getEl(activeIdxRef.current);
  const standbyEl = () => getEl(1 - activeIdxRef.current);

  // Kaydın hangi sûreye ait olduğu: ayet eşleşmesi olanlarda sûre no'sundan,
  // olmayanlarda başlığın ilk kelimesinden ("Haşr 22 — …" -> "hasr")
  const keyOf = (id: string): string => {
    const it = itemsRef.current.find(i => i.id === id);
    if (!it) return id;
    if (it.surahId) {
      const s = surahsRef.current.find(x => x.id === it.surahId);
      return s ? normSurahName(s.nameTurkish) : `s${it.surahId}`;
    }
    return normSurahName(it.title.trim().split(/\s+/)[0] || it.id) || it.id;
  };

  const resetShuffleOrder = (startId: string) => {
    orderRef.current = buildShuffleOrder(itemsRef.current.map(i => i.id), keyOf, startId, null);
    orderPosRef.current = 0;
    nextOrderRef.current = null;
  };

  // Sırada çalacak parçalar (karışık çalma açıksa karışık sıradan; tur
  // bitiyorsa bir sonraki tur şimdiden üretilir ki ön-indirme onu bilsin)
  const upcoming = (fromId: string, count: number): RecitationItem[] => {
    const list = itemsRef.current;
    if (list.length < 2) return [];
    const out: RecitationItem[] = [];
    if (shuffleRef.current && orderRef.current.length) {
      const order = orderRef.current;
      for (let k = 1; k <= count && k < list.length; k++) {
        const p = orderPosRef.current + k;
        let id: string;
        if (p < order.length) {
          id = order[p];
        } else {
          if (!nextOrderRef.current) {
            nextOrderRef.current = buildShuffleOrder(list.map(i => i.id), keyOf, null, order[order.length - 1]);
          }
          id = nextOrderRef.current[p - order.length];
        }
        const it = list.find(i => i.id === id);
        if (it) out.push(it);
      }
      return out;
    }
    const idx = list.findIndex(i => i.id === fromId);
    for (let k = 1; k <= count && k < list.length; k++) out.push(list[(idx + k) % list.length]);
    return out;
  };

  // Kullanılmayan blob'ları bırak: şu an iki elemandan birine bağlı olanlara
  // ve korunacak listedekilere dokunma.
  const pruneBlobs = (keep: Set<string>) => {
    const inUse = new Set(elsRef.current.map(e => e?.dataset.id).filter(Boolean) as string[]);
    blobsRef.current.forEach((url, id) => {
      if (!keep.has(id) && !inUse.has(id)) {
        if (url) URL.revokeObjectURL(url);
        blobsRef.current.delete(id);
      }
    });
  };

  const prefetch = (it: RecitationItem) => {
    if (blobsRef.current.has(it.id)) return;
    blobsRef.current.set(it.id, '');
    fetch(it.file)
      .then(r => (r.ok ? r.blob() : Promise.reject()))
      .then(b => {
        if (!blobsRef.current.has(it.id)) return; // bu arada budandı
        const url = URL.createObjectURL(b);
        blobsRef.current.set(it.id, url);
        // Yedek eleman bu parçayı ağdan yüklüyor ve henüz çalmıyorsa blob'a geçir
        const sb = elsRef.current[1 - activeIdxRef.current];
        if (sb && sb.dataset.id === it.id && sb.paused && !sb.src.startsWith('blob:')) {
          sb.src = url;
          sb.load();
        }
      })
      .catch(() => blobsRef.current.delete(it.id)); // başarısızsa geçişte normal URL kullanılır
  };

  const prepareStandby = (it: RecitationItem) => {
    const sb = standbyEl();
    if (sb.dataset.id === it.id) return;
    sb.dataset.id = it.id;
    sb.loop = false;
    sb.src = blobsRef.current.get(it.id) || it.file;
    sb.load();
  };

  const updateMediaMetadata = (it: RecitationItem) => {
    if (!('mediaSession' in navigator)) return;
    const art = makeArtworkPng();
    navigator.mediaSession.metadata = new MediaMetadata({
      title: it.title,
      artist: it.reciter,
      album: "Kur'an Meal — Özel Okuyuşlar",
      ...(art ? { artwork: [{ src: art, sizes: '512x512', type: 'image/png' }] } : {}),
    });
  };

  function syncPositionState() {
    const el = elsRef.current[activeIdxRef.current];
    if (!el || !('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (!isFinite(el.duration) || el.duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: el.duration,
        playbackRate: el.playbackRate,
        position: Math.min(el.currentTime, el.duration),
      });
    } catch { /* geçersiz değerlerde sessizce geç */ }
  }

  const playActive = () => {
    wantPlayingRef.current = true;
    keepAlive.start();
    activeEl().play().catch(() => { /* bloke olursa görünürlük sigortası devam ettirir */ });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  };

  const pauseActive = () => {
    wantPlayingRef.current = false; // kullanıcı bilinçli durdurdu: sigorta yeniden başlatmasın
    keepAlive.stop();
    activeEl().pause();
  };

  // Parçayı başlat. Geçişlerde 'ended' olayının İÇİNDEN senkron çağrılır.
  // Aynı parça için tekrar çağrılırsa (render sonrası efekt) yeniden başlatmaz.
  const startTrack = (it: RecitationItem) => {
    const act = activeEl();
    if (act.dataset.id !== it.id) {
      const sb = standbyEl();
      if (sb.dataset.id === it.id) {
        // Sıradaki parça yedekte hazır: elemanları değiştir
        activeIdxRef.current = 1 - activeIdxRef.current;
        if (!act.paused) act.pause();
      } else {
        act.dataset.id = it.id;
        act.src = blobsRef.current.get(it.id) || it.file;
      }
      const el = activeEl();
      try { if (el.currentTime > 0) el.currentTime = 0; } catch { /* metadata henüz yok */ }
      el.loop = repeatModeRef.current === 'one';
      setCurrentTime(0);
      setDuration(isFinite(el.duration) ? el.duration : it.durationSec);
      updateMediaMetadata(it); // geçişle aynı çağrı yığınında
      playActive();
    } else if (wantPlayingRef.current && act.paused) {
      playActive();
    }

    prepareAhead(it);
  };

  // Sıradaki 2 parçayı indir, bir sonrakini yedek elemana hazırla
  const prepareAhead = (it: RecitationItem) => {
    const ahead = upcoming(it.id, 2);
    ahead.forEach(prefetch);
    if (ahead[0]) prepareStandby(ahead[0]);
    pruneBlobs(new Set([it.id, ...ahead.map(a => a.id)]));
  };

  // Önceki/sonraki parçaya geç (liste başı/sonunda diğer uca sarar).
  // Karışık çalmada karışık sırada ilerler; tur bitince yeni tur başlar.
  const goToTrack = (dir: -1 | 1) => {
    const list = itemsRef.current;
    if (list.length === 0) return;
    let next: RecitationItem | undefined;
    if (shuffleRef.current && orderRef.current.length) {
      let p = orderPosRef.current + dir;
      if (p >= orderRef.current.length) {
        const order = orderRef.current;
        orderRef.current = nextOrderRef.current
          ?? buildShuffleOrder(list.map(i => i.id), keyOf, null, order[order.length - 1]);
        nextOrderRef.current = null;
        p = 0;
      } else if (p < 0) {
        p = orderRef.current.length - 1;
      }
      orderPosRef.current = p;
      next = list.find(i => i.id === orderRef.current[p]);
    }
    if (!next) {
      const idx = list.findIndex(i => i.id === currentIdRef.current);
      next = list[(idx + dir + list.length) % list.length];
    }
    currentIdRef.current = next.id; // olay içinde art arda çağrılara karşı hemen güncelle
    startTrack(next);               // sesi senkron başlat
    setCurrentId(next.id);          // UI'yı güncelle
  };

  // Olay dinleyicileri her render'da güncel fonksiyonlara bağlansın
  handlersRef.current = {
    ended: () => {
      setIsPlaying(false);
      if (repeatModeRef.current === 'all') {
        goToTrack(1); // liste tekrarı: AYNI olay içinde senkron geç
      } else {
        wantPlayingRef.current = false; // doğal bitiş
        keepAlive.stop();
      }
    },
    error: () => {
      setIsPlaying(false);
      const n = itemsRef.current.length;
      if (repeatModeRef.current === 'all' && n > 0 && errorRunRef.current < n) {
        errorRunRef.current += 1;
        goToTrack(1); // yüklenemeyen kaydı atla
      }
    },
    timeupdate: () => setCurrentTime(activeEl().currentTime),
    loadedmetadata: () => {
      setDuration(activeEl().duration);
      syncPositionState();
    },
  };

  // Kayıt değişince (veya ilk açılışta) çalmayı başlat. Karışık çalma açıkken
  // dışarıdan bir kayıt açıldıysa yeni karışık tur o kayıtla başlasın.
  React.useEffect(() => {
    if (!item) return;
    if (shuffleRef.current && orderRef.current[orderPosRef.current] !== item.id) {
      resetShuffleOrder(item.id);
    }
    startTrack(item);
  }, [item]);

  // Tek parça tekrarı sadece aktif elemanda döngü demektir
  React.useEffect(() => {
    repeatModeRef.current = repeatMode;
    localStorage.setItem('recitationRepeatMode', repeatMode);
    const el = elsRef.current[activeIdxRef.current];
    if (el) el.loop = repeatMode === 'one';
  }, [repeatMode]);

  // Kilit ekranı kontrolleri + görünürlük sigortası + kapanışta temizlik
  React.useEffect(() => {
    const ms = 'mediaSession' in navigator ? navigator.mediaSession : null;
    if (ms) {
      ms.setActionHandler('play', () => playActive());
      ms.setActionHandler('pause', () => pauseActive());
      ms.setActionHandler('seekbackward', () => {
        const el = activeEl();
        el.currentTime = Math.max(0, el.currentTime - 10);
      });
      ms.setActionHandler('seekforward', () => {
        const el = activeEl();
        el.currentTime = Math.min(el.duration || 0, el.currentTime + 10);
      });
      ms.setActionHandler('seekto', (d) => {
        if (d.seekTime != null) activeEl().currentTime = d.seekTime;
      });
      ms.setActionHandler('previoustrack', () => goToTrack(-1));
      ms.setActionHandler('nexttrack', () => goToTrack(1));
    }

    // play() yine de bloke olduysa, ekran açılınca kaldığı yerden devam et
    const onVisible = () => {
      const el = elsRef.current[activeIdxRef.current];
      if (document.visibilityState === 'visible' && el && wantPlayingRef.current && el.paused) {
        playActive();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      wantPlayingRef.current = false;
      keepAlive.stop();
      elsRef.current.forEach(el => {
        if (!el) return;
        el.pause();
        el.removeAttribute('src');
        el.load();
        el.remove();
      });
      elsRef.current = [null, null];
      blobsRef.current.forEach(url => { if (url) URL.revokeObjectURL(url); });
      blobsRef.current.clear();
      if (ms) {
        ms.metadata = null;
        (['play', 'pause', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack'] as MediaSessionAction[])
          .forEach(a => { try { ms.setActionHandler(a, null); } catch { /* desteklenmeyen eylem */ } });
      }
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
    if (isPlaying) pauseActive();
    else playActive();
  };

  // kapalı -> tek parça -> liste -> kapalı (seçilen mod kısa süre yazıyla gösterilir;
  // mobilde düğme ipucu (title) görünmediği için)
  const showToast = (text: string) => {
    setRepeatToast(text);
    if (repeatToastTimer.current) window.clearTimeout(repeatToastTimer.current);
    repeatToastTimer.current = window.setTimeout(() => setRepeatToast(null), 1600);
  };

  const cycleRepeatMode = () => {
    const next: RepeatMode = repeatMode === 'off' ? 'one' : repeatMode === 'one' ? 'all' : 'off';
    setRepeatMode(next);
    showToast(REPEAT_LABELS[next]);
  };

  // Karışık çal: çalan kayıt yerinde kalır, sıradakiler karışık sıradan gelir.
  // Tekrar kapalıyken açılırsa liste tekrarı da açılır; yoksa ilk kayıt
  // bitince durur ve karışık çalmanın bir anlamı kalmaz.
  const toggleShuffle = () => {
    const on = !shuffle;
    setShuffle(on);
    shuffleRef.current = on;
    localStorage.setItem('recitationShuffle', on ? '1' : '0');
    if (on) {
      resetShuffleOrder(currentIdRef.current);
    } else {
      orderRef.current = [];
      nextOrderRef.current = null;
    }
    let label = on ? 'Karışık çal açık' : 'Karışık çal kapalı';
    if (on && repeatModeRef.current === 'off') {
      repeatModeRef.current = 'all';
      setRepeatMode('all');
      label += ' · Liste tekrarı';
    }
    showToast(label);
    // sıradaki parça değişti: yedek oynatıcıyı ve ön-indirmeyi yeni sıraya göre hazırla
    const cur = itemsRef.current.find(i => i.id === currentIdRef.current);
    if (cur) prepareAhead(cur);
  };

  return (
    <main className="flex flex-col h-full bg-transparent relative overflow-hidden">
      {/* Ses elemanları buraya eklenir (görünmez) */}
      <div ref={containerRef} className="hidden" aria-hidden="true" />

      {!item ? (
        <div className="flex-1 flex items-center justify-center text-light-secondary dark:text-dark-secondary">
          {items.length ? 'Kayıt bulunamadı.' : 'Yükleniyor…'}
        </div>
      ) : (
        <>
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
                    <span className="opacity-60">•</span>
                    <span
                      className="tabular-nums inline-flex items-center gap-1"
                      title={shuffle ? 'Karışık turdaki sırası' : 'Listedeki sırası'}
                    >
                      {shuffle && <Shuffle size={12} />}
                      {(shuffle ? orderPosRef.current : itemIndex) + 1} / {items.length}
                    </span>
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
          <div className="flex-none relative bg-light-card/70 dark:bg-dark-card/70 backdrop-blur-sm border-t border-light-border dark:border-dark-border px-4 pt-3 pb-4 z-30">
            {repeatToast && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/75 text-white text-xs font-medium shadow pointer-events-none whitespace-nowrap">
                {repeatToast}
              </div>
            )}
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
                  onChange={e => { activeEl().currentTime = Number(e.target.value); }}
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
                  title={REPEAT_LABELS[repeatMode]}
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
                <button
                  onClick={toggleShuffle}
                  className={`p-2.5 rounded-full transition-colors ${
                    shuffle
                      ? 'text-light-accent dark:text-dark-accent bg-light-accent/15 dark:bg-dark-accent/15'
                      : 'text-light-secondary dark:text-dark-secondary hover:text-light-text dark:hover:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg'
                  }`}
                  title={shuffle ? 'Karışık çal açık' : 'Karışık çal kapalı'}
                >
                  <Shuffle size={20} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
};

export default RecitationView;
