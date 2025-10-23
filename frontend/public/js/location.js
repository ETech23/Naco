class LocationManager {
  constructor() {
    this.currentLocation = null;
    this.locationWatchId = null;
    this.geocodeCache = new Map();
    this.cityCoordinates = this.initializeCityDatabase();
  }

  /**
   * Initialize major Nigerian city coordinates database
   */
  initializeCityDatabase() {
    return new Map([
      ['lagos', { lat: 6.5244, lon: 3.3792, radius: 50 }],
      ['abuja', { lat: 9.0765, lon: 7.3986, radius: 40 }],
      ['port harcourt', { lat: 4.8156, lon: 7.0498, radius: 30 }],
      ['kano', { lat: 12.0022, lon: 8.5920, radius: 35 }],
      ['ibadan', { lat: 7.3775, lon: 3.9470, radius: 30 }],
      ['kaduna', { lat: 10.5105, lon: 7.4165, radius: 25 }],
      ['benin city', { lat: 6.3350, lon: 5.6037, radius: 20 }],
      ['jos', { lat: 9.9295, lon: 8.8922, radius: 20 }],
      ['ilorin', { lat: 8.5370, lon: 4.5420, radius: 18 }],
      ['enugu', { lat: 6.5244, lon: 7.5106, radius: 22 }],
      ['abeokuta', { lat: 7.1475, lon: 3.3619, radius: 18 }],
      ['owerri', { lat: 5.4840, lon: 7.0351, radius: 15 }],
      ['calabar', { lat: 4.9518, lon: 8.3417, radius: 18 }],
      ['akure', { lat: 7.2571, lon: 5.2058, radius: 15 }],
      ['warri', { lat: 5.5171, lon: 5.7500, radius: 20 }],
    ]);
  }

  /**
   * Normalize city name for consistent matching
   */
  normalizeCity(cityName) {
    if (!cityName) return null;
    
    return cityName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s-]/g, '')
      .replace(/\b(city|state|lga)\b/gi, '')
      .trim();
  }

  /**
   * Get city coordinates with fuzzy matching
   */
  getCityCoordinates(cityName) {
    const normalized = this.normalizeCity(cityName);
    if (!normalized) return null;

    // Direct match
    if (this.cityCoordinates.has(normalized)) {
      return this.cityCoordinates.get(normalized);
    }

    // Fuzzy match (partial matching)
    for (const [key, coords] of this.cityCoordinates.entries()) {
      if (key.includes(normalized) || normalized.includes(key)) {
        return coords;
      }
    }

    return null;
  }

  /**
   * Calculate Haversine distance between two coordinates
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get user location with comprehensive fallback strategy
   */
  async getLocation(options = {}) {
    const {
      enableHighAccuracy = true,
      timeout = 10000,
      maximumAge = 60000,
      fallbackToIP = true
    } = options;

    try {
      // Try GPS first
      const position = await this.getGPSLocation({
        enableHighAccuracy,
        timeout,
        maximumAge
      });

      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        method: 'gps',
        timestamp: new Date().toISOString()
      };

      // Reverse geocode to get city
      const cityInfo = await this.getCityFromCoordinates(
        locationData.latitude,
        locationData.longitude
      );

      if (cityInfo) {
        locationData.city = cityInfo.city;
        locationData.state = cityInfo.state;
        locationData.country = cityInfo.country;
      }

      this.currentLocation = locationData;
      this.saveLocation(locationData);
      return locationData;

    } catch (error) {
      console.warn('GPS location failed:', error);

      if (fallbackToIP) {
        return await this.getIPLocation();
      }

      throw error;
    }
  }

  /**
   * Get GPS location
   */
  getGPSLocation(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  /**
   * Get IP-based location with multiple fallbacks
   */
  async getIPLocation() {
    const ipApis = [
      {
        url: 'https://ipapi.co/json/',
        parser: (data) => ({
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city,
          state: data.region,
          country: data.country_name,
          accuracy: 5000,
          method: 'ip',
          timestamp: new Date().toISOString()
        })
      },
      {
        url: 'https://ipinfo.io/json',
        parser: (data) => {
          const [lat, lon] = data.loc.split(',').map(Number);
          return {
            latitude: lat,
            longitude: lon,
            city: data.city,
            state: data.region,
            country: data.country,
            accuracy: 10000,
            method: 'ip',
            timestamp: new Date().toISOString()
          };
        }
      }
    ];

    for (const api of ipApis) {
      try {
        const response = await fetch(api.url);
        if (!response.ok) continue;
        
        const data = await response.json();
        const locationData = api.parser(data);
        
        this.currentLocation = locationData;
        this.saveLocation(locationData);
        return locationData;
        
      } catch (error) {
        console.warn(`IP API ${api.url} failed:`, error);
        continue;
      }
    }

    // Ultimate fallback
    return this.getDefaultLocation();
  }

  /**
   * Reverse geocode coordinates to city name
   */
  async getCityFromCoordinates(lat, lon) {
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    
    if (this.geocodeCache.has(cacheKey)) {
      return this.geocodeCache.get(cacheKey);
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'NacoApp/1.0'
          }
        }
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      const cityInfo = {
        city: data.address.city || data.address.town || data.address.village,
        state: data.address.state,
        country: data.address.country
      };

      this.geocodeCache.set(cacheKey, cityInfo);
      return cityInfo;

    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return this.guesssCityFromCoordinates(lat, lon);
    }
  }

  /**
   * Guess city from coordinates using database
   */
  guessCityFromCoordinates(lat, lon) {
    let closestCity = null;
    let minDistance = Infinity;

    for (const [cityName, coords] of this.cityCoordinates.entries()) {
      const distance = this.calculateDistance(lat, lon, coords.lat, coords.lon);
      
      if (distance < minDistance && distance < coords.radius) {
        minDistance = distance;
        closestCity = {
          city: cityName.charAt(0).toUpperCase() + cityName.slice(1),
          state: null,
          country: 'Nigeria',
          confidence: 1 - (distance / coords.radius)
        };
      }
    }

    return closestCity || { city: 'Lagos', state: 'Lagos', country: 'Nigeria' };
  }

  /**
   * Default fallback location
   */
  getDefaultLocation() {
    return {
      latitude: 6.5244,
      longitude: 3.3792,
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      accuracy: 50000,
      method: 'default',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check permission status
   */
  async checkPermission() {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch (error) {
      return 'prompt';
    }
  }

  /**
   * Watch location changes
   */
  watchLocation(callback, options = {}) {
    if (!navigator.geolocation) return null;

    this.locationWatchId = navigator.geolocation.watchPosition(
      async (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          method: 'gps',
          timestamp: new Date().toISOString()
        };

        const cityInfo = await this.getCityFromCoordinates(
          locationData.latitude,
          locationData.longitude
        );

        if (cityInfo) {
          Object.assign(locationData, cityInfo);
        }

        this.currentLocation = locationData;
        callback(locationData);
      },
      (error) => console.warn('Location watch error:', error),
      options
    );

    return this.locationWatchId;
  }

  /**
   * Stop watching location
   */
  stopWatching() {
    if (this.locationWatchId) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }
  }

  /**
   * Save location to localStorage
   */
  saveLocation(locationData) {
    try {
      localStorage.setItem('naco_location', JSON.stringify(locationData));
    } catch (error) {
      console.warn('Failed to save location:', error);
    }
  }

  /**
   * Load saved location
   */
  loadSavedLocation() {
    try {
      const saved = localStorage.getItem('naco_location');
      if (saved) {
        const locationData = JSON.parse(saved);
        const age = Date.now() - new Date(locationData.timestamp).getTime();
        
        // Consider saved location fresh for 1 hour
        if (age < 3600000) {
          this.currentLocation = locationData;
          return locationData;
        }
      }
    } catch (error) {
      console.warn('Failed to load saved location:', error);
    }
    return null;
  }

  /**
   * Clear saved location
   */
  clearLocation() {
    localStorage.removeItem('naco_location');
    this.currentLocation = null;
  }
}

// Export singleton instance
const locationManager = new LocationManager();
export default locationManager;