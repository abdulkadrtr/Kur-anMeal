
class QuranApp {
    constructor() {
        this.currentVerse = null;
        this.contextVisible = false;
        this.mealData = [];
        this.isLoading = false;
        this.contextCount = 3;
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadMealData();
    }

    bindEvents() {
        const randomBtn = document.getElementById('randomVerseBtn');
        const contextToggle = document.getElementById('contextToggle');
        const contextCountBtns = document.querySelectorAll('.context-count-btn');

        randomBtn.addEventListener('click', () => this.showRandomVerse());
        contextToggle.addEventListener('click', () => this.toggleContext());

        // Ayet sayısı butonları için event listener
        contextCountBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.setContextCount(e));
        });
    }

    setContextCount(event) {
        const count = parseInt(event.target.dataset.count);
        this.contextCount = count;

        // Aktif butonu güncelle
        document.querySelectorAll('.context-count-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Eğer context açıksa, yeniden yükle
        if (this.contextVisible) {
            this.showContextVerses();
        }
    }

    async loadMealData() {
        try {
            const response = await fetch('meal.json');
            this.mealData = await response.json();
            console.log('Meal verisi yüklendi:', this.mealData.length, 'sure');
        } catch (error) {
            console.error('Meal verisi yüklenirken hata:', error);
            this.showError('Meal verisi yüklenirken bir hata oluştu.');
        }
    }

    parseVerseNumber(a_no) {
        // a_no string ise ve tire içeriyorsa, ilk sayıyı al
        if (typeof a_no === 'string' && a_no.includes('-')) {
            return parseInt(a_no.split('-')[0].trim());
        }
        // Sayı ise direkt döndür
        return parseInt(a_no);
    }

    async showRandomVerse() {
        if (this.isLoading || this.mealData.length === 0) return;

        this.isLoading = true;
        this.showLoading();

        try {
            // Rastgele sure seç
            const randomSurah = this.mealData[Math.floor(Math.random() * this.mealData.length)];

            // Rastgele ayet seç
            const randomVerse = randomSurah.ayetler[Math.floor(Math.random() * randomSurah.ayetler.length)];

            const verseIndex = randomSurah.ayetler.indexOf(randomVerse);
            this.currentVerse = {
                id: `${randomSurah.sure_no}-${verseIndex}`, // Benzersiz ID
                surah_id: randomSurah.sure_no,
                verse_number: this.parseVerseNumber(randomVerse.a_no),
                arabic: randomVerse.ar,
                turkish: randomVerse.tr,
                surahName: randomSurah.sure_adi,
                a_no: randomVerse.a_no, // Orijinal a_no değerini sakla
                verseIndex: verseIndex // Index'i de sakla
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

        // Ayet numarasını gösterirken orijinal a_no değerini kullan
        const verseNumberDisplay = verse.a_no || verse.verse_number;

        container.innerHTML = `
            <div class="verse-content">
                <div class="verse-arabic">${verse.arabic}</div>
                <div class="verse-turkish">${verse.turkish}</div>
                <div class="verse-info">
                    ${verse.surahName}, ${verseNumberDisplay}. Ayet
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

                // Ayet numarasını gösterirken orijinal a_no değerini kullan
                const verseNumberDisplay = verse.a_no || verse.verse_number;

                verseDiv.innerHTML = `
                    <div class="verse-arabic">${verse.arabic}</div>
                    <div class="verse-turkish">${verse.turkish}</div>
                    <div class="verse-info">
                        ${verse.surahName}, ${verseNumberDisplay}. Ayet
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
            // Mevcut sureyi meal.json'dan bul
            const currentSurah = this.mealData.find(surah => surah.sure_no === currentVerse.surah_id);
            if (!currentSurah) {
                throw new Error('Sure bulunamadı');
            }

            const allVerses = currentSurah.ayetler;

            // Mevcut ayetin indexini bul
            const currentIndex = currentVerse.verseIndex;

            // Seçilen sayıda önceki ve sonraki ayetleri al
            const startIndex = Math.max(0, currentIndex - this.contextCount);
            const endIndex = Math.min(allVerses.length, currentIndex + this.contextCount + 1);

            for (let i = startIndex; i < endIndex; i++) {
                const verse = allVerses[i];
                contextVerses.push({
                    id: `${currentVerse.surah_id}-${i}`, // Benzersiz ID oluştur
                    surah_id: currentVerse.surah_id,
                    verse_number: this.parseVerseNumber(verse.a_no),
                    arabic: verse.ar,
                    turkish: verse.tr,
                    surahName: currentVerse.surahName,
                    a_no: verse.a_no
                });
            }

            return contextVerses;

        } catch (error) {
            console.error('Context ayetleri alınırken hata:', error);
            throw error;
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    new QuranApp();
});


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