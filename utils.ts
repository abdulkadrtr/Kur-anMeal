export const ARABIC_RUN_SOURCE = '[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF]+';

// Kilit ekranı / bildirim kartı ikonu. Android bildirimi SVG'yi bitmap'e
// çeviremediği için canvas'ta bir kez PNG üretilir ve önbelleğe alınır.
let artworkCache = '';
export const makeArtworkPng = (): string => {
  if (artworkCache === '') {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const g = c.getContext('2d')!;
      g.fillStyle = '#1A1D23';
      g.fillRect(0, 0, 512, 512);
      g.fillStyle = '#D4AF37';
      g.beginPath();
      g.arc(256, 256, 190, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1A1D23';
      g.font = 'bold 220px Arial';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('ا', 256, 276);
      artworkCache = c.toDataURL('image/png');
    } catch {
      artworkCache = ' '; // üretilemedi: bir daha deneme, ikonsuz devam
    }
  }
  return artworkCache.trim();
};

export const formatTurkishText = (text: string): string => {
  return text
    .replace(
      /\(([^)]+)\)/g,
      '<span class="text-light-secondary dark:text-dark-secondary font-normal opacity-90">($1)</span>'
    )
    .replace(
      new RegExp(ARABIC_RUN_SOURCE, 'g'),
      '<span class="font-arabic text-[1.15em]">$&</span>'
    );
};
