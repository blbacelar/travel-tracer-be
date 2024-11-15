import { Location, LocationSearchParams } from "../../domain/entities/Location";
import { ILocationRepository } from "../../domain/repositories/ILocationRepository";
import { OpenWeatherApi } from "../../infrastructure/api/openWeatherApi";
import { CacheService } from "../../infrastructure/services/CacheService";

export class LocationService {
  private readonly cacheService: CacheService;

  constructor(
    private readonly locationRepository: ILocationRepository,
    private readonly weatherApi: OpenWeatherApi
  ) {
    this.cacheService = new CacheService();
  }

  async findLocations(params: LocationSearchParams): Promise<Location[]> {
    const cacheKey = CacheService.generateKey(
      'locations',
      params.latitude.toString(),
      params.longitude.toString(),
      params.radius.toString(),
      params.weatherCondition || 'none',
      params.date || 'current'
    );

    const cachedResults = await this.cacheService.get<Location[]>(cacheKey);
    if (cachedResults) {
      console.log('Returning cached results');
      return cachedResults;
    }

    console.log("Finding locations with params:", params);

    const locations = await this.locationRepository.findWithinRadius(
      params.latitude,
      params.longitude,
      params.radius
    );

    console.log("Found initial locations:", locations);

    if (params.weatherCondition) {
      console.log("Filtering by weather condition:", params.weatherCondition);

      type LocationWithWeather = Location & {
        weather: NonNullable<Location["weather"]>;
      };

      const locationsWithWeather = await Promise.allSettled(
        locations.map(async (location: Location) => {
          try {
            const weather = await this.weatherApi.getWeather(
              location.latitude,
              location.longitude
            );
            console.log(`Weather for ${location.city}:`, weather);
            return {
              ...location,
              weather,
            } as LocationWithWeather;
          } catch (error) {
            console.error(
              `Failed to fetch weather for ${location.city}:`,
              error
            );
            return null;
          }
        })
      );

      console.log("All weather results:", locationsWithWeather);

      const requestedCondition = params.weatherCondition
        .replace(/"/g, '')
        .toLowerCase()
        .trim();

      const filteredLocations = locationsWithWeather
        .filter(
          (result): result is PromiseFulfilledResult<LocationWithWeather | null> =>
            result.status === "fulfilled"
        )
        .map((result) => result.value)
        .filter((location): location is LocationWithWeather => {
          if (!location || !location.weather) return false;
          
          const actualCondition = location.weather.condition.toLowerCase().trim();
          
          console.log(`Comparing weather for ${location.city}:`, {
            requested: requestedCondition,
            actual: actualCondition,
            matches: actualCondition.includes(requestedCondition)
          });

          return actualCondition.includes(requestedCondition);
        });

      console.log("Filtered locations by weather:", filteredLocations);
      
      // Cache the filtered results
      await this.cacheService.set(cacheKey, filteredLocations, 900); // Cache for 15 minutes
      return filteredLocations;
    }

    return locations;
  }
}
