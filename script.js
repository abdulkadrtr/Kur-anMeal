// Açık Kuran API konfigürasyonu
const API_BASE_URL = 'https://api.acikkuran.com';
const DEFAULT_AUTHOR_ID = 105; // Erhan Aktaş - Kerim Kur'an

class QuranApp {
    constructor() {
        this.currentVerse = null;
        this.contextVisible = false;
        this.surahs = [];
        this.isLoading = false;
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadSurahs();
    }

    bindEvents() {
        const randomBtn = document.getElementById('randomVerseBtn');
        const contextToggle = document.getElementById('contextToggle');

        randomBtn.addEventListener('click', () => this.showRandomVerse());
        contextToggle.addEventListener('click', () => this.toggleContext());
    }

    async loadSurahs() {
        try {
            const response = await fetch(`${API_BASE_URL}/surahs`);
            const data = await response.json();
            this.surahs = data.data;
        } catch (error) {
            console.error('Sureler yüklenirken hata:', error);
            this.showError('Sureler yüklenirken bir hata oluştu.');
        }
    }

    async showRandomVerse() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            // Rastgele sure ve ayet seç
            const randomSurah = this.surahs[Math.floor(Math.random() * this.surahs.length)];
            const randomVerseNumber = Math.floor(Math.random() * randomSurah.verse_count) + 1;

            // API'den ayeti getir
            const response = await fetch(`${API_BASE_URL}/surah/${randomSurah.id}/verse/${randomVerseNumber}?author=${DEFAULT_AUTHOR_ID}`);
            const data = await response.json();

            this.currentVerse = {
                id: data.data.id,
                surah_id: data.data.surah.id,
                verse_number: data.data.verse_number,
                arabic: data.data.verse,
                turkish: data.data.translation.text,
                surahName: data.data.surah.name,
                page: data.data.page,
                juz: data.data.juz_number
            };

            this.displayVerse(this.currentVerse);
            this.showContextButton();

        } catch (error) {
            console.error('Ayet yüklenirken hata:', error);
            this.showError('Ayet yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            this.isLoading = false;
        }
    }

    displayVerse(verse) {
        const container = document.getElementById('verseContainer');

        container.innerHTML = `
            <div class="verse-content">
                <div class="verse-arabic">${verse.arabic}</div>
                <div class="verse-turkish">${verse.turkish}</div>
                <div class="verse-info">
                    ${verse.surahName} Suresi, ${verse.verse_number}. Ayet
                </div>
            </div>
        `;
    }

    showLoading() {
        const container = document.getElementById('verseContainer');
        container.innerHTML = `
            <div class="verse-content">
                <div class="loading"></div>
                <p style="margin-top: 15px; color: var(--text-secondary);">Ayet yükleniyor...</p>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById('verseContainer');
        container.innerHTML = `
            <div class="verse-content">
                <p style="color: #ff6b6b; text-align: center;">${message}</p>
            </div>
        `;
    }

    showContextButton() {
        const contextDiv = document.getElementById('contextVerses');
        contextDiv.style.display = 'block';
        this.contextVisible = false;
        document.getElementById('contextContent').style.display = 'none';
        document.getElementById('contextToggle').textContent = 'Önceki ve Sonraki Ayetleri Göster';
    }

    async toggleContext() {
        const contextContent = document.getElementById('contextContent');
        const toggleBtn = document.getElementById('contextToggle');

        if (!this.contextVisible) {
            toggleBtn.textContent = 'Yükleniyor...';
            toggleBtn.disabled = true;

            await this.showContextVerses();
            contextContent.style.display = 'flex';
            toggleBtn.textContent = 'Ayetleri Gizle';
            toggleBtn.disabled = false;
            this.contextVisible = true;
        } else {
            contextContent.style.display = 'none';
            toggleBtn.textContent = 'Önceki ve Sonraki Ayetleri Göster';
            this.contextVisible = false;
        }
    }

    async showContextVerses() {
        if (!this.currentVerse) return;

        const contextContent = document.getElementById('contextContent');
        contextContent.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="loading"></div></div>';

        try {
            const contextVerses = await this.getContextVerses();
            contextContent.innerHTML = '';

            contextVerses.forEach(verse => {
                const verseDiv = document.createElement('div');
                verseDiv.className = `context-verse ${verse.id === this.currentVerse.id ? 'current' : ''}`;

                verseDiv.innerHTML = `
                    <div class="verse-arabic">${verse.arabic}</div>
                    <div class="verse-turkish">${verse.turkish}</div>
                    <div class="verse-info">
                        ${verse.surahName} Suresi, ${verse.verse_number}. Ayet
                    </div>
                `;

                contextContent.appendChild(verseDiv);
            });
        } catch (error) {
            console.error('Context ayetleri yüklenirken hata:', error);
            contextContent.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff6b6b;">Ayetler yüklenirken bir hata oluştu.</div>';
        }
    }

    async getContextVerses() {
        const currentVerse = this.currentVerse;
        const contextVerses = [];

        try {
            // Mevcut surenin tüm ayetlerini getir
            const response = await fetch(`${API_BASE_URL}/surah/${currentVerse.surah_id}?author=${DEFAULT_AUTHOR_ID}`);
            const data = await response.json();
            const allVerses = data.data.verses;

            // Mevcut ayetin indexini bul
            const currentIndex = allVerses.findIndex(v => v.verse_number === currentVerse.verse_number);

            // Önceki 5 ayet
            const startIndex = Math.max(0, currentIndex - 5);
            const endIndex = Math.min(allVerses.length, currentIndex + 6);

            for (let i = startIndex; i < endIndex; i++) {
                const verse = allVerses[i];
                contextVerses.push({
                    id: verse.id,
                    surah_id: currentVerse.surah_id,
                    verse_number: verse.verse_number,
                    arabic: verse.verse,
                    turkish: verse.translation.text,
                    surahName: currentVerse.surahName
                });
            }

            return contextVerses;

        } catch (error) {
            console.error('Context ayetleri alınırken hata:', error);
            throw error;
        }
    }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    new QuranApp();
});

// Sayfa yüklendiğinde hoş geldin mesajını göster
window.addEventListener('load', () => {
    const container = document.querySelector('.verse-container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';

    setTimeout(() => {
        container.style.transition = 'all 0.5s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 100);
});