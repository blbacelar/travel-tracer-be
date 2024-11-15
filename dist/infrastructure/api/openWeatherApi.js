"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenWeatherApi = void 0;
const axios_1 = __importDefault(require("axios"));
const CacheService_1 = require("../services/CacheService");
class OpenWeatherApi {
    constructor() {
        this.weatherApiKey = process.env.WEATHER_API_KEY;
        this.googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!this.weatherApiKey) {
            throw new Error("Weather API key is not configured");
        }
        if (!this.googleMapsKey) {
            throw new Error("Google Maps API key is not configured");
        }
        // Initialize cache with different TTLs
        this.cacheService = new CacheService_1.CacheService();
    }
    async findNearbyCities(lat, lon, radius = 100) {
        var _a, _b;
        const cacheKey = CacheService_1.CacheService.generateKey("cities", lat.toString(), lon.toString(), radius.toString());
        const cachedCities = await this.cacheService.get(cacheKey) || [];
        if (cachedCities.length > 0) {
            console.log("Returning cached cities");
            return cachedCities;
        }
        try {
            const allLocations = [];
            // Calculate bounding box for the search area
            const bbox = this.calculateBBox(lat, lon, radius);
            // Search for cities and towns in the area
            const response = await axios_1.default.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    format: "json",
                    "accept-language": "en",
                    addressdetails: 1,
                    limit: 50,
                    q: "[place=city] OR [place=town]",
                    viewbox: bbox,
                    bounded: 1,
                },
                headers: {
                    "User-Agent": "TravelTracer/1.0",
                },
            });
            console.log("Raw Nominatim response:", response.data);
            if (response.data && Array.isArray(response.data)) {
                const locations = response.data
                    .filter((place) => {
                    return (place.class === "place" &&
                        ["city", "town", "village"].includes(place.type));
                })
                    .map((place) => {
                    const distance = this.calculateDistance(lat, lon, parseFloat(place.lat), parseFloat(place.lon));
                    return {
                        city: place.name,
                        state: place.address.state,
                        country: place.address.country || "",
                        latitude: parseFloat(place.lat),
                        longitude: parseFloat(place.lon),
                        distance,
                        weather: undefined,
                    };
                })
                    .filter((location) => location.distance <= radius);
                allLocations.push(...locations);
            }
            // Try a second search specifically for villages
            const villageResponse = await axios_1.default.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    format: "json",
                    "accept-language": "en",
                    addressdetails: 1,
                    limit: 50,
                    q: "[place=village]",
                    viewbox: bbox,
                    bounded: 1,
                },
                headers: {
                    "User-Agent": "TravelTracer/1.0",
                },
            });
            if (villageResponse.data && Array.isArray(villageResponse.data)) {
                const villageLocations = villageResponse.data
                    .filter((place) => place.class === "place" && place.type === "village")
                    .map((place) => {
                    const distance = this.calculateDistance(lat, lon, parseFloat(place.lat), parseFloat(place.lon));
                    return {
                        city: place.name,
                        state: place.address.state,
                        country: place.address.country || "",
                        latitude: parseFloat(place.lat),
                        longitude: parseFloat(place.lon),
                        distance,
                        weather: undefined,
                    };
                })
                    .filter((location) => location.distance <= radius);
                allLocations.push(...villageLocations);
            }
            // After getting locations, calculate driving distances
            const locationsWithDrivingDistance = await this.addDrivingDistances(lat, lon, allLocations);
            // Remove duplicates and sort by distance
            const uniqueLocations = this.removeDuplicates(locationsWithDrivingDistance);
            console.log(`Found ${uniqueLocations.length} unique cities within ${radius}km radius`);
            // Cache the results before returning
            this.cacheService.set(cacheKey, uniqueLocations, 3600); // Cache for 1 hour
            return uniqueLocations.sort((a, b) => a.distance - b.distance);
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                console.error("Location Search Error:", {
                    status: (_a = error.response) === null || _a === void 0 ? void 0 : _a.status,
                    data: (_b = error.response) === null || _b === void 0 ? void 0 : _b.data,
                    message: error.message,
                });
            }
            throw new Error("Failed to fetch nearby cities");
        }
    }
    calculateBBox(lat, lon, radius) {
        // Convert radius from km to degrees (approximate)
        const latDelta = radius / 111.32; // 1 degree of latitude is approximately 111.32 km
        const lonDelta = radius / (111.32 * Math.cos((lat * Math.PI) / 180));
        const minLon = lon - lonDelta;
        const minLat = lat - latDelta;
        const maxLon = lon + lonDelta;
        const maxLat = lat + latDelta;
        // Format: <min_lon>,<min_lat>,<max_lon>,<max_lat>
        return `${minLon},${minLat},${maxLon},${maxLat}`;
    }
    removeDuplicates(locations) {
        const seen = new Map();
        locations.forEach((location) => {
            var _a;
            const key = `${location.city.toLowerCase()}-${((_a = location.state) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || ""}-${location.country.toLowerCase()}`;
            const existing = seen.get(key);
            if (!existing || location.distance < existing.distance) {
                seen.set(key, location);
            }
        });
        return Array.from(seen.values());
    }
    async getWeather(lat, lon, date) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const cacheKey = CacheService_1.CacheService.generateKey("weather", lat.toString(), lon.toString(), date || "current");
        const cachedWeather = await this.cacheService.get(cacheKey);
        if (cachedWeather) {
            console.log("Returning cached weather");
            return cachedWeather;
        }
        try {
            if (!date) {
                // Get current weather
                const response = await axios_1.default.get(`http://api.weatherapi.com/v1/current.json`, {
                    params: {
                        key: this.weatherApiKey,
                        q: `${lat},${lon}`,
                    },
                });
                if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.current)) {
                    throw new Error("Invalid response from Weather API");
                }
                return {
                    temperature: response.data.current.temp_c,
                    condition: response.data.current.condition.text,
                };
            }
            const today = new Date();
            const targetDate = new Date(date);
            const diffTime = targetDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 14) {
                throw new Error("Can only fetch weather up to 14 days in the future");
            }
            if (diffDays > 0) {
                // Get future forecast
                const response = await axios_1.default.get(`http://api.weatherapi.com/v1/forecast.json`, {
                    params: {
                        key: this.weatherApiKey,
                        q: `${lat},${lon}`,
                        days: diffDays + 1,
                        dt: date,
                    },
                });
                if (!((_d = (_c = (_b = response.data) === null || _b === void 0 ? void 0 : _b.forecast) === null || _c === void 0 ? void 0 : _c.forecastday) === null || _d === void 0 ? void 0 : _d[0])) {
                    throw new Error("Invalid response from Weather API");
                }
                const forecast = response.data.forecast.forecastday[0];
                return {
                    temperature: forecast.day.avgtemp_c,
                    condition: forecast.day.condition.text,
                    date: forecast.date,
                };
            }
            else {
                // Get historical weather
                const response = await axios_1.default.get(`http://api.weatherapi.com/v1/history.json`, {
                    params: {
                        key: this.weatherApiKey,
                        q: `${lat},${lon}`,
                        dt: date,
                    },
                });
                if (!((_h = (_g = (_f = (_e = response.data) === null || _e === void 0 ? void 0 : _e.history) === null || _f === void 0 ? void 0 : _f.forecast) === null || _g === void 0 ? void 0 : _g.forecastday) === null || _h === void 0 ? void 0 : _h[0])) {
                    throw new Error("Invalid response from Weather API");
                }
                const history = response.data.history.forecast.forecastday[0];
                return {
                    temperature: history.day.avgtemp_c,
                    condition: history.day.condition.text,
                    date: history.date,
                };
            }
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                console.error("Weather API Error:", {
                    status: (_j = error.response) === null || _j === void 0 ? void 0 : _j.status,
                    data: (_k = error.response) === null || _k === void 0 ? void 0 : _k.data,
                    message: error.message,
                });
            }
            throw new Error("Failed to fetch weather data");
        }
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) *
                Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }
    async addDrivingDistances(originLat, originLon, locations) {
        const cacheKey = CacheService_1.CacheService.generateKey("distances", originLat.toString(), originLon.toString(), locations.map((l) => `${l.latitude},${l.longitude}`).join(","));
        const cachedDistances = await this.cacheService.get(cacheKey) || [];
        if (cachedDistances.length > 0) {
            console.log("Returning cached distances");
            return cachedDistances;
        }
        try {
            // Google Maps API has a limit of 25 destinations per request
            const batchSize = 25;
            const batches = [];
            for (let i = 0; i < locations.length; i += batchSize) {
                batches.push(locations.slice(i, i + batchSize));
            }
            const locationsWithDrivingDistance = [];
            for (const batch of batches) {
                const destinations = batch
                    .map((loc) => `${loc.latitude},${loc.longitude}`)
                    .join("|");
                const response = await axios_1.default.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
                    params: {
                        origins: `${originLat},${originLon}`,
                        destinations: destinations,
                        mode: "driving",
                        key: this.googleMapsKey,
                    },
                });
                console.log("Google Distance Response:", response.data);
                if (response.data.status === "OK") {
                    batch.forEach((location, index) => {
                        const element = response.data.rows[0].elements[index];
                        if (element.status === "OK") {
                            locationsWithDrivingDistance.push(Object.assign(Object.assign({}, location), { distance: Math.round(element.distance.value / 1000), straightLineDistance: this.calculateDistance(originLat, originLon, location.latitude, location.longitude) }));
                        }
                        else {
                            // Fallback to straight-line distance if driving route not found
                            locationsWithDrivingDistance.push(Object.assign(Object.assign({}, location), { distance: this.calculateDistance(originLat, originLon, location.latitude, location.longitude) }));
                        }
                    });
                }
                // Add delay to respect rate limits
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            this.cacheService.set(cacheKey, locationsWithDrivingDistance, 86400); // Cache for 24 hours
            return locationsWithDrivingDistance;
        }
        catch (error) {
            console.error("Error calculating driving distances:", error);
            // Fallback to straight-line distances if Google Maps API fails
            return locations.map((location) => (Object.assign(Object.assign({}, location), { distance: this.calculateDistance(originLat, originLon, location.latitude, location.longitude) })));
        }
    }
}
exports.OpenWeatherApi = OpenWeatherApi;
