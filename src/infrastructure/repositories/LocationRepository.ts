import { ILocationRepository } from '@/domain/repositories/ILocationRepository';
import { Location } from '@/domain/entities/Location';
import { OpenWeatherApi } from '../api/openWeatherApi';

export class LocationRepository implements ILocationRepository {
  constructor(private readonly weatherApi: OpenWeatherApi) {}

  async findWithinRadius(
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<Location[]> {
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