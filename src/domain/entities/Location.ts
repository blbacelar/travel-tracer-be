export interface Location {
  city: string;
  latitude: number;
  longitude: number;
  weather?: {
    temperature: number;
    condition: string;
  };
  distance: number;
}

export interface LocationSearchParams {
  latitude: number;
  longitude: number;
  radius: number;
  weatherCondition?: string;
} 