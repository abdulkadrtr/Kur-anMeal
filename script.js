
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
        this.savedVerses = this.loadSavedVerses();
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadMealData();
        this.updateSavedVersesCounter();
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
        const verseSelectInline = document.getElementById('verseSelectInline');

        // Saved verses elements
        const savedVersesBtn = document.getElementById('savedVersesBtn');

        randomBtn.addEventListener('click', () => this.showRandomVerse());
        contextToggle.addEventListener('click', () => this.toggleContext());

        // Mode switching
        randomModeBtn.addEventListener('click', () => this.switchMode('random'));
        normalModeBtn.addEventListener('click', () => this.switchMode('normal'));

        // Normal mode events
        surahSelect.addEventListener('change', () => this.onSurahSelect());
        readSurahBtn.addEventListener('click', () => this.startNormalReading());
        verseSelectInline.addEventListener('change', () => this.onInlineVerseSelect());

        // Saved verses events - header button still works for quick access
        savedVersesBtn.addEventListener('click', () => this.switchMode('saved'));

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

    hideAllNavigations() {
        const simpleNavigation = document.getElementById('simpleNavigation');
        const savedNavigation = document.getElementById('savedNavigation');
        
        if (simpleNavigation) {
            simpleNavigation.style.display = 'none';
        }
        if (savedNavigation) {
            savedNavigation.style.display = 'none';
        }
    }

    switchMode(mode) {
        this.currentMode = mode;

        // Mode butonlarını güncelle
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));

        // Tüm bölümleri gizle
        document.getElementById('randomModeSection').style.display = 'none';
        document.getElementById('normalModeSection').style.display = 'none';
        
        // Tüm navigasyonları gizle
        this.hideAllNavigations();

        if (mode === 'random') {
            document.getElementById('randomModeBtn').classList.add('active');
            document.getElementById('randomModeSection').style.display = 'block';

            // Welcome mesajını güncelle
            const container = document.getElementById('verseContainer');
            container.innerHTML = `
                <div class="welcome-message">
                    <p>Sistemin sizin yerinize ayet seçmesi için butona basın</p>
                </div>
            `;
        } else if (mode === 'saved') {
            // Saved mode için özel işlem - mode butonlarını güncelleme
            this.showSavedVersesPage();
        } else {
            document.getElementById('normalModeBtn').classList.add('active');
            document.getElementById('normalModeSection').style.display = 'block';

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
        const verseSelectInline = document.getElementById('verseSelectInline');

        if (surahSelect.value) {
            readSurahBtn.disabled = false;
            // Sure seçildiğinde ayet seçiciyi göster ve doldur
            this.populateInlineVerseSelect();
            verseSelectInline.style.display = 'block';
        } else {
            readSurahBtn.disabled = true;
            verseSelectInline.style.display = 'none';
        }
    }

    populateInlineVerseSelect() {
        const surahSelect = document.getElementById('surahSelect');
        const verseSelectInline = document.getElementById('verseSelectInline');
        const selectedSurahId = parseInt(surahSelect.value);

        if (!selectedSurahId) return;

        const selectedSurah = this.mealData.find(surah => surah.sure_no === selectedSurahId);
        if (!selectedSurah) return;

        verseSelectInline.innerHTML = '<option value="">Ayet seçin...</option>';

        selectedSurah.ayetler.forEach((verse, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${verse.a_no}. Ayet`;
            verseSelectInline.appendChild(option);
        });
    }

    onInlineVerseSelect() {
        const verseSelectInline = document.getElementById('verseSelectInline');
        const selectedIndex = parseInt(verseSelectInline.value);

        if (selectedIndex >= 0 && this.currentSurah && this.currentSurahVerses.length > 0) {
            this.currentVerseIndex = selectedIndex;
            this.showNormalVerse();
            // Navigasyon butonlarını güncelle
            this.updateNavigationButtons();
        }
    }

    startNormalReading() {
        const surahSelect = document.getElementById('surahSelect');
        const verseSelectInline = document.getElementById('verseSelectInline');
        const selectedSurahId = parseInt(surahSelect.value);

        if (!selectedSurahId) return;

        this.currentSurah = this.mealData.find(surah => surah.sure_no === selectedSurahId);
        if (!this.currentSurah) return;

        this.currentSurahVerses = this.currentSurah.ayetler;
        
        // Ayet seçimi varsa onu kullan, yoksa 1. ayetten başla
        const selectedVerseIndex = verseSelectInline.value !== '' ? parseInt(verseSelectInline.value) : 0;
        this.currentVerseIndex = selectedVerseIndex;

        this.showNormalVerse();
        this.showSimpleNavigation();
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
        const isSaved = this.isVerseSaved(verse);
        
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
                <button class="bookmark-btn ${isSaved ? 'saved' : ''}" onclick="app.toggleBookmark()">
                    <span class="bookmark-icon">${isSaved ? '💚' : '🤍'}</span>
                </button>
            </div>
        `;
    }

    showSimpleNavigation() {
        // Önce mevcut navigasyonları gizle
        this.hideAllNavigations();
        
        const randomModeSection = document.getElementById('randomModeSection');

        // Basit navigasyon butonlarını oluştur
        if (!document.getElementById('simpleNavigation')) {
            const navDiv = document.createElement('div');
            navDiv.id = 'simpleNavigation';
            navDiv.className = 'simple-navigation';
            navDiv.innerHTML = `
                <button class="nav-btn" id="prevVerseBtn">
                    <span class="btn-icon">⬅️</span>
                    <span class="btn-text">Önceki</span>
                </button>
                <button class="nav-btn" id="nextVerseBtn">
                    <span class="btn-text">Sonraki</span>
                    <span class="btn-icon">➡️</span>
                </button>
            `;

            randomModeSection.parentNode.insertBefore(navDiv, randomModeSection);

            // Event listener'ları ekle
            document.getElementById('prevVerseBtn').addEventListener('click', () => this.previousVerse());
            document.getElementById('nextVerseBtn').addEventListener('click', () => this.nextVerse());
        }

        document.getElementById('simpleNavigation').style.display = 'flex';
        this.updateNavigationButtons();
        this.updateInlineVerseSelect();
    }

    updateInlineVerseSelect() {
        const verseSelectInline = document.getElementById('verseSelectInline');
        if (verseSelectInline && this.currentVerseIndex >= 0) {
            verseSelectInline.value = this.currentVerseIndex;
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevVerseBtn');
        const nextBtn = document.getElementById('nextVerseBtn');

        if (prevBtn && nextBtn) {
            prevBtn.disabled = this.currentVerseIndex === 0;
            nextBtn.disabled = this.currentVerseIndex === this.currentSurahVerses.length - 1;
        }

        // Inline ayet seçiciyi de güncelle
        this.updateInlineVerseSelect();
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
        const isSaved = this.isVerseSaved(verse);

        container.innerHTML = `
            <div class="verse-content">
                <div class="verse-arabic">${verse.arabic}</div>
                <div class="verse-turkish">${verse.turkish}</div>
                <div class="verse-info">
                    ${verse.surahName}, ${verseNumberDisplay}. Ayet
                </div>
                <button class="bookmark-btn ${isSaved ? 'saved' : ''}" onclick="app.toggleBookmark()">
                    <span class="bookmark-icon">${isSaved ? '💚' : '🤍'}</span>
                </button>
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

    // Bookmark fonksiyonları
    loadSavedVerses() {
        try {
            const saved = localStorage.getItem('savedVerses');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Kaydedilen ayetler yüklenirken hata:', error);
            return [];
        }
    }

    saveSavedVerses() {
        try {
            localStorage.setItem('savedVerses', JSON.stringify(this.savedVerses));
            this.updateSavedVersesCounter();
        } catch (error) {
            console.error('Ayetler kaydedilirken hata:', error);
        }
    }

    isVerseSaved(verse) {
        return this.savedVerses.some(saved => saved.id === verse.id);
    }

    toggleBookmark() {
        if (!this.currentVerse) return;

        const verseId = this.currentVerse.id;
        const existingIndex = this.savedVerses.findIndex(saved => saved.id === verseId);

        if (existingIndex >= 0) {
            // Ayeti kaldır
            this.savedVerses.splice(existingIndex, 1);
        } else {
            // Ayeti ekle
            this.savedVerses.push({
                ...this.currentVerse,
                savedAt: new Date().toISOString()
            });
        }

        this.saveSavedVerses();
        
        // Bookmark butonunu güncelle
        const bookmarkBtn = document.querySelector('.bookmark-btn');
        if (bookmarkBtn) {
            const isSaved = this.isVerseSaved(this.currentVerse);
            bookmarkBtn.className = `bookmark-btn ${isSaved ? 'saved' : ''}`;
            bookmarkBtn.querySelector('.bookmark-icon').textContent = isSaved ? '💚' : '🤍';
        }
    }

    updateSavedVersesCounter() {
        const counter = document.getElementById('savedVersesCounter');
        if (counter) {
            const count = this.savedVerses.length;
            counter.textContent = count > 0 ? count : '';
            counter.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    showSavedVersesPage() {
        const container = document.getElementById('verseContainer');
        
        if (this.savedVerses.length === 0) {
            container.innerHTML = `
                <div class="welcome-message">
                    <p>Henüz kaydedilmiş ayet bulunmuyor</p>
                    <p style="font-size: 0.9rem; margin-top: 10px; opacity: 0.7;">Beğendiğiniz ayetleri kaydetmek için ayet kutucuğundaki 🤍 simgesine tıklayın</p>
                </div>
            `;
        } else {
            this.currentSavedIndex = 0;
            this.showSavedVerse();
            this.showSavedNavigation();
        }
    }

    showSavedVerse() {
        if (this.savedVerses.length === 0) return;
        
        const verse = this.savedVerses[this.currentSavedIndex];
        const container = document.getElementById('verseContainer');
        
        container.innerHTML = `
            <div class="verse-content">
                <div class="verse-arabic">${verse.arabic}</div>
                <div class="verse-turkish">${verse.turkish}</div>
                <div class="verse-info">
                    ${verse.surahName}, ${verse.a_no}. Ayet
                    <div class="verse-progress">${this.currentSavedIndex + 1} / ${this.savedVerses.length}</div>
                    <div class="saved-date">Kaydedilme: ${new Date(verse.savedAt).toLocaleDateString('tr-TR')}</div>
                </div>
                <button class="bookmark-btn saved" onclick="app.removeSavedVerse('${verse.id}')">
                    <span class="bookmark-icon">💚</span>
                </button>
            </div>
        `;
    }

    showSavedNavigation() {
        // Önce mevcut navigasyonları gizle
        this.hideAllNavigations();
        
        const randomModeSection = document.getElementById('randomModeSection');

        if (!document.getElementById('savedNavigation')) {
            const navDiv = document.createElement('div');
            navDiv.id = 'savedNavigation';
            navDiv.className = 'simple-navigation';
            navDiv.innerHTML = `
                <button class="nav-btn" id="prevSavedBtn">
                    <span class="btn-icon">⬅️</span>
                    <span class="btn-text">Önceki</span>
                </button>
                <button class="nav-btn" id="nextSavedBtn">
                    <span class="btn-text">Sonraki</span>
                    <span class="btn-icon">➡️</span>
                </button>
            `;

            randomModeSection.parentNode.insertBefore(navDiv, randomModeSection);

            document.getElementById('prevSavedBtn').addEventListener('click', () => this.previousSavedVerse());
            document.getElementById('nextSavedBtn').addEventListener('click', () => this.nextSavedVerse());
        }

        document.getElementById('savedNavigation').style.display = 'flex';
        this.updateSavedNavigationButtons();
    }

    updateSavedNavigationButtons() {
        const prevBtn = document.getElementById('prevSavedBtn');
        const nextBtn = document.getElementById('nextSavedBtn');

        if (prevBtn && nextBtn) {
            prevBtn.disabled = this.currentSavedIndex === 0;
            nextBtn.disabled = this.currentSavedIndex === this.savedVerses.length - 1;
        }
    }

    previousSavedVerse() {
        if (this.currentSavedIndex > 0) {
            this.currentSavedIndex--;
            this.showSavedVerse();
            this.updateSavedNavigationButtons();
        }
    }

    nextSavedVerse() {
        if (this.currentSavedIndex < this.savedVerses.length - 1) {
            this.currentSavedIndex++;
            this.showSavedVerse();
            this.updateSavedNavigationButtons();
        }
    }

    removeSavedVerse(verseId) {
        const index = this.savedVerses.findIndex(saved => saved.id === verseId);
        if (index >= 0) {
            this.savedVerses.splice(index, 1);
            this.saveSavedVerses();
            
            // Eğer kaydedilenler modundaysak sayfayı yenile
            if (this.currentMode === 'saved') {
                if (this.savedVerses.length === 0) {
                    this.showSavedVersesPage();
                    const savedNav = document.getElementById('savedNavigation');
                    if (savedNav) savedNav.style.display = 'none';
                } else {
                    // Index'i ayarla
                    if (this.currentSavedIndex >= this.savedVerses.length) {
                        this.currentSavedIndex = this.savedVerses.length - 1;
                    }
                    this.showSavedVerse();
                    this.updateSavedNavigationButtons();
                }
            }
            
            // Eğer şu anda görüntülenen ayet kaldırıldıysa bookmark butonunu güncelle
            if (this.currentVerse && this.currentVerse.id === verseId) {
                const bookmarkBtn = document.querySelector('.bookmark-btn');
                if (bookmarkBtn) {
                    bookmarkBtn.className = 'bookmark-btn';
                    bookmarkBtn.querySelector('.bookmark-icon').textContent = '🏷️';
                }
            }
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.app = new QuranApp();
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