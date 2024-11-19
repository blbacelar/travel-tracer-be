export interface Weather {
  temperature: number;
  condition: string;
  date?: string;
}

export interface Location {
  city: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  distance: number;
  weather?: Weather;
}

export interface SearchParams {
  latitude: number;
  longitude: number;
  radius: number;
  weatherCondition?: string;
  date?: string;
} 