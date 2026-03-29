/* ============================================
   Application Controller
   ============================================ */

const App = {
    refreshTimer: null,

    async init() {
        this.showLoading('Initializing map...');
        MapManager.init();

        this.bindEvents();
        this.loadTheme();

        this.showLoading('Fetching global air quality data...');
        await this.loadData();

        this.hideLoading();
        this.startAutoRefresh();
    },

    bindEvents() {
        // Search
        const searchInput = document.getElementById('citySearch');
        const searchResults = document.getElementById('searchResults');

        searchInput.addEventListener('input', Utils.debounce(() => {
            const query = searchInput.value.trim().toLowerCase();
            if (query.length < 2) {
                searchResults.classList.remove('active');
                return;
            }

            const matches = AirQualityAPI.cityData
                .filter(c => c.name.toLowerCase().includes(query) || c.country.toLowerCase().includes(query))
                .slice(0, 8);

            if (matches.length) {
                searchResults.innerHTML = matches.map(c => `
                    <div class="search-results__item" data-lat="${c.lat}" data-lng="${c.lng}">
                        <div>
                            <span class="search-results__city">${c.name}</span>
                            <span class="search-results__country">${c.country}</span>
                        </div>
                        <span class="search-results__aqi" style="background:${Utils.getAqiBackground(c.aqi)};color:${Utils.getAqiColor(c.aqi)}">${c.aqi}</span>
                    </div>
                `).join('');
                searchResults.classList.add('active');

                searchResults.querySelectorAll('.search-results__item').forEach(item => {
                    item.addEventListener('click', () => {
                        const lat = parseFloat(item.dataset.lat);
                        const lng = parseFloat(item.dataset.lng);
                        MapManager.flyTo(lat, lng);
                        searchResults.classList.remove('active');
                        searchInput.value = '';

                        const city = AirQualityAPI.cityData.find(c => c.lat === lat && c.lng === lng);
                        if (city) MapManager.showCityDetail(city);
                    });
                });
            } else {
                searchResults.innerHTML = '<div class="search-results__item"><span class="search-results__city" style="color:var(--text-muted)">No results found</span></div>';
                searchResults.classList.add('active');
            }
        }, 250));

        // Close search on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box')) {
                searchResults.classList.remove('active');
            }
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Close city detail
        document.getElementById('closeCityDetail').addEventListener('click', () => {
            document.getElementById('cityDetailPanel').classList.remove('active');
        });

        // Panel toggles
        document.querySelectorAll('.panel__toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                if (target) {
                    target.style.display = target.style.display === 'none' ? '' : 'none';
                    btn.style.transform = target.style.display === 'none' ? 'rotate(-90deg)' : '';
                }
            });
        });

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && !e.target.closest('input')) {
                e.preventDefault();
                searchInput.focus();
            }
            if (e.key === 'Escape') {
                document.getElementById('cityDetailPanel').classList.remove('active');
                searchResults.classList.remove('active');
                searchInput.blur();
            }
        });
    },

    async loadData() {
        const loadingStatus = document.getElementById('loadingStatus');

        try {
            // Clear cache on manual refresh
            AirQualityAPI.cache.clear();

            const data = await AirQualityAPI.fetchAllCities((pct) => {
                if (loadingStatus) loadingStatus.textContent = `Fetching live station data... ${pct}%`;
            });

            if (!data.length) {
                if (loadingStatus) loadingStatus.textContent = 'No data received — check network or API status';
                return;
            }

            // Plot on map
            MapManager.plotCities(data);

            // Update statistics
            const stats = AirQualityAPI.getStatistics();
            if (stats) this.updateDashboard(stats);

            // Update advisories
            this.updateAdvisories();

            // Update timestamp
            const now = new Date();
            document.getElementById('lastUpdate').textContent =
                `Updated: ${now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}`;
            document.getElementById('dataAge').textContent =
                `${data.length} stations live | ${now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

        } catch (e) {
            console.error('Failed to load data:', e);
            const loadingEl = document.getElementById('loadingStatus');
            if (loadingEl) loadingEl.textContent = `Error: ${e.message}`;
        }
    },

    updateDashboard(stats) {
        // Global AQI
        const aqiEl = document.getElementById('globalAqi');
        aqiEl.textContent = stats.avgAqi;
        aqiEl.style.color = Utils.getAqiColor(stats.avgAqi);

        const level = Utils.getAqiLevel(stats.avgAqi);
        const statusEl = document.getElementById('globalAqiStatus');
        statusEl.textContent = CONFIG.HEALTH_MESSAGES[level].label;
        statusEl.style.color = CONFIG.HEALTH_MESSAGES[level].color;

        // Trend badge — compare to previous fetch if available
        const trendEl = document.getElementById('globalAqiTrend');
        if (this._prevAvgAqi !== undefined && this._prevAvgAqi > 0) {
            const diff = stats.avgAqi - this._prevAvgAqi;
            const pct = Math.round((diff / this._prevAvgAqi) * 100);
            if (pct > 0) {
                trendEl.textContent = `+${pct}%`;
                trendEl.className = 'metric-card__badge metric-card__badge--up';
            } else if (pct < 0) {
                trendEl.textContent = `${pct}%`;
                trendEl.className = 'metric-card__badge metric-card__badge--down';
            } else {
                trendEl.textContent = '0%';
                trendEl.className = 'metric-card__badge';
            }
        } else {
            trendEl.textContent = 'LIVE';
            trendEl.className = 'metric-card__badge metric-card__badge--down';
        }
        this._prevAvgAqi = stats.avgAqi;

        // Station and country count
        document.getElementById('stationCount').textContent = stats.stationCount;
        document.getElementById('countryCount').textContent = stats.countryCount;

        // Population exposed
        document.getElementById('popExposed').textContent = Utils.formatNumber(stats.unhealthyPop);

        // Pollutant bars
        const pcts = stats.pollutantPcts;
        for (const [key, pct] of Object.entries(pcts)) {
            const bar = document.getElementById(`${key}Bar`);
            const label = document.getElementById(`${key}Pct`);
            if (bar) bar.style.width = `${pct}%`;
            if (label) label.textContent = `${pct}%`;
        }

        // Sparkline
        const sparkData = this.generateSparklineData(stats.avgAqi);
        Charts.drawSparkline('globalAqiSparkline', sparkData, Utils.getAqiColor(stats.avgAqi));

        // City lists
        this.renderCityList('worstCities', stats.worstCities);
        this.renderCityList('bestCities', stats.bestCities);

        // Regional chart
        Charts.drawRegionalChart(stats.regionalAvg);
    },

    renderCityList(containerId, cities) {
        const container = document.getElementById(containerId);
        if (!container || !cities.length) return;

        container.innerHTML = cities.map((city, i) => `
            <div class="city-list__item" data-lat="${city.lat}" data-lng="${city.lng}">
                <span class="city-list__rank">${i + 1}</span>
                <div class="city-list__info">
                    <div class="city-list__name">${city.name}</div>
                    <div class="city-list__country">${city.country}</div>
                </div>
                <span class="city-list__aqi" style="background:${Utils.getAqiBackground(city.aqi)};color:${Utils.getAqiColor(city.aqi)}">${city.aqi}</span>
            </div>
        `).join('');

        container.querySelectorAll('.city-list__item').forEach(item => {
            item.addEventListener('click', () => {
                const lat = parseFloat(item.dataset.lat);
                const lng = parseFloat(item.dataset.lng);
                MapManager.flyTo(lat, lng);
                const city = AirQualityAPI.cityData.find(c => c.lat === lat && c.lng === lng);
                if (city) MapManager.showCityDetail(city);
            });
        });
    },

    updateAdvisories() {
        const advisories = AirQualityAPI.getHealthAdvisories();
        const container = document.getElementById('advisoryList');
        if (!container) return;

        container.innerHTML = advisories.map(a => `
            <div class="advisory-item">
                <span class="advisory-item__icon">${a.icon}</span>
                <div class="advisory-item__content">
                    <div class="advisory-item__title">${a.title}</div>
                    <div class="advisory-item__text">${a.text}</div>
                </div>
            </div>
        `).join('');
    },

    generateSparklineData(baseAqi) {
        const points = [];
        for (let i = 0; i < 24; i++) {
            const variation = (Math.sin(i * 0.5) * 10) + (Math.random() * 8 - 4);
            points.push(Math.max(1, Math.round(baseAqi + variation)));
        }
        return points;
    },

    // Theme management
    loadTheme() {
        const saved = localStorage.getItem('airq-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        if (saved === 'light') {
            MapManager.updateTheme && MapManager.updateTheme('light');
        }
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('airq-theme', next);
        MapManager.updateTheme(next);
        Charts.refreshChartThemes();
    },

    // Auto refresh
    startAutoRefresh() {
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        this.refreshTimer = setInterval(() => this.loadData(), CONFIG.REFRESH_INTERVAL);
    },

    // Loading overlay
    showLoading(message) {
        const overlay = document.getElementById('loadingOverlay');
        const status = document.getElementById('loadingStatus');
        if (overlay) overlay.classList.remove('hidden');
        if (status) status.textContent = message || '';
    },

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            setTimeout(() => overlay.style.display = 'none', 400);
        }
    },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
