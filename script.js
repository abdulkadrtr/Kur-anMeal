
class QuranApp {
    constructor() {
        this.currentVerse = null;
        this.contextVisible = false;
        this.mealData = [];
        this.isLoading = false;
        this.contextCount = 3;
        this.currentMode = 'normal'; // 'random' or 'normal'
        this.currentSurah = null;
        this.currentSurahVerses = [];
        this.currentVerseIndex = 0;
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

        // Mode buttons
        const randomModeBtn = document.getElementById('randomModeBtn');
        const normalModeBtn = document.getElementById('normalModeBtn');

        // Normal mode elements
        const surahSelect = document.getElementById('surahSelect');
        const readSurahBtn = document.getElementById('readSurahBtn');

        randomBtn.addEventListener('click', () => this.showRandomVerse());
        contextToggle.addEventListener('click', () => this.toggleContext());

        // Mode switching
        randomModeBtn.addEventListener('click', () => this.switchMode('random'));
        normalModeBtn.addEventListener('click', () => this.switchMode('normal'));

        // Normal mode events
        surahSelect.addEventListener('change', () => this.onSurahSelect());
        readSurahBtn.addEventListener('click', () => this.startNormalReading());

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

            // Ağırlıklı seçim için sure ağırlıklarını hesapla
            this.surahWeights = [];
            let totalWeight = 0;

            this.mealData.forEach(surah => {
                // Her surenin toplam ayet ağırlığını hesapla
                let surahWeight = 0;
                surah.ayetler.forEach(verse => {
                    surahWeight += this.getVerseWeight(verse.a_no);
                });

                this.surahWeights.push({
                    surah: surah,
                    weight: surahWeight,
                    cumulativeWeight: totalWeight + surahWeight
                });

                totalWeight += surahWeight;
            });

            this.totalWeight = totalWeight;

            // Sure seçim listesini doldur
            this.populateSurahSelect();

            console.log('Meal verisi yüklendi:', this.mealData.length, 'sure,', 'toplam ağırlık:', totalWeight);
        } catch (error) {
            console.error('Meal verisi yüklenirken hata:', error);
            this.showError('Meal verisi yüklenirken bir hata oluştu.');
        }
    }

    populateSurahSelect() {
        const surahSelect = document.getElementById('surahSelect');
        surahSelect.innerHTML = '<option value="">Sure seçiniz...</option>';

        this.mealData.forEach(surah => {
            const option = document.createElement('option');
            option.value = surah.sure_no;
            option.textContent = `${surah.sure_no}. ${surah.sure_adi}`;
            surahSelect.appendChild(option);
        });
    }

    switchMode(mode) {
        this.currentMode = mode;

        // Mode butonlarını güncelle
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));

        if (mode === 'random') {
            document.getElementById('randomModeBtn').classList.add('active');
            document.getElementById('randomModeSection').style.display = 'block';
            document.getElementById('normalModeSection').style.display = 'none';

            // Normal mod navigasyon butonlarını gizle
            const normalNavigation = document.getElementById('normalNavigation');
            if (normalNavigation) {
                normalNavigation.style.display = 'none';
            }

            // Welcome mesajını güncelle
            const container = document.getElementById('verseContainer');
            container.innerHTML = `
                <div class="welcome-message">
                    <p>Rastgele bir ayet okumak için butona basın</p>
                </div>
            `;
        } else {
            document.getElementById('normalModeBtn').classList.add('active');
            document.getElementById('randomModeSection').style.display = 'none';
            document.getElementById('normalModeSection').style.display = 'block';

            // Normal mod navigasyon butonlarını gizle (henüz sure seçilmediği için)
            const normalNavigation = document.getElementById('normalNavigation');
            if (normalNavigation) {
                normalNavigation.style.display = 'none';
            }

            // Welcome mesajını güncelle
            const container = document.getElementById('verseContainer');
            container.innerHTML = `
                <div class="welcome-message">
                    <p>Okumak istediğiniz sureyi seçin</p>
                </div>
            `;
        }

        // Context bölümünü gizle
        document.getElementById('contextVerses').style.display = 'none';
        this.contextVisible = false;
    }

    onSurahSelect() {
        const surahSelect = document.getElementById('surahSelect');
        const readSurahBtn = document.getElementById('readSurahBtn');

        if (surahSelect.value) {
            readSurahBtn.disabled = false;
        } else {
            readSurahBtn.disabled = true;
        }
    }

    startNormalReading() {
        const surahSelect = document.getElementById('surahSelect');
        const selectedSurahId = parseInt(surahSelect.value);

        if (!selectedSurahId) return;

        this.currentSurah = this.mealData.find(surah => surah.sure_no === selectedSurahId);
        if (!this.currentSurah) return;

        this.currentSurahVerses = this.currentSurah.ayetler;
        this.currentVerseIndex = 0;

        this.showNormalVerse();
        this.showNormalNavigation();
    }

    showNormalVerse() {
        if (!this.currentSurah || !this.currentSurahVerses.length) return;

        const verse = this.currentSurahVerses[this.currentVerseIndex];

        this.currentVerse = {
            id: `${this.currentSurah.sure_no}-${this.currentVerseIndex}`,
            surah_id: this.currentSurah.sure_no,
            verse_number: this.parseVerseNumber(verse.a_no),
            arabic: verse.ar,
            turkish: verse.tr,
            surahName: this.currentSurah.sure_adi,
            a_no: verse.a_no,
            verseIndex: this.currentVerseIndex
        };

        this.displayNormalVerse(this.currentVerse);
        this.showContextButton();
    }

    displayNormalVerse(verse) {
        const container = document.getElementById('verseContainer');
        const verseNumberDisplay = verse.a_no || verse.verse_number;
        
        // Gerçek toplam ayet sayısını hesapla (son ayetin a_no değerini kullan)
        const lastVerse = this.currentSurahVerses[this.currentSurahVerses.length - 1];
        const totalVerses = this.getLastVerseNumber(lastVerse.a_no);
        const currentVerseNumber = this.getLastVerseNumber(verse.a_no);

        container.innerHTML = `
            <div class="verse-content">
                <div class="verse-arabic">${verse.arabic}</div>
                <div class="verse-turkish">${verse.turkish}</div>
                <div class="verse-info">
                    ${verse.surahName}, ${verseNumberDisplay}. Ayet
                    <div class="verse-progress">${currentVerseNumber} / ${totalVerses}</div>
                </div>
            </div>
        `;
    }

    showNormalNavigation() {
        const randomModeSection = document.getElementById('randomModeSection');

        // Navigation butonlarını oluştur
        if (!document.getElementById('normalNavigation')) {
            const navDiv = document.createElement('div');
            navDiv.id = 'normalNavigation';
            navDiv.className = 'normal-navigation';
            navDiv.innerHTML = `
                <button class="nav-btn" id="prevVerseBtn">
                    <span class="btn-icon">⬅️</span>
                    <span class="btn-text">Önceki</span>
                </button>
                <div class="verse-selector">
                    <label for="verseSelect" class="verse-selector-label">Ayet:</label>
                    <select id="verseSelect" class="verse-select">
                    </select>
                </div>
                <button class="nav-btn" id="nextVerseBtn">
                    <span class="btn-text">Sonraki</span>
                    <span class="btn-icon">➡️</span>
                </button>
            `;

            randomModeSection.parentNode.insertBefore(navDiv, randomModeSection);

            // Event listener'ları ekle
            document.getElementById('prevVerseBtn').addEventListener('click', () => this.previousVerse());
            document.getElementById('nextVerseBtn').addEventListener('click', () => this.nextVerse());
            document.getElementById('verseSelect').addEventListener('change', () => this.onVerseSelect());
        }

        document.getElementById('normalNavigation').style.display = 'flex';
        this.populateVerseSelect();
        this.updateNavigationButtons();
    }

    populateVerseSelect() {
        const verseSelect = document.getElementById('verseSelect');
        if (!verseSelect || !this.currentSurahVerses) return;

        verseSelect.innerHTML = '';

        this.currentSurahVerses.forEach((verse, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${verse.a_no}. Ayet`;
            verseSelect.appendChild(option);
        });

        // Mevcut ayeti seçili yap
        verseSelect.value = this.currentVerseIndex;
    }

    onVerseSelect() {
        const verseSelect = document.getElementById('verseSelect');
        if (!verseSelect) return;

        const selectedIndex = parseInt(verseSelect.value);
        if (selectedIndex >= 0 && selectedIndex < this.currentSurahVerses.length) {
            this.currentVerseIndex = selectedIndex;
            this.showNormalVerse();
            this.updateNavigationButtons();
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevVerseBtn');
        const nextBtn = document.getElementById('nextVerseBtn');
        const verseSelect = document.getElementById('verseSelect');

        if (prevBtn && nextBtn) {
            prevBtn.disabled = this.currentVerseIndex === 0;
            nextBtn.disabled = this.currentVerseIndex === this.currentSurahVerses.length - 1;
        }

        // Ayet seçiciyi de güncelle
        if (verseSelect) {
            verseSelect.value = this.currentVerseIndex;
        }
    }

    previousVerse() {
        if (this.currentVerseIndex > 0) {
            this.currentVerseIndex--;
            this.showNormalVerse();
            this.updateNavigationButtons();
        }
    }

    nextVerse() {
        if (this.currentVerseIndex < this.currentSurahVerses.length - 1) {
            this.currentVerseIndex++;
            this.showNormalVerse();
            this.updateNavigationButtons();
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

    // Ayet aralığının kaç ayet kapsadığını hesapla
    getVerseWeight(a_no) {
        if (typeof a_no === 'string' && a_no.includes('-')) {
            const parts = a_no.split('-');
            const start = parseInt(parts[0].trim());
            const end = parseInt(parts[1].trim());
            return end - start + 1; // Örnek: "3-4" = 2 ayet, "14-15" = 2 ayet
        }
        return 1; // Tek ayet
    }

    // Ayet numarasının son değerini al (aralık ise son sayıyı, tek ise kendisini)
    getLastVerseNumber(a_no) {
        if (typeof a_no === 'string' && a_no.includes('-')) {
            const parts = a_no.split('-');
            return parseInt(parts[1].trim()); // Son sayıyı döndür
        }
        return parseInt(a_no); // Tek ayet ise kendisini döndür
    }

    // Ağırlıklı rastgele ayet seçimi
    selectWeightedRandomVerse(surah) {
        // Her ayetin ağırlığını hesapla
        const weightedVerses = [];

        surah.ayetler.forEach((verse, index) => {
            const weight = this.getVerseWeight(verse.a_no);
            // Her ayet için ağırlığı kadar entry ekle
            for (let i = 0; i < weight; i++) {
                weightedVerses.push(index);
            }
        });

        // Ağırlıklı listeden rastgele seç
        const randomIndex = Math.floor(Math.random() * weightedVerses.length);
        const selectedVerseIndex = weightedVerses[randomIndex];

        return surah.ayetler[selectedVerseIndex];
    }

    // Ağırlıklı sure seçimi
    selectWeightedRandomSurah() {
        const randomWeight = Math.random() * this.totalWeight;

        for (let i = 0; i < this.surahWeights.length; i++) {
            if (randomWeight <= this.surahWeights[i].cumulativeWeight) {
                return this.surahWeights[i].surah;
            }
        }

        // Fallback - son sureyi döndür
        return this.surahWeights[this.surahWeights.length - 1].surah;
    }

    async showRandomVerse() {
        if (this.isLoading || this.mealData.length === 0) return;

        this.isLoading = true;
        this.showLoading();

        try {
            // Ağırlıklı rastgele sure seçimi - ayet sayısına göre
            const randomSurah = this.selectWeightedRandomSurah();

            // Ağırlıklı rastgele ayet seçimi kullan
            const randomVerse = this.selectWeightedRandomVerse(randomSurah);

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

        // Context bölümü sadece rastgele modda görünmeli
        if (this.currentMode === 'random') {
            contextDiv.style.display = 'block';
            this.contextVisible = false;
            document.getElementById('contextContent').style.display = 'none';
            document.getElementById('contextToggle').textContent = 'Önceki ve Sonraki Ayetleri Göster';
        } else {
            contextDiv.style.display = 'none';
            this.contextVisible = false;
        }
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