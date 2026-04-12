export interface WeatherCurrent {
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
}

export interface WeatherForecastItem {
  date: string;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
  precipitation: number;
}

export interface WeatherData {
  current: WeatherCurrent;
  forecast: WeatherForecastItem[];
  locationName: string;
  fetchedAt: string;
}
