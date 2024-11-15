"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationService = void 0;
const CacheService_1 = require("../../infrastructure/services/CacheService");
class LocationService {
    constructor(locationRepository, weatherApi) {
        this.locationRepository = locationRepository;
        this.weatherApi = weatherApi;
        this.cacheService = new CacheService_1.CacheService();
    }
    async findLocations(params) {
        const cacheKey = CacheService_1.CacheService.generateKey('locations', params.latitude.toString(), params.longitude.toString(), params.radius.toString(), params.weatherCondition || 'none', params.date || 'current');
        const cachedResults = await this.cacheService.get(cacheKey);
        if (cachedResults) {
            console.log('Returning cached results');
            return cachedResults;
        }
        console.log("Finding locations with params:", params);
        const locations = await this.locationRepository.findWithinRadius(params.latitude, params.longitude, params.radius);
        console.log("Found initial locations:", locations);
        if (params.weatherCondition) {
            console.log("Filtering by weather condition:", params.weatherCondition);
            const locationsWithWeather = await Promise.allSettled(locations.map(async (location) => {
                try {
                    const weather = await this.weatherApi.getWeather(location.latitude, location.longitude);
                    console.log(`Weather for ${location.city}:`, weather);
                    return Object.assign(Object.assign({}, location), { weather });
                }
                catch (error) {
                    console.error(`Failed to fetch weather for ${location.city}:`, error);
                    return null;
                }
            }));
            console.log("All weather results:", locationsWithWeather);
            const requestedCondition = params.weatherCondition
                .replace(/"/g, '')
                .toLowerCase()
                .trim();
            const filteredLocations = locationsWithWeather
                .filter((result) => result.status === "fulfilled")
                .map((result) => result.value)
                .filter((location) => {
                if (!location || !location.weather)
                    return false;
                const actualCondition = location.weather.condition.toLowerCase().trim();
                console.log(`Comparing weather for ${location.city}:`, {
                    requested: requestedCondition,
                    actual: actualCondition,
                    matches: actualCondition.includes(requestedCondition)
                });
                return actualCondition.includes(requestedCondition);
            });
            console.log("Filtered locations by weather:", filteredLocations);
            // Cache the final results
            this.cacheService.set(cacheKey, filteredLocations, 900); // Cache for 15 minutes
            return filteredLocations;
        }
        return locations;
    }
}
exports.LocationService = LocationService;
