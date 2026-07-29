import React from 'react';
import { RecitationItem } from '../types';
import { Sparkles, ChevronDown, Play, Youtube } from 'lucide-react';

interface RecitationsPanelProps {
  onOpenRecitation: (id: string) => void;
}

const fmtTime = (sec: number) => {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const RecitationsPanel: React.FC<RecitationsPanelProps> = ({ onOpenRecitation }) => {
  const [items, setItems] = React.useState<RecitationItem[]>([]);
  const [isOpen, setIsOpen] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('recitationsPanelOpen_v2');
    return saved ? JSON.parse(saved) : false; // varsayılan: kapalı
  });

  // Manifest'i yükle (yoksa panel hiç görünmez)
  React.useEffect(() => {
    fetch('./recitations.json')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setItems(d.items || []))
      .catch(() => setItems([]));
  }, []);

  React.useEffect(() => {
    localStorage.setItem('recitationsPanelOpen_v2', JSON.stringify(isOpen));
  }, [isOpen]);

  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Başlık — aç/kapa */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-light-accent/40 dark:border-dark-accent/40 bg-light-card/60 dark:bg-dark-card/60 hover:border-light-accent dark:hover:border-dark-accent transition-all shadow-sm"
      >
        <span className="flex items-center gap-2 font-semibold text-light-text dark:text-dark-text">
          <Sparkles size={20} className="text-light-accent dark:text-dark-accent" />
          Özel Okuyuşlar
          <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-light-bg dark:bg-dark-bg text-light-secondary dark:text-dark-secondary border border-light-border dark:border-dark-border">
            {items.length}
          </span>
        </span>
        <ChevronDown
          size={20}
          className={`text-light-secondary dark:text-dark-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="mt-3 flex flex-col gap-2">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => onOpenRecitation(item.id)}
              className="w-full min-w-0 flex items-center gap-3 p-3 md:p-4 rounded-xl border border-light-border dark:border-dark-border bg-light-card/50 dark:bg-dark-card/50 text-left hover:border-light-accent dark:hover:border-dark-accent hover:shadow-md transition-all group"
            >
              <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-light-bg dark:bg-dark-bg text-light-secondary dark:text-dark-secondary border border-light-border dark:border-dark-border group-hover:bg-light-accent group-hover:dark:bg-dark-accent group-hover:text-white dark:group-hover:text-gray-900 transition-colors">
                <Play size={16} className="ml-0.5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-sm md:text-base text-light-text dark:text-dark-text truncate">
                  {item.title}
                </span>
                <span className="block text-xs text-light-secondary dark:text-dark-secondary">
                  {item.reciter} • {fmtTime(item.durationSec)}
                </span>
              </span>
              <a
                href={item.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="shrink-0 p-1.5 rounded-lg text-light-secondary dark:text-dark-secondary hover:text-red-500 transition-colors"
                title="YouTube'da aç"
              >
                <Youtube size={16} />
              </a>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecitationsPanel;
