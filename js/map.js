/* ============================================
   Map Module - Leaflet Map with WAQI Tile Overlay
   ============================================ */

const MapManager = {
    map: null,
    markers: [],
    stationMarkers: [],
    activeLayer: 'aqi',
    tileLayer: null,
    aqiTileLayer: null,

    init() {
        this.map = L.map('map', {
            center: CONFIG.MAP_CENTER,
            zoom: CONFIG.MAP_ZOOM,
            minZoom: CONFIG.MAP_MIN_ZOOM,
            maxZoom: CONFIG.MAP_MAX_ZOOM,
            zoomControl: true,
            attributionControl: false,
        });

        // Dark base map
        this.tileLayer = L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                subdomains: 'abcd',
                maxZoom: 19,
            }
        ).addTo(this.map);

        // WAQI real-time AQI tile overlay — this is the official WAQI heatmap
        // Shows real data from thousands of stations worldwide
        this._addAqiTileLayer('usepa-aqi');

        // Attribution
        L.control.attribution({ position: 'bottomright', prefix: false })
            .addAttribution('&copy; <a href="https://carto.com/">CARTO</a> | AQI data &copy; <a href="https://waqi.info/">WAQI</a>')
            .addTo(this.map);

        // Events
        this.map.on('moveend', Utils.debounce(() => this.onMapMove(), 500));

        // Layer buttons — switch between pollutant tile overlays
        document.querySelectorAll('.map-layer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.map-layer-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeLayer = btn.dataset.layer;
                this._switchTileOverlay(btn.dataset.layer);
                this.updateMarkerColors();
            });
        });
    },

    _addAqiTileLayer(pollutant) {
        if (this.aqiTileLayer) {
            this.map.removeLayer(this.aqiTileLayer);
        }
        // WAQI provides free tile layers for different pollutants
        // Available: usepa-aqi, pm25, pm10, o3, no2, so2, co
        this.aqiTileLayer = L.tileLayer(
            `https://tiles.aqicn.org/tiles/${pollutant}/{z}/{x}/{y}.png?token=${CONFIG.WAQI_TOKEN}`, {
                opacity: 0.45,
                maxZoom: 18,
            }
        ).addTo(this.map);
    },

    _switchTileOverlay(layer) {
        const layerMap = {
            'aqi': 'usepa-aqi',
            'pm25': 'pm25',
            'pm10': 'pm10',
            'o3': 'o3',
            'no2': 'no2',
        };
        this._addAqiTileLayer(layerMap[layer] || 'usepa-aqi');
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

        // Re-add the AQI overlay on top of the new base
        if (this.aqiTileLayer) {
            this.aqiTileLayer.bringToFront();
        }
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
                    `${city.name}, ${city.country} \u2014 AQI: ${city.aqi} (${CONFIG.HEALTH_MESSAGES[Utils.getAqiLevel(city.aqi)].label}) \u2014 Station: ${city.station}`;
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
        if (zoom >= 7) {
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
                    `${s.station} \u2014 AQI: ${s.aqi}`;
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
                        station: detail.city?.name || s.station,
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

        // Pollutant chips — only show if we have actual data
        const pollutants = city.pollutants || {};
        const validPollutants = Object.entries(pollutants).filter(([, v]) => v !== null && v !== undefined);

        if (validPollutants.length > 0) {
            pollutantsEl.innerHTML = validPollutants
                .map(([name, value]) => `
                    <div class="pollutant-chip">
                        <span class="pollutant-chip__name">${name.toUpperCase()}</span>
                        <span class="pollutant-chip__value">${typeof value === 'number' ? Math.round(value * 10) / 10 : value}</span>
                    </div>
                `).join('');
        } else {
            pollutantsEl.innerHTML = '<span style="color:var(--text-muted);font-size:11px;">Pollutant breakdown not available for this station</span>';
        }

        // Station source info
        const stationInfo = city.station ? `<br><small style="color:var(--text-muted)">Source: ${city.station}</small>` : '';
        healthEl.innerHTML = `<strong>Health Advisory:</strong> ${health.message}${stationInfo}`;

        // Draw chart
        Charts.drawCityForecast(city);

        panel.classList.add('active');
    },

    flyTo(lat, lng, zoom = 10) {
        this.map.flyTo([lat, lng], zoom, { duration: 1.5 });
    },
};
