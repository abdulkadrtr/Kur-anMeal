export interface Ayah {
  id: number;
  surahId: number;
  numberInSurah: number | string;
  textArabic: string;
  textTurkish: string;
}

export interface Surah {
  id: number;
  nameArabic: string;
  nameTurkish: string;
  nameEnglish: string; // Used for slug/search internally
  verseCount: number;
  ayahs: Ayah[];
}

export interface AyahSearchResult {
  surah: Surah;
  ayah: Ayah;
  ayahIndex: number;
}

export interface AudioState {
  isPlaying: boolean;
  currentSurahId: number | null;
  progress: number; // 0 to 100
  duration: number; // in seconds
  currentTime: number; // in seconds
}

// public/recitations.json şeması (scripts/update_recitations.py üretir)
export interface RecitationSegment {
  ayahIndex: number; // meal.json'daki ayet kaydının sıra indeksi
  a_no: string;      // ayet numarası ("84" veya "99 - 100" gibi birleşik)
  startMs: number;
  endMs: number;
}

export interface RecitationItem {
  id: string;
  youtubeUrl: string;
  ytTitle: string;
  reciter: string;
  file: string;
  durationSec: number;
  title: string;
  surahId?: number;
  surahName?: string;
  segments?: RecitationSegment[];
}