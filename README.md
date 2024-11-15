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