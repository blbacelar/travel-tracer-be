import axios from "axios";
import { Location } from "@/domain/entities/Location";

interface GeocodingResponse {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

interface WeatherResponse {
  main: {
    temp: number;
  };
  weather: Array<{
    main: string;
    description: string;
  }>;
}

export class OpenWeatherApi {
  private readonly weatherUrl = "https://api.openweathermap.org/data/2.5";
  private readonly geoUrl = "http://api.openweathermap.org/geo/1.0";
  private readonly apiKey: string;
  private readonly geocodingApiKey: string;

  // Map of country codes to full names
  private readonly countryNames: { [key: string]: string } = {
    CA: "Canada",
    US: "United States",
    MX: "Mexico",
    GB: "United Kingdom",
    FR: "France",
    DE: "Germany",
    IT: "Italy",
    ES: "Spain",
    BR: "Brazil",
    AU: "Australia",
    JP: "Japan",
    CN: "China",
    IN: "India",
  };

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY!;
    this.geocodingApiKey = process.env.OPENWEATHER_GEOCODING_API_KEY!;
    if (!this.apiKey || !this.geocodingApiKey) {
      throw new Error("OpenWeather API keys are not configured");
    }
  }

  async findNearbyCities(
    lat: number,
    lon: number,
    radius: number = 100
  ): Promise<Location[]> {
    try {
      const cities: Location[] = [];
      const searchPoints = this.generateSearchPoints(lat, lon, radius);

      for (const point of searchPoints) {
        try {
          // Get cities using reverse geocoding
          const response = await axios.get<GeocodingResponse[]>(
            `${this.geoUrl}/reverse`,
            {
              params: {
                lat: point.lat,
                lon: point.lon,
                limit: 10,
                appid: this.geocodingApiKey,
              },
            }
          );

          if (response.data && Array.isArray(response.data)) {
            for (const location of response.data) {
              const distance = this.calculateDistance(
                lat,
                lon,
                location.lat,
                location.lon
              );
              if (distance <= radius) {
                cities.push({
                  city: location.name,
                  state: location.state || undefined,
                  country:
                    this.countryNames[location.country] || location.country,
                  latitude: location.lat,
                  longitude: location.lon,
                  distance: Math.round(distance),
                  weather: undefined,
                });
              }
            }
          }
        } catch (error) {
          console.error(
            `Failed to fetch cities for point ${point.lat},${point.lon}:`,
            error
          );
        }
      }

      const uniqueCities = this.removeDuplicates(cities);
      console.log(
        `Found ${uniqueCities.length} unique cities within ${radius}km radius`
      );

      return uniqueCities.sort((a, b) => a.distance - b.distance);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("OpenWeather API Error:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
      throw new Error("Failed to fetch nearby cities");
    }
  }

  private generateSearchPoints(
    centerLat: number,
    centerLon: number,
    radius: number
  ): Array<{ lat: number; lon: number }> {
    const points: Array<{ lat: number; lon: number }> = [];
    const gridSize = Math.ceil(radius / 25); // One point every 25km for better coverage
    const latDelta = radius / 111.32; // Convert km to degrees latitude
    const lonDelta = radius / (111.32 * Math.cos((centerLat * Math.PI) / 180)); // Adjust for longitude

    // Add center point
    points.push({ lat: centerLat, lon: centerLon });

    // Add grid points
    for (let i = -gridSize; i <= gridSize; i++) {
      for (let j = -gridSize; j <= gridSize; j++) {
        if (i === 0 && j === 0) continue; // Skip center point as it's already added
        const lat = centerLat + (i * latDelta) / gridSize;
        const lon = centerLon + (j * lonDelta) / gridSize;
        points.push({ lat, lon });
      }
    }

    return points;
  }

  private removeDuplicates(cities: Location[]): Location[] {
    const seen = new Set<string>();
    return cities.filter((city) => {
      const key = `${city.city}-${city.state || ""}-${city.country}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async getWeather(lat: number, lon: number): Promise<Location["weather"]> {
    try {
      const response = await axios.get<WeatherResponse>(
        `${this.weatherUrl}/weather`,
        {
          params: {
            lat,
            lon,
            appid: this.apiKey,
            units: "metric",
          },
        }
      );

      if (
        !response.data ||
        !response.data.weather ||
        !response.data.weather[0]
      ) {
        throw new Error("Invalid response from OpenWeather API");
      }

      return {
        temperature: response.data.main.temp,
        condition: response.data.weather[0].main,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("OpenWeather API Error:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
      throw new Error("Failed to fetch weather data");
    }
  }
}
