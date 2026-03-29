/* ============================================
   Charts Module - Chart.js Visualizations
   ============================================ */

const Charts = {
    regionalChart: null,
    sparklineChart: null,
    cityDetailChart: null,

    getChartDefaults() {
        const style = getComputedStyle(document.documentElement);
        return {
            textColor: style.getPropertyValue('--text-secondary').trim() || '#94a3b8',
            gridColor: style.getPropertyValue('--border-primary').trim() || '#1e293b',
            fontFamily: "'Inter', sans-serif",
        };
    },

    drawRegionalChart(regionalAvg) {
        const canvas = document.getElementById('regionalChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const defaults = this.getChartDefaults();

        const labels = Object.keys(regionalAvg);
        const values = Object.values(regionalAvg);
        const colors = values.map(v => Utils.getAqiColor(v));
        const bgColors = values.map(v => Utils.getAqiBackground(v));

        if (this.regionalChart) {
            this.regionalChart.destroy();
        }

        this.regionalChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: bgColors,
                    borderColor: colors,
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 18,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1a2035',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        borderColor: '#2a3654',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 10,
                        titleFont: { family: defaults.fontFamily, size: 12, weight: '600' },
                        bodyFont: { family: defaults.fontFamily, size: 11 },
                        callbacks: {
                            label: (ctx) => `AQI: ${ctx.raw}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: defaults.gridColor, drawBorder: false },
                        ticks: {
                            color: defaults.textColor,
                            font: { family: defaults.fontFamily, size: 10 },
                        },
                        max: Math.max(...values) + 30,
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: defaults.textColor,
                            font: { family: defaults.fontFamily, size: 10 },
                        },
                    }
                },
            }
        });
    },

    drawSparkline(elementId, dataPoints, color = '#3b82f6') {
        const canvas = document.getElementById(elementId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.sparklineChart) {
            this.sparklineChart.destroy();
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, color + '30');
        gradient.addColorStop(1, color + '00');

        this.sparklineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dataPoints.map((_, i) => i),
                datasets: [{
                    data: dataPoints,
                    borderColor: color,
                    backgroundColor: gradient,
                    fill: true,
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false },
                    y: { display: false },
                },
            }
        });
    },

    drawCityForecast(city) {
        const canvas = document.getElementById('cityDetailChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const defaults = this.getChartDefaults();

        if (this.cityDetailChart) {
            this.cityDetailChart.destroy();
        }

        // Generate simulated 24h trend data if no forecast
        let labels, pm25Data, pm10Data;

        if (city.forecast && city.forecast.pm25) {
            const forecastData = city.forecast.pm25.slice(0, 7);
            labels = forecastData.map(f => {
                const d = new Date(f.day);
                return d.toLocaleDateString('en', { weekday: 'short' });
            });
            pm25Data = forecastData.map(f => f.avg);
            pm10Data = city.forecast.pm10
                ? city.forecast.pm10.slice(0, 7).map(f => f.avg)
                : pm25Data.map(v => Math.round(v * 1.3));
        } else {
            // Simulated 24h pattern
            labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'];
            const base = city.aqi;
            pm25Data = [
                Math.round(base * 0.7),
                Math.round(base * 0.6),
                Math.round(base * 1.1),
                Math.round(base * 0.9),
                Math.round(base * 1.2),
                Math.round(base * 1.05),
                base
            ];
            pm10Data = pm25Data.map(v => Math.round(v * (1.1 + Math.random() * 0.3)));
        }

        const pm25Color = '#ef4444';
        const pm10Color = '#f59e0b';

        this.cityDetailChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'PM2.5',
                        data: pm25Data,
                        borderColor: pm25Color,
                        backgroundColor: pm25Color + '15',
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: pm25Color,
                        tension: 0.3,
                    },
                    {
                        label: 'PM10',
                        data: pm10Data,
                        borderColor: pm10Color,
                        backgroundColor: pm10Color + '10',
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: pm10Color,
                        tension: 0.3,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: defaults.textColor,
                            font: { family: defaults.fontFamily, size: 10 },
                            boxWidth: 10,
                            boxHeight: 2,
                            padding: 8,
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1a2035',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        borderColor: '#2a3654',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 10,
                        titleFont: { family: defaults.fontFamily, size: 11 },
                        bodyFont: { family: defaults.fontFamily, size: 11 },
                    }
                },
                scales: {
                    x: {
                        grid: { color: defaults.gridColor, drawBorder: false },
                        ticks: {
                            color: defaults.textColor,
                            font: { family: defaults.fontFamily, size: 9 },
                            maxRotation: 0,
                        },
                    },
                    y: {
                        grid: { color: defaults.gridColor, drawBorder: false },
                        ticks: {
                            color: defaults.textColor,
                            font: { family: defaults.fontFamily, size: 9 },
                        },
                        beginAtZero: true,
                    }
                }
            }
        });
    },

    refreshChartThemes() {
        // Redraw charts when theme changes
        const stats = AirQualityAPI.getStatistics();
        if (stats) {
            if (stats.regionalAvg) this.drawRegionalChart(stats.regionalAvg);
        }
    }
};
