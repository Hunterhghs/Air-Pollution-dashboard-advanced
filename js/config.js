/* ============================================
   Configuration & Constants
   ============================================ */

const CONFIG = {
    // WAQI API - free token for air quality data
    WAQI_TOKEN: 'demo',
    WAQI_BASE: 'https://api.waqi.info',

    // Map defaults
    MAP_CENTER: [25, 10],
    MAP_ZOOM: 3,
    MAP_MIN_ZOOM: 2,
    MAP_MAX_ZOOM: 14,

    // Refresh interval (5 minutes)
    REFRESH_INTERVAL: 5 * 60 * 1000,

    // Major cities to track with coordinates
    MAJOR_CITIES: [
        { name: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074, pop: 21540000 },
        { name: 'Delhi', country: 'India', lat: 28.7041, lng: 77.1025, pop: 32940000 },
        { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777, pop: 21670000 },
        { name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737, pop: 28520000 },
        { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, pop: 22430000 },
        { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332, pop: 21920000 },
        { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357, pop: 22180000 },
        { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792, pop: 15950000 },
        { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, pop: 37400000 },
        { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278, pop: 9540000 },
        { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, pop: 11020000 },
        { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060, pop: 18820000 },
        { name: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437, pop: 12490000 },
        { name: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173, pop: 12640000 },
        { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784, pop: 15640000 },
        { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456, pop: 34540000 },
        { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, pop: 9776000 },
        { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018, pop: 17070000 },
        { name: 'Dhaka', country: 'Bangladesh', lat: 23.8103, lng: 90.4125, pop: 23210000 },
        { name: 'Karachi', country: 'Pakistan', lat: 24.8607, lng: 67.0011, pop: 16840000 },
        { name: 'Lahore', country: 'Pakistan', lat: 31.5204, lng: 74.3587, pop: 13540000 },
        { name: 'Kolkata', country: 'India', lat: 22.5726, lng: 88.3639, pop: 15130000 },
        { name: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428, pop: 11040000 },
        { name: 'Bogotá', country: 'Colombia', lat: 4.7110, lng: -74.0721, pop: 11340000 },
        { name: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8231, lng: 106.6297, pop: 9320000 },
        { name: 'Chengdu', country: 'China', lat: 30.5728, lng: 104.0668, pop: 16330000 },
        { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, pop: 7680000 },
        { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708, pop: 3560000 },
        { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, pop: 5920000 },
        { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219, pop: 5120000 },
        { name: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050, pop: 3650000 },
        { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038, pop: 6750000 },
        { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964, pop: 4350000 },
        { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, pop: 5310000 },
        { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832, pop: 6200000 },
        { name: 'Chicago', country: 'USA', lat: 41.8781, lng: -87.6298, pop: 8900000 },
        { name: 'Houston', country: 'USA', lat: 29.7604, lng: -95.3698, pop: 7120000 },
        { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lng: 28.0473, pop: 6070000 },
        { name: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122, pop: 1790000 },
        { name: 'Hanoi', country: 'Vietnam', lat: 21.0278, lng: 105.8342, pop: 8530000 },
        { name: 'Ulaanbaatar', country: 'Mongolia', lat: 47.8864, lng: 106.9057, pop: 1540000 },
        { name: 'Kathmandu', country: 'Nepal', lat: 27.7172, lng: 85.3240, pop: 1440000 },
        { name: 'Accra', country: 'Ghana', lat: 5.6037, lng: -0.1870, pop: 4200000 },
        { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816, pop: 15370000 },
        { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693, pop: 6770000 },
        { name: 'Addis Ababa', country: 'Ethiopia', lat: 9.0250, lng: 38.7469, pop: 5460000 },
        { name: 'Taipei', country: 'Taiwan', lat: 25.0330, lng: 121.5654, pop: 7050000 },
        { name: 'Manila', country: 'Philippines', lat: 14.5995, lng: 120.9842, pop: 14400000 },
        { name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.1390, lng: 101.6869, pop: 8420000 },
        { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041, pop: 1150000 },
    ],

    // Regions for grouping
    REGIONS: {
        'South Asia': ['India', 'Pakistan', 'Bangladesh', 'Nepal'],
        'East Asia': ['China', 'Japan', 'South Korea', 'Taiwan', 'Mongolia'],
        'Southeast Asia': ['Thailand', 'Vietnam', 'Indonesia', 'Philippines', 'Malaysia', 'Singapore'],
        'Middle East': ['Saudi Arabia', 'UAE', 'Egypt', 'Turkey'],
        'Europe': ['UK', 'France', 'Germany', 'Spain', 'Italy', 'Poland', 'Russia', 'Netherlands'],
        'North America': ['USA', 'Canada', 'Mexico'],
        'South America': ['Brazil', 'Colombia', 'Peru', 'Argentina', 'Chile'],
        'Africa': ['Nigeria', 'Kenya', 'South Africa', 'Ghana', 'Ethiopia'],
        'Oceania': ['Australia'],
    },

    // Health messages by AQI level
    HEALTH_MESSAGES: {
        good: { label: 'Good', color: '#00e400', message: 'Air quality is satisfactory with little or no health risk.' },
        moderate: { label: 'Moderate', color: '#ffff00', message: 'Acceptable air quality. Some pollutants may pose moderate health concern for sensitive individuals.' },
        usg: { label: 'Unhealthy for Sensitive Groups', color: '#ff7e00', message: 'Sensitive groups may experience health effects. General public is less likely to be affected.' },
        unhealthy: { label: 'Unhealthy', color: '#ff0000', message: 'Everyone may begin to experience health effects. Sensitive groups may experience more serious effects.' },
        veryUnhealthy: { label: 'Very Unhealthy', color: '#8f3f97', message: 'Health alert: everyone may experience more serious health effects.' },
        hazardous: { label: 'Hazardous', color: '#7e0023', message: 'Health warning of emergency conditions. Entire population likely to be affected.' }
    }
};

// Utility functions
const Utils = {
    getAqiLevel(aqi) {
        if (aqi <= 50) return 'good';
        if (aqi <= 100) return 'moderate';
        if (aqi <= 150) return 'usg';
        if (aqi <= 200) return 'unhealthy';
        if (aqi <= 300) return 'veryUnhealthy';
        return 'hazardous';
    },

    getAqiColor(aqi) {
        if (aqi <= 50) return '#00e400';
        if (aqi <= 100) return '#c5c500';
        if (aqi <= 150) return '#ff7e00';
        if (aqi <= 200) return '#ff0000';
        if (aqi <= 300) return '#8f3f97';
        return '#7e0023';
    },

    getAqiBackground(aqi) {
        if (aqi <= 50) return 'rgba(0,228,0,0.15)';
        if (aqi <= 100) return 'rgba(255,255,0,0.12)';
        if (aqi <= 150) return 'rgba(255,126,0,0.15)';
        if (aqi <= 200) return 'rgba(255,0,0,0.15)';
        if (aqi <= 300) return 'rgba(143,63,151,0.15)';
        return 'rgba(126,0,35,0.2)';
    },

    getAqiClass(aqi) {
        if (aqi <= 50) return 'aqi-good';
        if (aqi <= 100) return 'aqi-moderate';
        if (aqi <= 150) return 'aqi-usg';
        if (aqi <= 200) return 'aqi-unhealthy';
        if (aqi <= 300) return 'aqi-very-unhealthy';
        return 'aqi-hazardous';
    },

    getMarkerSize(aqi) {
        if (aqi <= 50) return 22;
        if (aqi <= 100) return 24;
        if (aqi <= 150) return 26;
        if (aqi <= 200) return 28;
        if (aqi <= 300) return 30;
        return 32;
    },

    formatNumber(n) {
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toString();
    },

    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }
};
