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

export interface AudioState {
  isPlaying: boolean;
  currentSurahId: number | null;
  progress: number; // 0 to 100
  duration: number; // in seconds
  currentTime: number; // in seconds
}