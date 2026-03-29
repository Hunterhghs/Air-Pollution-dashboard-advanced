/* ============================================
   Map Module - Leaflet Map Management
   ============================================ */

const MapManager = {
    map: null,
    markers: [],
    stationMarkers: [],
    activeLayer: 'aqi',
    tileLayer: null,

    init() {
        this.map = L.map('map', {
            center: CONFIG.MAP_CENTER,
            zoom: CONFIG.MAP_ZOOM,
            minZoom: CONFIG.MAP_MIN_ZOOM,
            maxZoom: CONFIG.MAP_MAX_ZOOM,
            zoomControl: true,
            attributionControl: false,
        });

        // Dark map tiles
        this.tileLayer = L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                subdomains: 'abcd',
                maxZoom: 19,
            }
        ).addTo(this.map);

        // Attribution
        L.control.attribution({ position: 'bottomright', prefix: false })
            .addAttribution('&copy; <a href="https://carto.com/">CARTO</a>')
            .addTo(this.map);

        // Events
        this.map.on('moveend', Utils.debounce(() => this.onMapMove(), 500));

        // Layer buttons
        document.querySelectorAll('.map-layer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.map-layer-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeLayer = btn.dataset.layer;
                this.updateMarkerColors();
            });
        });
    },

    updateTheme(theme) {
        if (this.tileLayer) {
            this.map.removeLayer(this.tileLayer);
        }
        const url = theme === 'light'
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        this.tileLayer = L.tileLayer(url, {
            subdomains: 'abcd',
            maxZoom: 19,
        }).addTo(this.map);
    },

    plotCities(cityData) {
        // Clear existing markers
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];

        cityData.forEach(city => {
            if (!city.aqi || city.aqi <= 0) return;

            const size = Utils.getMarkerSize(city.aqi);
            const color = Utils.getAqiColor(city.aqi);

            const icon = L.divIcon({
                className: 'aqi-marker-wrapper',
                html: `<div class="aqi-marker" style="
                    width:${size}px;
                    height:${size}px;
                    background:${color};
                    box-shadow: 0 0 ${size/2}px ${color}40;
                ">${city.aqi}</div>`,
                iconSize: [size, size],
                iconAnchor: [size/2, size/2],
            });

            const marker = L.marker([city.lat, city.lng], { icon })
                .addTo(this.map);

            marker.on('click', () => this.showCityDetail(city));
            marker.on('mouseover', () => {
                document.getElementById('hoveredCity').textContent =
                    `${city.name}, ${city.country} — AQI: ${city.aqi} (${CONFIG.HEALTH_MESSAGES[Utils.getAqiLevel(city.aqi)].label})`;
            });
            marker.on('mouseout', () => {
                document.getElementById('hoveredCity').textContent = 'Hover over a station for details';
            });

            marker.cityData = city;
            this.markers.push(marker);
        });
    },

    async onMapMove() {
        const zoom = this.map.getZoom();
        if (zoom >= 6) {
            const bounds = this.map.getBounds();
            const stations = await AirQualityAPI.fetchMapStations(bounds);
            this.plotStations(stations);
        } else {
            this.clearStations();
        }
    },

    plotStations(stations) {
        this.clearStations();

        stations.forEach(s => {
            if (!s.aqi || s.aqi <= 0) return;
            const size = Math.max(16, Utils.getMarkerSize(s.aqi) - 4);
            const color = Utils.getAqiColor(s.aqi);

            const icon = L.divIcon({
                className: 'aqi-marker-wrapper',
                html: `<div class="aqi-marker" style="
                    width:${size}px;
                    height:${size}px;
                    background:${color};
                    font-size:8px;
                    box-shadow: 0 0 ${size/3}px ${color}30;
                ">${s.aqi}</div>`,
                iconSize: [size, size],
                iconAnchor: [size/2, size/2],
            });

            const marker = L.marker([s.lat, s.lng], { icon }).addTo(this.map);

            marker.on('mouseover', () => {
                document.getElementById('hoveredCity').textContent =
                    `${s.station} — AQI: ${s.aqi}`;
            });
            marker.on('mouseout', () => {
                document.getElementById('hoveredCity').textContent = 'Hover over a station for details';
            });
            marker.on('click', async () => {
                const detail = await AirQualityAPI.fetchStationDetail(s.uid);
                if (detail) {
                    const iaqi = detail.iaqi || {};
                    this.showCityDetail({
                        name: detail.city?.name || s.station,
                        country: '',
                        aqi: parseInt(detail.aqi) || s.aqi,
                        pollutants: {
                            pm25: iaqi.pm25?.v ?? null,
                            pm10: iaqi.pm10?.v ?? null,
                            o3: iaqi.o3?.v ?? null,
                            no2: iaqi.no2?.v ?? null,
                            so2: iaqi.so2?.v ?? null,
                            co: iaqi.co?.v ?? null,
                        },
                        dominantPollutant: detail.dominentpol || 'pm25',
                        forecast: detail.forecast?.daily || null,
                    });
                }
            });

            this.stationMarkers.push(marker);
        });
    },

    clearStations() {
        this.stationMarkers.forEach(m => this.map.removeLayer(m));
        this.stationMarkers = [];
    },

    updateMarkerColors() {
        this.markers.forEach(m => {
            const city = m.cityData;
            if (!city) return;

            let value = city.aqi;
            const layer = this.activeLayer;

            if (layer !== 'aqi' && city.pollutants) {
                value = city.pollutants[layer] || city.aqi;
            }

            const size = Utils.getMarkerSize(value);
            const color = Utils.getAqiColor(value);

            const icon = L.divIcon({
                className: 'aqi-marker-wrapper',
                html: `<div class="aqi-marker" style="
                    width:${size}px;
                    height:${size}px;
                    background:${color};
                    box-shadow: 0 0 ${size/2}px ${color}40;
                ">${value}</div>`,
                iconSize: [size, size],
                iconAnchor: [size/2, size/2],
            });

            m.setIcon(icon);
        });
    },

    showCityDetail(city) {
        const panel = document.getElementById('cityDetailPanel');
        const nameEl = document.getElementById('cityDetailName');
        const aqiEl = document.getElementById('cityDetailAqi');
        const statusEl = document.getElementById('cityDetailStatus');
        const pollutantsEl = document.getElementById('cityDetailPollutants');
        const healthEl = document.getElementById('cityDetailHealth');

        const level = Utils.getAqiLevel(city.aqi);
        const health = CONFIG.HEALTH_MESSAGES[level];

        nameEl.textContent = city.country ? `${city.name}, ${city.country}` : city.name;
        aqiEl.textContent = city.aqi;
        aqiEl.style.background = Utils.getAqiBackground(city.aqi);
        aqiEl.style.color = Utils.getAqiColor(city.aqi);

        statusEl.textContent = health.label;
        statusEl.style.color = health.color;

        // Pollutant chips
        const pollutants = city.pollutants || {};
        pollutantsEl.innerHTML = Object.entries(pollutants)
            .filter(([, v]) => v !== null && v !== undefined)
            .map(([name, value]) => `
                <div class="pollutant-chip">
                    <span class="pollutant-chip__name">${name}</span>
                    <span class="pollutant-chip__value">${value}</span>
                </div>
            `).join('');

        healthEl.innerHTML = `<strong>Health Advisory:</strong> ${health.message}`;

        // Draw forecast chart if available
        Charts.drawCityForecast(city);

        panel.classList.add('active');
    },

    flyTo(lat, lng, zoom = 10) {
        this.map.flyTo([lat, lng], zoom, { duration: 1.5 });
    },
};
