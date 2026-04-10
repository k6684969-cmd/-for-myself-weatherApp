import React, { useState, useEffect } from 'react';
import { getCurrentWeather, getForecast, getHourlyForecast } from './api/weather';

interface WeatherData {
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

interface ForecastData {
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

const App: React.FC = () => {
  const [city, setCity] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    // 从 LocalStorage 加载收藏的城市
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }

    // 尝试获取用户位置
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherByCoords(latitude, longitude);
        },
        (err) => {
          console.error('Error getting location:', err);
        }
      );
    }
  }, []);

  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    setLoading(true);
    setError('');
    try {
      const [weatherData, forecastData, hourlyData] = await Promise.all([
        getCurrentWeather({ lat, lon }),
        getForecast({ lat, lon }),
        getHourlyForecast({ lat, lon })
      ]);
      setWeather(weatherData);
      setForecast(forecastData);
      setHourlyForecast(hourlyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (cityName: string) => {
    setLoading(true);
    setError('');
    try {
      const [weatherData, forecastData, hourlyData] = await Promise.all([
        getCurrentWeather({ city: cityName }),
        getForecast({ city: cityName }),
        getHourlyForecast({ city: cityName })
      ]);
      setWeather(weatherData);
      setForecast(forecastData);
      setHourlyForecast(hourlyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'City not found');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city) {
      fetchWeather(city);
    }
  };

  const toggleFavorite = (cityName: string) => {
    let newFavorites: string[];
    if (favorites.includes(cityName)) {
      newFavorites = favorites.filter(fav => fav !== cityName);
    } else {
      newFavorites = [...favorites, cityName];
    }
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  const getWeatherIcon = (icon: string) => {
    if (!icon) {
      return `https://openweathermap.org/img/wn/01d@2x.png`;
    }
    return `https://openweathermap.org/img/wn/${icon}@2x.png`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('zh-CN', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // 拖动相关状态
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [lastX, setLastX] = useState(0);
  const [lastTime, setLastTime] = useState(0);
  const [animationId, setAnimationId] = useState<number | null>(null);
  const hourlyContainerRef = React.useRef<HTMLDivElement>(null);

  // 处理鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent) => {
    // 取消之前的动画
    if (animationId) {
      cancelAnimationFrame(animationId);
      setAnimationId(null);
    }
    setIsDragging(true);
    setStartX(e.clientX - (hourlyContainerRef.current?.offsetLeft || 0));
    setScrollLeft(hourlyContainerRef.current?.scrollLeft || 0);
    setLastX(e.clientX);
    setLastTime(Date.now());
    setVelocity(0);
  };

  // 处理鼠标移动事件
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !hourlyContainerRef.current) return;
    e.preventDefault();
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    const deltaX = e.clientX - lastX;
    
    // 计算速度
    if (deltaTime > 0) {
      setVelocity(deltaX / deltaTime);
    }
    
    setLastX(e.clientX);
    setLastTime(currentTime);
    
    const x = e.clientX - (hourlyContainerRef.current.offsetLeft || 0);
    let walk = (x - startX) * 0.8; // 减小滚动速度，提高精度
    
    // 计算目标滚动位置
    let targetScrollLeft = scrollLeft - walk;
    
    // 处理边界阻力
    const container = hourlyContainerRef.current;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    const resistanceFactor = 0.3; // 阻力系数
    
    if (targetScrollLeft < 0) {
      // 左侧边界阻力
      const overshoot = Math.abs(targetScrollLeft);
      const resistance = overshoot * resistanceFactor;
      targetScrollLeft = -resistance;
    } else if (targetScrollLeft > maxScrollLeft) {
      // 右侧边界阻力
      const overshoot = targetScrollLeft - maxScrollLeft;
      const resistance = overshoot * resistanceFactor;
      targetScrollLeft = maxScrollLeft + resistance;
    }
    
    container.scrollLeft = targetScrollLeft;
  };

  // 惯性动画函数
  const animate = () => {
    if (!hourlyContainerRef.current) return;
    
    const container = hourlyContainerRef.current;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    const currentScrollLeft = container.scrollLeft;
    
    // 检查是否需要回弹
    if (currentScrollLeft < 0 || currentScrollLeft > maxScrollLeft) {
      // 回弹动画
      const targetScrollLeft = Math.max(0, Math.min(currentScrollLeft, maxScrollLeft));
      const distance = targetScrollLeft - currentScrollLeft;
      const springConstant = 0.1; // 弹簧常数
      const damping = 0.8; // 阻尼系数
      
      // 计算回弹速度
      const reboundVelocity = velocity * damping - distance * springConstant;
      
      // 应用回弹速度
      const newScrollLeft = currentScrollLeft + reboundVelocity * 16; // 假设 60fps
      
      // 检查是否接近目标位置
      if (Math.abs(newScrollLeft - targetScrollLeft) < 1 && Math.abs(reboundVelocity) < 0.5) {
        container.scrollLeft = targetScrollLeft;
        if (animationId) {
          cancelAnimationFrame(animationId);
          setAnimationId(null);
        }
        setVelocity(0);
        return;
      }
      
      container.scrollLeft = newScrollLeft;
      setVelocity(reboundVelocity);
    } else {
      // 正常惯性动画
      // 衰减系数
      const DECAY = 0.95;
      // 最小速度阈值
      const MIN_VELOCITY = 0.1;
      
      // 更新速度
      setVelocity(prev => {
        const newVelocity = prev * DECAY;
        
        // 检查是否需要停止动画
        if (Math.abs(newVelocity) < MIN_VELOCITY) {
          if (animationId) {
            cancelAnimationFrame(animationId);
            setAnimationId(null);
          }
          return 0;
        }
        
        // 应用速度
        const newScrollLeft = container.scrollLeft - newVelocity * 16; // 假设 60fps
        
        // 处理边界
        const clampedScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScrollLeft));
        
        container.scrollLeft = clampedScrollLeft;
        
        return newVelocity;
      });
    }
    
    // 继续动画
    const id = requestAnimationFrame(animate);
    setAnimationId(id);
  };

  // 处理鼠标释放事件
  const handleMouseUp = () => {
    setIsDragging(false);
    
    // 如果速度足够大，启动惯性动画
    if (Math.abs(velocity) > 0.5) {
      const id = requestAnimationFrame(animate);
      setAnimationId(id);
    }
  };

  // 处理鼠标离开事件
  const handleMouseLeave = () => {
    setIsDragging(false);
    
    // 如果速度足够大，启动惯性动画
    if (Math.abs(velocity) > 0.5) {
      const id = requestAnimationFrame(animate);
      setAnimationId(id);
    }
  };

  // 处理滚动事件
  const handleScroll = () => {
    if (hourlyContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = hourlyContainerRef.current;
      const percentage = (scrollLeft / (scrollWidth - clientWidth)) * 100;
      setScrollPercentage(percentage);
    }
  };

  // 添加滚动事件监听
  useEffect(() => {
    const container = hourlyContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-600 p-4">
      <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-4 sm:mb-6">天气应用</h1>
        
        <form onSubmit={handleSubmit} className="flex mb-4 sm:mb-6">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="请输入城市名称"
            className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 sm:px-6 py-2 rounded-r-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
          >
            搜索
          </button>
        </form>

        {loading && <p className="text-center text-gray-600">加载中...</p>}
        {error && <p className="text-center text-red-500 mb-4">{error}</p>}

        {weather && (
          <div className="mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{weather.name}</h2>
              <button
                onClick={() => toggleFavorite(weather.name)}
                className={`p-2 rounded-full ${favorites.includes(weather.name) ? 'bg-yellow-400' : 'bg-gray-200'}`}
              >
                {favorites.includes(weather.name) ? '★' : '☆'}
              </button>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center mb-3 sm:mb-4 md:mb-0">
                <img
                  src={getWeatherIcon(weather.weather[0].icon)}
                  alt={weather.weather[0].main}
                  className="w-16 sm:w-20 h-16 sm:h-20 mr-3 sm:mr-4"
                />
                <div>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-800">{Math.round(weather.main.temp)}°C</p>
                  <p className="text-gray-600 text-sm sm:text-base">{weather.weather[0].description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full md:w-auto">
                <div className="bg-gray-100 p-3 sm:p-4 rounded-lg">
                  <p className="text-gray-600 text-sm sm:text-base">湿度</p>
                  <p className="text-lg sm:text-xl font-semibold">{weather.main.humidity}%</p>
                </div>
                <div className="bg-gray-100 p-3 sm:p-4 rounded-lg">
                  <p className="text-gray-600 text-sm sm:text-base">风速</p>
                  <p className="text-lg sm:text-xl font-semibold">{weather.wind.speed} m/s</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {hourlyForecast && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">未来12小时天气预报</h3>
            <div 
              ref={hourlyContainerRef}
              className="relative overflow-x-auto pb-3 sm:pb-4 -mx-4 sm:mx-0 px-4 sm:px-0 cursor-grab active:cursor-grabbing hourly-container"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={(e) => {
                // 取消之前的动画
                if (animationId) {
                  cancelAnimationFrame(animationId);
                  setAnimationId(null);
                }
                setIsDragging(true);
                const touch = e.touches[0];
                setStartX(touch.clientX - (hourlyContainerRef.current?.offsetLeft || 0));
                setScrollLeft(hourlyContainerRef.current?.scrollLeft || 0);
                setLastX(touch.clientX);
                setLastTime(Date.now());
                setVelocity(0);
              }}
              onTouchMove={(e) => {
                if (!isDragging || !hourlyContainerRef.current) return;
                e.preventDefault();
                const touch = e.touches[0];
                const currentTime = Date.now();
                const deltaTime = currentTime - lastTime;
                const deltaX = touch.clientX - lastX;
                
                // 计算速度
                if (deltaTime > 0) {
                  setVelocity(deltaX / deltaTime);
                }
                
                setLastX(touch.clientX);
                setLastTime(currentTime);
                
                const x = touch.clientX - (hourlyContainerRef.current.offsetLeft || 0);
                let walk = (x - startX) * 0.8; // 减小滚动速度，提高精度
                
                // 计算目标滚动位置
                let targetScrollLeft = scrollLeft - walk;
                
                // 处理边界阻力
                const container = hourlyContainerRef.current;
                const maxScrollLeft = container.scrollWidth - container.clientWidth;
                const resistanceFactor = 0.3; // 阻力系数
                
                if (targetScrollLeft < 0) {
                  // 左侧边界阻力
                  const overshoot = Math.abs(targetScrollLeft);
                  const resistance = overshoot * resistanceFactor;
                  targetScrollLeft = -resistance;
                } else if (targetScrollLeft > maxScrollLeft) {
                  // 右侧边界阻力
                  const overshoot = targetScrollLeft - maxScrollLeft;
                  const resistance = overshoot * resistanceFactor;
                  targetScrollLeft = maxScrollLeft + resistance;
                }
                
                container.scrollLeft = targetScrollLeft;
              }}
              onTouchEnd={() => {
                setIsDragging(false);
                
                // 如果速度足够大，启动惯性动画
                if (Math.abs(velocity) > 0.5) {
                  const id = requestAnimationFrame(animate);
                  setAnimationId(id);
                }
              }}
            >
              {/* 隐藏滚动条和防止文本选择 */}
              <style>{`
                .hourly-container::-webkit-scrollbar {
                  display: none;
                }
                .hourly-container {
                  -webkit-user-select: none;
                  -moz-user-select: none;
                  -ms-user-select: none;
                  user-select: none;
                }
                .hourly-container img {
                  pointer-events: none;
                }
              `}</style>
              <div className={`flex space-x-3 sm:space-x-4 transition-transform duration-200 ${isDragging ? 'opacity-90' : 'opacity-100'}`}>
                {hourlyForecast.list
                  .slice(0, 12) // 取前12个数据点，每3小时一个，共覆盖36小时，取前12个覆盖12小时
                  .map((item, index) => (
                    <div key={index} className="bg-gray-100 p-3 sm:p-4 rounded-lg text-center min-w-[90px] sm:min-w-[100px] hover:shadow-md transition-shadow">
                      <p className="font-semibold mb-2 text-xs sm:text-sm">{new Date(item.dt * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
                      <img
                        src={getWeatherIcon(item.weather[0].icon)}
                        alt={item.weather[0].main}
                        className="w-8 sm:w-10 h-8 sm:h-10 mx-auto mb-2"
                      />
                      <p className="text-base sm:text-lg font-bold">{Math.round(item.main.temp)}°C</p>
                      <p className="text-gray-600 text-xs sm:text-sm">{item.weather[0].main}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
        {forecast && (
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">5天天气预报</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
              {forecast.list
                .filter((_, index) => index % 8 === 0) // 每8小时一个数据点，取每天的第一个
                .slice(0, 5)
                .map((item, index) => (
                  <div key={index} className="bg-gray-100 p-3 sm:p-4 rounded-lg text-center">
                    <p className="font-semibold mb-2 text-xs sm:text-sm">{formatDate(item.dt)}</p>
                    <img
                      src={getWeatherIcon(item.weather[0].icon)}
                      alt={item.weather[0].main}
                      className="w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-2"
                    />
                    <p className="text-base sm:text-lg font-bold">{Math.round(item.main.temp)}°C</p>
                    <p className="text-gray-600 text-xs sm:text-sm">{item.weather[0].main}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {favorites.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">收藏城市</h3>
            <div className="flex flex-wrap gap-2">
              {favorites.map((favCity) => (
                <div key={favCity} className="bg-gray-200 px-3 sm:px-4 py-2 rounded-full flex items-center">
                  <button
                    onClick={() => fetchWeather(favCity)}
                    className="mr-2 text-sm sm:text-base"
                  >
                    {favCity}
                  </button>
                  <button
                    onClick={() => toggleFavorite(favCity)}
                    className="text-gray-500 hover:text-red-500 text-sm sm:text-base"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;