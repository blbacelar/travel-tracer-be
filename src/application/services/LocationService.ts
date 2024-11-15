import { Location, LocationSearchParams } from "@/domain/entities/Location";
import { ILocationRepository } from "@/domain/repositories/ILocationRepository";
import { OpenWeatherApi } from "@/infrastructure/api/openWeatherApi";

export class LocationService {
  constructor(
    private readonly locationRepository: ILocationRepository,
    private readonly weatherApi: OpenWeatherApi
  ) {}

  async findLocations(params: LocationSearchParams): Promise<Location[]> {
    console.log("Finding locations with params:", params);

    const locations = await this.locationRepository.findWithinRadius(
      params.latitude,
      params.longitude,
      params.radius
    );

    console.log("Found locations:", locations);

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

      const filteredLocations = locationsWithWeather
        .filter(
          (
            result
          ): result is PromiseFulfilledResult<LocationWithWeather | null> =>
            result.status === "fulfilled"
        )
        .map((result) => result.value)
        .filter(
          (location): location is LocationWithWeather =>
            location !== null &&
            location.weather.condition.toLowerCase() ===
              params.weatherCondition?.toLowerCase()
        );

      console.log("Filtered locations by weather:", filteredLocations);
      return filteredLocations;
    }

    return locations;
  }
}
