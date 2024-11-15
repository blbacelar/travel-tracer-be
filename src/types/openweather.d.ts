export namespace OpenWeather {
  export interface WeatherResponse {
    main: {
      temp: number;
    };
    weather: Array<{
      main: string;
      description: string;
    }>;
  }
} 