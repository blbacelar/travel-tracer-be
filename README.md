# Travel Tracer Backend

A Node.js/Express backend service that helps users find cities within a specified radius and filter them by weather conditions.

## Features

- Find cities within a specified radius from given coordinates
- Filter cities by current or forecasted weather conditions
- Calculate driving distances between locations
- Cache responses using Redis for improved performance
- Support for both current and future weather conditions (up to 14 days ahead)

## Tech Stack

- **Node.js** - Runtime environment
- **TypeScript** - Programming language
- **Express** - Web framework
- **Redis** - Caching
- **WeatherAPI.com** - Weather data provider
- **Nominatim** - Geocoding service
- **Google Maps API** - Driving distance calculations
- **Zod** - Input validation

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Redis (local or cloud instance)
- API keys for:
  - WeatherAPI.com
  - Google Maps Platform
  - Redis Cloud account

## Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

# Weather API Keys

WEATHER_API_KEY=your_weatherapi_key # WeatherAPI.com API key
OPENWEATHER_API_KEY=your_openweather_key # OpenWeather API key (if needed)
OPENWEATHER_GEOCODING_API_KEY=your_geocoding_key # OpenWeather Geocoding API key (if needed)

# Google Maps

GOOGLE_MAPS_API_KEY=your_google_maps_key # For calculating driving distances

# Server Configuration

PORT=3000 # Application port

# Redis Configuration

REDIS_PASSWORD=your_redis_password # Redis Cloud password
REDIS_HOST=your_redis_host # Redis Cloud host (e.g., redis-xxxxx.xxxx.region.cloud.redislabs.com)
REDIS_PORT=14158 # Redis Cloud port

# Optional: Alternative Redis URL format

REDIS_URL=redis://default:password@hostname:port # Alternative Redis connection string

# Optional: Image Service (if needed)

UNSPLASH_ACCESS_KEY=your_unsplash_access_key # Unsplash API access key
UNSPLASH_SECRET_KEY=your_unsplash_secret_key # Unsplash API secret key
