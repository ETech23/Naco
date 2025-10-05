// api.js - Frontend API Client (replaces pocketbase.js)

// Detect environment and use appropriate API URL
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8091'  // Local development
  : 'https://your-production-domain.com';  // Update with your production URL

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  // Helper method for making requests
  async request(endpoint, options = {}) {
  const url = `${this.baseURL}${endpoint}`;
  const headers = { ...options.headers };

  // Only set JSON Content-Type if body is not FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers
  };

  // Add auth token if available
  if (this.token) {
    config.headers.Authorization = `Bearer ${this.token}`;
  }

  try {
    // Check if online
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

  // Set auth token
  setAuthToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Get auth token
  getAuthToken() {
    return this.token || localStorage.getItem('authToken');
  }

  // Check if authenticated
  isAuthenticated() {
    return !!this.getAuthToken();
  }
}

// Create API client instance
export const api = new ApiClient(API_URL);

// Authentication Functions
/** export async function registerUser(userData) {
  try {
    // Validate required fields
    if (!userData.email || !userData.password || !userData.name || !userData.location) {
      throw new Error('Please fill in all required fields');
    }

    const response = await api.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    // Set auth token
    api.setAuthToken(response.token);

    return response.user;
  } catch (error) {
    console.error('Registration failed:', error);
    throw new Error(error.message || 'Registration failed. Please try again.');
  }
}**/
export async function registerUser(userData) {
  try {
    if (!userData.email || !userData.password || !userData.name || !userData.location) {
      throw new Error('Please fill in all required fields');
    }

    const response = await api.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    console.log('Register response:', response); // Debug log

    // FIX: Extract the actual user object from response
    const user = response.user || response.data?.user || response;
    const token = response.token || response.data?.token;

    if (!token) {
      throw new Error('No token received from server');
    }

    // Save token
    api.setAuthToken(token);
    
    // CRITICAL: Save the actual user object, not the response wrapper
    localStorage.setItem('userData', JSON.stringify(user));
    
    console.log('User saved:', user); // Debug log
    console.log('Token saved:', token); // Debug log

    return user;
  } catch (error) {
    console.error('Registration failed:', error);
    throw new Error(error.message || 'Registration failed. Please try again.');
  }
}

/** export async function loginUser(email, password) {
  try {
    const response = await api.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    api.setAuthToken(response.token);
    return response.user;
  } catch (error) {
    console.error('Login failed:', error);
    throw new Error(error.message || 'Login failed. Please check your credentials.');
  }
}**/
export async function loginUser(email, password) {
  try {
    const response = await api.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    console.log('Login response:', response); // Debug log

    // FIX: Extract the actual user object from response
    const user = response.user || response.data?.user || response;
    const token = response.token || response.data?.token;

    if (!token) {
      throw new Error('No token received from server');
    }

    // Save token
    api.setAuthToken(token);
    
    // CRITICAL: Save the actual user object, not the response wrapper
    localStorage.setItem('userData', JSON.stringify(user));
    
    console.log('User saved:', user); // Debug log
    console.log('Token saved:', token); // Debug log

    return user;
  } catch (error) {
    console.error('Login failed:', error);
    throw new Error(error.message || 'Login failed. Please check your credentials.');
  }
}

/** export function logout() {
  api.setAuthToken(null);
  return Promise.resolve(true);
} **/
export function logout() {
  api.setAuthToken(null);
  localStorage.removeItem('userData'); // Add this line
  return Promise.resolve(true);
}

/** export async function getCurrentUser() {
  try {
    if (!api.isAuthenticated()) return null;
    
    const user = await api.request('/auth/user');
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    
    // If unauthorized, clear invalid token
    if (error.status === 401 || error.code === 'UNAUTHORIZED') {
      api.setAuthToken(null);
    }
    
    return null;
  }
} **/
export async function getCurrentUser() {
  try {
    // First try to get from localStorage (faster, works offline)
    const cachedUser = localStorage.getItem('userData');
    if (cachedUser) {
      try {
        return JSON.parse(cachedUser);
      } catch (e) {
        console.warn('Failed to parse cached user data');
      }
    }
    
    // If not cached or invalid, fetch from API
    if (!api.isAuthenticated()) return null;
    
    const user = await api.request('/auth/user');
    
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

// Unified profile update (with or without image)
export async function updateUserProfile(userId, updates) {
  try {
    const user = await api.request(`/users/${userId}`, {
      method: 'PUT',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    return user;
  } catch (error) {
    console.error('Profile update failed:', error);
    throw error;
  }
}

/**export async function updateUserProfile(userId, updates) {
  try {
    const user = await api.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return user;
  } catch (error) {
    console.error('Profile update failed:', error);
    throw error;
  }
}**/

export async function uploadProfileImage(userId, file) {
  try {
    const formData = new FormData();
    formData.append('photo', file); // <--- must match backend upload.single('photo')

    const updatedUser = await api.request(`/users/${userId}/avatar`, {
      method: 'POST',
      body: formData
      // DO NOT set Content-Type header — the browser will set it automatically
    });

    return updatedUser;
  } catch (error) {
    console.error('Profile image upload failed:', error);
    throw error;
  }
}

export async function switchUserRole(userId, newRole) {
  try {
    const user = await api.request(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ newRole })
    });
    return user;
  } catch (error) {
    console.error('Role switch failed:', error);
    throw error;
  }
}

// Artisan Functions
export async function getArtisans() {
  try {
    const artisans = await api.request('/artisans');
    return artisans;
  } catch (error) {
    console.error('Failed to get artisans:', error);
    return [];
  }
}

export async function getFullArtisanData(artisanId) {
  try {
    const artisan = await api.request(`/artisans/${artisanId}`);
    return artisan;
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

    const artisans = await api.request(endpoint);
    return artisans;
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

    const booking = await api.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });

    return booking;
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

    const bookings = await api.request('/bookings');
    return bookings;
  } catch (error) {
    console.error('Failed to get bookings:', error);
    return [];
  }
}

    export async function updateBookingStatus(bookingId, action) {
  try {
    // Map frontend actions to backend endpoints
    const actionMap = {
      'confirmed': 'accept',
      'declined': 'decline', 
      'in_progress': 'start',
      'completed': 'complete',
      'pending_confirmation': 'complete',  // When artisan marks as complete
      'confirm_completion': 'confirm',     // When client confirms
      'reject_completion': 'reject',
      'cancelled': 'cancel'
    };
    
    const endpoint = actionMap[action];
    if (!endpoint) {
      throw new Error(`Unknown action: ${action}. Valid actions: ${Object.keys(actionMap).join(', ')}`);
    }
    
    const booking = await api.request(`/bookings/${bookingId}/${endpoint}`, {
      method: 'PUT'
    });

    return booking;
  } catch (error) {
    console.error('Booking status update failed:', error);
    throw error;
  }
}

// Review Functions
export async function getReviewsForArtisan(artisanId) {
  try {
    const reviews = await api.request(`/reviews/artisan/${artisanId}`);
    return reviews;
  } catch (error) {
    console.error('Failed to get reviews:', error);
    return [];
  }
}

export async function getAllReviewsForRating(artisanId) {
  try {
    const reviews = await api.request(`/reviews/artisan/${artisanId}`);
    // Return only rating data for calculation
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

    const review = await api.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });

    return review;
  } catch (error) {
    console.error('Review creation failed:', error);
    throw error;
  }
}

// Notification Functions
async function createNotification(userId, title, message, type = 'booking', data = {}) {
  try {
    const notification = await api.request('/notifications', {
      method: 'POST',
      body: JSON.stringify({
        user: userId,
        title,
        message,
        type,
        data
      })
    });
    return notification;
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

    const notifications = await api.request('/notifications');
    console.log('Retrieved notifications:', notifications);
    return notifications;
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

    const favorites = await api.request('/favorites');
    return favorites;
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
    const user = await api.request(`/users/${userId}/theme`, {
      method: 'PUT',
      body: JSON.stringify({ theme })
    });
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

// Real-time functionality placeholder
// Note: For real-time features, you'll need to implement WebSocket or Socket.IO
export function subscribeToBookings(userId, callback) {
  console.warn('Real-time subscriptions not implemented yet. Consider using Socket.IO.');
  return null;
}

export function subscribeToNotifications(userId, callback) {
  console.warn('Real-time subscriptions not implemented yet. Consider using Socket.IO.');
  return null;
}

export function unsubscribe(subscription) {
  console.warn('Real-time subscriptions not implemented yet.');
}

// Export API client for advanced usage export { api };

