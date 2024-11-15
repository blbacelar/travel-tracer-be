export interface Location {
  city: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  weather?: {
    temperature: number;
    condition: string;
    date?: string;
  };
  distance: number;
  straightLineDistance?: number;
}

export interface LocationSearchParams {
  latitude: number;
  longitude: number;
  radius: number;
  weatherCondition?: string;
  date?: string;
} 