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

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY!;
    this.geocodingApiKey = process.env.OPENWEATHER_GEOCODING_API_KEY!;
    if (!this.apiKey || !this.geocodingApiKey) {
      throw new Error("OpenWeather API keys are not configured");
    }
  }

  async findNearbyCities(lat: number, lon: number, radius: number = 100): Promise<Location[]> {
    try {
      const cities: Location[] = [];
      const searchPoints = this.generateSearchPoints(lat, lon, radius);
      
      // Search for cities at each point
      for (const point of searchPoints) {
        try {
          // Try direct geocoding first
          const directResponse = await axios.get<GeocodingResponse[]>(`${this.geoUrl}/direct`, {
            params: {
              q: "city",
              lat: point.lat,
              lon: point.lon,
              limit: 5,
              appid: this.geocodingApiKey,
            },
          });

          // Then try reverse geocoding
          const reverseResponse = await axios.get<GeocodingResponse[]>(`${this.geoUrl}/reverse`, {
            params: {
              lat: point.lat,
              lon: point.lon,
              limit: 5,
              appid: this.geocodingApiKey,
            },
          });

          const locations = [...directResponse.data, ...reverseResponse.data];
          
          for (const location of locations) {
            const distance = this.calculateDistance(lat, lon, location.lat, location.lon);
            if (distance <= radius) {
              cities.push({
                city: `${location.name}${location.state ? `, ${location.state}` : ''}, ${location.country}`,
                latitude: location.lat,
                longitude: location.lon,
                distance: Math.round(distance),
                weather: undefined
              });
            }
          }
        } catch (error) {
          console.error(`Failed to fetch cities for point ${point.lat},${point.lon}:`, error);
        }
      }

      // Add known major cities in the area
      const knownCities = this.getKnownCities(lat, lon);
      for (const city of knownCities) {
        const distance = this.calculateDistance(lat, lon, city.latitude, city.longitude);
        if (distance <= radius) {
          cities.push({
            ...city,
            distance: Math.round(distance)
          });
        }
      }

      // Remove duplicates
      const uniqueCities = this.removeDuplicates(cities);
      console.log(`Found ${uniqueCities.length} unique cities within ${radius}km radius`);
      
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

  private generateSearchPoints(centerLat: number, centerLon: number, radius: number): Array<{lat: number, lon: number}> {
    const points: Array<{lat: number, lon: number}> = [];
    const gridSize = Math.ceil(radius / 50); // One point every 50km
    const latDelta = radius / 111.32; // Convert km to degrees latitude
    const lonDelta = radius / (111.32 * Math.cos(centerLat * Math.PI / 180)); // Adjust for longitude

    for (let i = -gridSize; i <= gridSize; i++) {
      for (let j = -gridSize; j <= gridSize; j++) {
        const lat = centerLat + (i * latDelta / gridSize);
        const lon = centerLon + (j * lonDelta / gridSize);
        points.push({ lat, lon });
      }
    }

    return points;
  }

  private getKnownCities(lat: number, lon: number): Location[] {
    // Add known major cities based on the region
    // Example for Calgary area
    if (lat > 50 && lat < 52 && lon > -115 && lon < -113) {
      return [
        { city: "Calgary, CA", latitude: 51.0447, longitude: -114.0719, distance: 0 },
        { city: "Airdrie, CA", latitude: 51.2927, longitude: -114.0134, distance: 0 },
        { city: "Cochrane, CA", latitude: 51.1897, longitude: -114.4667, distance: 0 },
        { city: "Chestermere, CA", latitude: 51.0500, longitude: -113.8219, distance: 0 },
        { city: "Okotoks, CA", latitude: 50.7250, longitude: -113.9747, distance: 0 },
        { city: "Strathmore, CA", latitude: 51.0378, longitude: -113.4000, distance: 0 }
      ];
    }
    return [];
  }

  private removeDuplicates(cities: Location[]): Location[] {
    const seen = new Set<string>();
    return cities.filter(city => {
      const key = `${city.city}-${city.latitude.toFixed(4)}-${city.longitude.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  async getWeather(lat: number, lon: number): Promise<Location['weather']> {
    try {
      const response = await axios.get<WeatherResponse>(`${this.weatherUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: "metric",
        },
      });

      if (!response.data || !response.data.weather || !response.data.weather[0]) {
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
