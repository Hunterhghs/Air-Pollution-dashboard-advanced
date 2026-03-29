/* ============================================
   API Layer - Real Data from WAQI + OpenAQ
   ============================================ */

const AirQualityAPI = {
    cache: new Map(),
    cityData: [],
    _seenUids: new Set(),

    /**
     * Fetch AQI for a single city using the WAQI city-name feed endpoint.
     * This returns REAL station data even with the demo token.
     */
    async fetchCityAqi(city) {
        const cacheKey = city.feed;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 300000) {
            return cached.data;
        }

        // Strategy 1: city name feed (most reliable with demo token)
        let data = await this._fetchByName(city);

        // Strategy 2: search endpoint if name feed failed
        if (!data) {
            data = await this._fetchBySearch(city);
        }

        if (data) {
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        }

        // Final fallback: no data available for this city
        console.warn(`No live data for ${city.name} — skipping`);
        return null;
    },

    async _fetchByName(city) {
        try {
            const response = await fetch(
                `${CONFIG.WAQI_BASE}/feed/${encodeURIComponent(city.feed)}/?token=${CONFIG.WAQI_TOKEN}`
            );
            const json = await response.json();

            if (json.status === 'ok' && json.data && json.data.aqi !== '-' && json.data.aqi !== undefined) {
                const aqi = typeof json.data.aqi === 'number' ? json.data.aqi : parseInt(json.data.aqi);
                if (!isNaN(aqi) && aqi > 0) {
                    return this._processStationData(json.data, city);
                }
            }
        } catch (e) {
            console.warn(`Name feed failed for ${city.name}:`, e.message);
        }
        return null;
    },

    async _fetchBySearch(city) {
        try {
            const response = await fetch(
                `${CONFIG.WAQI_BASE}/search/?keyword=${encodeURIComponent(city.name)}&token=${CONFIG.WAQI_TOKEN}`
            );
            const json = await response.json();

            if (json.status === 'ok' && json.data && json.data.length > 0) {
                // Pick the first result that has a valid AQI
                for (const result of json.data) {
                    const aqi = parseInt(result.aqi);
                    if (!isNaN(aqi) && aqi > 0) {
                        return {
                            name: city.name,
                            country: city.country,
                            lat: city.lat,
                            lng: city.lng,
                            pop: city.pop,
                            aqi,
                            pollutants: {}, // search endpoint doesn't provide individual pollutants
                            dominantPollutant: 'pm25',
                            time: result.time?.stime || new Date().toISOString(),
                            station: result.station?.name || city.name,
                            uid: result.uid,
                            forecast: null,
                            _needsDetail: true, // flag to fetch full detail later
                        };
                    }
                }
            }
        } catch (e) {
            console.warn(`Search failed for ${city.name}:`, e.message);
        }
        return null;
    },

    _processStationData(raw, city) {
        const iaqi = raw.iaqi || {};
        const aqi = typeof raw.aqi === 'number' ? raw.aqi : parseInt(raw.aqi);

        return {
            name: city.name,
            country: city.country,
            lat: city.lat,
            lng: city.lng,
            pop: city.pop,
            aqi: isNaN(aqi) ? 0 : aqi,
            pollutants: {
                pm25: iaqi.pm25?.v ?? null,
                pm10: iaqi.pm10?.v ?? null,
                o3: iaqi.o3?.v ?? null,
                no2: iaqi.no2?.v ?? null,
                so2: iaqi.so2?.v ?? null,
                co: iaqi.co?.v ?? null,
            },
            dominantPollutant: raw.dominentpol || this._inferDominant(iaqi),
            time: raw.time?.s || raw.time?.iso || new Date().toISOString(),
            station: raw.city?.name || city.name,
            uid: raw.idx,
            forecast: raw.forecast?.daily || null,
        };
    },

    _inferDominant(iaqi) {
        let max = 0;
        let dominant = 'pm25';
        for (const [key, obj] of Object.entries(iaqi)) {
            const v = obj?.v ?? 0;
            if (v > max) {
                max = v;
                dominant = key.replace('.', '');
            }
        }
        return dominant;
    },

    /**
     * Fetch all configured cities with real API data.
     * Uses batching with delays to respect rate limits.
     */
    async fetchAllCities(onProgress) {
        const cities = CONFIG.MAJOR_CITIES;
        const results = [];
        const batchSize = 5; // smaller batches to avoid rate limits
        this._seenUids.clear();

        for (let i = 0; i < cities.length; i += batchSize) {
            const batch = cities.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(
                batch.map(city => this.fetchCityAqi(city))
            );

            for (const result of batchResults) {
                if (result.status === 'fulfilled' && result.value) {
                    // De-duplicate by UID (some cities may resolve to same station)
                    const d = result.value;
                    if (d.uid && this._seenUids.has(d.uid)) continue;
                    if (d.uid) this._seenUids.add(d.uid);
                    results.push(d);
                }
            }

            if (onProgress) {
                onProgress(Math.round(((i + batch.length) / cities.length) * 100));
            }

            // Rate-limit delay between batches
            if (i + batchSize < cities.length) {
                await new Promise(r => setTimeout(r, 350));
            }
        }

        // Enrich any results that only have AQI (from search endpoint) with full detail
        const needsDetail = results.filter(r => r._needsDetail && r.uid);
        if (needsDetail.length > 0) {
            const detailBatches = [];
            for (let i = 0; i < needsDetail.length; i += 4) {
                detailBatches.push(needsDetail.slice(i, i + 4));
            }
            for (const batch of detailBatches) {
                await Promise.allSettled(batch.map(async (city) => {
                    const detail = await this.fetchStationDetail(city.uid);
                    if (detail) {
                        const iaqi = detail.iaqi || {};
                        city.pollutants = {
                            pm25: iaqi.pm25?.v ?? null,
                            pm10: iaqi.pm10?.v ?? null,
                            o3: iaqi.o3?.v ?? null,
                            no2: iaqi.no2?.v ?? null,
                            so2: iaqi.so2?.v ?? null,
                            co: iaqi.co?.v ?? null,
                        };
                        city.dominantPollutant = detail.dominentpol || this._inferDominant(iaqi);
                        city.forecast = detail.forecast?.daily || null;
                        delete city._needsDetail;
                    }
                }));
                await new Promise(r => setTimeout(r, 300));
            }
        }

        this.cityData = results.filter(r => r && r.aqi > 0);

        // Sort by AQI descending for debugging
        console.log(`Loaded ${this.cityData.length} cities with live AQI data`);
        console.table(this.cityData.map(c => ({ city: c.name, aqi: c.aqi, station: c.station })));

        return this.cityData;
    },

    /**
     * Fetch stations within map bounds (for zoomed-in views).
     * Uses WAQI map bounds API.
     */
    async fetchMapStations(bounds) {
        try {
            const { _southWest: sw, _northEast: ne } = bounds;
            const url = `${CONFIG.WAQI_BASE}/v2/map/bounds?latlng=${sw.lat},${sw.lng},${ne.lat},${ne.lng}&networks=all&token=${CONFIG.WAQI_TOKEN}`;
            const response = await fetch(url);
            const json = await response.json();

            if (json.status === 'ok' && json.data) {
                return json.data
                    .map(s => ({
                        lat: s.lat,
                        lng: s.lon,
                        aqi: parseInt(s.aqi) || 0,
                        station: s.station?.name || 'Unknown',
                        uid: s.uid,
                    }))
                    .filter(s => s.aqi > 0 && !isNaN(s.aqi));
            }
        } catch (e) {
            console.warn('Map bounds fetch failed:', e.message);
        }
        return [];
    },

    /**
     * Fetch detailed data for a single station by UID.
     */
    async fetchStationDetail(uid) {
        try {
            const response = await fetch(
                `${CONFIG.WAQI_BASE}/feed/@${uid}/?token=${CONFIG.WAQI_TOKEN}`
            );
            const json = await response.json();
            if (json.status === 'ok' && json.data) {
                return json.data;
            }
        } catch (e) {
            console.warn('Station detail fetch failed:', e.message);
        }
        return null;
    },

    /**
     * Compute dashboard statistics from loaded city data.
     */
    getStatistics() {
        const data = this.cityData;
        if (!data.length) return null;

        const aqis = data.map(d => d.aqi);
        const avgAqi = Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length);
        const countries = new Set(data.map(d => d.country)).size;
        const unhealthyPop = data
            .filter(d => d.aqi > 100)
            .reduce((sum, d) => sum + (d.pop || 0), 0);

        // Dominant pollutant distribution
        const pollutantCounts = { pm25: 0, pm10: 0, o3: 0, no2: 0, so2: 0, co: 0 };
        data.forEach(d => {
            // Use actual highest pollutant value, not just the reported dominant
            const p = d.pollutants || {};
            let maxKey = 'pm25';
            let maxVal = 0;
            for (const [key, val] of Object.entries(p)) {
                if (val !== null && val > maxVal) {
                    maxVal = val;
                    maxKey = key;
                }
            }
            if (pollutantCounts.hasOwnProperty(maxKey)) {
                pollutantCounts[maxKey]++;
            } else {
                pollutantCounts.pm25++;
            }
        });

        const total = Object.values(pollutantCounts).reduce((a, b) => a + b, 0) || 1;
        const pollutantPcts = {};
        for (const [key, val] of Object.entries(pollutantCounts)) {
            pollutantPcts[key] = Math.round((val / total) * 100);
        }

        // Regional averages
        const regionalAvg = {};
        for (const [region, countries_list] of Object.entries(CONFIG.REGIONS)) {
            const regionData = data.filter(d => countries_list.includes(d.country));
            if (regionData.length) {
                regionalAvg[region] = Math.round(
                    regionData.reduce((s, d) => s + d.aqi, 0) / regionData.length
                );
            }
        }

        return {
            avgAqi,
            stationCount: data.length,
            countryCount: countries,
            unhealthyPop,
            pollutantPcts,
            regionalAvg,
            worstCities: [...data].sort((a, b) => b.aqi - a.aqi).slice(0, 10),
            bestCities: [...data].sort((a, b) => a.aqi - b.aqi).slice(0, 10),
        };
    },

    /**
     * Generate health advisories based on current data.
     */
    getHealthAdvisories() {
        const data = this.cityData;
        const advisories = [];

        const hazardous = data.filter(d => d.aqi > 300);
        const veryUnhealthy = data.filter(d => d.aqi > 200 && d.aqi <= 300);
        const unhealthy = data.filter(d => d.aqi > 150 && d.aqi <= 200);

        if (hazardous.length) {
            advisories.push({
                icon: '\u26a0\ufe0f',
                title: `Hazardous Air in ${hazardous.length} ${hazardous.length === 1 ? 'city' : 'cities'}`,
                text: `${hazardous.map(c => c.name).join(', ')} \u2014 avoid outdoor activity, use air purifiers indoors.`,
                severity: 'hazardous'
            });
        }

        if (veryUnhealthy.length) {
            advisories.push({
                icon: '\ud83d\udfe3',
                title: `Very Unhealthy: ${veryUnhealthy.length} ${veryUnhealthy.length === 1 ? 'city' : 'cities'}`,
                text: `${veryUnhealthy.map(c => c.name).join(', ')} \u2014 health alert for entire population.`,
                severity: 'very-unhealthy'
            });
        }

        if (unhealthy.length) {
            advisories.push({
                icon: '\ud83d\udfe0',
                title: `Unhealthy: ${unhealthy.length} ${unhealthy.length === 1 ? 'city' : 'cities'}`,
                text: `${unhealthy.slice(0, 5).map(c => c.name).join(', ')}${unhealthy.length > 5 ? ' and more' : ''} \u2014 sensitive groups should limit prolonged outdoor exertion.`,
                severity: 'unhealthy'
            });
        }

        const usg = data.filter(d => d.aqi > 100 && d.aqi <= 150);
        if (usg.length) {
            advisories.push({
                icon: '\ud83d\udfe1',
                title: `Sensitive Groups Alert: ${usg.length} cities`,
                text: `Children, elderly, and those with respiratory conditions should take precautions.`,
                severity: 'usg'
            });
        }

        const goodCount = data.filter(d => d.aqi <= 50).length;
        if (goodCount > 0) {
            advisories.push({
                icon: '\ud83d\udfe2',
                title: `${goodCount} cities with Good AQI`,
                text: 'Air quality is ideal for outdoor activities in these regions.',
                severity: 'good'
            });
        }

        if (!advisories.length) {
            advisories.push({
                icon: '\u2139\ufe0f',
                title: 'No active advisories',
                text: 'Monitoring all stations. Data refreshes automatically.',
                severity: 'info'
            });
        }

        return advisories;
    }
};
