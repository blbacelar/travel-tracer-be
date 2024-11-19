import { getCache, setCache } from "./cacheService";
import { getWeather, findNearbyCities } from "./weatherService";
import { Location, SearchParams, Weather } from "../utils/types";

interface LocationWithWeather extends Location {
  weather: Weather;
}

export async function searchLocations(
  params: SearchParams
): Promise<Location[]> {
  const cacheKey = `locations:${params.latitude}:${params.longitude}:${
    params.radius
  }:${params.weatherCondition || "none"}`;

  try {
    // Try cache first, but don't fail if cache is unavailable
    const cached = await getCache<Location[]>(cacheKey);
    if (cached) return cached;
  } catch (error) {
    console.error('Cache error:', error);
    // Continue without cache
  }

  // Get locations
  let locations = await findNearbyCities(
    params.latitude,
    params.longitude,
    params.radius
  );

  // Filter by weather if needed
  if (params.weatherCondition) {
    locations = await filterByWeather(locations, params.weatherCondition);
  }

  // Try to cache results, but don't fail if cache is unavailable
  try {
    await setCache(cacheKey, locations, 3600); // 1 hour cache
  } catch (error) {
    console.error('Cache set error:', error);
    // Continue without cache
  }

  return locations;
}

async function filterByWeather(
  locations: Location[],
  condition: string
): Promise<Location[]> {
  const weatherPromises = locations.map(async (location) => {
    try {
      const weather = await getWeather(location.latitude, location.longitude);
      return {
        ...location,
        weather,
      };
    } catch (error) {
      console.error(`Weather fetch failed for ${location.city}:`, error);
      return null;
    }
  });

  const locationsWithWeather = (await Promise.all(weatherPromises)).filter(
    (loc): loc is LocationWithWeather =>
      loc !== null &&
      loc.weather !== undefined &&
      loc.weather.condition.toLowerCase().includes(condition.toLowerCase())
  );

  return locationsWithWeather;
}
