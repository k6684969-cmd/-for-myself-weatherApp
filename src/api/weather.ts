import axios from 'axios';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || 'd08c16ee0de4d667aa2cf544701e6de1';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

interface WeatherQuery {
  city?: string;
  lat?: number;
  lon?: number;
}

interface CurrentWeatherResponse {
  main: {
    temp: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  name: string;
}

interface ForecastResponse {
  list: Array<{
    dt: number;
    main: {
      temp: number;
    };
    weather: Array<{
      main: string;
      icon: string;
    }>;
  }>;
}

interface HourlyForecastResponse {
  list: Array<{
    dt: number;
    main: {
      temp: number;
    };
    weather: Array<{
      main: string;
      icon: string;
    }>;
  }>;
}

export const getCurrentWeather = async (query: WeatherQuery): Promise<CurrentWeatherResponse> => {
  try {
    let url = `${BASE_URL}/weather`;
    const params: Record<string, string | number> = {
      appid: API_KEY,
      units: 'metric',
      lang: 'zh_cn'
    };

    if (query.city) {
      params.q = query.city;
    } else if (query.lat && query.lon) {
      params.lat = query.lat;
      params.lon = query.lon;
    } else {
      throw new Error('Either city name or lat/lon must be provided');
    }

    const response = await axios.get<CurrentWeatherResponse>(url, { params });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('City not found');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid API key');
      }
      throw new Error(`Failed to fetch current weather: ${error.message}`);
    }
    throw new Error('Failed to fetch current weather');
  }
};

export const getForecast = async (query: WeatherQuery): Promise<ForecastResponse> => {
  try {
    let url = `${BASE_URL}/forecast`;
    const params: Record<string, string | number> = {
      appid: API_KEY,
      units: 'metric',
      lang: 'zh_cn'
    };

    if (query.city) {
      params.q = query.city;
    } else if (query.lat && query.lon) {
      params.lat = query.lat;
      params.lon = query.lon;
    } else {
      throw new Error('Either city name or lat/lon must be provided');
    }

    const response = await axios.get<ForecastResponse>(url, { params });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('City not found');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid API key');
      }
      throw new Error(`Failed to fetch forecast: ${error.message}`);
    }
    throw new Error('Failed to fetch forecast');
  }
};

export const getHourlyForecast = async (query: WeatherQuery): Promise<HourlyForecastResponse> => {
  try {
    let url = `${BASE_URL}/forecast`;
    const params: Record<string, string | number> = {
      appid: API_KEY,
      units: 'metric',
      lang: 'zh_cn'
    };

    if (query.city) {
      params.q = query.city;
    } else if (query.lat && query.lon) {
      params.lat = query.lat;
      params.lon = query.lon;
    } else {
      throw new Error('Either city name or lat/lon must be provided');
    }

    const response = await axios.get<HourlyForecastResponse>(url, { params });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('City not found');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid API key');
      }
      throw new Error(`Failed to fetch hourly forecast: ${error.message}`);
    }
    throw new Error('Failed to fetch hourly forecast');
  }
};