import axios from "axios";
import { Location, Weather } from "../utils/types";
import { getCache, setCache } from "./cacheService";
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
if (!WEATHER_API_KEY) {
  console.error(
    "[Weather Service] WEATHER_API_KEY is not configured in environment variables.",
    "Available environment variables:",
    Object.keys(process.env)
  );
  throw new Error("WEATHER_API_KEY is required");
}

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface WeatherApiResponse {
  current?: {
    temp_c: number;
    condition: {
      text: string;
    };
  };
  forecast?: {
    forecastday: Array<{
      date: string;
      day: {
        avgtemp_c: number;
        condition: {
          text: string;
        };
      };
    }>;
  };
}

interface NominatimResponse {
  name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
  type: string;
  class: string;
}

// Add Google Maps API types
interface GoogleDistanceResponse {
  rows: [{
    elements: [{
      status: string;
      distance?: {
        value: number;  // distance in meters
        text: string;
      };
      duration?: {
        value: number;  // duration in seconds
        text: string;
      };
    }];
  }];
  status: string;
}

async function testWeatherApiKey() {
  try {
    const testUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=London`;
    const response = await axios.get(testUrl);
    console.log('[Weather Service] API Key test successful');
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[Weather Service] API Key test failed:', {
        status: error.response?.status,
        message: error.response?.data?.error?.message || error.message
      });
    }
    return false;
  }
}

if (WEATHER_API_KEY) {
  testWeatherApiKey().then(isValid => {
    if (!isValid) {
      console.error('[Weather Service] Weather API key validation failed');
    }
  });
}

export async function getWeather(
  latitude: number,
  longitude: number,
  date?: string
): Promise<Weather> {
  console.log(
    `[Weather Service] Fetching weather for coordinates: ${latitude}, ${longitude}, date: ${
      date || "current"
    }`
  );
  console.log(
    "[Weather Service] Using API key:",
    WEATHER_API_KEY?.substring(0, 5) + "..."
  );

  const cacheKey = `weather:${latitude}:${longitude}:${date || "current"}`;

  // Try cache first
  const cached = await getCache<Weather>(cacheKey);
  if (cached) {
    console.log("[Weather Service] Returning cached weather data:", cached);
    return cached;
  }

  try {
    if (!date) {
      const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&aqi=no`;
      console.log("[Weather Service] Fetching current weather from:", url);

      const response = await axios.get<WeatherApiResponse>(url);

      console.log(
        "[Weather Service] Raw API Response:",
        JSON.stringify(response.data, null, 2)
      );

      if (!response.data?.current) {
        console.error(
          "[Weather Service] Invalid API response structure:",
          response.data
        );
        throw new Error("Invalid weather API response");
      }

      const weather = {
        temperature: response.data.current.temp_c,
        condition: response.data.current.condition.text,
      };

      console.log("[Weather Service] Processed weather data:", weather);
      await setCache(cacheKey, weather, 1800);
      return weather;
    }

    const forecastUrl = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&dt=${date}&days=1`;
    console.log(
      "[Weather Service] Fetching forecast weather from:",
      forecastUrl
    );

    const response = await axios.get<WeatherApiResponse>(forecastUrl);

    console.log(
      "[Weather Service] Raw Forecast Response:",
      JSON.stringify(response.data, null, 2)
    );

    if (!response.data?.forecast?.forecastday?.[0]) {
      console.error(
        "[Weather Service] Invalid forecast response structure:",
        response.data
      );
      throw new Error("Invalid forecast API response");
    }

    const forecast = response.data.forecast.forecastday[0];
    const weather = {
      temperature: forecast.day.avgtemp_c,
      condition: forecast.day.condition.text,
      date: forecast.date,
    };

    console.log("[Weather Service] Processed forecast data:", weather);
    await setCache(cacheKey, weather, 3600);
    return weather;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("[Weather Service] API Error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        params: error.config?.params,
        headers: error.response?.headers,
      });
    } else {
      console.error("[Weather Service] Non-Axios Error:", error);
    }
    throw new Error("Failed to fetch weather data");
  }
}

export async function findNearbyCities(
  latitude: number,
  longitude: number,
  radius: number = 100
): Promise<Location[]> {
  console.log(
    `[Location Service] Finding cities near: ${latitude}, ${longitude}, radius: ${radius}km`
  );

  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY is required for distance calculations");
  }

  const cacheKey = `cities:${latitude}:${longitude}:${radius}`;

  const cached = await getCache<Location[]>(cacheKey);
  if (cached) {
    console.log(`[Location Service] Returning ${cached.length} cached cities`);
    return cached;
  }

  try {
    const bbox = calculateBBox(latitude, longitude, radius);
    console.log("[Location Service] Using bounding box:", bbox);

    // Multiple search queries to get different types of settlements
    const searchQueries = [
      { q: "[place=city]", type: "city" },
      { q: "[place=town]", type: "town" },
      { q: "[place=village]", type: "village" },
      { q: "[place=suburb]", type: "suburb" }
    ];

    let allResults: NominatimResponse[] = [];

    for (const query of searchQueries) {
      try {
        console.log(`[Location Service] Searching for ${query.type}s...`);
        const response = await axios.get<NominatimResponse[]>(
          "https://nominatim.openstreetmap.org/search",
          {
            params: {
              format: "json",
              "accept-language": "en",
              addressdetails: 1,
              limit: 50,
              q: query.q,
              viewbox: bbox,
              bounded: 1,
            },
            headers: {
              "User-Agent": "TravelTracer/1.0 (contact@traveltracer.com)"
            },
          }
        );

        console.log(`[Location Service] Found ${response.data.length} ${query.type}s`);
        allResults = [...allResults, ...response.data];

        // Add delay between requests to respect Nominatim's rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Location Service] Error searching for ${query.type}s:`, error);
      }
    }

    console.log(`[Location Service] Total raw results: ${allResults.length}`);

    // Process and filter locations
    const initialLocations = allResults
      .filter((place) => {
        const isValid = place.class === "place" && 
                       ["city", "town", "village", "suburb"].includes(place.type) &&
                       place.address &&
                       (place.address.city || place.address.town || place.address.village || place.name);
        
        if (!isValid) {
          console.log(
            `[Location Service] Filtered out: ${place.name} (${place.class}/${place.type})`
          );
        }
        return isValid;
      })
      .map((place) => {
        const cityName = place.address.city || place.address.town || place.address.village || place.name;
        console.log(`[Location Service] Processing location: ${cityName}`);
        
        return {
          city: cityName,
          state: place.address.state,
          country: place.address.country || "",
          latitude: parseFloat(place.lat),
          longitude: parseFloat(place.lon),
          distance: 0, // Will be updated with actual driving distance
        };
      });

    console.log(`[Location Service] Processed ${initialLocations.length} locations`);

    if (initialLocations.length === 0) {
      console.error("[Location Service] No locations found in initial search");
      return [];
    }

    // Calculate driving distances using Google Distance Matrix API
    const locations = await calculateDrivingDistances(
      { lat: latitude, lng: longitude },
      initialLocations
    );

    console.log(`[Location Service] Calculated distances for ${locations.length} locations`);

    // Filter locations by driving distance
    const filteredLocations = locations.filter(location => {
      const withinRadius = location.distance <= radius;
      if (!withinRadius) {
        console.log(`[Location Service] Filtered out ${location.city} - too far (${location.distance}km)`);
      }
      return withinRadius;
    });

    // Remove duplicates and sort by distance
    const uniqueLocations = removeDuplicates(filteredLocations);
    
    console.log(
      `[Location Service] Final results: ${uniqueLocations.length} unique locations within ${radius}km driving distance`
    );

    // Add weather data to each location
    console.log('[Location Service] Fetching weather data for locations...');
    const locationsWithWeather = await Promise.all(
      uniqueLocations.map(async (location) => {
        try {
          const weather = await getWeather(location.latitude, location.longitude);
          return {
            ...location,
            weather
          };
        } catch (error) {
          console.error(`[Location Service] Failed to fetch weather for ${location.city}:`, error);
          return {
            ...location,
            weather: undefined
          };
        }
      })
    );

    console.log(
      `[Location Service] Added weather data to ${locationsWithWeather.length} locations`
    );

    // Cache results if we found any
    if (locationsWithWeather.length > 0) {
      await setCache(cacheKey, locationsWithWeather, 3600);
    }

    return locationsWithWeather.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("[Location Service] API Error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        params: error.config?.params,
      });
    } else {
      console.error("[Location Service] Error:", error);
    }
    throw new Error("Failed to fetch nearby cities");
  }
}

async function calculateDrivingDistances(
  origin: { lat: number; lng: number },
  locations: Location[]
): Promise<Location[]> {
  // Check if we have a valid Google Maps API key
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'your_google_maps_key_here') {
    console.log('[Location Service] No valid Google Maps API key, falling back to straight-line distance');
    return locations.map(location => ({
      ...location,
      distance: calculateDistance(
        origin.lat,
        origin.lng,
        location.latitude,
        location.longitude
      )
    }));
  }

  // Process in batches of 25 (Google's limit per request)
  const batchSize = 25;
  const updatedLocations: Location[] = [];

  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    
    try {
      const response = await axios.get<GoogleDistanceResponse>(
        'https://maps.googleapis.com/maps/api/distancematrix/json',
        {
          params: {
            origins: `${origin.lat},${origin.lng}`,
            destinations: batch
              .map(loc => `${loc.latitude},${loc.longitude}`)
              .join('|'),
            mode: 'driving',
            key: GOOGLE_MAPS_API_KEY
          }
        }
      );

      if (response.data.status === 'OK') {
        batch.forEach((location, index) => {
          const element = response.data.rows[0].elements[index];
          if (element.status === 'OK' && element.distance) {
            // Convert meters to kilometers and round to nearest integer
            const distanceKm = Math.round(element.distance.value / 1000);
            updatedLocations.push({
              ...location,
              distance: distanceKm
            });
          } else {
            // Fallback to straight-line distance if driving route not found
            const straightLineDistance = calculateDistance(
              origin.lat,
              origin.lng,
              location.latitude,
              location.longitude
            );
            updatedLocations.push({
              ...location,
              distance: straightLineDistance
            });
          }
        });
      } else {
        throw new Error(`Google Distance Matrix API returned status: ${response.data.status}`);
      }

      // Add a small delay between batches to respect rate limits
      if (i + batchSize < locations.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('[Location Service] Distance Matrix API Error:', error);
      // Fallback to straight-line distance for this batch
      batch.forEach(location => {
        const straightLineDistance = calculateDistance(
          origin.lat,
          origin.lng,
          location.latitude,
          location.longitude
        );
        updatedLocations.push({
          ...location,
          distance: straightLineDistance
        });
      });
    }
  }

  return updatedLocations;
}

function calculateBBox(lat: number, lon: number, radius: number): string {
  const kmPerLat = 111.32; // kilometers per degree of latitude
  const kmPerLon = 111.32 * Math.cos(lat * Math.PI / 180); // kilometers per degree of longitude
  
  const latChange = radius / kmPerLat;
  const lonChange = radius / kmPerLon;
  
  const minLon = lon - lonChange;
  const minLat = lat - latChange;
  const maxLon = lon + lonChange;
  const maxLat = lat + latChange;
  
  // Format: <min_lon>,<min_lat>,<max_lon>,<max_lat>
  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

function calculateDistance(
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
  return Math.round(R * c);
}

function removeDuplicates(locations: Location[]): Location[] {
  const seen = new Map<string, Location>();

  locations.forEach((location) => {
    const key = `${location.city.toLowerCase()}-${
      location.state?.toLowerCase() || ""
    }-${location.country.toLowerCase()}`;
    const existing = seen.get(key);

    if (!existing || location.distance < existing.distance) {
      seen.set(key, location);
    }
  });

  return Array.from(seen.values());
}
