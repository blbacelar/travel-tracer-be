"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationRepository = void 0;
class LocationRepository {
    constructor(weatherApi) {
        this.weatherApi = weatherApi;
    }
    async findWithinRadius(latitude, longitude, radius) {
        console.log('Searching for cities within', radius, 'km of', latitude, longitude);
        // Get nearby cities from OpenWeather Geocoding API with driving distances
        const cities = await this.weatherApi.findNearbyCities(latitude, longitude, radius);
        // Filter by radius and sort by driving distance
        const filteredCities = cities
            .filter(city => city.distance <= radius)
            .sort((a, b) => a.distance - b.distance);
        console.log(`Found ${filteredCities.length} cities within ${radius}km driving distance`);
        return filteredCities;
    }
}
exports.LocationRepository = LocationRepository;
