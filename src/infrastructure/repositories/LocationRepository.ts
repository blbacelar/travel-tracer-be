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
    
    // Get nearby cities from OpenWeather Geocoding API
    const cities = await this.weatherApi.findNearbyCities(latitude, longitude, radius);
    
    // Calculate distances and filter by radius
    const citiesWithDistance = cities
      .map(city => ({
        ...city,
        distance: this.calculateDistance(
          latitude,
          longitude,
          city.latitude,
          city.longitude
        )
      }))
      .filter(city => city.distance <= radius)
      .sort((a, b) => a.distance - b.distance); // Sort by distance

    console.log(`Found ${citiesWithDistance.length} cities within ${radius}km radius`);
    return citiesWithDistance;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
      Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c); // Distance in kilometers, rounded
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
} 