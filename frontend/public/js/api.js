// Detect environment and use appropriate API URL
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8091'
  : 'https://naco.onrender.com';

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = { ...options.headers };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      if (!navigator.onLine) {
        throw new Error('You are currently offline. Please check your internet connection.');
      }

      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', endpoint, error);

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }

      throw error;
    }
  }

  setAuthToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getAuthToken() {
    return this.token || localStorage.getItem('authToken');
  }

  isAuthenticated() {
    return !!this.getAuthToken();
  }
}

export const api = new ApiClient(API_URL);

// ✅ HELPER: Normalize user object to always have both id and _id
function normalizeUserObject(response) {
  console.log('🔍 Raw response:', response);
  
  let user, token;

  // Structure 1: Nested { data: { user: {...}, token: "..." } }
  if (response.data?.user && response.data?.token) {
    user = response.data.user;
    token = response.data.token;
  }
  // Structure 2: Flat { user: {...}, token: "..." }
  else if (response.user && response.token) {
    user = response.user;
    token = response.token;
  }
  // Structure 3: Merged { token: "...", _id: "...", name: "...", ... }
  else if (response.token && (response._id || response.id)) {
    token = response.token;
    user = { ...response };
    delete user.token; // Remove token from user object
  }
  // Structure 4: Just user object (from profile updates)
  else if (response._id || response.id) {
    user = response;
    token = null; // No new token
  }
  else {
    console.error('❌ Unexpected response structure:', response);
    throw new Error('Invalid response structure from server');
  }

  // Validate user object
  if (!user || (!user._id && !user.id)) {
    console.error('❌ Invalid user object:', user);
    throw new Error('Invalid user data received from server');
  }

  // NORMALIZE: Ensure both _id and id exist
  const normalizedUser = {
    ...user,
    id: user.id || user._id?.toString() || user._id,
    _id: user._id || user.id
  };

  console.log('✅ Normalized user:', normalizedUser);
  if (token) console.log('✅ Token extracted');

  return { user: normalizedUser, token };
}

// ✅ HELPER: Normalize array responses
function normalizeArrayResponse(response, key = null) {
  // If response is already an array
  if (Array.isArray(response)) {
    return response;
  }
  
  // If response has a data property that's an array
  if (response.data && Array.isArray(response.data)) {
    return response.data;
  }
  
  // If a specific key is provided and it contains an array
  if (key && Array.isArray(response[key])) {
    return response[key];
  }
  
  // Default: return empty array
  console.warn('⚠️ Unexpected array response structure:', response);
  return [];
}

// Authentication Functions
export async function registerUser(userData) {
  try {
    if (!userData.email || !userData.password || !userData.name || !userData.location) {
      throw new Error('Please fill in all required fields');
    }

    const response = await api.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    const { user, token } = normalizeUserObject(response);

    if (token) {
      api.setAuthToken(token);
    }
    
    localStorage.setItem('userData', JSON.stringify(user));
    console.log('💾 User and token saved');

    return user;
  } catch (error) {
    console.error('❌ Registration failed:', error);
    throw new Error(error.message || 'Registration failed. Please try again.');
  }
}

export async function loginUser(email, password) {
  try {
    const response = await api.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    const { user, token } = normalizeUserObject(response);

    if (token) {
      api.setAuthToken(token);
    }
    
    localStorage.setItem('userData', JSON.stringify(user));
    console.log('💾 User and token saved');

    return user;
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw new Error(error.message || 'Login failed. Please check your credentials.');
  }
}

export function logout() {
  api.setAuthToken(null);
  localStorage.removeItem('userData');
  return Promise.resolve(true);
}

export async function getCurrentUser() {
  try {
    // First try to get from localStorage (faster, works offline)
    const cachedUser = localStorage.getItem('userData');
    if (cachedUser) {
      try {
        const user = JSON.parse(cachedUser);
        // Ensure cached user is normalized
        const normalized = {
          ...user,
          id: user.id || user._id,
          _id: user._id || user.id
        };
        return normalized;
      } catch (e) {
        console.warn('Failed to parse cached user data');
      }
    }
    
    // If not cached or invalid, fetch from API
    if (!api.isAuthenticated()) return null;
    
    const response = await api.request('/auth/user');
    const { user } = normalizeUserObject(response);
    
    // Cache the fresh user data
    localStorage.setItem('userData', JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    
    // If unauthorized, clear invalid token and user data
    if (error.status === 401 || error.message.includes('401')) {
      api.setAuthToken(null);
      localStorage.removeItem('userData');
    }
    
    return null;
  }
}

export function isAuthenticated() {
  return api.isAuthenticated();
}

// User Profile Functions
export async function updateUserProfile(userId, updates) {
  try {
    console.log('Updating profile with userId:', userId);
    
    const response = await api.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    const { user } = normalizeUserObject(response);
    
    // ✅ Update localStorage with new data
    localStorage.setItem('userData', JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('Profile update failed:', error);
    throw error;
  }
}

export async function uploadProfileImage(userId, file) {
  try {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await api.request(`/users/${userId}/avatar`, {
      method: 'POST',
      body: formData
    });

    const { user } = normalizeUserObject(response);
    
    // ✅ Update localStorage with new avatar
    localStorage.setItem('userData', JSON.stringify(user));

    return user;
  } catch (error) {
    console.error('Profile image upload failed:', error);
    throw error;
  }
}

export async function switchUserRole(userId, newRole) {
  try {
    const response = await api.request(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ newRole })
    });

    const { user } = normalizeUserObject(response);
    
    // ✅ Update localStorage
    localStorage.setItem('userData', JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('Role switch failed:', error);
    throw error;
  }
}

// Artisan Functions
export async function getArtisans() {
  try {
    const response = await api.request('/artisans');
    // ✅ Normalize array response
    return normalizeArrayResponse(response, 'artisans');
  } catch (error) {
    console.error('Failed to get artisans:', error);
    return [];
  }
}

export async function getFullArtisanData(artisanId) {
  try {
    const response = await api.request(`/artisans/${artisanId}`);
    // Handle potential nesting
    return response.data?.artisan || response.artisan || response;
  } catch (error) {
    console.error('Failed to get full artisan data:', error);
    throw error;
  }
}

export async function searchArtisans(query = '', city = '') {
  try {
    let endpoint = `/artisans/search/${encodeURIComponent(query)}`;
    const params = new URLSearchParams();
    
    if (city) {
      params.append('city', city);
    }
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const response = await api.request(endpoint);
    // ✅ Normalize array response
    return normalizeArrayResponse(response, 'artisans');
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

// Booking Functions
export async function createBooking(bookingData) {
  try {
    if (!api.isAuthenticated()) {
      throw new Error('Authentication required');
    }

    const response = await api.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });

    return response.data?.booking || response.booking || response;
  } catch (error) {
    console.error('Booking creation failed:', error);
    throw error;
  }
}

export async function getUserBookings(userId = null) {
  try {
    if (!api.isAuthenticated()) {
      return [];
    }

    const response = await api.request('/bookings');
    return normalizeArrayResponse(response, 'bookings');
  } catch (error) {
    console.error('Failed to get bookings:', error);
    return [];
  }
}

export async function getBookingDetails(bookingId) {
  try {
    if (!api.isAuthenticated()) {
      throw new Error('Authentication required');
    }

    const response = await api.request(`/bookings/${bookingId}`);
    return response.data?.booking || response.booking || response;
  } catch (error) {
    console.error('Failed to get booking details:', error);
    throw error;
  }
}

export function getBaseUrl() {
  return API_URL;
}

export async function updateBookingStatus(bookingId, action) {
  try {
    const actionMap = {
      'confirmed': 'accept',
      'declined': 'decline', 
      'in_progress': 'start',
      'completed': 'complete',
      'pending_confirmation': 'complete',
      'confirm_completion': 'confirm',
      'reject_completion': 'reject',
      'cancelled': 'cancel'
    };
    
    const endpoint = actionMap[action];
    if (!endpoint) {
      throw new Error(`Unknown action: ${action}`);
    }
    
    const response = await api.request(`/bookings/${bookingId}/${endpoint}`, {
      method: 'PUT'
    });

    return response.data?.booking || response.booking || response;
  } catch (error) {
    console.error('Booking status update failed:', error);
    throw error;
  }
}

// Review Functions
export async function getReviewsForArtisan(artisanId) {
  try {
    const response = await api.request(`/reviews/artisan/${artisanId}`);
    return normalizeArrayResponse(response, 'reviews');
  } catch (error) {
    console.error('Failed to get reviews:', error);
    return [];
  }
}

export async function getAllReviewsForRating(artisanId) {
  try {
    const response = await api.request(`/reviews/artisan/${artisanId}`);
    const reviews = normalizeArrayResponse(response, 'reviews');
    return reviews.map(review => ({ rating: review.rating }));
  } catch (error) {
    console.error('Failed to get reviews for rating:', error);
    return [];
  }
}

export async function createReview(reviewData) {
  try {
    if (!api.isAuthenticated()) {
      throw new Error('Authentication required');
    }

    const response = await api.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });

    return response.data?.review || response.review || response;
  } catch (error) {
    console.error('Review creation failed:', error);
    throw error;
  }
}

// Notification Functions
async function createNotification(userId, title, message, type = 'booking', data = {}) {
  try {
    const response = await api.request('/notifications', {
      method: 'POST',
      body: JSON.stringify({ user: userId, title, message, type, data })
    });
    return response.data?.notification || response.notification || response;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

export { createNotification };

export async function getNotifications() {
  try {
    if (!api.isAuthenticated()) {
      return [];
    }

    const response = await api.request('/notifications');
    console.log('Retrieved notifications:', response);
    // ✅ Normalize array response
    return normalizeArrayResponse(response, 'notifications');
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return [];
  }
}

export async function markSingleNotificationRead(notificationId) {
  try {
    if (!notificationId) {
      throw new Error('Notification ID is required');
    }
    
    const response = await api.request(`/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
    
    return response;
  } catch (error) {
    console.error('Failed to mark single notification as read:', error);
    throw error;
  }
}

export async function markNotificationsRead(userId = null) {
  try {
    if (!api.isAuthenticated()) {
      return;
    }

    await api.request('/notifications/read', {
      method: 'PUT'
    });
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    throw error;
  }
}

// Favorites Functions
export async function toggleFavorite(artisanId) {
  try {
    if (!api.isAuthenticated()) {
      throw new Error('Authentication required');
    }

    const result = await api.request(`/favorites/toggle/${artisanId}`, {
      method: 'POST'
    });

    return result.isFavorite;
  } catch (error) {
    console.error('Toggle favorite failed:', error);
    throw error;
  }
}

export async function getUserFavorites(userId = null) {
  try {
    if (!api.isAuthenticated()) {
      return [];
    }

    const response = await api.request('/favorites');
    return normalizeArrayResponse(response, 'favorites');
  } catch (error) {
    console.error('Failed to get favorites:', error);
    return [];
  }
}

// File Upload Functions
export async function uploadAvatar(userId, file) {
  try {
    return await uploadProfileImage(userId, file);
  } catch (error) {
    console.error('Avatar upload failed:', error);
    throw error;
  }
}

export function getAvatarUrl(user, size = '100x100') {
  if (!user?.avatar) return null;
  return `${API_URL}/uploads/${user.avatar}`;
}

// Theme Functions
export async function toggleTheme(userId, theme) {
  try {
    const response = await api.request(`/users/${userId}/theme`, {
      method: 'PUT',
      body: JSON.stringify({ theme })
    });
    
    const { user } = normalizeUserObject(response);
    // ✅ Update localStorage
    localStorage.setItem('userData', JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('Theme update failed:', error);
    throw error;
  }
}

// Utility Functions
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0
  }).format(amount);
}

export function subscribeToBookings(userId, callback) {
  console.warn('Real-time subscriptions not implemented yet.');
  return null;
}

export function subscribeToNotifications(userId, callback) {
  console.warn('Real-time subscriptions not implemented yet.');
  return null;
}

export function unsubscribe(subscription) {
  console.warn('Real-time subscriptions not implemented yet.');
}

//export { api };