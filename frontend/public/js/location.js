class LocationManager {
  constructor() {
    this.currentLocation = null;
    this.locationMethod = null; // 'gps', 'ip', or 'manual'
    this.locationError = null;
    this.watchId = null;
  }

  /**
   * Get user location with automatic fallback
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Location object with latitude, longitude, method
   */
  async getLocation(options = {}) {
    const {
      enableHighAccuracy = true,
      timeout = 10000,
      maximumAge = 300000, // 5 minutes
      fallbackToIP = true,
      showPrompt = true
    } = options;

    try {
      // Try GPS first
      console.log('Attempting GPS location...');
      const gpsLocation = await this.getGPSLocation({
        enableHighAccuracy,
        timeout,
        maximumAge
      });

      this.currentLocation = {
        ...gpsLocation,
        method: 'gps',
        accuracy: gpsLocation.accuracy,
        timestamp: Date.now()
      };

      this.locationMethod = 'gps';
      this.locationError = null;

      console.log('GPS location obtained:', this.currentLocation);
      
      // Store location
      this.storeLocation(this.currentLocation);
      
      return this.currentLocation;

    } catch (gpsError) {
      console.warn('GPS location failed:', gpsError.message);
      this.locationError = gpsError;

      // Fallback to IP geolocation
      if (fallbackToIP) {
        try {
          console.log('Falling back to IP geolocation...');
          const ipLocation = await this.getIPLocation();

          this.currentLocation = {
            ...ipLocation,
            method: 'ip',
            accuracy: 5000, // IP location is less accurate (±5km)
            timestamp: Date.now()
          };

          this.locationMethod = 'ip';

          console.log('IP location obtained:', this.currentLocation);
          
          // Store location
          this.storeLocation(this.currentLocation);
          
          return this.currentLocation;

        } catch (ipError) {
          console.error('IP geolocation also failed:', ipError);
          
          // Final fallback - use stored location or default
          const stored = this.getStoredLocation();
          if (stored) {
            console.log('Using stored location:', stored);
            this.currentLocation = stored;
            return stored;
          }

          // Ultimate fallback - Lagos, Nigeria (default)
          this.currentLocation = this.getDefaultLocation();
          console.log('Using default location:', this.currentLocation);
          return this.currentLocation;
        }
      } else {
        throw gpsError;
      }
    }
  }

  /**
   * Get GPS location using browser Geolocation API
   */
  getGPSLocation(options = {}) {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported by browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed
          });
        },
        (error) => {
          let errorMessage = 'Location access denied';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'User denied location access';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: options.enableHighAccuracy !== false,
          timeout: options.timeout || 10000,
          maximumAge: options.maximumAge || 300000
        }
      );
    });
  }

  /**
   * Get approximate location using IP address
   * Uses multiple services for redundancy
   */
  async getIPLocation() {
    // Try multiple IP geolocation services in order
    const services = [
      {
        name: 'ipapi',
        url: 'https://ipapi.co/json/',
        parse: (data) => ({
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city,
          region: data.region,
          country: data.country_name,
          countryCode: data.country_code
        })
      },
      {
        name: 'ip-api',
        url: 'http://ip-api.com/json/',
        parse: (data) => ({
          latitude: data.lat,
          longitude: data.lon,
          city: data.city,
          region: data.regionName,
          country: data.country,
          countryCode: data.countryCode
        })
      },
      {
        name: 'ipgeolocation',
        url: 'https://api.ipgeolocation.io/ipgeo?apiKey=free',
        parse: (data) => ({
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          city: data.city,
          region: data.state_prov,
          country: data.country_name,
          countryCode: data.country_code2
        })
      }
    ];

    let lastError = null;

    for (const service of services) {
      try {
        console.log(`Trying IP location service: ${service.name}`);
        
        const response = await fetch(service.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const location = service.parse(data);

        // Validate location data
        if (!location.latitude || !location.longitude) {
          throw new Error('Invalid location data');
        }

        console.log(`IP location obtained from ${service.name}:`, location);
        return location;

      } catch (error) {
        console.warn(`${service.name} failed:`, error.message);
        lastError = error;
        continue;
      }
    }

    throw new Error(`All IP geolocation services failed. Last error: ${lastError?.message}`);
  }

  /**
   * Watch location changes (continuous tracking)
   */
  watchLocation(callback, options = {}) {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported');
      return null;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          method: 'gps',
          timestamp: Date.now()
        };

        this.storeLocation(this.currentLocation);
        
        if (callback) {
          callback(this.currentLocation);
        }
      },
      (error) => {
        console.error('Watch location error:', error);
        this.locationError = error;
      },
      {
        enableHighAccuracy: options.enableHighAccuracy !== false,
        timeout: options.timeout || 10000,
        maximumAge: options.maximumAge || 60000
      }
    );

    return this.watchId;
  }

  /**
   * Stop watching location
   */
  stopWatching() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('Stopped watching location');
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get distance from current location to a point
   */
  getDistanceTo(latitude, longitude) {
    if (!this.currentLocation) {
      return null;
    }

    return this.calculateDistance(
      this.currentLocation.latitude,
      this.currentLocation.longitude,
      latitude,
      longitude
    );
  }

  /**
   * Get city from coordinates using reverse geocoding
   */
  async getCityFromCoordinates(latitude, longitude) {
    try {
      // Use Nominatim (OpenStreetMap) for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      
      return {
        city: data.address.city || data.address.town || data.address.village,
        state: data.address.state,
        country: data.address.country,
        displayName: data.display_name
      };

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Store location in localStorage
   */
  storeLocation(location) {
    try {
      localStorage.setItem('naco_location', JSON.stringify({
        ...location,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to store location:', error);
    }
  }

  /**
   * Get stored location
   */
  getStoredLocation() {
    try {
      const stored = localStorage.getItem('naco_location');
      if (!stored) return null;

      const location = JSON.parse(stored);
      
      // Check if stored location is still valid (less than 24 hours old)
      const age = Date.now() - location.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (age > maxAge) {
        console.log('Stored location expired');
        localStorage.removeItem('naco_location');
        return null;
      }

      return location;

    } catch (error) {
      console.error('Failed to get stored location:', error);
      return null;
    }
  }

  /**
   * Get default location (Lagos, Nigeria)
   */
  getDefaultLocation() {
    return {
      latitude: 6.5244,
      longitude: 3.3792,
      city: 'Lagos',
      country: 'Nigeria',
      method: 'default',
      accuracy: 10000,
      timestamp: Date.now()
    };
  }

  /**
   * Check if location permission is granted
   */
  async checkPermission() {
    if (!('permissions' in navigator)) {
      return 'prompt'; // Unknown
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state; // 'granted', 'denied', or 'prompt'
    } catch (error) {
      console.error('Permission check failed:', error);
      return 'prompt';
    }
  }

  /**
   * Request location permission with custom UI
   */
  async requestPermission(showCustomPrompt = true) {
    const permission = await this.checkPermission();

    if (permission === 'granted') {
      return true;
    }

    if (permission === 'denied') {
      return false;
    }

    // Permission is 'prompt' - need to request
    if (showCustomPrompt) {
      return new Promise((resolve) => {
        this.showPermissionDialog(resolve);
      });
    }

    // Trigger browser's native permission prompt
    try {
      await this.getGPSLocation();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Show custom permission dialog
   */
  showPermissionDialog(callback) {
    const dialog = document.createElement('div');
    dialog.id = 'location-permission-dialog';
    dialog.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
      ">
        <div style="
          background: var(--card);
          padding: 30px;
          border-radius: 16px;
          max-width: 400px;
          width: 100%;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        ">
          <i class="fas fa-map-marker-alt" style="
            font-size: 48px;
            color: var(--green);
            margin-bottom: 20px;
          "></i>
          <h3 style="margin-bottom: 10px; color: var(--text);">Enable Location Access</h3>
          <p style="color: var(--muted); margin-bottom: 30px; line-height: 1.6;">
            We need your location to show you nearby artisans and provide accurate distance estimates.
          </p>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <button id="allow-location" style="
              padding: 14px;
              background: var(--green);
              color: white;
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              font-size: 16px;
            ">
              Allow Location Access
            </button>
            <button id="deny-location" style="
              padding: 14px;
              background: var(--border);
              color: var(--text);
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              font-size: 16px;
            ">
              Use Approximate Location
            </button>
          </div>
          <p style="
            font-size: 12px;
            color: var(--muted);
            margin-top: 16px;
            line-height: 1.4;
          ">
            Don't worry! We'll use your IP address to estimate your location if you decline.
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const allowBtn = dialog.querySelector('#allow-location');
    const denyBtn = dialog.querySelector('#deny-location');

    allowBtn.addEventListener('click', async () => {
      dialog.remove();
      
      try {
        await this.getGPSLocation();
        callback(true);
      } catch (error) {
        callback(false);
      }
    });

    denyBtn.addEventListener('click', () => {
      dialog.remove();
      callback(false);
    });
  }

  /**
   * Get current location or cached
   */
  getCurrentLocation() {
    return this.currentLocation || this.getStoredLocation() || this.getDefaultLocation();
  }

  /**
   * Clear stored location
   */
  clearLocation() {
    localStorage.removeItem('naco_location');
    this.currentLocation = null;
    this.locationMethod = null;
    console.log('Location cleared');
  }
}

// Create global instance
const locationManager = new LocationManager();

export default locationManager;